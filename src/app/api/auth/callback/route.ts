import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Supabase Auth Callback Handler
 * Handles OAuth callbacks and email confirmation links
 * Exchanges auth code for session and redirects user
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    const redirectUrl = new URL('/auth/error', requestUrl.origin)
    redirectUrl.searchParams.set('error', error)
    if (errorDescription) {
      redirectUrl.searchParams.set('message', errorDescription)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // Exchange code for session
  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError.message)
        const redirectUrl = new URL('/auth/error', requestUrl.origin)
        redirectUrl.searchParams.set('error', 'exchange_failed')
        redirectUrl.searchParams.set('message', exchangeError.message)
        return NextResponse.redirect(redirectUrl)
      }

      // Successful authentication - redirect to intended destination
      const redirectUrl = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectUrl)
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      const redirectUrl = new URL('/auth/error', requestUrl.origin)
      redirectUrl.searchParams.set('error', 'unexpected_error')
      redirectUrl.searchParams.set('message', 'An unexpected error occurred during authentication')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // No code provided - redirect to login
  const redirectUrl = new URL('/auth/login', requestUrl.origin)
  redirectUrl.searchParams.set('error', 'no_code')
  redirectUrl.searchParams.set('message', 'No authorization code provided')
  return NextResponse.redirect(redirectUrl)
}
