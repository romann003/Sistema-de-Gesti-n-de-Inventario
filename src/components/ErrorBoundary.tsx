import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h2 className="text-lg font-semibold text-red-700">Ha ocurrido un error</h2>
            <p className="text-sm text-red-600 mt-2">La aplicación encontró un error en tiempo de ejecución. Puedes recargar la página o copiar los detalles abajo para investigar.</p>
            <div className="mt-3">
              <button
                className="px-3 py-1 rounded bg-red-600 text-white"
                onClick={() => window.location.reload()}
              >
                Recargar
              </button>
            </div>
            <details className="mt-4 text-xs text-gray-700">
              <summary className="cursor-pointer">Detalles del error (expandir)</summary>
              <pre className="whitespace-pre-wrap mt-2">{String(this.state.error && this.state.error.toString())}\n{this.state.errorInfo?.componentStack}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
