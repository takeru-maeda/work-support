"use client"

interface GaugeChartProps {
  value: number
  maxValue?: number
  size?: number
  label?: string
  title?: string
}

export function GaugeChart({ value, maxValue = 100, size = 120, label = "%", title }: GaugeChartProps) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100))
  const radius = (size - 16) / 2
  const circumference = Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const needleAngle = -90 + (percentage / 100) * 180

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        <svg width={size} height={size * 0.65} className="transform">
          {/* Background arc */}
          <path
            d={`M ${size / 2 - radius} ${size * 0.6} A ${radius} ${radius} 0 0 1 ${size / 2 + radius} ${size * 0.6}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${size / 2 - radius} ${size * 0.6} A ${radius} ${radius} 0 0 1 ${size / 2 + radius} ${size * 0.6}`}
            fill="none"
            stroke="hsl(var(--chart-2))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
          {/* Needle */}
          <g transform={`rotate(${needleAngle} ${size / 2} ${size * 0.6})`}>
            <line
              x1={size / 2}
              y1={size * 0.6}
              x2={size / 2}
              y2={size * 0.6 - radius + 12}
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
            <circle cx={size / 2} cy={size * 0.6} r="4" fill="hsl(var(--foreground))" />
          </g>
        </svg>
        {/* Value display */}
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {value.toFixed(1)}
              <span className="text-sm text-muted-foreground ml-1">{label}</span>
            </div>
          </div>
        </div>
      </div>
      {title && <span className="text-sm font-medium text-muted-foreground">{title}</span>}
    </div>
  )
}
