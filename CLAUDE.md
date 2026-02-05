# Academy360 - Project Guide

## Overview
Academy360 is a multi-tenant football/soccer player development platform for ages 8-18. Built with Next.js 16 (App Router), Supabase (PostgreSQL + Auth), TailwindCSS, and deployed on Vercel.

## Tech Stack
- **Framework**: Next.js 16.1.6 with App Router & Turbopack
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Auth**: Supabase Auth with OTP email verification
- **Styling**: TailwindCSS + custom UI components (shadcn-inspired)
- **Validation**: Zod for all API request/response validation
- **Language**: TypeScript (strict mode)
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
    api/              # API routes (Next.js Route Handlers)
      auth/           # login, register, logout, verify-otp, me, select-role
      athletes/       # CRUD + stats, achievements, goals
      programs/       # Training programs CRUD
      assignments/    # Program assignments
      training-logs/  # Training log entries
      performance/    # Performance measurements
      metrics/        # Metric definitions
      sessions/       # Training sessions + attendance
      groups/         # Group management + members
      organizations/  # Dashboard, members
      fees/           # plans/, payments/ (manual payment system)
      notifications/  # Notification CRUD + mark as read
    auth/             # Auth pages (login, register, verify-otp, select-role)
    (dashboard)/      # Dashboard pages (athlete, coach, admin)
  components/
    ui/               # Reusable UI components (button, input, card, etc.)
    dashboard/        # Dashboard layout components (sidebar, header)
  lib/
    supabase/         # Supabase clients (client.ts, server.ts, middleware.ts)
    auth/             # Auth helpers (requireAuth, isAdmin, isCoach, etc.)
    types/            # TypeScript types (database.ts, index.ts)
    adapters/         # Email adapter (Resend/Console), Content adapter
    services/         # Notification service
    utils.ts          # cn() utility + re-exports from utils/index.ts
    utils/index.ts    # Utility functions (formatDate, getInitials, etc.)
  middleware.ts       # Next.js middleware for auth protection
supabase/
  migrations/         # Database migrations
  config.toml         # Supabase local config
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

## Payment System
Manual/offline payment tracking only. No online payment gateway. Admins record payments manually.

## Build & Dev Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx supabase db push # Push migrations to remote
npx supabase gen types typescript --project-id gfbjixcuknuucoobtvor > src/lib/types/database.ts  # Regenerate types
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
