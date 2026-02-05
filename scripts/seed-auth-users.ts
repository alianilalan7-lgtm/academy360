/**
 * Supabase Auth kullanıcılarını oluşturan script
 *
 * Kullanım:
 * npx tsx scripts/seed-auth-users.ts
 *
 * Not: .env.local dosyasında SUPABASE_SERVICE_ROLE_KEY olmalı
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test kullanıcıları - seed.sql ile eşleşmeli
const users = [
  // Super Admin
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'superadmin@academy360.com',
    password: 'Test1234!',
    full_name: 'Sistem Yöneticisi',
  },
  // Club Admin
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'admin@yildizakademi.com',
    password: 'Test1234!',
    full_name: 'Ahmet Yılmaz',
  },
  // Coaches
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    email: 'mehmet.demir@yildizakademi.com',
    password: 'Test1234!',
    full_name: 'Mehmet Demir',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    email: 'ayse.kaya@yildizakademi.com',
    password: 'Test1234!',
    full_name: 'Ayşe Kaya',
  },
  // Athletes
  {
    id: 'b0000000-0000-0000-0000-000000000010',
    email: 'enes.yildirim@email.com',
    password: 'Test1234!',
    full_name: 'Enes Yıldırım',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000011',
    email: 'kerem.ozturk@email.com',
    password: 'Test1234!',
    full_name: 'Kerem Öztürk',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000012',
    email: 'ali.sahin@email.com',
    password: 'Test1234!',
    full_name: 'Ali Şahin',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000013',
    email: 'burak.celik@email.com',
    password: 'Test1234!',
    full_name: 'Burak Çelik',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000014',
    email: 'can.arslan@email.com',
    password: 'Test1234!',
    full_name: 'Can Arslan',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000015',
    email: 'deniz.kara@email.com',
    password: 'Test1234!',
    full_name: 'Deniz Kara',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000016',
    email: 'emre.polat@email.com',
    password: 'Test1234!',
    full_name: 'Emre Polat',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000017',
    email: 'furkan.korkmaz@email.com',
    password: 'Test1234!',
    full_name: 'Furkan Korkmaz',
  },
  // Parents
  {
    id: 'b0000000-0000-0000-0000-000000000020',
    email: 'hakan.yildirim@email.com',
    password: 'Test1234!',
    full_name: 'Hakan Yıldırım',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000021',
    email: 'fatma.ozturk@email.com',
    password: 'Test1234!',
    full_name: 'Fatma Öztürk',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000022',
    email: 'mustafa.sahin@email.com',
    password: 'Test1234!',
    full_name: 'Mustafa Şahin',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000023',
    email: 'zeynep.celik@email.com',
    password: 'Test1234!',
    full_name: 'Zeynep Çelik',
  },
]

async function seedAuthUsers() {
  console.log('🚀 Auth kullanıcıları oluşturuluyor...\n')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const user of users) {
    try {
      // Önce kullanıcı var mı kontrol et
      const { data: existingUser } = await supabase.auth.admin.getUserById(user.id)

      if (existingUser?.user) {
        console.log(`⏭️  ${user.email} zaten mevcut`)
        skipped++
        continue
      }

      // Kullanıcı oluştur
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true, // Email doğrulamasını atla
        user_metadata: {
          full_name: user.full_name,
        },
      })

      if (error) {
        // Eğer email zaten varsa, farklı ID ile kayıtlı olabilir
        if (error.message.includes('already been registered')) {
          console.log(`⚠️  ${user.email} farklı ID ile mevcut`)
          skipped++
        } else {
          console.error(`❌ ${user.email}: ${error.message}`)
          errors++
        }
      } else {
        console.log(`✅ ${user.email} oluşturuldu`)
        created++
      }
    } catch (err) {
      console.error(`❌ ${user.email}: ${err}`)
      errors++
    }
  }

  console.log('\n📊 Sonuç:')
  console.log(`   ✅ Oluşturulan: ${created}`)
  console.log(`   ⏭️  Atlanan: ${skipped}`)
  console.log(`   ❌ Hata: ${errors}`)
  console.log('\n🔑 Tüm kullanıcılar için şifre: Test1234!')
  console.log('\n📋 Test Hesapları:')
  console.log('   Super Admin: superadmin@academy360.com')
  console.log('   Kulüp Admin: admin@yildizakademi.com')
  console.log('   Antrenör:    mehmet.demir@yildizakademi.com')
  console.log('   Sporcu:      enes.yildirim@email.com')
  console.log('   Veli:        hakan.yildirim@email.com')
}

seedAuthUsers()
  .then(() => {
    console.log('\n✨ Tamamlandı!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Hata:', err)
    process.exit(1)
  })
