import React from 'react';
import clsx from 'clsx';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({ variant = 'primary', className, type = 'button', ...rest }) {
  return <button type={type} className={clsx('btn', VARIANTS[variant] || VARIANTS.primary, className)} {...rest} />;
}
