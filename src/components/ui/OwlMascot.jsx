export default function OwlMascot({ size = 80, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="吉祥物猫头鹰"
      role="img"
    >
      {/* Feet */}
      <ellipse cx="38" cy="92" rx="6" ry="3" fill="var(--owl-feet)" />
      <ellipse cx="62" cy="92" rx="6" ry="3" fill="var(--owl-feet)" />

      {/* Body */}
      <ellipse cx="50" cy="58" rx="32" ry="34" fill="var(--owl-body-dark)" />

      {/* Belly */}
      <ellipse cx="50" cy="62" rx="20" ry="24" fill="var(--owl-belly)" />

      {/* Wings */}
      <path
        d="M20 50 Q14 62 20 76 Q26 80 28 70 Q26 58 28 48 Z"
        fill="var(--owl-wing)"
      />
      <path
        d="M80 50 Q86 62 80 76 Q74 80 72 70 Q74 58 72 48 Z"
        fill="var(--owl-wing)"
      />

      {/* Ear tufts */}
      <path d="M30 28 Q28 18 34 22 Z" fill="var(--owl-body-dark)" />
      <path d="M70 28 Q72 18 66 22 Z" fill="var(--owl-body-dark)" />

      {/* Eye whites */}
      <circle cx="38" cy="40" r="11" fill="var(--owl-eye-highlight)" />
      <circle cx="62" cy="40" r="11" fill="var(--owl-eye-highlight)" />

      {/* Pupils */}
      <circle cx="40" cy="42" r="5" fill="var(--owl-eye-pupil)" />
      <circle cx="60" cy="42" r="5" fill="var(--owl-eye-pupil)" />

      {/* Eye highlights */}
      <circle cx="42" cy="40" r="1.5" fill="var(--owl-eye-highlight)" />
      <circle cx="62" cy="40" r="1.5" fill="var(--owl-eye-highlight)" />

      {/* Beak */}
      <path d="M50 46 L45 54 Q50 58 55 54 Z" fill="var(--owl-beak)" />
    </svg>
  );
}
