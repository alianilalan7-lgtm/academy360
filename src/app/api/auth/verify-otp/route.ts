import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * OTP Verification Schema
 * Supports both email OTP and phone OTP verification
 */
const verifyOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  token: z
    .string()
    .min(6, 'OTP must be at least 6 characters')
    .max(10, 'OTP must be less than 10 characters'),
  type: z
    .enum(['signup', 'recovery', 'invite', 'magiclink', 'email_change', 'sms', 'phone_change'])
    .default('signup'),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
)

// Email OTP types
type EmailOtpType = 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change'

// Phone/SMS OTP types
type PhoneOtpType = 'sms' | 'phone_change'

/**
 * POST /api/auth/verify-otp
 * Verifies OTP code for email/phone verification or magic link
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = verifyOtpSchema.safeParse(body)

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

    const { email, phone, token, type } = validationResult.data

    const supabase = await createClient()

    // Verify OTP based on whether email or phone is provided
    let verifyResult

    if (email) {
      // Email OTP verification
      const emailOtpTypes: EmailOtpType[] = ['signup', 'recovery', 'invite', 'magiclink', 'email_change']
      const otpType = emailOtpTypes.includes(type as EmailOtpType) ? type as EmailOtpType : 'signup'

      verifyResult = await supabase.auth.verifyOtp({
        email,
        token,
        type: otpType,
      })
    } else if (phone) {
      // Phone/SMS OTP verification
      const phoneOtpTypes: PhoneOtpType[] = ['sms', 'phone_change']
      const otpType = phoneOtpTypes.includes(type as PhoneOtpType) ? type as PhoneOtpType : 'sms'

      verifyResult = await supabase.auth.verifyOtp({
        phone,
        token,
        type: otpType,
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

    const { data, error } = verifyResult

    if (error) {
      const statusCode = 400
      let errorMessage = error.message

      if (error.message.includes('expired')) {
        errorMessage = 'OTP has expired. Please request a new one'
      } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        errorMessage = 'Invalid OTP code'
      } else if (error.message.includes('used')) {
        errorMessage = 'OTP has already been used'
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

    // For signup type, update email_confirmed status in user_profiles if needed
    if (type === 'signup' && data.user) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Error updating user profile after OTP verification:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone,
          emailConfirmedAt: data.user.email_confirmed_at,
          phoneConfirmedAt: data.user.phone_confirmed_at,
        } : null,
        session: data.session ? {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          expiresIn: data.session.expires_in,
        } : null,
        message: 'OTP verified successfully',
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
    console.error('OTP verification error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'An unexpected error occurred during OTP verification',
      },
      { status: 500 }
    )
  }
}
