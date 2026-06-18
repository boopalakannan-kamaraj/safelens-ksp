type LoadingSpinnerProps = {
  message?: string
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-3 text-text-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        {message}
      </div>
    </div>
  )
}

type ErrorStateProps = {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-sm font-medium text-danger">Failed to load data</p>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
