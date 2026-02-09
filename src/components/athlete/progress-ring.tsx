'use client'

interface ProgressRingProps {
    progress: number // 0-100
    size?: number
    strokeWidth?: number
    color?: 'emerald' | 'blue' | 'orange' | 'purple'
    label?: string
    sublabel?: string
}

const colorMap = {
    emerald: '#10B981',
    blue: '#3B82F6',
    orange: '#F97316',
    purple: '#8B5CF6',
}

export function ProgressRing({
    progress,
    size = 120,
    strokeWidth = 8,
    color = 'emerald',
    label,
    sublabel,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colorMap[color]}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {label && <span className="text-2xl font-bold text-gray-800">{label}</span>}
                {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
            </div>
        </div>
    )
}
