import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error | null
}

export class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('[ModalErrorBoundary] Caught error in modal:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm p-5 bg-[#FAF8F3] rounded-2xl shadow-xl border border-stone-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <span className="text-lg">⚠️</span>
            </div>
            <h3 className="font-bold text-sm text-stone-900">
              {this.props.fallbackTitle || 'Dialog Encountered an Issue'}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              This dialog could not be displayed properly. Your prayer records and progress are safe.
            </p>
            {this.state.error?.message && (
              <p className="text-[10.5px] font-mono text-rose-700 bg-rose-50 p-2 rounded-lg break-words text-left max-h-24 overflow-y-auto">
                {this.state.error.message}
              </p>
            )}
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  if (this.props.onReset) this.props.onReset()
                }}
                className="px-4 py-2 bg-[#0C4535] text-white text-xs font-semibold rounded-xl hover:bg-[#093529] transition cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
