import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2, Globe } from 'lucide-react';

/**
 * CompanyProfileGenerator - Component for step-by-step company profile extraction
 *
 * States:
 * - idle: Ready to generate
 * - connecting: Connecting to WebSocket
 * - step 1-5: Progress through extraction steps
 * - complete: Extraction complete
 * - error: Error occurred
 */
const CompanyProfileGenerator = ({ url, onComplete, onCancel }) => {
    const [state, setState] = useState('idle'); // idle, connecting, step1-step5, complete, error
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState(null);
    const [tokensUsed, setTokensUsed] = useState(0);
    const [latency, setLatency] = useState(0);

    const wsRef = useRef(null);
    const isCompleteRef = useRef(false);
    const token = localStorage.getItem('token');

    const steps = [
        "Fetching website content...",
        "Analyzing website content and extracting key information...",
        "Processing with AI to extract company details...",
        "Validating extracted information...",
        "Generating company profile..."
    ];

    // Auto-start extraction when component mounts
    useEffect(() => {
        if (url) {
            connectWebSocket();
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [url, token]);

    const connectWebSocket = () => {
        if (!token) {
            setError('Authentication required');
            setState('error');
            return;
        }

        if (!url) {
            setError('Company website URL is required');
            setState('error');
            return;
        }

        setState('connecting');
        setError(null);
        setCurrentStep(0);

        // Build query parameters
        const params = new URLSearchParams({
            token: token,
            url: url
        });

        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsPath = 'api/company/regenerate/stream';
        const wsUrl = `${wsProtocol}//${wsHost}/${wsPath}?${params.toString()}`;

        console.log('🔌 Connecting to Company Profile WebSocket:', {
            wsUrl: wsUrl.replace(/token=[^&]+/, 'token=***'),
            targetUrl: url
        });

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('✅ Company Profile WebSocket connected');
                setState('step1');
                setCurrentStep(1);
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
                console.error('❌ Company Profile WebSocket error:', error);
                setError('Connection error. Please try again.');
                setState('error');
            };

            wsRef.current.onclose = (event) => {
                console.log('Company Profile WebSocket closed. Code:', event.code, 'Reason:', event.reason);
                
                // Use a small timeout to allow the 'complete' message to be processed
                // and the isCompleteRef to be updated.
                setTimeout(() => {
                    // Only show error if we haven't completed successfully
                    if (!isCompleteRef.current) {
                        if (event.code !== 1000 && event.code !== 1001) {
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
    };

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'step': {
                const stepNum = data.step;
                setCurrentStep(stepNum);
                setState(`step${stepNum}`);
                break;
            }

            case 'complete':
                isCompleteRef.current = true;
                setState('complete');
                setTokensUsed(data.tokens_used || 0);
                setLatency(data.latency_ms || 0);

                if (onComplete) {
                    onComplete(data.data);
                }
                break;

            case 'error':
                setError(data.message || 'An error occurred');
                setState('error');
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    };

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
        setCurrentStep(0);
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
                        <p className="text-sm text-red-700 mb-3">{error || 'An error occurred during extraction'}</p>
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
                        <h4 className="font-semibold text-green-900 mb-1">Company Profile Extracted</h4>
                        <p className="text-sm text-green-700">
                            Successfully extracted company information
                            {tokensUsed > 0 && ` • ${tokensUsed.toLocaleString()} tokens`}
                            {latency > 0 && ` • ${(latency / 1000).toFixed(1)}s`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading/progress states
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    {(state === 'connecting' || state.startsWith('step')) && (
                        <Loader2 className="text-blue-600 animate-spin" size={20} />
                    )}
                    {state === 'complete' && (
                        <CheckCircle2 className="text-blue-600" size={20} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <Globe size={16} />
                            {state === 'connecting' && 'Connecting...'}
                            {state.startsWith('step') && `Step ${currentStep} of ${steps.length}`}
                            {state === 'complete' && 'Complete'}
                        </h4>
                        <button
                            onClick={handleCancel}
                            className="text-blue-600 hover:text-blue-700 transition"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {state.startsWith('step') && (
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-blue-600 mb-1">
                                <span>Progress</span>
                                <span>{currentStep}/{steps.length}</span>
                            </div>
                            <div className="w-full bg-blue-100 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-blue-700 mb-2">
                        {state === 'connecting' && 'Connecting to AI service...'}
                        {state.startsWith('step') && steps[currentStep - 1]}
                        {state === 'complete' && 'Company profile extracted successfully!'}
                    </p>

                    {/* Step indicators */}
                    {state.startsWith('step') && (
                        <div className="space-y-1">
                            {steps.map((stepText, index) => {
                                const stepNumber = index + 1;
                                const isActive = stepNumber === currentStep;
                                const isCompleted = stepNumber < currentStep;

                                return (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${isCompleted ? 'bg-green-500' :
                                            isActive ? 'bg-blue-600' :
                                                'bg-blue-300'
                                            }`}>
                                            {isCompleted ? '✓' : stepNumber}
                                        </div>
                                        <span className={`${isCompleted ? 'text-green-700' :
                                            isActive ? 'text-blue-900 font-medium' :
                                                'text-blue-500'
                                            }`}>
                                            {stepText}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyProfileGenerator;
