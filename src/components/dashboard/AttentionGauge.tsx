interface AttentionGaugeProps {
  score: number;
  label?: string;
}

export default function AttentionGauge({ score, label = 'Attention Score' }: AttentionGaugeProps) {
  const color = score > 75 ? 'var(--destructive)' : score > 40 ? 'var(--warning)' : 'var(--primary)';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 flex flex-col items-center">
      <span className="text-[10px] font-mono text-primary uppercase tracking-wider mb-2">{label}</span>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={`hsl(${color})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold text-foreground">{score}</span>
        </div>
      </div>
      <span className={`text-[10px] font-mono mt-1 ${
        score > 75 ? 'text-destructive' : score > 40 ? 'text-warning' : 'text-primary'
      }`}>
        {score > 75 ? 'HIGH' : score > 40 ? 'MODERATE' : 'LOW'}
      </span>
    </div>
  );
}
