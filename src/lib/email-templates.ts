interface OtpTemplateParams {
  code: string
  variant: 'login' | 'signup'
}

export function buildOtpEmail({ code, variant }: OtpTemplateParams) {
  const isSignup = variant === 'signup'
  const title = isSignup ? 'Добро пожаловать!' : 'С возвращением!'
  const subtitle = isSignup ? 'Остался один шаг до начала обучения' : 'Продолжайте свой путь к знаниям'
  const boxLabel = isSignup ? 'Код подтверждения' : 'Код авторизации'
  const heading = isSignup ? 'Завершите регистрацию' : 'Ваш код для входа'
  const info = isSignup
    ? 'Введите этот код в приложении, чтобы завершить создание аккаунта:'
    : 'Введите этот код для входа в ваш аккаунт:'
  const warning = isSignup
    ? 'Код действует 10 минут. Никому его не сообщайте.'
    : 'Код действует 10 минут. Если это были не вы — просто проигнорируйте письмо.'

  const plain = [
    isSignup ? 'Добро пожаловать в Изучатор!' : 'Ваш код входа в Изучатор',
    '',
    `Код: ${code}`,
    '',
    warning,
    '',
    'Изучатор • izuchator.ru'
  ].join('\n')

  const preheader = isSignup ? 'Завершите регистрацию в Изучаторе' : 'Ваш одноразовый код входа'

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charSet="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${heading}</title>
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>@media (prefers-color-scheme:dark){body{background:#0f1115!important}}</style>
</head><body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:0;line-height:0;">${preheader}</div>
<table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,.08),0 6px 12px -4px rgba(0,0,0,.05);">
      <tr><td style="padding:48px 40px;text-align:center;background:linear-gradient(135deg,${isSignup ? '#3b82f6,#8b5cf6,#06b6d4' : '#10b981,#06b6d4,#3b82f6'});color:#fff;">
        <div style="width:74px;height:74px;border-radius:20px;background:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <img src="https://izuchator.ru/logo.svg" width="40" height="40" alt="Изучатор" style="display:block" />
        </div>
        <h1 style="margin:0 0 12px;font-size:30px;font-weight:700;line-height:1.2;letter-spacing:.5px;">${title}</h1>
        <p style="margin:0;font-size:17px;line-height:1.5;color:rgba(255,255,255,.92);">${subtitle}</p>
      </td></tr>
      <tr><td style="padding:48px 40px;">
        <h2 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#1e293b;text-align:center;">${heading}</h2>
        <p style="margin:0 0 32px;font-size:16px;line-height:1.55;color:#475569;text-align:center;">${info}</p>
        <div style="background:#f1f5f9;border:2px solid #e2e8f0;border-radius:18px;padding:28px 24px;text-align:center;margin:28px 0 8px;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600;color:#64748b;">${boxLabel}</p>
          <div style="font-family:'SF Mono',Monaco,'Roboto Mono','Cascadia Code',Consolas,monospace;font-size:44px;font-weight:700;letter-spacing:10px;color:#1e293b;">${code}</div>
        </div>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;text-align:center;">${warning}</p>
        <p style="margin:40px 0 0;font-size:14px;line-height:1.55;color:#475569;text-align:center;">Если вы не запрашивали это письмо – просто удалите его.</p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:32px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:13px;color:#64748b;">С наилучшими пожеланиями,<br/><strong style="color:#1e293b;">Команда Изучатора</strong></p>
        <p style="margin:0;font-size:11px;color:#94a3b8;">Учи. Учись. Твори! 🚀<br/>© ${new Date().getFullYear()} Izuchator</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`

  return { html, text: plain, subject: isSignup ? 'Код подтверждения' : 'Код входа' }
}
