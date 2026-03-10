
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

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const normalizedCode = String(code ?? '').trim();

    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'Código inválido o no solicitado' }, { status: 400 });
    }

    if (otpRecord.code !== normalizedCode) {
       return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
    }

    if (otpRecord.used) {
        return NextResponse.json({ error: 'Este código ya fue utilizado' }, { status: 400 });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
        return NextResponse.json({ error: 'El código ha expirado' }, { status: 400 });
    }

    await supabaseAdmin
        .from('otp_codes')
        .update({ used: true })
        .eq('email', normalizedEmail);

    const getOrigin = () => {
      if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
      if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
      return new URL(request.url).origin;
    };

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: {
            redirectTo: `${getOrigin()}/auth/callback`
        }
    });

    if (linkError) {
        console.error('Error generating login link:', linkError);
        return NextResponse.json({ error: 'Error al generar sesión' }, { status: 500 });
    }

    const actionLink = new URL(linkData.properties.action_link);
    
    return NextResponse.json({ 
        success: true, 
        redirectUrl: actionLink.toString() 
    });

  } catch (error: unknown) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
