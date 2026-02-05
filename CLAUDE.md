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

## Project Structure
```
src/
  app/
    (auth)/             # Auth pages (login, register, verify-otp, forgot-password)
    (dashboard)/        # Dashboard shell wrapper
      admin/            # Club admin pages (members, groups, payments, notifications)
      athlete/          # Athlete pages (programs, progress, achievements)
      coach/            # Coach pages (players, sessions, measurements, assignments)
      parent/           # Parent pages (progress, payments)
      super-admin/      # Super admin pages (organizations, users, settings)
    api/                # 50+ API routes (Route Handlers)
      auth/             # login, register, logout, verify-otp, me, select-role, reset-password
      athletes/         # CRUD + stats, achievements, goals
      programs/         # Training programs CRUD
      assignments/      # Program assignments
      training-logs/    # Training log entries
      performance/      # Performance measurements
      metrics/          # Metric definitions
      sessions/         # Training sessions + attendance
      groups/           # Group management + members
      organizations/    # Dashboard, members
      fees/             # plans/, payments/ (manual payment system)
      notifications/    # Notification CRUD + mark as read
    manifest.ts         # PWA manifest (Next.js native MetadataRoute.Manifest)
  components/
    ui/                 # Reusable UI components (button, input, card, skeleton, etc.)
    dashboard/          # Sidebar, Header, SidebarContext
    pwa/                # ServiceWorkerRegister client component
  lib/
    supabase/           # Supabase clients (client.ts, server.ts, middleware.ts)
    auth/               # Auth helpers (requireAuth, isAdmin, isCoach, etc.)
    types/              # TypeScript types (database.ts, index.ts)
    adapters/           # Email adapter (Resend/Console), Content adapter
    services/           # Notification service
    utils.ts            # cn() utility + re-exports from utils/index.ts
    utils/index.ts      # Utility functions (formatDate, getInitials, etc.)
  middleware.ts         # Next.js middleware for auth protection
public/
  sw.js                 # Service worker (cache-first static, network-first pages, network-only API)
  offline.html          # Offline fallback page (Turkish)
  icons/                # App icons (SVG + PNG 192/512 + apple-touch-icon)
supabase/
  migrations/           # Database migrations
  config.toml           # Supabase local config
```

## Roles
- `athlete` - Young players (8-18)
- `coach` - Trainers managing athletes
- `club_admin` - Organization administrators
- `parent` - Parents of athletes (can view payments if linked)
- `super_admin` - Platform-wide administrators

## Key Patterns
- **API Response**: `{ success: boolean, data: T | null, error?: string | null }`
- **Paginated Response**: Adds `total, page, pageSize, totalPages` fields
- **Auth**: `requireAuth()` returns user with memberships and currentOrganizationId
- **Org Access**: Always verify user membership to the target organization
- **Zod Errors**: Use `.error.issues.map()` (NOT `.error.errors.map()`)
- **Type Casts**: Use `as any` for complex Supabase query results where TypeScript inference fails
- **Next.js 16 params**: `params` is `Promise<{ id: string }>` - must `await params`
- **Viewport**: Export `viewport` separately from `metadata` in layout.tsx
- **useSearchParams**: Requires `<Suspense>` boundary wrapper

## PWA
- Manual service worker in `public/sw.js` - no third-party PWA library
- Cache strategies: API = network-only (auth cookies), static = cache-first, pages = network-first + offline fallback
- Push notification stubs ready in SW for future implementation
- Mobile responsive sidebar: CSS transform slide-in + overlay backdrop + React Context

## Payment System
Manual/offline payment tracking only. No online payment gateway. Admins record payments manually.

## Current Status (Feb 2025)
- Phase 0 (Infrastructure): Complete
- Phase 1 (API + Frontend): Complete - 72 routes, 30+ pages, all 5 roles
- PWA + Mobile: Complete
- Build: 0 errors

## Remaining Work
- Real data integration for dashboard stats (currently placeholder)
- Coach measurement/evaluation forms
- Push notifications (SW stubs ready)
- File uploads (profile photos, documents)
- Reporting / PDF export
- E2E and unit tests

## Build & Dev Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx supabase db push # Push migrations to remote
npx supabase gen types typescript --project-id gfbjixcuknuucoobtvor > src/lib/types/database.ts
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
