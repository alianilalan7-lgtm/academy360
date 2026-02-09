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
const TARGET_USER_ID = '383ed494-46dc-4753-93c1-f9006d4ca91b'

async function makeAdmin() {
    console.log('🔍 Checking memberships for:', TARGET_EMAIL)

    // Check existing memberships
    const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select('*, organizations(name)')
        .eq('user_id', TARGET_USER_ID)

    if (membershipError) {
        console.error('❌ Error fetching memberships:', membershipError)
        return
    }

    console.log('📋 Current memberships:', memberships?.length || 0)
    memberships?.forEach(m => {
        console.log(`   - ${(m.organizations as any)?.name}: ${m.role} (${m.status})`)
    })

    if (!memberships || memberships.length === 0) {
        console.log('\n⚠️ No memberships found. Creating admin membership...')

        // Get the first organization
        const { data: orgs } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(1)
            .single()

        if (!orgs) {
            console.error('❌ No organizations found')
            return
        }

        // Create admin membership
        const { error: insertError } = await supabase
            .from('memberships')
            .insert({
                user_id: TARGET_USER_ID,
                organization_id: orgs.id,
                role: 'club_admin',
                status: 'active'
            })

        if (insertError) {
            console.error('❌ Error creating membership:', insertError)
            return
        }

        console.log(`✅ Created admin membership for org: ${orgs.name}`)
    } else {
        // Update existing membership to admin
        const { error: updateError } = await supabase
            .from('memberships')
            .update({ role: 'club_admin', status: 'active' })
            .eq('user_id', TARGET_USER_ID)

        if (updateError) {
            console.error('❌ Error updating membership:', updateError)
            return
        }

        console.log('✅ Updated to club_admin role!')
    }

    // Also check for super_admin - create if needed
    const { data: superAdminCheck } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', TARGET_USER_ID)
        .eq('role', 'super_admin')
        .single()

    if (!superAdminCheck) {
        console.log('\n🔑 Adding super_admin role...')

        const { data: firstOrg } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single()

        if (firstOrg) {
            const { error: superError } = await supabase
                .from('memberships')
                .upsert({
                    user_id: TARGET_USER_ID,
                    organization_id: firstOrg.id,
                    role: 'super_admin',
                    status: 'active'
                }, { onConflict: 'user_id,organization_id' })

            if (!superError) {
                console.log('✅ Super admin role added!')
            }
        }
    }

    console.log('\n🎉 Done! User is now admin.')
    console.log('📧 Email:', TARGET_EMAIL)
}

makeAdmin()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error)
        process.exit(1)
    })
