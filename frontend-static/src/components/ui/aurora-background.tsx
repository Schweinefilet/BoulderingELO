import React from 'react';
import { cn } from '@/lib/utils';

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  showRadialGradient?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <div className={cn('aurora-bg', className)} {...props}>
      <div className="aurora-layer" aria-hidden />
      {showRadialGradient && <div className="aurora-radial" aria-hidden />}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};
