import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught: ", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="card card-body text-center space-y-4">
            <h2 className="text-2xl font-semibold">Something went wrong</h2>
            <p className="text-slate-600">An unexpected error occurred. Try reloading the page.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload
              </button>
              <a className="btn btn-secondary" href="/">Go Home</a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
