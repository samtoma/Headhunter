import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * JobAnalysisGenerator - Component for streaming AI-generated job analysis
 * 
 * States:
 * - idle: Ready to generate
 * - connecting: Connecting to WebSocket
 * - thinking: AI is analyzing
 * - generating: Generating job description
 * - streaming: Streaming content
 * - complete: Analysis complete
 * - error: Error occurred
 */
const JobAnalysisGenerator = ({ title, location, employmentType, fineTuning, departmentId, departmentName, onComplete, onCancel }) => {
    const [state, setState] = useState('idle'); // idle, connecting, thinking, generating, streaming, complete, error
    const [statusMessage, setStatusMessage] = useState('');
    const [preview, setPreview] = useState('');
    const [error, setError] = useState(null);
    const [tokensUsed, setTokensUsed] = useState(0);
    const [latency, setLatency] = useState(0);

    const wsRef = useRef(null);
    const isCompleteRef = useRef(false);
    const token = localStorage.getItem('token');

    const handleWebSocketMessage = useCallback((data) => {
        switch (data.type) {
            case 'status':
                setStatusMessage(data.message || 'Processing...');
                if (data.status === 'thinking') {
                    setState('thinking');
                } else if (data.status === 'generating') {
                    setState('generating');
                }
                break;

            case 'chunk':
                setPreview(data.accumulated || data.content || '');
                setState(prev => prev !== 'streaming' ? 'streaming' : prev);
                break;

            case 'complete': {
                isCompleteRef.current = true;
                setState('complete');
                setStatusMessage('Analysis complete!');
                setTokensUsed(data.tokens_used || 0);
                setLatency(data.latency_ms || 0);

                // Parse the data
                const parseField = (val) => {
                    if (Array.isArray(val)) return val;
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch { return []; }
                    }
                    return [];
                };

                const result = {
                    ...data.data,
                    responsibilities: parseField(data.data.responsibilities),
                    qualifications: parseField(data.data.qualifications),
                    preferred_qualifications: parseField(data.data.preferred_qualifications),
                    benefits: parseField(data.data.benefits),
                    skills_required: parseField(data.data.skills_required)
                };

                if (onComplete) {
                    onComplete(result);
                }
                break;
            }

            case 'error':
                setError(data.message || 'An error occurred');
                setState('error');
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

        if (!title) {
            setError('Job title is required');
            setState('error');
            return;
        }

        setState('connecting');
        setStatusMessage('Connecting to AI service...');
        setError(null);
        setPreview('');
        isCompleteRef.current = false;

        // Build query parameters
        const params = new URLSearchParams({
            token: token,
            title: title
        });
        if (location) params.append('location', location);
        if (employmentType) params.append('employment_type', employmentType);
        if (fineTuning) params.append('fine_tuning', fineTuning);
        if (departmentId) params.append('department_id', departmentId);
        if (departmentName) params.append('department_name', departmentName);

        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsPath = `/api/jobs/analyze/stream`;
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}?${params.toString()}`;

        console.log('🔌 Connecting to Job Analysis WebSocket:', {
            url: wsUrl.replace(/token=[^&]+/, 'token=***'),
            title
        });

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('✅ Job Analysis WebSocket connected');
                setState('thinking');
                setStatusMessage('AI is analyzing job requirements...');
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
                console.error('❌ Job Analysis WebSocket error:', error);
                setError('Connection error. Please try again.');
                setState('error');
            };

            wsRef.current.onclose = (event) => {
                console.log('Job Analysis WebSocket closed. Code:', event.code, 'Reason:', event.reason);

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
    }, [token, title, location, employmentType, fineTuning, departmentId, departmentName, handleWebSocketMessage]);

    // Auto-start generation when component mounts
    useEffect(() => {
        if (title) {
            connectWebSocket();
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [title, location, employmentType, fineTuning, departmentId, departmentName, token, connectWebSocket]);

    const handleCancel = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        if (onCancel) {
            onCancel();
        }
    };

    const handleRetry = () => {
        setError(null);
        setState('idle');
        connectWebSocket();
    };

    // Render based on state
    if (state === 'error') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <h4 className="font-semibold text-red-900 mb-1">Error</h4>
                        <p className="text-sm text-red-700 mb-3">{error || 'An error occurred during analysis'}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRetry}
                                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Retry
                            </button>
                            <button
                                onClick={handleCancel}
                                className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (state === 'complete') {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <h4 className="font-semibold text-green-900 mb-1">Analysis Complete</h4>
                        <p className="text-sm text-green-700">
                            Generated job description successfully
                            {tokensUsed > 0 && ` • ${tokensUsed.toLocaleString()} tokens`}
                            {latency > 0 && ` • ${(latency / 1000).toFixed(1)}s`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading/streaming states
    return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    {(state === 'connecting' || state === 'thinking' || state === 'generating') && (
                        <Loader2 className="text-indigo-600 animate-spin" size={20} />
                    )}
                    {state === 'streaming' && (
                        <Sparkles className="text-indigo-600" size={20} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-indigo-900">
                            {state === 'connecting' && 'Connecting...'}
                            {state === 'thinking' && 'Analyzing...'}
                            {state === 'generating' && 'Generating...'}
                            {state === 'streaming' && 'Streaming...'}
                        </h4>
                        <button
                            onClick={handleCancel}
                            className="text-indigo-600 hover:text-indigo-700 transition"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-sm text-indigo-700 mb-3">{statusMessage}</p>

                    {/* Streaming preview */}
                    {state === 'streaming' && preview && (
                        <div className="bg-white rounded-lg p-3 border border-indigo-100 max-h-48 overflow-y-auto">
                            <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap">
                                {preview}
                                <span className="animate-pulse">▊</span>
                            </pre>
                            <p className="text-xs text-slate-400 mt-2">
                                {preview.length} characters generated...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobAnalysisGenerator;
