'use client'

interface StatsCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon?: string
    color?: 'emerald' | 'blue' | 'orange' | 'purple'
    progress?: number // 0-100
}

const colorClasses = {
    emerald: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-500',
        light: 'bg-emerald-100',
    },
    blue: {
        text: 'text-blue-600',
        bg: 'bg-blue-500',
        light: 'bg-blue-100',
    },
    orange: {
        text: 'text-orange-500',
        bg: 'bg-orange-500',
        light: 'bg-orange-100',
    },
    purple: {
        text: 'text-purple-600',
        bg: 'bg-purple-500',
        light: 'bg-purple-100',
    },
}

export function StatsCard({ title, value, subtitle, icon, color = 'emerald', progress }: StatsCardProps) {
    const colors = colorClasses[color]

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-sm text-gray-500">{title}</div>
                    <div className={`text-3xl font-bold mt-1 ${colors.text}`}>{value}</div>
                    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
                </div>
                {icon && (
                    <div className={`w-10 h-10 ${colors.light} rounded-lg flex items-center justify-center text-xl`}>
                        {icon}
                    </div>
                )}
            </div>

            {typeof progress === 'number' && (
                <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${colors.bg} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-right">{progress}%</div>
                </div>
            )}
        </div>
    )
}
