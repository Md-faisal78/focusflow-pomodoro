import React from 'react';
import clsx from 'clsx';

export default function ProgressRing({ progress, className, children, trackClass = '', barClass = '' }) {
  const p = Math.min(1, Math.max(0, progress));
  const r = 44; // viewBox units
  const c = 2 * Math.PI * r;
  return (
    <div className={clsx('relative', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="6"
          className={clsx('stroke-soft-hairline dark:stroke-night-hairline', trackClass)}
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={clsx(
            'stroke-accent transition-[stroke-dashoffset] duration-500 ease-linear',
            barClass
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
