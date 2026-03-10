
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

// Use a secure way to create admin client.
// NOTE: You MUST add SUPABASE_SERVICE_ROLE_KEY to your .env.local file!
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Fallback for types, but will fail if empty
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function assertAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (usuario?.rol !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await assertAdmin()
    if (!adminCheck.ok) return adminCheck.response

    const { email, nombre, rol } = await request.json() // password not needed

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Server configuration error: Missing Service Role Key' }, { status: 500 })
    }

    // 1. Create Auth User without password (email confirmation triggers link, or we rely on OTP later)
    // For OTP flow, we just need the user to exist. We can create with a random password or just invite.
    // 'inviteUserByEmail' sends a magic link. 'createUser' allows setting attributes.
    // Let's use createUser with email_confirm: true so they can login immediately via OTP without clicking a link first if we want.
    // Actually, for OTP login (Magic Link / Code), the user just needs to exist.
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto confirm so they can use OTP immediately
      user_metadata: { full_name: nombre, rol: rol || 'responsable' }
    })

    if (authError) {
      console.error('Auth create error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
        return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 })
    }

    const profile = {
      id: authData.user.id,
      email: authData.user.email ?? email,
      nombre: nombre ?? authData.user.user_metadata?.full_name ?? 'Usuario Nuevo',
      rol: (rol || authData.user.user_metadata?.rol || 'responsable') as 'admin' | 'responsable',
    }

    const { error: profileError } = await supabaseAdmin
      .from('usuarios')
      .upsert(profile, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      return NextResponse.json(
        { error: 'Usuario creado en Auth, pero falló el perfil en la BD', details: profileError.message },
        { status: 500 }
      )
    }
    
    // We don't need to return password since we don't set one

    return NextResponse.json({ 
        success: true, 
        user: { 
            id: authData.user.id, 
            email: profile.email,
            nombre: profile.nombre,
            rol: profile.rol
        } 
    })

  } catch (error: unknown) {
    console.error('Server error:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Handle Delete User
export async function DELETE(request: Request) {
    try {
        const adminCheck = await assertAdmin()
        if (!adminCheck.ok) return adminCheck.response

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const email = searchParams.get('email')

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let userId = id

        if (!userId && email) {
            const { data: usuario } = await supabaseAdmin
                .from('usuarios')
                .select('id')
                .eq('email', email)
                .maybeSingle()

            if (usuario?.id) {
                userId = usuario.id
            } else {
                for (let page = 1; page <= 5; page++) {
                    const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                        page,
                        perPage: 1000,
                    })

                    if (listError) break

                    const match = listed.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
                    if (match?.id) {
                        userId = match.id
                        break
                    }

                    if (listed.users.length < 1000) break
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Usuario no se encuentra' }, { status: 404 })
        }

        const { count: objetivosCount } = await supabaseAdmin
            .from('objetivos')
            .select('id', { count: 'exact', head: true })
            .eq('responsable_id', userId)

        if ((objetivosCount ?? 0) > 0) {
            return NextResponse.json(
                {
                    error: 'No se puede eliminar: el usuario tiene objetivos asignados. Reasigna esos objetivos antes de eliminar.',
                },
                { status: 409 }
            )
        }

        const { error: profileDeleteError } = await supabaseAdmin
            .from('usuarios')
            .delete()
            .eq('id', userId)

        if (profileDeleteError) {
            return NextResponse.json({ error: profileDeleteError.message }, { status: 400 })
        }

        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        const authDeleted = !authDeleteError || authDeleteError.status === 404 || /not found/i.test(authDeleteError.message)

        if (authDeleteError && !authDeleted) {
            return NextResponse.json({ error: authDeleteError.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            deleted: {
                profile: true,
                auth: authDeleted,
            },
        })

    } catch (error: unknown) {
        console.error('Delete error:', error)
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
