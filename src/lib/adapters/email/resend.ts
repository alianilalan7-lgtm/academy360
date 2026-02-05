import type { EmailAdapter, EmailOptions } from './index'

export class ResendAdapter implements EmailAdapter {
  private apiKey: string
  private fromEmail: string

  constructor() {
    this.apiKey = process.env.EMAIL_API_KEY || ''
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@academy360.com'
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.warn('Email API key not configured, skipping email send')
      return { success: false, error: 'Email not configured' }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: options.from || this.fromEmail,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Resend API error:', error)
        return { success: false, error }
      }

      const data = await response.json()
      return { success: true, messageId: data.id }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: String(error) }
    }
  }
}
