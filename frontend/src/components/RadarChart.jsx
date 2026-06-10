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
  const fillColor = avgScore < 40 ? 'rgba(248,113,113,0.1)' : avgScore < 70 ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)';
  const strokeColor = avgScore < 40 ? '#f87171' : avgScore < 70 ? '#fbbf24' : '#4ade80';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map(level => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, level));
        return (
          <path key={level} d={makePath(pts)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        );
      })}

      {CATEGORIES.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />;
      })}

      <path
        d={makePath(dataPoints)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={strokeColor}
          style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      ))}

      {CATEGORIES.map((cat, i) => {
        const p = getPoint(i, 125);
        const score = scores[cat.key];
        return (
          <g key={i}>
            <text x={p.x} y={p.y - 5} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="'Inter', sans-serif" fontWeight="500">
              {cat.label}
            </text>
            {score != null && (
              <text x={p.x} y={p.y + 5} textAnchor="middle" dominantBaseline="middle"
                fill={score < 40 ? 'rgba(248,113,113,0.5)' : score < 70 ? 'rgba(251,191,36,0.5)' : 'rgba(74,222,128,0.5)'}
                fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                {Math.round(score)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
