const VARIANTS = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  danger: 'btn--danger',
  info: 'btn--info',
  warning: 'btn--warning',
};

export default function DuolingoButton({
  children,
  variant = 'primary',
  size,
  className = '',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = size === 'small' ? 'btn--small' : '';
  return (
    <button className={`btn ${variantClass} ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
