# Academy360

Academy360 is a role-based management and player development tracking platform built for football academies.
It brings planning, tracking, performance measurement, and operations into one application for
athletes, coaches, parents, club admins, and super admins.

## Key Features

- Role-based dashboard architecture (`athlete`, `coach`, `parent`, `club_admin`, `super_admin`)
- Coach workflows for weekly planning, sessions, program assignment, and player management
- Athlete workflows for daily plan, programs, exercises, and progress visibility
- Parent workflows for child progress and reporting
- Club management workflows for members, groups, payments, and notifications
- Supabase-powered authentication and data layer

## Cross-Panel Data Flow

To see how coach actions propagate to athlete/parent views:

- `/Users/alianilalan/Desktop/academy360/docs/paneller-arasi-baglanti.md`

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Zod (request validation)

## Project Structure

```text
academy360/
|- src/
|  |- app/                 # App Router pages and API routes
|  |- components/          # UI and dashboard components
|  |- contexts/            # Role/context management
|  `- lib/                 # Supabase, types, services, helpers
|- supabase/
|  |- migrations/          # SQL migration files
|  |- seed.sql             # Seed data
|  `- config.toml          # Supabase CLI config
|- scripts/                # Seed and helper scripts
`- docs/                   # Project documentation
```

## Requirements

- Node.js 20+
- npm 10+
- (Optional) Supabase CLI

## Setup

1. Clone the repository and enter the directory:

```bash
git clone <repo-url>
cd academy360
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Start the development server:

```bash
npm run dev
```

The app runs by default at `http://localhost:3000`.

## Available Scripts

- `npm run dev`: start development server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint
- `npm run seed:auth`: create test auth users
- `npm run seed:data`: run seed SQL
- `npm run seed`: run both auth + data seeds

## Sample Test Accounts

Default sample accounts used in seed flow:

- Super Admin: `superadmin@academy360.com`
- Club Admin: `admin@yildizakademi.com`
- Coach: `mehmet.demir@yildizakademi.com`
- Athlete: `enes.yildirim@email.com`
- Parent: `hakan.yildirim@email.com`
- Password: `Test1234!`

## Development Notes

- Role-based navigation and access control are managed at dashboard level.
- API validation is handled with Zod schemas.
- Supabase migration/seed flow keeps the data model synchronized.

## Contribution

1. Create a branch (`codex/<short-description>`)
2. Make your changes
3. Run `npm run lint` and ideally `npm run build`
4. Open a PR
