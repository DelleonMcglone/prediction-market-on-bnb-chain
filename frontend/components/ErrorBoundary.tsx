"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="max-w-md mx-auto mt-24 p-6 rounded-lg border border-no/30 bg-no/5 text-center">
          <h2 className="text-lg font-semibold mb-2">Something broke</h2>
          <p className="text-sm text-muted mb-4">
            {this.state.error.message || "Unknown error"}
          </p>
          <Button onClick={this.reset} variant="secondary" size="md">
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
