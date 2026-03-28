'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
  label?: string;
}

export function ExportButton({ onClick, label = 'Exportar CSV' }: ExportButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground hover:text-acai"
    >
      <Download className="h-3.5 w-3.5 mr-1" />
      {label}
    </Button>
  );
}
