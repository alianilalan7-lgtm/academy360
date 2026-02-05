import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Registration Schema
 * Validates user registration data
 */
const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  locale: z
    .string()
    .min(2)
    .max(10)
    .default('tr'),
  timezone: z
    .string()
    .default('Europe/Istanbul'),
  kvkkConsent: z
    .boolean()
    .refine((val) => val === true, 'KVKK consent is required'),
})

/**
 * POST /api/auth/register
 * Registers a new user with email and password
 * Creates auth user and user profile
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = registerSchema.safeParse(body)

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

    const {
      email,
      password,
      fullName,
      phone,
      locale,
      timezone,
      kvkkConsent,
    } = validationResult.data

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if user already exists
    const { data: existingUser } = await serviceClient
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'An account with this email already exists',
        },
        { status: 409 }
      )
    }

    // Create auth user with admin API (auto-confirmed, no OTP needed)
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone,
      },
    })

    if (error) {
      let statusCode = 400
      let errorMessage = error.message

      if (error.message.includes('already registered')) {
        statusCode = 409
        errorMessage = 'An account with this email already exists'
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password does not meet security requirements'
      } else if (error.message.includes('rate limit')) {
        statusCode = 429
        errorMessage = 'Too many registration attempts. Please try again later'
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

    if (!data.user) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Failed to create user account',
        },
        { status: 500 }
      )
    }

    // Create user profile in the database
    // Note: This may also be handled by a database trigger on auth.users
    const { error: profileError } = await serviceClient
      .from('user_profiles')
      .upsert({
        id: data.user.id,
        email: email,
        full_name: fullName || null,
        phone: phone || null,
        locale: locale,
        timezone: timezone,
        kvkk_consent: kvkkConsent,
        kvkk_consent_date: new Date().toISOString(),
        onboarding_completed: false,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Don't fail the registration, profile might be created by trigger
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmedAt: data.user.email_confirmed_at,
          createdAt: data.user.created_at,
        },
        needsEmailConfirmation: false,
        message: 'Kayit basarili. Giris yapabilirsiniz.',
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
    console.error('Registration error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'An unexpected error occurred during registration',
      },
      { status: 500 }
    )
  }
}
