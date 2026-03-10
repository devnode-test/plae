import Link from 'next/link';
import { BreadcrumbItem } from '@/lib/types';

interface BreadcrumbsBarProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbsBar({ items }: BreadcrumbsBarProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="overflow-x-auto whitespace-nowrap rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
      <Link href="/dashboard" className="text-primary hover:underline">
        Dashboard
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const href = item.level === 'meta' ? `/item/${item.level}/${item.id}` : `/drilldown/${item.level}/${item.id}`;

        return (
          <span key={item.id} className="inline-flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            {isLast ? (
              <span className="font-medium text-foreground">{item.nombre}</span>
            ) : (
              <Link href={href} className="text-primary hover:underline">
                {item.nombre}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
