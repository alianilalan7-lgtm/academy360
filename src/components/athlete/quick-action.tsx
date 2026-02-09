'use client'

import Link from 'next/link'

interface QuickActionProps {
    label: string
    icon: string
    href: string
    color?: 'emerald' | 'blue' | 'orange' | 'purple'
    description?: string
}

const colorClasses = {
    emerald: 'bg-emerald-500 hover:bg-emerald-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
}

export function QuickAction({ label, icon, href, color = 'emerald', description }: QuickActionProps) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 p-4 rounded-xl text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${colorClasses[color]}`}
        >
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
                {icon}
            </div>
            <div>
                <div className="font-semibold">{label}</div>
                {description && <div className="text-sm text-white/80">{description}</div>}
            </div>
            <svg className="w-5 h-5 ml-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </Link>
    )
}
