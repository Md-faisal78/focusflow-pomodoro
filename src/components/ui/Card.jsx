import React from 'react';
import clsx from 'clsx';

export default function Card({ className, children, ...rest }) {
  return (
    <div className={clsx('card', className)} {...rest}>
      {children}
    </div>
  );
}
