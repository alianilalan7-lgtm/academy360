import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceRoleKey) {
        return NextResponse.json({ success: false, error: 'Service Role Key not found' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    try {
        // Check if bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets()

        if (listError) {
            return NextResponse.json({ success: false, error: listError.message }, { status: 500 })
        }

        const avatarsBucket = buckets.find(b => b.name === 'avatars')

        if (avatarsBucket) {
            return NextResponse.json({ success: true, message: 'Bucket "avatars" already exists', bucket: avatarsBucket })
        }

        // Create bucket
        const { data, error } = await supabase
            .storage
            .createBucket('avatars', {
                public: true,
                fileSizeLimit: 2097152, // 2MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
            })

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Bucket "avatars" created successfully', data })
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
