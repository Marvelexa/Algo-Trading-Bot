import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Readonly<Props>;
  declare state: Readonly<State>;
  declare setState: Component<Props, State>["setState"];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Workstation Error Boundary Caught]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">
                Workstation Auto-Protection Active
              </h2>
              <p className="text-xs text-slate-400">
                A temporary rendering exception occurred. The system prevented a white screen crash and isolated the workspace.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-950 text-left font-mono text-[11px] text-rose-300 border border-slate-800/80 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              Reload & Recover Workstation
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
