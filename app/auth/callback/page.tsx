
'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      const redirectUser = async (userId: string) => {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', userId)
          .single();

        toast.success('Sesión iniciada correctamente');
        router.push('/dashboard');
      };

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Get session error:', error);
      }
      
      if (session) {
        await redirectUser(session.user.id);
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const hash = url.hash;

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
             console.error('Exchange error:', exchangeError);
             toast.error('Error al verificar código');
             router.push('/login');
        } else if (data.session) {
             await redirectUser(data.session.user.id);
        }
      } else {
        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
        const accessToken = url.searchParams.get('access_token') ?? hashParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token') ?? hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setError) {
            console.error('Set session error:', setError);
            toast.error('Error al iniciar sesión');
            router.push('/login');
            return;
          }

          window.history.replaceState({}, document.title, url.origin + url.pathname);

          const {
            data: { session: finalSession },
          } = await supabase.auth.getSession();

          if (finalSession) {
            await redirectUser(finalSession.user.id);
            return;
          }
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, sessionFromEvent) => {
          if (event === 'SIGNED_IN' && sessionFromEvent) {
            await redirectUser(sessionFromEvent.user.id);
          }
        });

        setTimeout(async () => {
          subscription.unsubscribe();
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();

          if (retrySession) {
            await redirectUser(retrySession.user.id);
            return;
          }

          toast.error('No se pudo iniciar sesión');
          router.push('/login');
        }, 4000);
      }
    };

    handleAuth();
  }, [router, supabase]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Verificando sesión...</p>
      </div>
    </div>
  );
}
