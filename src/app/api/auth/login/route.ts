import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Login Schema
 * Validates email and password for authentication
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
})

/**
 * POST /api/auth/login
 * Authenticates user with email and password
 * Returns user data and session on success
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Create Supabase client and attempt sign in
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Handle specific Supabase auth errors
      let statusCode = 401
      let errorMessage = error.message

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (error.message.includes('Email not confirmed')) {
        statusCode = 403
        errorMessage = 'Please verify your email before logging in'
      } else if (error.message.includes('Too many requests')) {
        statusCode = 429
        errorMessage = 'Too many login attempts. Please try again later'
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: errorMessage,
        },
        { status: statusCode }
      )
    }

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    }

    // Fetch memberships separately to avoid FK ambiguity
    const { data: memberships } = await supabase
      .from('memberships')
      .select(`
        id,
        role,
        status,
        organization_id,
        organizations (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('user_id', data.user.id)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmedAt: data.user.email_confirmed_at,
          lastSignInAt: data.user.last_sign_in_at,
          createdAt: data.user.created_at,
        },
        profile: userProfile ? { ...userProfile, memberships: memberships || [] } : null,
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          expiresIn: data.session.expires_in,
        },
      },
      error: null,
    })
  } catch (err) {
    // Handle JSON parse errors
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      )
    }

    // Handle unexpected errors
    console.error('Login error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'An unexpected error occurred during login',
      },
      { status: 500 }
    )
  }
}
