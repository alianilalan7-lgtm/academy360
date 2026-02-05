import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Reset Password Schema
 * Validates new password for password reset
 */
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Sifre en az 8 karakter olmalidir'),
})

/**
 * POST /api/auth/reset-password
 * Updates the user's password after they click the reset link
 * The user is already authenticated via the reset token in the callback URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = resetPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Sifre en az 8 karakter olmalidir',
          details: errors,
        },
        { status: 400 }
      )
    }

    const { password } = validationResult.data

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('Password update error:', error)

      let errorMessage = 'Sifre guncellenirken bir hata olustu'

      if (error.message.includes('same password')) {
        errorMessage = 'Yeni sifreniz eski sifrenizden farkli olmalidir'
      } else if (error.message.includes('session')) {
        errorMessage = 'Sifre sifirlama baglantinizin suresi dolmus. Lutfen tekrar deneyin.'
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: errorMessage,
        },
        { status: 400 }
      )
    }

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

    console.error('Reset password error:', err)
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
