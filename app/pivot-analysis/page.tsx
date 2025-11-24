'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { format, subDays } from 'date-fns'
import { ChevronDownIcon, RefreshCw, AlertCircle, Check, ChevronsUpDown, CheckCircle } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip } from 'recharts'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/date-range-picker'
import { cn } from '@/lib/utils'
import { useAppState } from '@/contexts/app-state-context'
import {
  parseHourlyCandles,
  calculateDailyPivots,
  calculateHourlyStats,
  adjustForCurrentDay,
  getHeatmapColor,
  getTextColor,
  type HourlyStats,
  type HeatmapScheme,
} from '@/lib/pivot-utils'

const WEEKDAY_OPTIONS = [
  { label: 'Monday', short: 'Mon', value: 1 },
  { label: 'Tuesday', short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday', short: 'Thu', value: 4 },
  { label: 'Friday', short: 'Fri', value: 5 },
  { label: 'Saturday', short: 'Sat', value: 6 },
  { label: 'Sunday', short: 'Sun', value: 0 },
]

const HEATMAP_SCHEMES: { value: HeatmapScheme; label: string }[] = [
  { value: 'viridis', label: 'Viridis' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'turbo', label: 'Turbo' },
  { value: 'blues', label: 'Blues' },
  { value: 'green', label: 'Green' },
]


// Memoized Row Component for better performance
const PivotRow = memo(({ 
  stat, 
  isDark, 
  heatmapScheme, 
  intensity, 
  currentHour, 
  todayP1Hour, 
  todayP2Hour, 
  popoverOpen, 
  setPopoverOpen, 
  dailyPivots 
}: {
  stat: HourlyStats,
  isDark: boolean,
  heatmapScheme: HeatmapScheme,
  intensity: number,
  currentHour: number,
  todayP1Hour: number | null,
  todayP2Hour: number | null,
  popoverOpen: string | null,
  setPopoverOpen: (id: string | null) => void,
  dailyPivots: any[]
}) => {
  const p1Color = getHeatmapColor(stat.p1Probability, isDark, heatmapScheme, intensity)
  const p2Color = getHeatmapColor(stat.p2Probability, isDark, heatmapScheme, intensity)
  const p1TextColor = getTextColor(p1Color)
  const p2TextColor = getTextColor(p2Color)
  const isCurrentHour = stat.hour === currentHour
  const isTodayP1 = todayP1Hour !== null && stat.hour === todayP1Hour
  const isTodayP2 = todayP2Hour !== null && stat.hour === todayP2Hour

  const p1PopoverId = `p1-${stat.hour}`
  const p2PopoverId = `p2-${stat.hour}`
  const isP1Open = popoverOpen === p1PopoverId
  const isP2Open = popoverOpen === p2PopoverId

  return (
    <tr
      className={cn(
        "border-b border-border/50 cursor-pointer transition-none",
        // Terminal-like hover effect: subtle highlight
        "hover:bg-muted/60",
        isCurrentHour && "ring-2 ring-inset ring-primary/50"
      )}
    >
      <td className={cn(
        "px-4 py-2 font-bold",
        isCurrentHour && "text-primary"
      )}>
        {String(stat.hour).padStart(2, '0')}:00
      </td>
      <td
        className="px-4 py-2 text-right font-semibold"
        style={{
          backgroundColor: p1Color,
          color: p1TextColor,
        }}
      >
        <div className="flex items-center justify-end gap-1">
          {isTodayP1 && (
            <Check className="h-3 w-3 stroke-[3] text-green-500" />
          )}
          <span>{stat.p1Probability.toFixed(1)}</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right text-xs opacity-70 hover:opacity-100">
        <Popover open={isP1Open} onOpenChange={(open) => setPopoverOpen(open ? p1PopoverId : null)}>
          <PopoverTrigger asChild>
            <button className="hover:underline decoration-current underline-offset-2">
              {stat.lastP1DaysAgo !== null ? `${stat.lastP1DaysAgo}d` : '-'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3" align="end">
            <div className="space-y-2">
              <h4 className="font-semibold text-xs font-mono">P1 at {String(stat.hour).padStart(2, '0')}:00</h4>
              <div className="max-h-48 overflow-auto space-y-1">
                {dailyPivots
                  .filter(p => p.p1Hour === stat.hour)
                  .slice(-10)
                  .reverse()
                  .map((p, idx) => (
                    <div key={idx} className="text-xs font-mono text-muted-foreground flex justify-between">
                      <span>{p.date}</span>
                      <span className={p.p1Type === 'high' ? 'text-green-500' : 'text-red-500'}>
                        {p.p1Type === 'high' ? '↑' : '↓'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </td>
      <td
        className="px-4 py-2 text-right font-semibold"
        style={{
          backgroundColor: p2Color,
          color: p2TextColor,
        }}
      >
        <div className="flex items-center justify-end gap-1">
          {isTodayP2 && (
            <Check className="h-3 w-3 stroke-[3] text-green-500" />
          )}
          <span>{stat.p2Probability.toFixed(1)}</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right text-xs opacity-70 hover:opacity-100">
        <Popover open={isP2Open} onOpenChange={(open) => setPopoverOpen(open ? p2PopoverId : null)}>
          <PopoverTrigger asChild>
            <button className="hover:underline decoration-current underline-offset-2">
              {stat.lastP2DaysAgo !== null ? `${stat.lastP2DaysAgo}d` : '-'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3" align="end">
            <div className="space-y-2">
              <h4 className="font-semibold text-xs font-mono">P2 at {String(stat.hour).padStart(2, '0')}:00</h4>
              <div className="max-h-48 overflow-auto space-y-1">
                {dailyPivots
                  .filter(p => p.p2Hour === stat.hour)
                  .slice(-10)
                  .reverse()
                  .map((p, idx) => (
                    <div key={idx} className="text-xs font-mono text-muted-foreground flex justify-between">
                      <span>{p.date}</span>
                      <span className={p.p2Type === 'high' ? 'text-green-500' : 'text-red-500'}>
                        {p.p2Type === 'high' ? '↑' : '↓'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </td>
    </tr>
  )
}, (prev, next) => {
  const p1Id = `p1-${prev.stat.hour}`
  const p2Id = `p2-${prev.stat.hour}`
  
  const prevP1Open = prev.popoverOpen === p1Id
  const prevP2Open = prev.popoverOpen === p2Id
  const nextP1Open = next.popoverOpen === p1Id
  const nextP2Open = next.popoverOpen === p2Id

  return (
    prev.stat === next.stat &&
    prev.isDark === next.isDark &&
    prev.heatmapScheme === next.heatmapScheme &&
    prev.intensity === next.intensity &&
    prev.currentHour === next.currentHour &&
    prev.todayP1Hour === next.todayP1Hour &&
    prev.todayP2Hour === next.todayP2Hour &&
    prev.dailyPivots === next.dailyPivots &&
    prevP1Open === nextP1Open &&
    prevP2Open === nextP2Open
  )
})

export default function PivotAnalysisPage() {
  // Use persistent global state
  const { pivotAnalysisSettings, updatePivotAnalysisSettings } = useAppState()
  
  // Destructure settings for easier access
  const { ticker, selectedWeekdays, heatmapScheme, intensity: savedIntensity, daysBack } = pivotAnalysisSettings
  
  // Helper functions to update settings
  const setTicker = (value: string) => updatePivotAnalysisSettings({ ticker: value })
  const setSelectedWeekdays = (value: number[]) => updatePivotAnalysisSettings({ selectedWeekdays: value })
  const setHeatmapScheme = (value: HeatmapScheme) => updatePivotAnalysisSettings({ heatmapScheme: value })
  const updateIntensity = (value: number) => updatePivotAnalysisSettings({ intensity: value })
  
  // State for intensity slider (array format for UI component)
  const [intensity, setIntensity] = useState([savedIntensity])
  
  // Sync intensity with global state
  useEffect(() => {
    updateIntensity(intensity[0])
  }, [intensity])
  
  // Date range calculated from daysBack
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), daysBack),
    to: new Date(),
  })
  
  // Update daysBack when date range changes
  useEffect(() => {
    if (dateRange?.from) {
      const days = Math.ceil((new Date().getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      updatePivotAnalysisSettings({ daysBack: days })
    }
  }, [dateRange])
  
  // Local UI state (not persisted)
  const [tickers, setTickers] = useState<string[]>([])
  const [tickerSearch, setTickerSearch] = useState('')
  const [tickerOpen, setTickerOpen] = useState(false)
  const [weekdayOpen, setWeekdayOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([])
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const adjustForToday = false // Don't adjust for current day
  const [isDark, setIsDark] = useState(false)
  const [currentHour, setCurrentHour] = useState(new Date().getUTCHours())
  const [todayP1Hour, setTodayP1Hour] = useState<number | null>(null)
  const [todayP2Hour, setTodayP2Hour] = useState<number | null>(null)
  const [dailyPivots, setDailyPivots] = useState<any[]>([])
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null)
  const [todayP1Time, setTodayP1Time] = useState<string | null>(null)
  const [todayP2Time, setTodayP2Time] = useState<string | null>(null)
  const [todayP1Type, setTodayP1Type] = useState<'high' | 'low' | null>(null)
  const [todayP2Type, setTodayP2Type] = useState<'high' | 'low' | null>(null)
  const [todayChartData, setTodayChartData] = useState<any[]>([])
  const [todayP1Price, setTodayP1Price] = useState<number | null>(null)
  const [todayP2Price, setTodayP2Price] = useState<number | null>(null)

  // Update current hour every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getUTCHours())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

  // Fetch available tickers from Bybit
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await fetch('/api/bybit-tickers')
        if (response.ok) {
          const data = await response.json()
          if (data.tickers && Array.isArray(data.tickers)) {
            setTickers(data.tickers)
          }
        }
      } catch (err) {
        console.error('Failed to fetch tickers:', err)
      }
    }
    fetchTickers()
  }, [])

  // Filter tickers based on search
  const filteredTickers = useMemo(() => {
    if (!tickerSearch) return tickers
    const search = tickerSearch.toLowerCase()
    return tickers.filter(t => t.toLowerCase().includes(search))
  }, [tickers, tickerSearch])

  // Fetch and calculate pivot data
  const fetchPivotData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setError('Please select a date range')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startMs = dateRange.from.getTime()
      const endMs = dateRange.to.getTime()
      
      const daysDiff = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24))
      const hoursNeeded = daysDiff * 24
      const maxCandlesPerRequest = 1000
      const chunks = Math.ceil(hoursNeeded / maxCandlesPerRequest)
      
      let allCandles: any[] = []
      
      for (let i = 0; i < chunks; i++) {
        const chunkStart = startMs + (i * maxCandlesPerRequest * 60 * 60 * 1000)
        const chunkEnd = Math.min(
          chunkStart + (maxCandlesPerRequest * 60 * 60 * 1000),
          endMs
        )
        
        const params = new URLSearchParams({
          symbol: ticker,
          interval: '60',
          start: chunkStart.toString(),
          end: chunkEnd.toString(),
          limit: '1000',
        })
        
        const response = await fetch(`/api/bybit-intraday?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.retCode !== 0) {
          throw new Error(result.retMsg || 'Failed to fetch kline data')
        }
        
        if (result.result?.list) {
          allCandles = [...allCandles, ...result.result.list.reverse()]
        }
      }
      
      if (allCandles.length === 0) {
        throw new Error('No data available for the selected date range')
      }
      
      const hourlyCandles = parseHourlyCandles(allCandles)
      const pivots = calculateDailyPivots(hourlyCandles)
      
      // Store daily pivots for popover display
      setDailyPivots(pivots)
      
      // Find today's P1 and P2 hours
      const today = new Date()
      const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`
      const todayPivot = pivots.find(p => p.date === todayKey)
      
      if (todayPivot) {
        setTodayP1Hour(todayPivot.p1Hour)
        setTodayP2Hour(todayPivot.p2Hour)
        setTodayP1Type(todayPivot.p1Type)
        setTodayP2Type(todayPivot.p2Type)
      } else {
        setTodayP1Hour(null)
        setTodayP2Hour(null)
        setTodayP1Type(null)
        setTodayP2Type(null)
      }
      
      // Fetch 15-minute data for today to get precise times
      if (todayPivot) {
        try {
          const todayStart = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()).getTime()
          const todayEnd = todayStart + (24 * 60 * 60 * 1000)
          
          const params15m = new URLSearchParams({
            symbol: ticker,
            interval: '15',
            start: todayStart.toString(),
            end: todayEnd.toString(),
            limit: '100',
          })
          
          const response15m = await fetch(`/api/bybit-intraday?${params15m.toString()}`)
          if (response15m.ok) {
            const result15m = await response15m.json()
            if (result15m.retCode === 0 && result15m.result?.list) {
              const candles15m = result15m.result.list.reverse()
              
              // Find the actual daily high and low from all candles
              let actualDailyHigh = -Infinity
              let actualDailyLow = Infinity
              
              for (const candle of candles15m) {
                const h = parseFloat(candle[2])
                const l = parseFloat(candle[3])
                if (h > actualDailyHigh) actualDailyHigh = h
                if (l < actualDailyLow) actualDailyLow = l
              }
              
              // Now find when each was first reached
              let highTime = null
              let lowTime = null
              let highTimestamp = Infinity
              let lowTimestamp = Infinity
              
              for (const candle of candles15m) {
                const [timestamp, open, high, low, close] = candle
                const ts = parseInt(timestamp)
                const h = parseFloat(high)
                const l = parseFloat(low)
                
                // Check if this candle contains the daily high (within tolerance)
                if (!highTime && Math.abs(h - actualDailyHigh) < 0.01) {
                  highTime = ts
                  highTimestamp = ts
                }
                
                // Check if this candle contains the daily low (within tolerance)
                if (!lowTime && Math.abs(l - actualDailyLow) < 0.01) {
                  lowTime = ts
                  lowTimestamp = ts
                }
                
                if (highTime && lowTime) break
              }
              
              // Format times and prepare chart data
              let p1Time = null
              let p2Time = null
              let p1Price = null
              let p2Price = null
              
              if (highTimestamp < lowTimestamp) {
                // High came first = P1
                if (highTime) {
                  const date = new Date(highTime)
                  p1Time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
                  p1Price = actualDailyHigh
                }
                if (lowTime) {
                  const date = new Date(lowTime)
                  p2Time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
                  p2Price = actualDailyLow
                }
              } else {
                // Low came first = P1
                if (lowTime) {
                  const date = new Date(lowTime)
                  p1Time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
                  p1Price = actualDailyLow
                }
                if (highTime) {
                  const date = new Date(highTime)
                  p2Time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
                  p2Price = actualDailyHigh
                }
              }
              
              // Prepare chart data
              const chartData = candles15m.map((candle: any) => {
                const [timestamp, open, high, low, close] = candle
                const date = new Date(parseInt(timestamp))
                return {
                  time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
                  timestamp: parseInt(timestamp),
                  price: parseFloat(close),
                  high: parseFloat(high),
                  low: parseFloat(low),
                }
              })
              
              setTodayP1Time(p1Time)
              setTodayP2Time(p2Time)
              setTodayP1Price(p1Price)
              setTodayP2Price(p2Price)
              setTodayChartData(chartData)
            }
          }
        } catch (err) {
          console.error('Failed to fetch 15m data:', err)
        }
      } else {
        setTodayP1Time(null)
        setTodayP2Time(null)
        setTodayP1Price(null)
        setTodayP2Price(null)
        setTodayChartData([])
      }
      
      const stats = calculateHourlyStats(
        pivots,
        selectedWeekdays.length > 0 ? selectedWeekdays : undefined
      )
      
      const currentUTCHour = new Date().getUTCHours()
      const finalStats = adjustForToday 
        ? adjustForCurrentDay(stats, currentUTCHour)
        : stats
      
      setHourlyStats(finalStats)
      setLastFetch(new Date())
    } catch (err) {
      console.error('Error fetching pivot data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pivot data')
    } finally {
      setLoading(false)
    }
  }, [ticker, dateRange, selectedWeekdays, adjustForToday])

  // Auto-fetch on mount and when parameters change
  useEffect(() => {
    if (ticker && dateRange?.from && dateRange?.to) {
      fetchPivotData()
    }
  }, [ticker, dateRange?.from, dateRange?.to, selectedWeekdays, adjustForToday, fetchPivotData])

  const toggleWeekday = (value: number) => {
    setSelectedWeekdays(
      selectedWeekdays.includes(value)
        ? selectedWeekdays.filter(v => v !== value)
        : [...selectedWeekdays, value]
    )
  }

  const selectWeekdayPreset = (preset: 'all' | 'weekdays' | 'weekend') => {
    if (preset === 'all') {
      setSelectedWeekdays([])
    } else if (preset === 'weekdays') {
      setSelectedWeekdays([1, 2, 3, 4, 5]) // Mon-Fri
    } else if (preset === 'weekend') {
      setSelectedWeekdays([0, 6]) // Sat-Sun
    }
  }

  // Memoize Key Insights calculation
  const keyInsights = useMemo(() => {
    if (todayP1Hour === null || todayP2Hour === null) return null

    // Filter pivots by selected weekdays to match table data
    const filteredPivots = selectedWeekdays.length > 0
      ? dailyPivots.filter(p => selectedWeekdays.includes(p.dayOfWeek))
      : dailyPivots
    
    const totalDays = filteredPivots.length
    if (totalDays === 0) return null
    
    // Calculate all percentages
    const p1AfterP1 = filteredPivots.filter(p => p.p1Hour > todayP1Hour).length
    const p1AtOrAfterP2 = filteredPivots.filter(p => p.p1Hour >= todayP2Hour).length
    const p2AfterP2 = filteredPivots.filter(p => p.p2Hour > todayP2Hour).length
    const p2AfterNow = filteredPivots.filter(p => p.p2Hour > currentHour).length
    
    const pct1 = ((p1AfterP1 / totalDays) * 100).toFixed(1)
    const pct2 = ((p1AtOrAfterP2 / totalDays) * 100).toFixed(1)
    const pct3 = ((p2AfterP2 / totalDays) * 100).toFixed(1)
    const pct4 = ((p2AfterNow / totalDays) * 100).toFixed(1)
    
    const flipRisk = parseFloat(pct2) < 20 ? 'Low' : parseFloat(pct2) < 40 ? 'Moderate' : 'High'
    const flipRiskColor = parseFloat(pct2) < 20 ? 'text-green-500' : parseFloat(pct2) < 40 ? 'text-amber-500' : 'text-red-500'
    
    // High % means P2 still to come = UNLIKELY P2 is already in (RED = risky)
    // Low % means P2 unlikely to come = Likely P2 is in (GREEN = safe)
    const p2Likely = parseFloat(pct4) > 50 ? 'Unlikely' : 'Likely'
    const p2LikelyColor = parseFloat(pct4) > 50 ? 'text-red-500' : 'text-green-500'

    return {
      totalDays,
      pct1,
      pct2,
      pct3,
      pct4,
      flipRisk,
      flipRiskColor,
      p2Likely,
      p2LikelyColor
    }
  }, [todayP1Hour, todayP2Hour, selectedWeekdays, dailyPivots, currentHour])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Two-Level Tab Hierarchy */}
      <Tabs defaultValue="time" className="flex flex-col h-full">
        <div className="border-b border-border bg-card px-4 py-2">
          <TabsList className="h-9">
            <TabsTrigger value="time" className="font-mono text-xs">Time</TabsTrigger>
            <TabsTrigger value="distance" className="font-mono text-xs">Distance</TabsTrigger>
            <TabsTrigger value="summary" className="font-mono text-xs">Summary</TabsTrigger>
          </TabsList>
        </div>

        {/* Time Tab Content with Sub-tabs */}
        <TabsContent value="time" className="flex-1 flex flex-col m-0">
          <Tabs defaultValue="daily" className="flex flex-col h-full">
            <div className="border-b border-border bg-muted/30 px-4 py-1.5">
              <TabsList className="h-8 bg-background">
                <TabsTrigger value="daily" className="font-mono text-xs">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="font-mono text-xs">Weekly</TabsTrigger>
                <TabsTrigger value="session" className="font-mono text-xs">Session</TabsTrigger>
              </TabsList>
            </div>

            {/* Daily Tab - Current Content */}
            <TabsContent value="daily" className="flex-1 flex flex-col m-0">
              {/* Compact Single-Line Control Bar */}
              <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Ticker Search Dropdown */}
          <div className="w-40">
            <Popover open={tickerOpen} onOpenChange={setTickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tickerOpen}
                  className="w-full justify-between font-mono text-xs h-8"
                >
                  {ticker}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search ticker..." 
                    value={tickerSearch}
                    onValueChange={setTickerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No ticker found.</CommandEmpty>
                    <CommandGroup>
                      {filteredTickers.slice(0, 100).map((t) => (
                        <CommandItem
                          key={t}
                          value={t}
                          onSelect={() => {
                            setTicker(t)
                            setTickerOpen(false)
                            setTickerSearch('')
                          }}
                          className="font-mono text-xs"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3 w-3",
                              ticker === t ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {t}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range Picker with Presets */}
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />

          {/* Weekday Filter with Presets */}
          <DropdownMenu open={weekdayOpen} onOpenChange={setWeekdayOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 font-mono text-xs">
                {selectedWeekdays.length === 0
                  ? 'All Days'
                  : `${selectedWeekdays.length} day${selectedWeekdays.length === 1 ? '' : 's'}`}
                <ChevronDownIcon className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuLabel className="font-mono text-xs">Quick Presets</DropdownMenuLabel>
              <div className="px-2 py-1 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs flex-1"
                  onClick={() => selectWeekdayPreset('all')}
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs flex-1"
                  onClick={() => selectWeekdayPreset('weekdays')}
                >
                  Mon-Fri
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs flex-1"
                  onClick={() => selectWeekdayPreset('weekend')}
                >
                  Sat-Sun
                </Button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-mono text-xs">Individual Days</DropdownMenuLabel>
              {WEEKDAY_OPTIONS.map(day => (
                <DropdownMenuCheckboxItem
                  key={day.value}
                  checked={selectedWeekdays.includes(day.value)}
                  onCheckedChange={() => toggleWeekday(day.value)}
                  onSelect={(e) => e.preventDefault()}
                  className="font-mono text-xs"
                >
                  {day.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Color Scheme Selector */}
          <Select value={heatmapScheme} onValueChange={(v) => setHeatmapScheme(v as HeatmapScheme)}>
            <SelectTrigger className="w-24 h-8 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEATMAP_SCHEMES.map(scheme => (
                <SelectItem key={scheme.value} value={scheme.value} className="font-mono text-xs">
                  {scheme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Intensity Slider */}
          <div className="flex items-center gap-2 w-32">
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">Int:</span>
            <Slider
              value={intensity}
              onValueChange={setIntensity}
              min={0.5}
              max={2.0}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground font-mono w-8">{intensity[0].toFixed(1)}</span>
          </div>

          {/* Fetch Button */}
          <Button
            onClick={fetchPivotData}
            disabled={loading}
            size="sm"
            className="h-8 font-mono text-xs"
          >
            {loading ? 'Loading...' : 'fetch ⚡'}
          </Button>

          {/* Last Update */}
          {lastFetch && (
            <div className="ml-auto text-xs text-muted-foreground font-mono">
              {format(lastFetch, 'HH:mm:ss')}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-xs text-destructive font-mono">{error}</span>
          </div>
        )}
      </div>

      {/* Main Content: Table + Key Insights */}
      <div className="flex-1 overflow-hidden p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full flex-col gap-4">
            {/* Futuristic Loading Animation */}
            <div className="w-64 space-y-2">
              <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
                <div className="h-full bg-primary w-full origin-left animate-[shimmer_1s_infinite_linear] relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-[shimmer_1s_infinite_linear]" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <span>Loading Analysis</span>
                <span className="animate-pulse text-primary">processing...</span>
              </div>
            </div>
          </div>
        ) : hourlyStats.length > 0 ? (
          <div className="flex gap-4 h-full">
            {/* Left: Pivot Table (60%) */}
            <div className="w-[60%] flex flex-col">
              <div className="bg-card border border-border rounded overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full font-mono text-sm">
                    <thead className="sticky top-0 bg-muted/50 z-10">
                      <tr className="border-b border-border">
                        <th className="px-4 py-2.5 text-left font-semibold">Hour</th>
                        <th className="px-4 py-2.5 text-right font-semibold">P1 %</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Last</th>
                        <th className="px-4 py-2.5 text-right font-semibold">P2 %</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hourlyStats.map(stat => (
                        <PivotRow
                          key={stat.hour}
                          stat={stat}
                          isDark={isDark}
                          heatmapScheme={heatmapScheme}
                          intensity={intensity[0]}
                          currentHour={currentHour}
                          todayP1Hour={todayP1Hour}
                          todayP2Hour={todayP2Hour}
                          popoverOpen={popoverOpen}
                          setPopoverOpen={setPopoverOpen}
                          dailyPivots={dailyPivots}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Stats Footer - Fixed at bottom */}
                <div className="border-t border-border bg-muted/30 px-4 py-2 flex gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground">Days:</span>{' '}
                    <span className="font-bold">{hourlyStats[0]?.totalDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scheme:</span>{' '}
                    <span className="font-bold capitalize">{heatmapScheme}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Key Insights (40%) */}
            <div className="w-[40%] flex flex-col">
              <div className="bg-card border border-border rounded p-4 flex-1 overflow-auto">
                <h3 className="text-sm font-bold font-mono mb-4 text-foreground sticky top-0 bg-card pb-2 border-b border-border">Key Insights</h3>
                <div className="space-y-4 text-xs font-mono">
                  {keyInsights ? (
                    <>
                      {/* Data Points */}
                      <div className="text-muted-foreground">
                        <span className="font-bold text-foreground">{keyInsights.totalDays}</span> data points used - stats are reliable
                      </div>

                      {/* Asset Section */}
                      <div className="space-y-1 pt-2">
                        <div className="text-muted-foreground">
                          <span className="text-foreground font-bold">Asset:</span> {ticker}
                        </div>
                        <div className="text-muted-foreground pl-2">
                          <span className="text-foreground">Current P1:</span> Daily {todayP1Type} ({todayP1Time || `${String(todayP1Hour).padStart(2, '0')}:00`})
                        </div>
                        <div className="text-muted-foreground pl-2">
                          <span className="text-foreground">Current P2:</span> Daily {todayP2Type} ({todayP2Time || `${String(todayP2Hour).padStart(2, '0')}:00`})
                        </div>
                      </div>

                      {/* P1 Status */}
                      <div className="space-y-1 pt-2">
                        <div className="font-bold text-foreground">P1 Status</div>
                        <div className="text-muted-foreground pl-2">
                          <span className="text-foreground">{keyInsights.pct1}%</span> of P1's formed after {String(todayP1Hour).padStart(2, '0')}:00
                        </div>
                        <div className="text-muted-foreground pl-2">
                          <span className="text-foreground">{keyInsights.pct2}%</span> of P1's formed at or after {String(todayP2Hour).padStart(2, '0')}:00
                        </div>
                      </div>

                      {/* P2 Status */}
                      <div className="space-y-1 pt-2">
                        <div className="font-bold text-foreground">P2 Status</div>
                        <div className="text-muted-foreground pl-2">
                          <span className="text-foreground">{keyInsights.pct3}%</span> of P2's formed after {String(todayP2Hour).padStart(2, '0')}:00
                        </div>
                        <div className="text-muted-foreground pl-2">
                          <span className="text-foreground">{keyInsights.pct4}%</span> of P2's formed after {String(currentHour).padStart(2, '0')}:00
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="space-y-1 pt-2 border-t border-border">
                        <div className="font-bold text-foreground">Summary</div>
                        <div className="text-muted-foreground">
                          <span className={cn("font-bold", keyInsights.flipRiskColor)}>{keyInsights.flipRisk}</span> P1 flip risk - <span className="text-foreground">{keyInsights.pct2}%</span> of days took out the daily {todayP1Type}
                        </div>
                        <div className="text-muted-foreground">
                          <span className={cn("font-bold", keyInsights.p2LikelyColor)}>{keyInsights.p2Likely}</span> P2 is in - <span className="text-foreground">{keyInsights.pct4}%</span> of days form a new P2 after {String(currentHour).padStart(2, '0')}:00
                        </div>
                      </div>

                      {/* Price Chart */}
                      {todayChartData.length > 0 && todayP1Price && todayP2Price && (
                        <div className="pt-2 border-t border-border">
                          <div className="font-bold text-foreground mb-2">Today's Price Action</div>
                          <div className="bg-muted/20 rounded border border-border p-3">
                            <ResponsiveContainer width="100%" height={320}>
                              <LineChart data={todayChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <XAxis 
                                  dataKey="time" 
                                  tick={{ fontSize: 10, fill: isDark ? '#aaa' : '#666' }}
                                  interval={Math.floor(todayChartData.length / 8)}
                                  tickMargin={5}
                                  stroke={isDark ? '#444' : '#ddd'}
                                />
                                <YAxis 
                                  domain={['dataMin - 0.5%', 'dataMax + 0.5%']}
                                  tick={{ fontSize: 10, fill: isDark ? '#aaa' : '#666' }}
                                  width={60}
                                  tickFormatter={(value) => value.toFixed(2)}
                                  stroke={isDark ? '#444' : '#ddd'}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                    border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                                    borderRadius: '6px',
                                    fontSize: '11px'
                                  }}
                                  labelStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                  formatter={(value: any) => [parseFloat(value).toFixed(2), 'Price']}
                                />
                                {/* P1 Reference Line */}
                                <ReferenceLine 
                                  y={todayP1Price} 
                                  stroke="#3b82f6" 
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  label={{ 
                                    value: `P1 ${todayP1Type === 'high' ? '↑' : '↓'} ${todayP1Price.toFixed(2)}`, 
                                    position: 'insideTopRight',
                                    fontSize: 10,
                                    fill: '#3b82f6',
                                    fontWeight: 'bold'
                                  }}
                                />
                                {/* P2 Reference Line */}
                                <ReferenceLine 
                                  y={todayP2Price} 
                                  stroke="#f59e0b" 
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  label={{ 
                                    value: `P2 ${todayP2Type === 'high' ? '↑' : '↓'} ${todayP2Price.toFixed(2)}`, 
                                    position: 'insideBottomRight',
                                    fontSize: 10,
                                    fill: '#f59e0b',
                                    fontWeight: 'bold'
                                  }}
                                />
                                {/* Price Line */}
                                <Line 
                                  type="monotone" 
                                  dataKey="price" 
                                  stroke={isDark ? '#10b981' : '#059669'}
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                                {/* P1 Marker */}
                                {todayP1Time && (
                                  <ReferenceDot
                                    x={todayP1Time}
                                    y={todayP1Price}
                                    r={6}
                                    fill="#3b82f6"
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                )}
                                {/* P2 Marker */}
                                {todayP2Time && (
                                  <ReferenceDot
                                    x={todayP2Time}
                                    y={todayP2Price}
                                    r={6}
                                    fill="#f59e0b"
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                )}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      No data for today. Fetch data to see insights.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground font-mono">
              Select ticker and date range to analyze
            </p>
          </div>
        )}
      </div>
            </TabsContent>

            {/* Weekly Tab - Placeholder */}
            <TabsContent value="weekly" className="flex-1 flex flex-col m-0">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground font-mono">
                  Weekly pivot analysis coming soon
                </p>
              </div>
            </TabsContent>

            {/* Session Tab - Placeholder */}
            <TabsContent value="session" className="flex-1 flex flex-col m-0">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground font-mono">
                  Session pivot analysis coming soon
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Distance Tab - Placeholder */}
        <TabsContent value="distance" className="flex-1 flex flex-col m-0">
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground font-mono">
              Distance analysis coming soon
            </p>
          </div>
        </TabsContent>

        {/* Summary Tab - Placeholder */}
        <TabsContent value="summary" className="flex-1 flex flex-col m-0">
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground font-mono">
              Summary analysis coming soon
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
