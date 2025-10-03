import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <div className="relative">
        {/* Outer Ring */}
        <div className={cn(
          'border-2 border-primary/20 rounded-full animate-spin',
          sizeClasses[size]
        )}>
          <div className="absolute top-0 left-0 w-1 h-1 bg-primary rounded-full"></div>
        </div>
        
        {/* Inner Ring */}
        <div className={cn(
          'absolute top-0.5 left-0.5 border border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin-reverse',
          {
            'w-3 h-3': size === 'sm',
            'w-5 h-5': size === 'md',
            'w-7 h-7': size === 'lg', 
            'w-11 h-11': size === 'xl'
          }
        )}></div>
      </div>
      
      {text && (
        <span className={cn(
          'font-medium text-primary animate-pulse',
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;