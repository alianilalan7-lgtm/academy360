'use client'

interface StreakIndicatorProps {
    days: number
    showAnimation?: boolean
}

export function StreakIndicator({ days, showAnimation = true }: StreakIndicatorProps) {
    const isActive = days > 0

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <span
                    className={`text-2xl ${showAnimation && isActive ? 'animate-bounce' : ''}`}
                    style={{ animationDuration: '1.5s' }}
                >
                    🔥
                </span>
                {isActive && showAnimation && (
                    <span
                        className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-ping"
                        style={{ animationDuration: '2s' }}
                    />
                )}
            </div>
            <div>
                <span className="text-2xl font-bold text-orange-500">{days}</span>
                <span className="text-sm text-gray-500 ml-1">gün seri</span>
            </div>
        </div>
    )
}
