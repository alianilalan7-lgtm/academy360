import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Forgot Password Schema
 * Validates email for password reset request
 */
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gereklidir')
    .email('Gecerli bir e-posta adresi girin'),
})

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email to the user
 * Always returns success to prevent email enumeration attacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = forgotPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Gecerli bir e-posta adresi girin',
          details: errors,
        },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/forgot-password/reset`,
    })

    if (error) {
      console.error('Password reset error:', error)
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      data: null,
      error: null,
    })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Gecersiz istek formati',
        },
        { status: 400 }
      )
    }

    console.error('Forgot password error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Beklenmeyen bir hata olustu',
      },
      { status: 500 }
    )
  }
}
