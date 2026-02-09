'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AvatarUploadProps {
    currentUrl: string | null | undefined
    onUploadSuccess: (url: string) => void
}

export function AvatarUpload({ currentUrl, onUploadSuccess }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        try {
            setError(null)
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Bir resim seciniz.')
            }

            const file = event.target.files[0]

            // Get current user to use as ID prefix
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Kullanici bulunamadi')

            const formData = new FormData()
            formData.append('file', file)
            formData.append('userId', user.id)

            // Upload via server-side API to bypass RLS
            const response = await fetch('/api/upload/avatar', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Yukleme basarisiz oldu')
            }

            // Update user metadata with new avatar URL
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: data.publicUrl }
            })

            if (updateError) {
                throw updateError
            }

            onUploadSuccess(data.publicUrl)
        } catch (error: any) {
            console.error(error)
            setError(error.message || 'Resim yuklenirken hata olustu.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-emerald-500 transition-colors">
                    {currentUrl ? (
                        <img
                            src={currentUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl">
                            👤
                        </div>
                    )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Degistir</span>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={uploading}
            />

            {uploading && <p className="text-sm text-gray-500 animate-pulse">Yukleniyor...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    )
}
