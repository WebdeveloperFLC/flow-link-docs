import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class HrModuleErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[HR Payroll]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ padding: 24, borderColor: "#fecaca", background: "#fff1f2" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            HR module error
          </div>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
            This screen crashed. Try another menu item or hard-refresh. If it persists after Publish,
            share the message below.
          </p>
          <pre
            className="mono"
            style={{
              fontSize: 11,
              padding: 12,
              background: "var(--paper)",
              borderRadius: 8,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
