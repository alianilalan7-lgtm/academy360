export const ASSIGNMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  assigned: { label: 'Atandi', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Devam Ediyor', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Tamamlandi', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Iptal Edildi', className: 'bg-gray-100 text-gray-500' },
}

export const SESSION_STATUS_META: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Planlandi', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Devam Ediyor', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Tamamlandi', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Iptal Edildi', className: 'bg-gray-100 text-gray-500' },
}

const DEFAULT_STATUS_META = { label: 'Bilinmiyor', className: 'bg-gray-100 text-gray-500' }

export function getAssignmentStatusMeta(status: string | null | undefined) {
  if (!status) return DEFAULT_STATUS_META
  return ASSIGNMENT_STATUS_META[status] || { label: status, className: 'bg-gray-100 text-gray-500' }
}

export function getSessionStatusMeta(status: string | null | undefined) {
  if (!status) return DEFAULT_STATUS_META
  return SESSION_STATUS_META[status] || { label: status, className: 'bg-gray-100 text-gray-500' }
}
