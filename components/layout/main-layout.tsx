 'use client';

import Link from 'next/link';
import { Sidebar } from './sidebar';
import { Button } from '@/components/ui/button';
import { Menu, User } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin' | 'responsable' | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const roleFromMeta = user.user_metadata?.rol;
      if ((roleFromMeta === 'admin' || roleFromMeta === 'responsable') && active) {
        setRole(roleFromMeta);
      }

      const { data: profile } = await supabase
        .from('usuarios')
        .select('nombre,rol')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      const resolvedName = profile?.nombre?.trim() || user.email || '';
      setDisplayName(resolvedName);
      if (profile?.rol === 'admin' || profile?.rol === 'responsable') {
        setRole(profile.rol);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile Sidebar */}
      <div className="md:hidden border-b p-4 flex items-center justify-between bg-background sticky top-0 z-10">
        <div className="min-w-0">
          <h1 className="font-bold text-base text-primary truncate sm:text-lg">Plan Estratégico</h1>
          <p className="text-xs text-muted-foreground truncate">Saint George&apos;s College</p>
        </div>
        <div className="flex items-center gap-2">
          {displayName ? (
            <div className="inline-flex max-w-[42vw] items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{displayName}</span>
            </div>
          ) : null}
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar userRole={role} onNavigate={() => setIsMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto border-r">
        <Sidebar userRole={role} />
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col bg-stone-50/50">
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
        <footer className="border-t bg-background px-4 py-3 md:px-8">
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
      </main>
    </div>
  );
}
