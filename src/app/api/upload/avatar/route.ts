import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const userId = formData.get('userId') as string

        if (!file || !userId) {
            return NextResponse.json(
                { error: 'File and userId are required' },
                { status: 400 }
            )
        }

        // Initialize Supabase with Service Role Key to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // Upload file
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            })

        if (error) {
            console.error('Upload Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // 1. Update user_profiles table (This is what the app reads from)
        const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', userId)

        if (profileError) {
            console.error('Profile Update Error:', profileError)
        }

        // 2. Update auth.users metadata (For completeness)
        const { error: authError } = await supabase.auth.admin.updateUserById(
            userId,
            { user_metadata: { avatar_url: publicUrl } }
        )

        if (authError) {
            console.error('Auth Update Error:', authError)
        }

        return NextResponse.json({ success: true, publicUrl })
    } catch (error) {
        console.error('Server Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
