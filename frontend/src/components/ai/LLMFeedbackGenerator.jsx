import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * LLMFeedbackGenerator - Component for streaming AI-generated interview feedback
 * 
 * States:
 * - idle: Ready to generate
 * - connecting: Connecting to WebSocket
 * - thinking: AI is analyzing
 * - generating: Generating feedback
 * - streaming: Streaming content
 * - complete: Feedback complete
 * - error: Error occurred
 */
const LLMFeedbackGenerator = ({ interviewId, onComplete, onCancel }) => {
    const [state, setState] = useState('idle'); // idle, connecting, thinking, generating, streaming, complete, error
    const [statusMessage, setStatusMessage] = useState('');
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState(null);
    const [tokensUsed, setTokensUsed] = useState(0);
    const [latency, setLatency] = useState(0);

    const wsRef = useRef(null);
    const isCompleteRef = useRef(false);
    const token = localStorage.getItem('token');

    const handleWebSocketMessage = useCallback((data) => {
        switch (data.type) {
            case 'status':
                if (data.status === 'thinking') {
                    setState('thinking');
                    setStatusMessage(data.message || 'AI is analyzing interview data...');
                } else if (data.status === 'analyzing') {
                    setState('thinking');
                    setStatusMessage(data.message || 'Analyzing candidate profile and job requirements...');
                } else if (data.status === 'generating') {
                    setState('generating');
                    setStatusMessage(data.message || 'Generating feedback...');
                }
                break;

            case 'chunk':
                // Use functional update to avoid reading state dependency, or rely on React bail-out
                setState(prev => prev !== 'streaming' ? 'streaming' : prev);
                setStatusMessage('Streaming feedback...');
                if (data.accumulated) {
                    setFeedback(data.accumulated);
                } else if (data.content) {
                    setFeedback(prev => prev + data.content);
                }
                // Update token count if provided in chunk
                if (data.tokens_used) {
                    setTokensUsed(data.tokens_used);
                }
                break;

            case 'complete':
                isCompleteRef.current = true;
                setState('complete');
                setStatusMessage('Feedback generation complete!');
                setFeedback(prev => data.feedback || prev);
                setTokensUsed(data.tokens_used || 0);
                setLatency(data.latency_ms || 0);
                if (onComplete && data.feedback) {
                    onComplete(data.feedback);
                }
                // Close WebSocket
                if (wsRef.current) {
                    wsRef.current.close();
                }
                break;

            case 'error':
                setError(data.message || 'An error occurred');
                setState('error');
                if (wsRef.current) {
                    wsRef.current.close();
                }
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    }, [onComplete]);

    const connectWebSocket = useCallback(() => {
        if (!token) {
            setError('Authentication required');
            setState('error');
            return;
        }

        setState('connecting');
        setStatusMessage('Connecting to AI service...');
        setError(null);
        setFeedback('');
        isCompleteRef.current = false;

        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsPath = `/api/interviews/${interviewId}/generate-feedback/stream`;
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`;

        console.log('🔌 Connecting to LLM WebSocket:', {
            url: wsUrl.replace(/token=[^&]+/, 'token=***'),
            interviewId
        });

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('✅ LLM Feedback WebSocket connected');
                setState('thinking');
                setStatusMessage('AI is analyzing interview data...');
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                    setError('Failed to parse server response');
                    setState('error');
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('❌ LLM Feedback WebSocket error:', error);
                setError('Connection error. Please try again.');
                setState('error');
            };

            wsRef.current.onclose = (event) => {
                console.log('LLM Feedback WebSocket closed. Code:', event.code, 'Reason:', event.reason);

                // Use a small timeout to allow the 'complete' message to be processed
                setTimeout(() => {
                    if (!isCompleteRef.current) {
                        if (event.code !== 1000) {
                            setError(event.reason || 'Connection closed unexpectedly');
                            setState('error');
                        }
                    }
                }, 200);
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setError('Failed to connect. Please try again.');
            setState('error');
        }
    }, [token, interviewId, handleWebSocketMessage]);

    const handleStart = () => {
        connectWebSocket();
    };

    const handleCancel = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        setState('idle');
        setFeedback('');
        setError(null);
        setStatusMessage('');
        if (onCancel) {
            onCancel();
        }
    };

    const handleRetry = () => {
        setState('idle');
        setError(null);
        setFeedback('');
        setStatusMessage('');
        connectWebSocket();
    };

    // Auto-start when component mounts
    useEffect(() => {
        // Auto-start generation when component is first shown
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]); // Only run on mount or if dependencies change

    // Note: Component auto-starts on mount, so idle state is rarely shown
    // It's only shown if user cancels and retries, or if there's an initialization delay
    if (state === 'idle') {
        return (
            <div className="w-full">
                <button
                    onClick={handleStart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
                >
                    <Sparkles size={18} />
                    Generate AI Feedback
                </button>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="w-full space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-600 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-800 mb-1">Error Generating Feedback</h4>
                            <p className="text-sm text-red-700">{error || 'An unknown error occurred'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRetry}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Retry
                    </button>
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'complete') {
        return (
            <div className="w-full space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h4 className="font-semibold text-emerald-800 mb-1">Feedback Generated Successfully</h4>
                            <p className="text-sm text-emerald-700">
                                {statusMessage}
                                {tokensUsed > 0 && (
                                    <span className="ml-2 text-xs">
                                        ({tokensUsed} tokens, {latency}ms)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                {feedback && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                            {feedback}
                        </pre>
                    </div>
                )}
                <button
                    onClick={handleCancel}
                    className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                    Close
                </button>
            </div>
        );
    }

    // Loading states: connecting, thinking, generating, streaming
    return (
        <div className="w-full space-y-4">
            {/* Status indicator */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    {state === 'connecting' || state === 'thinking' || state === 'generating' ? (
                        <Loader2 className="text-indigo-600 animate-spin" size={20} />
                    ) : (
                        <Sparkles className="text-indigo-600" size={20} />
                    )}
                    <div className="flex-1">
                        <p className="font-semibold text-indigo-800">{statusMessage || 'Processing...'}</p>
                        {state === 'streaming' && feedback && (
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-indigo-600">
                                    {feedback.length} characters generated...
                                </p>
                                {tokensUsed > 0 && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                        {tokensUsed} tokens
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {(state === 'connecting' || state === 'thinking' || state === 'generating' || state === 'streaming') && (
                        <button
                            onClick={handleCancel}
                            className="p-1 hover:bg-indigo-100 rounded transition-colors"
                            title="Cancel"
                        >
                            <X size={18} className="text-indigo-600" />
                        </button>
                    )}
                </div>
            </div>

            {/* Streaming feedback preview */}
            {state === 'streaming' && feedback && (
                <div className="bg-white border-2 border-indigo-300 rounded-xl p-4 max-h-96 overflow-y-auto shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                            <Sparkles size={16} className="animate-pulse" />
                            Live Streaming Feedback
                        </div>
                        <div className="text-xs text-slate-500">
                            {feedback.length} characters
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                            {feedback}
                            <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse">▊</span>
                        </pre>
                    </div>
                </div>
            )}

            {/* Progress indicator for thinking/generating */}
            {(state === 'thinking' || state === 'generating') && (
                <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
            )}
        </div>
    );
};

export default LLMFeedbackGenerator;
