import React from "react";

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(_error: Error, _info: unknown) {
    // Could log to service
    // console.error(error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">Ocorreu um erro na UI.</div>;
    }
    return this.props.children;
  }
}

