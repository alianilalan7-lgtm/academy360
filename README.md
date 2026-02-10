# Academy360

Academy360, futbol akademileri icin gelistirilmis rol tabanli bir yonetim ve gelisim takip platformudur.
Sporcu, antrenor, veli, kulup yoneticisi ve super admin kullanici tipleri icin tek bir uygulama icinde
planlama, takip, olcum ve operasyon akislarini bir araya getirir.

## One Cikan Ozellikler

- Rol bazli dashboard mimarisi (`athlete`, `coach`, `parent`, `club_admin`, `super_admin`)
- Antrenor tarafinda haftalik plan, seans, program atama ve oyuncu yonetimi
- Sporcu tarafinda gunluk plan, programlar, egzersiz ve gelisim gorunumu
- Veli tarafinda cocuk ilerleme ve rapor takibi
- Kulup yonetimi tarafinda uyeler, gruplar, odeme ve bildirim ekranlari
- Supabase tabanli auth + veri yonetimi

## Paneller Arasi Akis

Antrenor aksiyonlarinin sporcu/veli gorunumune nasil yansidigini gormek icin:

- `/Users/alianilalan/Desktop/academy360/docs/paneller-arasi-baglanti.md`

## Teknoloji Yigini

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Zod (request validation)

## Proje Yapisi

```text
academy360/
|- src/
|  |- app/                 # App Router sayfalari ve API route'lari
|  |- components/          # UI ve dashboard bilesenleri
|  |- contexts/            # Role/context yonetimi
|  `- lib/                 # Supabase, tipler, servisler, yardimcilar
|- supabase/
|  |- migrations/          # SQL migration dosyalari
|  |- seed.sql             # Seed verisi
|  `- config.toml          # Supabase CLI config
|- scripts/                # Seed ve yardimci komut script'leri
`- docs/                   # Proje dokumantasyonu
```

## Gereksinimler

- Node.js 20+
- npm 10+
- (Opsiyonel) Supabase CLI

## Kurulum

1. Depoyu klonla ve dizine gir:

```bash
git clone <repo-url>
cd academy360
```

2. Bagimliliklari yukle:

```bash
npm install
```

3. Ortam degiskenlerini ayarla (`.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Gelistirme sunucusunu baslat:

```bash
npm run dev
```

Uygulama varsayilan olarak `http://localhost:3000` adresinde acilir.

## Kullanilan Scriptler

- `npm run dev`: gelistirme sunucusu
- `npm run build`: production build
- `npm run start`: production sunucusu
- `npm run lint`: ESLint kontrolu
- `npm run seed:auth`: test auth kullanicilarini olusturur
- `npm run seed:data`: seed SQL calistirir
- `npm run seed`: auth + data seed islemlerini birlikte calistirir

## Ornek Test Hesaplari

Varsayilan seed akisinda kullanilan ornek hesaplar:

- Super Admin: `superadmin@academy360.com`
- Kulup Admin: `admin@yildizakademi.com`
- Antrenor: `mehmet.demir@yildizakademi.com`
- Sporcu: `enes.yildirim@email.com`
- Veli: `hakan.yildirim@email.com`
- Sifre: `Test1234!`

## Gelistirme Notlari

- Rol bazli menu ve erisim kontrolu dashboard seviyesinde yonetilir.
- API katmaninda validasyon icin Zod semalari kullanilir.
- Supabase migration/seed akisi ile veri modeli senkron tutulur.

## Katki

1. Yeni branch ac (`codex/<kisa-aciklama>`)
2. Degisiklikleri yap
3. `npm run lint` ve mumkunse `npm run build` calistir
4. PR ac
