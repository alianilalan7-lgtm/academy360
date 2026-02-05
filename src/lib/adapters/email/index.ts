export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface EmailAdapter {
  send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Email template generator
export function generateEmailTemplate(
  template: 'welcome' | 'password_reset' | 'notification' | 'payment_reminder' | 'training_reminder',
  data: Record<string, string>
): EmailTemplate {
  switch (template) {
    case 'welcome':
      return {
        subject: `Academy360'a Hoş Geldiniz, ${data.name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10B981;">Academy360'a Hoş Geldiniz!</h1>
            <p>Merhaba ${data.name},</p>
            <p>Academy360 ailesine katıldığınız için teşekkür ederiz. Futbol yolculuğunuzda size eşlik etmekten mutluluk duyuyoruz.</p>
            <p>Hesabınıza giriş yaparak antrenmanlarınızı takip edebilir, performansınızı görüntüleyebilir ve hedeflerinize ulaşabilirsiniz.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Giriş Yap</a>
            <p style="margin-top: 24px; color: #666;">Başarılar dileriz,<br>Academy360 Ekibi</p>
          </div>
        `,
        text: `Academy360'a Hoş Geldiniz, ${data.name}!\n\nMerhaba ${data.name},\n\nAcademy360 ailesine katıldığınız için teşekkür ederiz.\n\nGiriş yapmak için: ${data.loginUrl}\n\nBaşarılar dileriz,\nAcademy360 Ekibi`,
      }

    case 'password_reset':
      return {
        subject: 'Academy360 Şifre Sıfırlama',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10B981;">Şifre Sıfırlama</h1>
            <p>Merhaba ${data.name},</p>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Şifremi Sıfırla</a>
            <p style="margin-top: 24px; color: #666;">Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.</p>
            <p style="color: #666;">Bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
          </div>
        `,
        text: `Şifre Sıfırlama\n\nMerhaba ${data.name},\n\nŞifrenizi sıfırlamak için: ${data.resetUrl}\n\nBu bağlantı 1 saat içinde geçerliliğini yitirecektir.`,
      }

    case 'notification':
      return {
        subject: data.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10B981;">${data.title}</h1>
            <p>Merhaba ${data.name},</p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              ${data.body}
            </div>
            <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Detayları Gör</a>
          </div>
        `,
        text: `${data.title}\n\nMerhaba ${data.name},\n\n${data.body}\n\nDetaylar için: ${data.actionUrl}`,
      }

    case 'payment_reminder':
      return {
        subject: `Ödeme Hatırlatması - ${data.dueDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F59E0B;">Ödeme Hatırlatması</h1>
            <p>Merhaba ${data.name},</p>
            <p>${data.athleteName} için ${data.dueDate} tarihinde ödenmesi gereken ${data.amount} TL tutarında aidat ödemesi bulunmaktadır.</p>
            <div style="background-color: #FEF3C7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #F59E0B;">
              <strong>Tutar:</strong> ${data.amount} TL<br>
              <strong>Son Ödeme Tarihi:</strong> ${data.dueDate}
            </div>
            <a href="${data.paymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Ödeme Detayları</a>
          </div>
        `,
        text: `Ödeme Hatırlatması\n\nMerhaba ${data.name},\n\n${data.athleteName} için ${data.dueDate} tarihinde ödenmesi gereken ${data.amount} TL tutarında aidat ödemesi bulunmaktadır.\n\nÖdeme detayları: ${data.paymentUrl}`,
      }

    case 'training_reminder':
      return {
        subject: `Antrenman Hatırlatması - ${data.date}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10B981;">Antrenman Hatırlatması</h1>
            <p>Merhaba ${data.name},</p>
            <p>Yarın saat ${data.time}'de ${data.location} lokasyonunda antrenmanınız var.</p>
            <div style="background-color: #ECFDF5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10B981;">
              <strong>Tarih:</strong> ${data.date}<br>
              <strong>Saat:</strong> ${data.time}<br>
              <strong>Lokasyon:</strong> ${data.location}<br>
              <strong>Antrenör:</strong> ${data.coach}
            </div>
          </div>
        `,
        text: `Antrenman Hatırlatması\n\nMerhaba ${data.name},\n\nYarın saat ${data.time}'de ${data.location} lokasyonunda antrenmanınız var.\n\nTarih: ${data.date}\nSaat: ${data.time}\nLokasyon: ${data.location}\nAntrenör: ${data.coach}`,
      }

    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}
