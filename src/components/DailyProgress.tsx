interface Props {
  current: number
  goal: number
}

export default function DailyProgress({ current, goal }: Props) {
  const pct = Math.min(current / goal, 1)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const remaining = Math.max(goal - current, 0)

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r={radius}
            fill="none" stroke="#e5e7eb" strokeWidth="8"
          />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={current > goal ? '#ef4444' : '#34C759'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="progress-ring-animate transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{current}</span>
          <span className="text-xs text-gray-500">of {goal} kcal</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {remaining > 0 ? `${remaining} kcal remaining` : 'Goal reached!'}
      </p>
    </div>
  )
}
