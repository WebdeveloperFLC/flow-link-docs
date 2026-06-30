import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  error: Error | null;
}

/** Catches render errors inside finance pages without crashing the whole app shell. */
export class AccountingPageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AccountingPageErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-8">
          <div className="max-w-lg w-full rounded-lg border p-6 space-y-3">
            <h2 className="text-base font-semibold">{this.props.title ?? "Finance page error"}</h2>
            <p className="text-sm text-muted-foreground">
              This finance screen hit a runtime error. Try reloading. If it persists, share the message below.
            </p>
            <pre className="text-xs overflow-auto rounded bg-muted p-3 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AccountingPageErrorBoundary;
