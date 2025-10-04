import { Resend } from 'resend';
import { HonoEnv } from '../custom-types';
import { AppError } from './errors';

export async function sendEmail(
  env: HonoEnv['Bindings'],
  to: string[],
  subject: string,
  body: string,
) {
  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: 'Work Support <onboarding@resend.dev>',
    to,
    subject,
    text: body,
  });
  if (error) throw new AppError(500, 'Failed to send Email', error);
}
