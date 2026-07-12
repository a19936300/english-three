export default function ProgressBar({ progress, color = '#58cc02', height = 8 }) {
  return (
    <div
      className="w-full rounded-full bg-gray-200 overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${Math.min(progress * 100, 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
