'use client';

import { cn } from '@/lib/utils';

export type Channel = 'all' | 'pdv' | 'online';

interface ChannelToggleProps {
  value: Channel;
  onChange: (channel: Channel) => void;
}

const options: { value: Channel; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pdv', label: 'PDV' },
  { value: 'online', label: 'Online' },
];

export function ChannelToggle({ value, onChange }: ChannelToggleProps) {
  return (
    <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            'relative rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer',
            value === opt.value
              ? 'bg-acai/20 text-acai shadow-sm'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/60',
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
