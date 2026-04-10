const ScoreCircle = ({ score = 75, size = 104 }: { score: number; size?: number }) => {
    const radius = 40;
    const stroke = 8;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const progress = score / 100;
    const strokeDashoffset = circumference * (1 - progress);
    const scoreColor = score > 69 ? "text-emerald-600" : score > 49 ? "text-amber-600" : "text-rose-600";
    const label = score > 69 ? "Strong" : score > 49 ? "Needs polish" : "At risk";

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg
                height="100%"
                width="100%"
                viewBox="0 0 100 100"
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r={normalizedRadius}
                        stroke="#e2e8f0"
                    strokeWidth={stroke}
                    fill="transparent"
                />
                {/* Partial circle with gradient */}
                <defs>
                    <linearGradient id="grad" x1="1" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF97AD" />
                        <stop offset="100%" stopColor="#5171FF" />
                    </linearGradient>
                </defs>
                <circle
                    cx="50"
                    cy="50"
                    r={normalizedRadius}
                    stroke="url(#grad)"
                    strokeWidth={stroke}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>

            {/* Score and issues */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold tracking-tight ${scoreColor}`}>{score}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    /100
                </span>
                <span className="mt-1 text-[11px] font-semibold text-slate-500">{label}</span>
            </div>
        </div>
    );
};

export default ScoreCircle;
