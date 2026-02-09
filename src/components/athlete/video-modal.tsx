'use client'

import { useState } from 'react'

interface VideoModalProps {
    isOpen: boolean
    onClose: () => void
    videoUrl: string
    title?: string
}

function getYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}

export function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
    const [isLoading, setIsLoading] = useState(true)

    if (!isOpen) return null

    const youtubeId = getYouTubeId(videoUrl)
    const isYouTube = !!youtubeId

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                    {title && <h3 className="text-white font-medium truncate pr-8">{title}</h3>}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Video Container */}
                <div className="relative pt-[56.25%]">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {isYouTube ? (
                        <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                            title={title || 'Video'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            onLoad={() => setIsLoading(false)}
                        />
                    ) : (
                        <video
                            className="absolute inset-0 w-full h-full"
                            src={videoUrl}
                            controls
                            autoPlay
                            onLoadedData={() => setIsLoading(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
