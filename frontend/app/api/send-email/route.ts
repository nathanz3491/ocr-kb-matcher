export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { VerificationEmail } from '@/components/email/VerificationEmail';

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'KIP';
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[SendEmail] RESEND_API_KEY not set. Dev mode — logging:');
    const body = await request.json().catch(() => ({}));
    console.log('[SendEmail]', body);
    return NextResponse.json({ success: true, dev: true });
  }

  const { to, code, name } = await request.json();

  if (!to || !code) {
    return NextResponse.json({ error: 'Missing to or code' }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject: 'Verify your email — KIP',
    react: VerificationEmail({ code, name }),
  });

  if (error) {
    console.error('[SendEmail] Resend error:', error);
    return NextResponse.json({ error }, { status: 500 });
  }

  console.log(`[SendEmail] Verification email sent to ${to}`);
  return NextResponse.json({ success: true, data });
}
