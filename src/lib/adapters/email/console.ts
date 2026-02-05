import type { EmailAdapter, EmailOptions } from './index'

/**
 * Console email adapter for development/testing
 * Logs emails to console instead of sending them
 */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('='.repeat(60))
    console.log('📧 EMAIL (Console Adapter - Development Mode)')
    console.log('='.repeat(60))
    console.log(`To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
    console.log(`From: ${options.from || process.env.EMAIL_FROM || 'noreply@academy360.com'}`)
    console.log(`Subject: ${options.subject}`)
    console.log('-'.repeat(60))
    console.log('HTML Content:')
    console.log(options.html)
    console.log('-'.repeat(60))
    if (options.text) {
      console.log('Text Content:')
      console.log(options.text)
    }
    console.log('='.repeat(60))

    return { success: true, messageId: `console-${Date.now()}` }
  }
}
