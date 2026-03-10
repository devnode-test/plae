'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Target,
  Crosshair,
  BarChart,
  User,
  LogOut,
  FileText
} from 'lucide-react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  onNavigate?: () => void;
  userRole?: 'admin' | 'responsable' | null;
}

export function Sidebar({ className, onNavigate, userRole = null }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      router.push('/login');
      router.refresh();
      onNavigate?.();
    }
  };

  const sharedRoutes = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname.startsWith('/dashboard'),
    },
  ];

  const adminRoutes = [
    {
      href: '/admin/ejes',
      label: 'Gestión Ejes',
      icon: Layers,
      active: pathname.startsWith('/admin/ejes'),
    },
    {
      href: '/admin/focos',
      label: 'Gestión Focos',
      icon: Crosshair,
      active: pathname.startsWith('/admin/focos'),
    },
    {
      href: '/admin/objetivos',
      label: 'Gestión Objetivos',
      icon: Target,
      active: pathname.startsWith('/admin/objetivos'),
    },
    {
      href: '/admin/indicadores',
      label: 'Gestión Indicadores',
      icon: BarChart,
      active: pathname.startsWith('/admin/indicadores'),
    },
    {
      href: '/admin/responsables',
      label: 'Gestión Líderes',
      icon: User,
      active: pathname.startsWith('/admin/responsables'),
    },
  ];

  const responsibleRoutes = [
    {
      href: '/responsable/objetivos',
      label: 'Mis Objetivos',
      icon: FileText,
      active: pathname.startsWith('/responsable/objetivos'),
    },
  ];

  return (
    <div className={cn('pb-12 min-h-screen border-r bg-background', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary">
            Plan Estratégico
          </h2>
          <div className="mb-4 px-4">
            <Image
              src="/logo_sgc_90.png"
              alt="Logo Saint George's College"
              width={180}
              height={90}
              className="h-auto w-36 md:w-40"
              priority
            />
          </div>
          <div className="space-y-1">
            {sharedRoutes.map((route) => (
              <Button
                key={route.href}
                variant={route.active ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                asChild
              >
                <Link href={route.href} onClick={onNavigate}>
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        {userRole === 'admin' ? (
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h3 className="mb-1 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administración
              </h3>
              {adminRoutes.map((route) => (
                <Button
                  key={route.href}
                  variant={route.active ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={route.href} onClick={onNavigate}>
                    <route.icon className="mr-2 h-4 w-4" />
                    {route.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {userRole === 'responsable' || userRole === 'admin' ? (
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h3 className="mb-1 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Responsable
              </h3>
              {responsibleRoutes.map((route) => (
                <Button
                  key={route.href}
                  variant={route.active ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={route.href} onClick={onNavigate}>
                    <route.icon className="mr-2 h-4 w-4" />
                    {route.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {userRole === null ? (
          <div className="px-3 py-2">
            <div className="space-y-2 px-4">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-9 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : null}
      </div>
      
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-muted-foreground hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );
}
