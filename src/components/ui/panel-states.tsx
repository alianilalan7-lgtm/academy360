import Link from 'next/link'

type AlertType = 'success' | 'error' | 'info'

interface PanelInlineAlertProps {
  type: AlertType
  message: string
  actionHref?: string
  actionLabel?: string
}

interface PanelEmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
}

interface PanelPageSkeletonProps {
  withHeader?: boolean
  rows?: number
}

export function PanelInlineAlert({ type, message, actionHref, actionLabel }: PanelInlineAlertProps) {
  const className =
    type === 'success'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : type === 'error'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-blue-50 text-blue-700 border-blue-200'

  return (
    <div className={`rounded-lg border p-3 text-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="whitespace-nowrap text-xs font-semibold underline">
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function PanelEmptyState({ icon = '📭', title, description, actionHref, actionLabel }: PanelEmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-600 font-medium">{title}</p>
      {description ? <p className="text-gray-500 text-sm mt-1">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-block mt-3 text-sm text-emerald-600 hover:underline">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function PanelPageSkeleton({ withHeader = true, rows = 3 }: PanelPageSkeletonProps) {
  return (
    <div className="space-y-6">
      {withHeader ? <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" /> : null}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
