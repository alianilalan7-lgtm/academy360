'use client'

interface AchievementBadgeProps {
    name: string
    icon?: string
    xpReward?: number
    isLocked?: boolean
    earnedAt?: string
    size?: 'sm' | 'md' | 'lg'
}

export function AchievementBadge({
    name,
    icon = '🏆',
    xpReward,
    isLocked = false,
    earnedAt,
    size = 'md',
}: AchievementBadgeProps) {
    const sizeClasses = {
        sm: 'p-2',
        md: 'p-3',
        lg: 'p-4',
    }

    const iconSizes = {
        sm: 'w-8 h-8 text-lg',
        md: 'w-10 h-10 text-xl',
        lg: 'w-14 h-14 text-2xl',
    }

    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    }

    if (isLocked) {
        return (
            <div className={`${sizeClasses[size]} bg-gray-100 rounded-lg text-center opacity-60`}>
                <div className={`${iconSizes[size]} bg-gray-200 rounded-full flex items-center justify-center mx-auto grayscale`}>
                    🔒
                </div>
                <div className={`font-medium text-gray-400 mt-2 ${textSizes[size]}`}>???</div>
            </div>
        )
    }

    return (
        <div
            className={`${sizeClasses[size]} bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition-colors cursor-pointer group`}
        >
            <div
                className={`${iconSizes[size]} bg-yellow-200 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}
            >
                {icon}
            </div>
            <div className={`font-medium text-gray-800 mt-2 ${textSizes[size]}`}>{name}</div>
            {xpReward && (
                <div className="text-xs text-yellow-600 mt-1">+{xpReward} XP</div>
            )}
            {earnedAt && (
                <div className="text-xs text-gray-400 mt-1">
                    {new Date(earnedAt).toLocaleDateString('tr-TR')}
                </div>
            )}
        </div>
    )
}
