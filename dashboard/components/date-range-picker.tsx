'use client';

import { useState } from 'react';
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

const today = () => new Date();
const yesterday = () => subDays(new Date(), 1);

const presets: { label: string; range: () => DateRange }[] = [
  { label: 'Hoje', range: () => ({ from: today(), to: today() }) },
  { label: 'Ontem', range: () => ({ from: yesterday(), to: yesterday() }) },
  { label: 'Últimos 7 dias', range: () => ({ from: subDays(today(), 6), to: today() }) },
  { label: 'Últimos 14 dias', range: () => ({ from: subDays(today(), 13), to: today() }) },
  { label: 'Últimos 30 dias', range: () => ({ from: subDays(today(), 29), to: today() }) },
  { label: 'Esta semana', range: () => ({ from: startOfWeek(today(), { weekStartsOn: 1 }), to: today() }) },
  { label: 'Este mês', range: () => ({ from: startOfMonth(today()), to: today() }) },
  {
    label: 'Mês passado',
    range: () => {
      const prev = subMonths(today(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
];

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const isSameDay =
    dateRange.from && dateRange.to &&
    format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd');

  const label = dateRange.from
    ? isSameDay
      ? format(dateRange.from, "dd 'de' MMM", { locale: ptBR })
      : `${format(dateRange.from, 'dd/MM', { locale: ptBR })} — ${dateRange.to ? format(dateRange.to, 'dd/MM', { locale: ptBR }) : '...'}`
    : 'Selecionar período';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg bg-muted/60 border-border hover:bg-muted/80 hover:border-border transition-all duration-200 text-xs font-medium cursor-pointer"
          />
        }
      >
        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-border shadow-2xl shadow-black/40" align="end">
        <div className="flex">
          <div className="border-r border-border p-2 space-y-0.5 min-w-[140px]">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs rounded-lg hover:bg-acai/10 hover:text-acai transition-colors duration-150 cursor-pointer"
                onClick={() => {
                  onDateRangeChange(preset.range());
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              if (range?.from) {
                onDateRangeChange({ from: range.from, to: range.to || range.from });
                if (range.to) setOpen(false);
              }
            }}
            numberOfMonths={1}
            locale={ptBR}
            disabled={{ after: today() }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
