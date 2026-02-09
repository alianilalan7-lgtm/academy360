'use client'

import { useEffect, useState } from 'react'

interface XpToastProps {
    xp: number
    isVisible: boolean
    onHide: () => void
}

export function XpToast({ xp, isVisible, onHide }: XpToastProps) {
    const [show, setShow] = useState(false)

    useEffect(() => {
        if (isVisible) {
            setShow(true)
            const timer = setTimeout(() => {
                setShow(false)
                setTimeout(onHide, 300)
            }, 2500)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onHide])

    if (!isVisible && !show) return null

    return (
        <div
            className={`fixed top-20 right-4 z-50 transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                }`}
        >
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg animate-bounce">
                    ⭐
                </div>
                <div>
                    <div className="font-bold text-lg">+{xp} XP</div>
                    <div className="text-xs text-emerald-100">Tebrikler!</div>
                </div>
            </div>
        </div>
    )
}
