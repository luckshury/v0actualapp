'use client'

import { memo, useMemo, useCallback } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ChartDataPoint {
  timestamp: number // Unix timestamp in milliseconds
  price: number
}

interface StockWidgetProps {
  symbol: string
  change: number
  price: number
  data: ChartDataPoint[]
  range?: string
  onClick?: () => void
}

// Format price with dynamic decimal places based on magnitude
const formatPrice = (price: number): string => {
  if (price === 0) return '$0.00'
  if (price < 0.00001) return `$${price.toFixed(8)}` // Very very small
  if (price < 0.0001) return `$${price.toFixed(7)}`  // Very small
  if (price < 0.001) return `$${price.toFixed(6)}`   // Very small
  if (price < 0.01) return `$${price.toFixed(5)}`    // Small
  if (price < 1) return `$${price.toFixed(4)}`       // Less than $1
  if (price < 100) return `$${price.toFixed(3)}`     // Less than $100
  return `$${price.toFixed(2)}`                      // Normal prices
}

// Format timestamp based on range
const formatTimestampLabel = (timestamp: number, range: string): string => {
  const date = new Date(timestamp)
  
  if (range === '1h' || range === '4h') {
    // For intraday, show time
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } else if (range === '1d') {
    // For 1 day, show date and time
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } else {
    // For longer ranges, show date only
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: range === '1y' || range === '5y' ? 'numeric' : undefined,
    })
  }
}

const CustomTooltip = ({ active, payload, range }: { active?: boolean; payload?: any[]; range: string }) => {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0].payload as ChartDataPoint
  return (
    <div className="bg-popover border-2 border-border p-2 font-mono text-xs shadow-md">
      <div className="text-muted-foreground mb-1">{formatTimestampLabel(point.timestamp, range)}</div>
      <div className="text-foreground font-bold">{formatPrice(point.price)}</div>
    </div>
  )
}

const StockWidgetComponent = ({ symbol, change, price, data, range = '1d', onClick }: StockWidgetProps) => {
  const isPositive = change >= 0
  
  const chartData = useMemo(() => {
    if (data.length === 0) return []
    return [...data].sort((a, b) => a.timestamp - b.timestamp)
  }, [data])
  
  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100]
    const prices = chartData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const padding = (max - min) * 0.1 // 10% padding
    return [min - padding, max + padding]
  }, [chartData])

  const renderTooltip = useCallback(
    (tooltipProps: any) => <CustomTooltip {...tooltipProps} range={range} />,
    [range]
  )
  
  return (
    <div 
      className="bg-card border-2 border-border p-2 sm:p-3 hover:border-accent cursor-pointer min-w-0 transition-colors duration-75"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1 mb-1 sm:mb-2 min-w-0">
        <h3 className="text-xs sm:text-sm font-mono font-bold text-foreground truncate flex-1 min-w-0">
          {symbol}
        </h3>
        <span 
          className={`text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      
      <div className="h-10 sm:h-12 mb-1 sm:mb-2 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={70} minHeight={48}>
          <LineChart 
            data={chartData}
            margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
          >
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              hide
            />
            <YAxis 
              domain={yDomain}
              hide={true}
            />
            <Tooltip 
              content={renderTooltip} 
              isAnimationActive={false}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />
            <Line 
              type="linear" 
              dataKey="price" 
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="text-sm sm:text-base md:text-lg font-mono font-bold text-foreground truncate">
        {formatPrice(price)}
      </div>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const StockWidget = memo(StockWidgetComponent, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.price === nextProps.price &&
    prevProps.change === nextProps.change &&
    prevProps.range === nextProps.range &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.data === nextProps.data
  )
})
