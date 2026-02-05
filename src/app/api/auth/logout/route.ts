import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * Signs out the current user and invalidates their session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current session to verify user is logged in
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'No active session found',
        },
        { status: 401 }
      )
    }

    // Sign out the user
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully logged out',
      },
      error: null,
    })
  } catch (err) {
    console.error('Logout error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'An unexpected error occurred during logout',
      },
      { status: 500 }
    )
  }
}
