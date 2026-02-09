'use client'

import type { Exercise, ExerciseCategory, ExerciseDifficulty } from '@/lib/types'

interface ExerciseCardProps {
    exercise: Exercise
    isCompleted?: boolean
    isCompleting?: boolean
    onComplete?: (id: string) => void
    onVideoClick?: (videoUrl: string, title: string) => void
    showCompleteButton?: boolean
}

const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
    warmup: '🏃',
    coordination: '🎯',
    strength_agility: '💪',
    ball_work: '⚽',
    cooldown: '🧘',
}

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
    easy: 'Kolay',
    medium: 'Orta',
    hard: 'Zor',
}

const DIFFICULTY_COLORS: Record<ExerciseDifficulty, string> = {
    easy: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    hard: 'bg-red-100 text-red-700 border-red-200',
}

function getYouTubeThumbnail(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
        return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`
    }
    return null
}

export function ExerciseCard({
    exercise,
    isCompleted = false,
    isCompleting = false,
    onComplete,
    onVideoClick,
    showCompleteButton = true,
}: ExerciseCardProps) {
    const hasVideo = !!exercise.video_url
    const thumbnail = hasVideo ? getYouTubeThumbnail(exercise.video_url!) : null

    return (
        <div
            className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-lg ${isCompleted ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 hover:border-gray-300'
                }`}
        >
            {/* Video Thumbnail */}
            {hasVideo && (
                <div
                    className="relative aspect-video bg-gray-100 cursor-pointer group"
                    onClick={() => onVideoClick?.(exercise.video_url!, exercise.name)}
                >
                    {thumbnail ? (
                        <img
                            src={thumbnail}
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                            <span className="text-4xl">🎬</span>
                        </div>
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 text-emerald-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Category icon */}
                    <div className="absolute top-2 left-2 w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center text-lg shadow">
                        {CATEGORY_ICONS[exercise.category]}
                    </div>

                    {/* Completed badge */}
                    {isCompleted && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow">
                            ✓
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-400">#{exercise.order_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[exercise.difficulty]}`}>
                                {DIFFICULTY_LABELS[exercise.difficulty]}
                            </span>
                            {!hasVideo && (
                                <span className="text-lg">{CATEGORY_ICONS[exercise.category]}</span>
                            )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mt-1">{exercise.name}</h3>
                    </div>
                    {isCompleted && !hasVideo && (
                        <span className="text-emerald-500 text-xl flex-shrink-0">✓</span>
                    )}
                </div>

                {/* Description */}
                {exercise.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{exercise.description}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                    {exercise.sets > 1 && <span className="bg-gray-100 px-2 py-1 rounded">{exercise.sets} set</span>}
                    {exercise.repetitions && <span className="bg-gray-100 px-2 py-1 rounded">{exercise.repetitions} tekrar</span>}
                    {exercise.duration_seconds && <span className="bg-gray-100 px-2 py-1 rounded">{exercise.duration_seconds}sn</span>}
                    {exercise.rest_seconds && <span className="bg-gray-100 px-2 py-1 rounded">⏱ {exercise.rest_seconds}sn dinlenme</span>}
                </div>

                {/* Action button */}
                {showCompleteButton && (
                    <>
                        {!isCompleted ? (
                            <button
                                onClick={() => onComplete?.(exercise.id)}
                                disabled={isCompleting}
                                className="mt-4 w-full py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {isCompleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Kaydediliyor...
                                    </span>
                                ) : (
                                    'Yaptım ✓'
                                )}
                            </button>
                        ) : (
                            <div className="mt-4 w-full py-2.5 text-center text-emerald-600 text-sm font-medium bg-emerald-50 rounded-lg">
                                ✓ Tamamlandı
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
