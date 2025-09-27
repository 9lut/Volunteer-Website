'use client';

import React from 'react';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({ 
  loading, 
  loadingText, 
  disabled, 
  children, 
  className,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button 
      disabled={loading || disabled} 
      className={cn(className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? (loadingText || 'กำลังดำเนินการ...') : children}
    </Button>
  );
}
