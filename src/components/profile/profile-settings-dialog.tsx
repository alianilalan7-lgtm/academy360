'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AvatarUpload } from './avatar-upload'

interface ProfileSettingsDialogProps {
    isOpen: boolean
    onClose: () => void
    currentUser: any // Supabase user object
}

export function ProfileSettingsDialog({ isOpen, onClose, currentUser }: ProfileSettingsDialogProps) {
    const router = useRouter()
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.user_metadata?.avatar_url)

    if (!isOpen) return null

    const handleUploadSuccess = (url: string) => {
        setAvatarUrl(url)
        router.refresh()
        // Optional: Show success toast
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Profil Ayarlari</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Profil Fotografi</h3>
                        <AvatarUpload
                            currentUrl={avatarUrl}
                            onUploadSuccess={handleUploadSuccess}
                        />
                    </div>

                    <div className="api-info bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
                        <p className="flex items-center gap-2">
                            ℹ️ Diger profil bilgilerinizi (isim, dogum tarihi vb.) degistirmek icin lutfen antrenorunuzle iletisime geciniz.
                        </p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
