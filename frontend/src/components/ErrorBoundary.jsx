import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full border border-red-100">
                        <div className="flex items-center gap-3 mb-6 text-red-600">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <h1 className="text-2xl font-bold text-slate-900">Application Error</h1>
                        </div>

                        <p className="text-slate-600 mb-6">
                            An unexpected error occurred. We've logged this issue.
                            We&apos;re sorry, but something went wrong. Please try refreshing the page. or contact support if the problem persists.
                        </p>

                        <div className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-auto max-h-64 text-xs font-mono mb-6">
                            <p className="text-red-400 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => {
                                    // Mock email report
                                    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || 'Unknown Error'}`);
                                    const body = encodeURIComponent(`Error Details:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`);
                                    window.open(`mailto:support@headhunter.ai?subject=${subject}&body=${body}`);
                                }}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                            >
                                Send Error Report
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
