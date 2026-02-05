# Academy360 - Project Guide

## Overview
Academy360 is a multi-tenant football/soccer player development platform for ages 8-18. Built with Next.js 16 (App Router), Supabase (PostgreSQL + Auth), TailwindCSS, and deployed on Vercel. Turkish UI with emerald (#10B981) theme.

## Tech Stack
- **Framework**: Next.js 16.1.6 with App Router & Turbopack
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Auth**: Supabase Auth with OTP email verification
- **Styling**: TailwindCSS 4 + custom UI components (shadcn-inspired)
- **Validation**: Zod for all API request/response validation
- **Language**: TypeScript (strict mode)
- **PWA**: Manual service worker (public/sw.js) + Next.js native manifest.ts
- **Deployment**: Vercel - https://academy360-one.vercel.app

## Supabase
- Project ref: `gfbjixcuknuucoobtvor`
- Region: eu-central-1
- Use `gen_random_uuid()` (NOT `uuid_generate_v4()`)
- RLS enabled on all tables with helper functions (is_org_member, is_org_admin, etc.)
- Seed data available: `supabase/seed.sql` or `scripts/run-seed-sql.ts`

## Project Structure (Unified Dashboard)
```
src/
  app/
    (auth)/                 # Auth pages (login, register, verify-otp, forgot-password)
    (dashboard)/            # Dashboard shell with RoleProvider
      dashboard/            # UNIFIED dashboard routes (all roles)
        _components/        # Role-specific dashboard contents
          admin-dashboard.tsx
          athlete-dashboard.tsx
          coach-dashboard.tsx
          parent-dashboard.tsx
          super-admin-dashboard.tsx
        achievements/       # Athlete achievements
        assignments/        # Coach: program assignments
        groups/             # Admin: group management
          [id]/             # Group detail + members
        measurements/       # Coach: athlete measurements + history
        members/            # Admin: member management
        notifications/      # Admin: send notifications
        organizations/      # Super Admin: all orgs
        payments/           # Admin/Parent: payment tracking
        players/            # Coach: athlete list
          [id]/             # Player detail + stats
        programs/           # Coach/Athlete: training programs
        progress/           # Athlete/Parent: progress tracking
        sessions/           # Coach/Athlete: training sessions
          [id]/             # Session detail + attendance
        settings/           # Super Admin: platform settings
        users/              # Super Admin: all users
        page.tsx            # Main dashboard (role-conditional)
      dashboard-shell-wrapper.tsx
      layout.tsx
    api/                    # 55+ API routes
      admin/                # Super admin APIs (stats, organizations, users, settings)
      auth/                 # login, register, logout, verify-otp, me, select-role, reset-password
      athletes/             # CRUD + stats, achievements, goals
      programs/             # Training programs CRUD
      assignments/          # Program assignments
      training-logs/        # Training log entries
      performance/          # Performance measurements
      metrics/              # Metric definitions
      sessions/             # Training sessions + attendance
      groups/               # Group management + members
      organizations/        # Dashboard, members
      fees/                 # plans/, payments/ (manual payment system)
      notifications/        # Notification CRUD + mark as read
    manifest.ts
  components/
    ui/                     # Reusable UI components
    dashboard/              # Sidebar, Header, RoleSwitcher, SidebarContext
    access-denied.tsx       # Role-based access denied component
    pwa/                    # ServiceWorkerRegister
  contexts/
    role-context.tsx        # RoleProvider for role switching
  lib/
    supabase/               # Supabase clients
    auth/                   # Auth helpers
    types/                  # TypeScript types
    adapters/               # Email, Content adapters
    services/               # Notification service
    utils.ts                # Utilities
  middleware.ts
public/
  sw.js                     # Service worker
  offline.html              # Offline fallback (Turkish)
  icons/                    # App icons
scripts/
  seed-auth-users.ts        # Create test users in Supabase Auth
  run-seed-sql.ts           # Seed database via REST API
supabase/
  migrations/               # Database migrations
  seed.sql                  # Seed data SQL
  config.toml
```

## Unified Dashboard Architecture
All roles share a single `/dashboard` URL namespace with role-based content:

```typescript
// Role switching via RoleContext
const { activeRole, switchRole, availableRoles } = useRole()

// Role-conditional rendering in pages
if (activeRole === 'coach') return <CoachContent />
if (activeRole === 'athlete') return <AthleteContent />
// etc.
```

**Features:**
- Header dropdown for switching between user's available roles
- Role persisted in cookie for page refresh
- Sidebar menu items change based on active role
- AccessDenied component for unauthorized access

## Roles
- `athlete` - Young players (8-18)
- `coach` - Trainers managing athletes
- `club_admin` - Organization administrators
- `parent` - Parents of athletes (linked via parent_athlete_relations)
- `super_admin` - Platform-wide administrators

## Key Patterns
- **API Response**: `{ success: boolean, data: T | null, error?: string | null }`
- **Paginated Response**: Adds `total, page, pageSize, totalPages` fields
- **Auth**: `requireAuth()` returns user with memberships and currentOrganizationId
- **Org Access**: Always verify user membership to the target organization
- **Zod Errors**: Use `.error.issues.map()` (NOT `.error.errors.map()`)
- **Type Casts**: Use `as any` for complex Supabase query results
- **Next.js 16 params**: `params` is `Promise<{ id: string }>` - must `await params`
- **Viewport**: Export `viewport` separately from `metadata` in layout.tsx
- **useSearchParams**: Requires `<Suspense>` boundary wrapper
- **Super Admin Check**: `user.memberships?.some(m => m.role === 'super_admin' && m.status === 'active')`

## PWA
- Manual service worker in `public/sw.js` - no third-party PWA library
- Cache strategies: API = network-only (auth cookies), static = cache-first, pages = network-first + offline fallback
- Push notification stubs ready in SW for future implementation
- Mobile responsive sidebar: CSS transform slide-in + overlay backdrop + React Context

## Payment System
Manual/offline payment tracking only. No online payment gateway. Admins record payments manually.

## Current Status (Feb 2025)
- Phase 0 (Infrastructure): Complete
- Phase 1 (API + Frontend): Complete - 55+ API routes, unified dashboard
- Unified Dashboard Migration: Complete - single /dashboard namespace
- Real Data Integration: Complete - Super Admin, Athletes, all dashboards
- PWA + Mobile: Complete
- Build: 0 errors

## Completed Detail Pages
- `/dashboard/players/[id]` - Player detail (profile, stats, achievements, measurements, quick actions)
- `/dashboard/sessions/[id]` - Session detail + bulk attendance recording (present/absent/late/excused)
- `/dashboard/groups/[id]` - Group detail + member management (add/remove athletes)
- `/dashboard/measurements` - Add measurement form + history tab with filters

## Known Missing Features
**Pages:**
- `/dashboard/programs/[id]` - Program detail page
- Program create/edit form for coaches

**Other:**
- Member role update (only invite/deactivate exists)
- Push notifications (SW stubs ready)
- File uploads (profile photos, documents)
- Reporting / PDF export
- E2E and unit tests

## Test Users (Seed Data)
Password for all: `Test1234!`

| Email | Role |
|-------|------|
| superadmin@test.com | super_admin |
| admin@test.com | club_admin |
| coach1@test.com, coach2@test.com | coach |
| athlete1-8@test.com | athlete |
| parent1-2@test.com | parent |

## Build & Dev Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx supabase db push # Push migrations to remote
npx supabase gen types typescript --project-id gfbjixcuknuucoobtvor > src/lib/types/database.ts

# Seed data
npx ts-node scripts/seed-auth-users.ts  # Create auth users
npx ts-node scripts/run-seed-sql.ts     # Seed database
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
