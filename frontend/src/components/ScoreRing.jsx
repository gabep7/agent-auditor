import { useEffect, useState } from 'react';

export default function ScoreRing({ score = 0, size = 140, strokeWidth = 10, label = 'Overall Score' }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = null;
    const duration = 1200;
    const target = Math.max(0, Math.min(100, score));

    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(eased * target);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const color = animatedScore < 40 ? '#ff4466' : animatedScore < 70 ? '#ffaa00' : '#00ff88';
  const bgColor = animatedScore < 40 ? 'rgba(255,68,102,0.1)' : animatedScore < 70 ? 'rgba(255,170,0,0.1)' : 'rgba(0,255,136,0.1)';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#ring-glow)"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color }}
        >
          <span className="text-3xl font-bold font-mono leading-none">
            {Math.round(animatedScore)}
          </span>
          <span className="text-[10px] text-auditor-400 mt-0.5">/100</span>
        </div>
        {/* Subtle background glow */}
        <div
          className="absolute inset-4 rounded-full blur-xl opacity-30"
          style={{ background: bgColor }}
        />
      </div>
      <span className="text-[11px] text-auditor-400 font-medium tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
