import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error | null
  errorInfo?: unknown
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('Captured by global ErrorBoundary:', error, info)
    this.setState({ error, errorInfo: info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 mb-4 shadow-sm">
            <span className="text-2xl">🕌</span>
          </div>
          <h2 className="text-xl font-bold text-[#12281E]">Something went wrong</h2>
          <p className="text-sm text-stone-600 mt-2 mb-2 max-w-md">
            The application encountered an unexpected issue while rendering. Your data is safe.
          </p>
          {this.state.error?.message && (
            <div className="max-w-md p-3 my-3 bg-red-50 border border-red-200 rounded-xl text-left text-xs text-red-800 font-mono overflow-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
              }}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/app'
              }}
              className="px-4 py-2 bg-[#0C4535] hover:bg-[#093529] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
