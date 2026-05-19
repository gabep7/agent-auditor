import { useEffect, useState } from 'react';

const CATEGORIES = [
  { key: 'parameter_attack', label: 'Params' },
  { key: 'prompt_injection', label: 'Injection' },
  { key: 'contradictory', label: 'Contradict' },
  { key: 'edge_case', label: 'Edge Case' },
  { key: 'multi_turn', label: 'Multi-Turn' },
  { key: 'tool_misuse', label: 'Tool Misuse' },
];

export default function RadarChart({ scores = {}, size = 220 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  const n = CATEGORIES.length;

  const getPoint = (i, value) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const radius = (value / 100) * r;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const makePath = (points) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  const gridLevels = [25, 50, 75, 100];

  const dataPoints = CATEGORIES.map((cat, i) => {
    const val = animated ? (scores[cat.key] ?? 0) : 0;
    return getPoint(i, val);
  });

  const avgScore = CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] ?? 0), 0) / n;
  const fillColor = avgScore < 40 ? 'rgba(255,68,102,0.15)' : avgScore < 70 ? 'rgba(255,170,0,0.15)' : 'rgba(0,255,136,0.15)';
  const strokeColor = avgScore < 40 ? '#ff4466' : avgScore < 70 ? '#ffaa00' : '#00ff88';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid polygons */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, level));
        return (
          <path
            key={level}
            d={makePath(pts)}
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axes */}
      {CATEGORIES.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={`axis-${i}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="rgba(148,163,184,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={makePath(dataPoints)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        filter="url(#glow)"
        style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x} cy={p.y} r="3.5"
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth="1"
          filter="url(#glow)"
          style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      ))}

      {/* Labels */}
      {CATEGORIES.map((cat, i) => {
        const p = getPoint(i, 128);
        const score = scores[cat.key];
        return (
          <g key={`label-${i}`}>
            <text
              x={p.x} y={p.y - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize="9"
              fontFamily="'Inter', sans-serif"
              fontWeight="500"
            >
              {cat.label}
            </text>
            {score != null && (
              <text
                x={p.x} y={p.y + 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={score < 40 ? '#ff4466' : score < 70 ? '#ffaa00' : '#00ff88'}
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >
                {Math.round(score)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
