import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})

const TARGET_EMAIL = 'alianilalan@hotmail.com'
const NEW_PASSWORD = '75109Aa.'

async function resetPassword() {
    console.log('🔍 Checking user:', TARGET_EMAIL)

    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
        console.error('❌ Error listing users:', authError)
        return
    }

    const user = authUser.users.find(u => u.email === TARGET_EMAIL)

    if (!user) {
        console.log('❌ User not found in auth.users')
        console.log('Creating user...')

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: TARGET_EMAIL,
            password: NEW_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: 'Ali Anil Alan'
            }
        })

        if (createError) {
            console.error('❌ Error creating user:', createError)
            return
        }

        console.log('✅ User created:', newUser.user.id)
    } else {
        console.log('✅ User found:', user.id)
        console.log('Updating password...')

        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            {
                password: NEW_PASSWORD,
                email_confirm: true
            }
        )

        if (updateError) {
            console.error('❌ Error updating password:', updateError)
            return
        }

        console.log('✅ Password updated successfully!')
    }

    console.log('\n📧 Email:', TARGET_EMAIL)
    console.log('🔑 Password:', NEW_PASSWORD)
}

resetPassword()
    .then(() => {
        console.log('\n✅ Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error)
        process.exit(1)
    })
