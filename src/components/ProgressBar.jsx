export default function ProgressBar({ progress, color = 'var(--color-primary)', height = 10 }) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{
        height: `${height}px`,
        background: 'var(--swan)',
      }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(progress * 100, 100)}%`,
          background: color,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}
