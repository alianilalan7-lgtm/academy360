import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Resend OTP Schema
 * Supports resending OTP to email or phone
 */
const resendOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  type: z
    .enum(['signup', 'sms'])
    .default('signup'),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
)

/**
 * POST /api/auth/resend-otp
 * Resends OTP code to user's email or phone
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = resendOtpSchema.safeParse(body)

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

    const { email, phone, type } = validationResult.data

    const supabase = await createClient()

    // Get the origin for redirect URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL

    let resendResult

    if (email) {
      // Resend email OTP
      resendResult = await supabase.auth.resend({
        type: type as 'signup' | 'email_change',
        email,
        options: {
          emailRedirectTo: `${origin}/api/auth/callback`,
        },
      })
    } else if (phone) {
      // Resend SMS OTP
      resendResult = await supabase.auth.resend({
        type: 'sms',
        phone,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Either email or phone is required',
        },
        { status: 400 }
      )
    }

    const { error } = resendResult

    if (error) {
      let statusCode = 400
      let errorMessage = error.message

      if (error.message.includes('rate limit') || error.message.includes('Too many')) {
        statusCode = 429
        errorMessage = 'Too many requests. Please wait before requesting another code'
      } else if (error.message.includes('not found')) {
        statusCode = 404
        errorMessage = 'No account found with this email/phone'
      } else if (error.message.includes('already confirmed')) {
        statusCode = 400
        errorMessage = 'This account has already been verified'
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

    return NextResponse.json({
      success: true,
      data: {
        message: email
          ? 'Verification code sent to your email'
          : 'Verification code sent to your phone',
        destination: email || phone,
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
    console.error('Resend OTP error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'An unexpected error occurred while resending OTP',
      },
      { status: 500 }
    )
  }
}
