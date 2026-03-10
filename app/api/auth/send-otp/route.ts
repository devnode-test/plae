
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email ?? '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no registrado. Contacte al administrador.' }, { status: 404 });
    }

    const { data: existingOtp } = await supabaseAdmin
      .from('otp_codes')
      .select('code,expires_at,created_at,used')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingOtp?.created_at) {
      const elapsed = Date.now() - new Date(existingOtp.created_at).getTime();
      if (elapsed < 60 * 1000) {
        return NextResponse.json({ error: 'Espera un minuto antes de solicitar un nuevo código.' }, { status: 429 });
      }
    }

    const hasReusableOtp =
      Boolean(existingOtp?.code) &&
      existingOtp?.used === false &&
      new Date(existingOtp.expires_at) > new Date();

    const otp = hasReusableOtp ? String(existingOtp?.code) : generateOTP();

    if (!hasReusableOtp) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: otpError } = await supabaseAdmin
        .from('otp_codes')
        .upsert(
          {
            email: normalizedEmail,
            code: otp,
            expires_at: expiresAt.toISOString(),
            used: false,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );

      if (otpError) {
        console.error('Error saving OTP:', otpError);
        return NextResponse.json({ error: 'Error interno al generar código' }, { status: 500 });
      }
    }

    if (resend) {
        const { error: emailError } = await resend.emails.send({
            from: 'Plan Estratégico <sistema@alexanardi.com>',
            to: [normalizedEmail],
            subject: 'Tu código de acceso al PLAE',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Código de Acceso</h2>
                    <p style="color: #334155;">Hola ${user.nombre},</p>
                    <p style="color: #334155;">Usa el siguiente código de 6 dígitos para ingresar al Sistema de Plan Estratégico:</p>
                    <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
                        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #0f172a; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">Este código expira en 10 minutos. Si no lo solicitaste, puedes ignorar este correo.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">Sistema de Gestión PLAE</p>
                </div>
            `
        });

        if (emailError) {
            console.error('Resend error:', emailError);
            return NextResponse.json({ error: 'Error al enviar correo' }, { status: 500 });
        }
    } else {
        console.log(`[DEV MODE] OTP for ${normalizedEmail}: ${otp}`);
    }

    return NextResponse.json({ success: true, message: 'Código enviado' });

  } catch (error: unknown) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
