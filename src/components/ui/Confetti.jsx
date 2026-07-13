import { useEffect, useState } from 'react';

const COLORS = [
  '#58cc02',
  '#1cb0f6',
  '#ff9600',
  '#ce82ff',
  '#ffc800',
  '#ff4b4b',
  '#89e219',
];

function makePieces(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.4 + Math.random() * 1.2,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));
}

export default function Confetti({ active, count = 40, durationMs = 3600 }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    setPieces(makePieces(count));
    const timer = setTimeout(() => setPieces([]), durationMs);
    return () => clearTimeout(timer);
  }, [active, count, durationMs]);

  if (!pieces.length) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
