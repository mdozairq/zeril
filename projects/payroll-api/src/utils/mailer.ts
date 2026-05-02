export type SendEmailInput = {
  to: string
  subject: string
  html: string
}

export async function sendEmailSandbox(input: SendEmailInput) {
  // Sandbox implementation: print to console. (Real SMTP can be added via nodemailer later.)
  // Intentionally not throwing to keep invite creation reliable in dev.
  // eslint-disable-next-line no-console
  console.log('[mail:sandbox]', { to: input.to, subject: input.subject })
  // eslint-disable-next-line no-console
  console.log(input.html)
}

export function renderInviteEmail(opts: { companyName: string; inviteCode: string; expiresAtIso: string }) {
  const { companyName, inviteCode, expiresAtIso } = opts
  return `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4;">
    <h2>You have been invited to ${companyName}</h2>
    <p>Use the invitation code below to complete onboarding:</p>
    <pre style="padding:12px;border:1px solid #ddd;border-radius:8px;background:#fafafa;font-size:14px;">${inviteCode}</pre>
    <p style="color:#666;font-size:12px;">Expires: ${expiresAtIso}</p>
  </div>
  `.trim()
}

