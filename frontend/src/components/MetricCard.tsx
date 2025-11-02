import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'

interface MetricCardProps {
  label: string
  value: number
  format?: 'number' | 'percentage'
  colorClass: string
  bgColorClass: string
  trend?: 'up' | 'down' | 'neutral'
  decimals?: number
}

export const MetricCard: FC<MetricCardProps> = memo(({
  label,
  value,
  format = 'number',
  colorClass,
  bgColorClass,
  trend,
  decimals = 4
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      setDisplayValue(value)
      return () => clearTimeout(timer)
    }
  }, [value, displayValue])

  const formattedValue = format === 'percentage'
    ? `${(value * 100).toFixed(decimals === 4 ? 2 : decimals)}%`
    : value.toFixed(decimals)

  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return null

    const isPositive = trend === 'up'
    const icon = isPositive ? '↑' : '↓'
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600'

    return <span className={`ml-1 text-xs ${colorClass}`}>{icon}</span>
  }

  return (
    <div className={`${bgColorClass} p-3 rounded-lg`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-lg font-semibold ${colorClass} transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'} flex items-center`}>
        {formattedValue}
        {getTrendIcon()}
      </p>
    </div>
  )
})

MetricCard.displayName = 'MetricCard'
