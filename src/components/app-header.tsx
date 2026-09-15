'use client';

import { useStore } from '@/lib/store';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function AppHeader({ title, subtitle, onBack, rightAction }: Props) {
  const config = useStore((s) => s.config);
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors animate-button-pop"
            aria-label="Volver"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {!onBack && (
          <img src={config.logo} alt="LOS COMPAS" className="w-9 h-9 rounded-full" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-cartoon text-base leading-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {rightAction}
      </div>
    </header>
  );
}
