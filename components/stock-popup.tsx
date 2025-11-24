'use client'

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { X, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppState } from '@/contexts/app-state-context'

interface ChartDataPoint {
  timestamp: number // Unix timestamp in milliseconds
  price: number
}

interface StockPopupProps {
  symbol: string
  change: number
  price: number
  data: ChartDataPoint[]
  range?: string
  onClose: () => void
}

// Format price with dynamic decimal places based on magnitude
const formatPrice = (price: number): string => {
  if (price === 0) return '$0.00'
  if (price < 0.00001) return `$${price.toFixed(8)}`
  if (price < 0.0001) return `$${price.toFixed(7)}`
  if (price < 0.001) return `$${price.toFixed(6)}`
  if (price < 0.01) return `$${price.toFixed(5)}`
  if (price < 1) return `$${price.toFixed(4)}`
  if (price < 100) return `$${price.toFixed(3)}`
  return `$${price.toFixed(2)}`
}

// Format timestamp for display based on range
const formatTimestampForDisplay = (timestamp: number, range: string): string => {
  const date = new Date(timestamp)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  if (range === '1h' || range === '4h') {
    // For intraday, show detailed time
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes} ${ampm}`
  } else if (range === '1d') {
    // For 1 day, show month, day, and time
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${displayHours}:${minutes} ${ampm}`
  } else if (range === '7d') {
    // For 7 days, show month and day
    return `${monthNames[date.getMonth()]} ${date.getDate()}`
  } else {
    // For longer ranges, show month, day, year
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }
}

const CustomTooltip = ({ active, payload, range }: { active?: boolean; payload?: any[]; range: string }) => {
  if (!active || !payload?.length) {
    return null
  }

  const dataPoint = payload[0].payload as ChartDataPoint

  return (
    <div className="bg-popover border border-border p-2 font-mono text-xs shadow-lg">
      <div className="text-muted-foreground">{formatTimestampForDisplay(dataPoint.timestamp, range)}</div>
      <div className="text-foreground font-bold">{formatPrice(dataPoint.price)}</div>
    </div>
  )
}

const StockPopupComponent = ({ symbol, change, price, data, range = '1d', onClose }: StockPopupProps) => {
  const isPositive = change >= 0
  const { watchlists, addSymbolToWatchlist } = useAppState()
  
  // Store initial chart data to prevent constant refreshing
  const initialDataRef = useRef<ChartDataPoint[]>([])
  const [stableChartData, setStableChartData] = useState<ChartDataPoint[]>([])
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('')
  const [addedToWatchlists, setAddedToWatchlists] = useState<Set<string>>(new Set())
  
  // Set stable chart data on mount or when symbol changes
  useEffect(() => {
    if (data.length > 0 && (initialDataRef.current.length === 0 || initialDataRef.current !== data)) {
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
      initialDataRef.current = sortedData
      setStableChartData(sortedData)
    }
  }, [symbol, data])
  
  // Check which watchlists already contain this symbol
  useEffect(() => {
    const watchlistsWithSymbol = new Set<string>()
    watchlists.forEach(wl => {
      if (wl.symbols.includes(symbol)) {
        watchlistsWithSymbol.add(wl.id)
      }
    })
    setAddedToWatchlists(watchlistsWithSymbol)
  }, [watchlists, symbol])
  
  const chartData = stableChartData
  
  const handleAddToWatchlist = () => {
    if (selectedWatchlistId && !addedToWatchlists.has(selectedWatchlistId)) {
      addSymbolToWatchlist(selectedWatchlistId, symbol)
      setAddedToWatchlists(prev => new Set(prev).add(selectedWatchlistId))
      // Clear selection after adding
      setSelectedWatchlistId('')
    }
  }
  
  const isAlreadyAdded = selectedWatchlistId && addedToWatchlists.has(selectedWatchlistId)

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto']
    const prices = chartData.map(point => point.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const padding = (max - min) * 0.05
    return [min - padding, max + padding]
  }, [chartData])

  const renderTooltip = useCallback(
    (tooltipProps: any) => <CustomTooltip {...tooltipProps} range={range} />,
    [range]
  )
  
  const currentPercentage = change

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card border-2 border-border w-full max-w-6xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-mono font-bold text-foreground">
              {symbol}
            </h2>
            {watchlists.length > 0 && (
              <>
                <select 
                  className="bg-muted border-2 border-border px-3 py-1.5 font-mono text-sm text-muted-foreground"
                  value={selectedWatchlistId}
                  onChange={(e) => setSelectedWatchlistId(e.target.value)}
                >
                  <option value="">Add to watchlist...</option>
                  {watchlists.map((watchlist) => {
                    const alreadyInList = addedToWatchlists.has(watchlist.id)
                    return (
                      <option 
                        key={watchlist.id} 
                        value={watchlist.id}
                        disabled={alreadyInList}
                      >
                        {watchlist.name} {alreadyInList ? '✓' : ''}
                      </option>
                    )
                  })}
                </select>
                <Button 
                  className="bg-accent text-accent-foreground border-0 px-4 py-1.5 h-auto font-mono text-sm hover:opacity-80"
                  onClick={handleAddToWatchlist}
                  disabled={!selectedWatchlistId || isAlreadyAdded}
                >
                  {isAlreadyAdded ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
          <Button 
            variant="ghost" 
            className="p-1 h-auto hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-6 border-b-2 border-border">
          <div className="font-mono text-sm text-muted-foreground mb-2">
            {currentPercentage >= 0 ? '+' : ''}{currentPercentage.toFixed(4)}% / {range}
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <div className={`w-4 h-1 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>vs USD ({range.toUpperCase()})</span>
          </div>
        </div>

        <div className="flex-1 p-6 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 60 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
              />
              <XAxis 
                dataKey="timestamp" 
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => formatTimestampForDisplay(value as number, range)}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                tickFormatter={(value) => formatPrice(value)}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                domain={yDomain as any}
                width={80}
              />
              <Tooltip 
                content={renderTooltip} 
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }} 
              />
              <Line 
                type="linear" 
                dataKey="price" 
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? '#22c55e' : '#ef4444' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent re-renders when data reference changes
export const StockPopup = React.memo(StockPopupComponent, (prevProps, nextProps) => {
  // Only re-render if symbol changes - ignore price/change/data reference changes
  return prevProps.symbol === nextProps.symbol && prevProps.range === nextProps.range
})
