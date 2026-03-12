'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const handleSessionFromUrl = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/dashboard');
        return;
      }

      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        toast.error('Error al iniciar sesión');
        return;
      }

      window.history.replaceState({}, document.title, '/login');
      toast.success('Sesión iniciada correctamente');
      router.replace('/dashboard');
    };

    handleSessionFromUrl();
  }, [router, supabase]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar código');
      }

      toast.success('Código enviado a tu correo');
      setShowOtpInput(true);
    } catch (error: unknown) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Error al enviar código';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      if (data.redirectUrl) {
          toast.success('Código verificado. Iniciando sesión...');
          window.location.href = data.redirectUrl;
      } else {
          throw new Error('Error al iniciar sesión');
      }

    } catch (error: unknown) {
      console.error('Verify error:', error);
      const message = error instanceof Error ? error.message : 'Código inválido';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-100">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-center">
            <div className="px-2 py-1">
              <Image
                src="/logo_sgc_90.png"
                alt="Logo Saint George's College"
                width={196}
                height={98}
                className="h-auto w-[150px] drop-shadow-[0_8px_16px_rgba(15,23,42,0.16)] md:w-[196px]"
                priority
              />
            </div>
          </div>
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Plan Estratégico</CardTitle>
              <CardDescription className="text-center">
                {showOtpInput 
                  ? 'Ingresa el código enviado a tu correo' 
                  : 'Ingresa tu correo para recibir un código de acceso'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showOtpInput ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="usuario@saintgeorge.cl"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Código de Acceso
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Código de Verificación</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="otp" 
                        type="text" 
                        placeholder="123456"
                        className="pl-9 tracking-widest text-center text-lg"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      El código expira en 10 minutos.
                    </p>
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar e Ingresar
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    type="button" 
                    onClick={() => setShowOtpInput(false)}
                    disabled={isLoading}
                  >
                    Volver / Reenviar
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <footer className="border-t bg-background px-4 py-3">
        <div className="mx-auto max-w-7xl text-center text-xs text-muted-foreground sm:text-sm">
          Informática |{' '}
          <Link
            href="https://saintgeorge.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Saint George&apos;s College
          </Link>
        </div>
      </footer>
    </div>
  );
}
