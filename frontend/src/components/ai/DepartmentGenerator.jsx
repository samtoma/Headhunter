import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * DepartmentGenerator - Component for step-by-step department generation
 *
 * States:
 * - idle: Ready to generate
 * - connecting: Connecting to WebSocket
 * - step 1-5: Progress through generation steps
 * - complete: Generation complete
 * - error: Error occurred
 */
const DepartmentGenerator = ({ name, fineTuning, onComplete, onCancel }) => {
    const [state, setState] = useState('idle'); // idle, connecting, step1-step5, complete, error
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState(null);
    const [tokensUsed, setTokensUsed] = useState(0);
    const [latency, setLatency] = useState(0);

    const wsRef = useRef(null);
    const token = localStorage.getItem('token');

    const steps = [
        "Analyzing department requirements and company context...",
        "Researching industry best practices and department structures...",
        "Generating department structure and responsibilities...",
        "Creating job templates and role definitions...",
        "Finalizing department profile..."
    ];

    // Auto-start generation when component mounts
    useEffect(() => {
        if (name) {
            connectWebSocket();
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [name, fineTuning, token]);

    const connectWebSocket = () => {
        if (!token) {
            setError('Authentication required');
            setState('error');
            return;
        }

        if (!name) {
            setError('Department name is required');
            setState('error');
            return;
        }

        setState('connecting');
        setError(null);
        setCurrentStep(0);

        // Build query parameters
        const params = new URLSearchParams({
            token: token,
            name: name
        });
        if (fineTuning) params.append('fine_tuning', fineTuning);

        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsPath = `/api/departments/generate/stream`;
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}?${params.toString()}`;

        console.log('🔌 Connecting to Department Generation WebSocket:', {
            url: wsUrl.replace(/token=[^&]+/, 'token=***'),
            name,
            fineTuning
        });

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('✅ Department Generation WebSocket connected');
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
                console.error('❌ Department Generation WebSocket error:', error);
                setError('Connection error. Please try again.');
                setState('error');
            };

            wsRef.current.onclose = (event) => {
                console.log('Department Generation WebSocket closed. Code:', event.code, 'Reason:', event.reason);
                if (state !== 'complete' && state !== 'error') {
                    if (event.code !== 1000) {
                        setError(event.reason || 'Connection closed unexpectedly');
                        setState('error');
                    }
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setError('Failed to connect. Please try again.');
            setState('error');
        }
    };

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'step':
                const stepNum = data.step;
                setCurrentStep(stepNum);
                setState(`step${stepNum}`);
                break;

            case 'complete':
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
                        <p className="text-sm text-red-700 mb-3">{error || 'An error occurred during generation'}</p>
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
                        <h4 className="font-semibold text-green-900 mb-1">Department Generated</h4>
                        <p className="text-sm text-green-700">
                            Successfully created department profile
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
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    {(state === 'connecting' || state.startsWith('step')) && (
                        <Loader2 className="text-indigo-600 animate-spin" size={20} />
                    )}
                    {state === 'complete' && (
                        <CheckCircle2 className="text-indigo-600" size={20} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-indigo-900">
                            {state === 'connecting' && 'Connecting...'}
                            {state.startsWith('step') && `Step ${currentStep} of ${steps.length}`}
                            {state === 'complete' && 'Complete'}
                        </h4>
                        <button
                            onClick={handleCancel}
                            className="text-indigo-600 hover:text-indigo-700 transition"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {state.startsWith('step') && (
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-indigo-600 mb-1">
                                <span>Progress</span>
                                <span>{currentStep}/{steps.length}</span>
                            </div>
                            <div className="w-full bg-indigo-100 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-indigo-700 mb-2">
                        {state === 'connecting' && 'Connecting to AI service...'}
                        {state.startsWith('step') && steps[currentStep - 1]}
                        {state === 'complete' && 'Department profile generated successfully!'}
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
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                            isCompleted ? 'bg-green-500' :
                                            isActive ? 'bg-indigo-600' :
                                            'bg-indigo-300'
                                        }`}>
                                            {isCompleted ? '✓' : stepNumber}
                                        </div>
                                        <span className={`${
                                            isCompleted ? 'text-green-700' :
                                            isActive ? 'text-indigo-900 font-medium' :
                                            'text-indigo-500'
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

export default DepartmentGenerator;
