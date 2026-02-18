'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createChart, ColorType, CrosshairMode, CandlestickSeries } from 'lightweight-charts'
import { ChevronsUpDown, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

const SESSIONS = [
  { name: 'Asia', startHour: 0, endHour: 6 },
  { name: 'London', startHour: 6, endHour: 12 },
  { name: 'New York', startHour: 12, endHour: 20 },
  { name: 'Close', startHour: 20, endHour: 24 },
]

const UP_COLOR = '#32D695'
const DOWN_COLOR = '#FF4C61'
const BG_COLOR = '#161616'

interface RawCandle {
  t: number
  o: number
  h: number
  l: number
  c: number
  vb?: number
  vs?: number
}

interface SessionCandle {
  _key: string
  time: number
  open: number
  high: number
  low: number
  close: number
}

function aggregateToSessions(candles: RawCandle[]): SessionCandle[] {
  candles.sort((a, b) => a.t - b.t)
  const sessionCandles: SessionCandle[] = []
  let current: SessionCandle | null = null

  for (const c of candles) {
    const date = new Date(c.t * 1000)
    const hour = date.getUTCHours()
    const session = SESSIONS.find(s => hour >= s.startHour && hour < s.endHour)
    if (!session) continue

    const dayStr = date.toISOString().slice(0, 10)
    const key = `${dayStr}-${session.name}`

    if (!current || current._key !== key) {
      if (current) sessionCandles.push(current)
      current = {
        _key: key,
        time: c.t,
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      }
    } else {
      current.high = Math.max(current.high, c.h)
      current.low = Math.min(current.low, c.l)
      current.close = c.c
    }
  }
  if (current) sessionCandles.push(current)
  return sessionCandles
}

export default function SessionCandlesPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)

  const [exchange, setExchange] = useState('binancef')
  const [ticker, setTicker] = useState('BTC/USD')
  const [tickers, setTickers] = useState<string[]>([])
  const [tickerSearch, setTickerSearch] = useState('')
  const [tickerOpen, setTickerOpen] = useState(false)
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingSymbols, setLoadingSymbols] = useState(false)

  // Fetch symbols when exchange changes
  useEffect(() => {
    const fetchSymbols = async () => {
      setLoadingSymbols(true)
      try {
        const resp = await fetch(`/api/mmt-markets?exchange=${encodeURIComponent(exchange)}`)
        const data = await resp.json()
        const symbols: string[] = data.symbols || []
        setTickers(symbols)
        if (symbols.length > 0 && !symbols.includes(ticker)) {
          const btc = symbols.find(s => s === 'BTC/USD')
          setTicker(btc || symbols[0])
        }
      } catch (err) {
        console.error('Failed to fetch symbols:', err)
        setTickers(['BTC/USD', 'ETH/USD', 'SOL/USD'])
      }
      setLoadingSymbols(false)
    }
    fetchSymbols()
  }, [exchange])

  const filteredTickers = useMemo(() => {
    if (!tickerSearch) return tickers
    const search = tickerSearch.toLowerCase()
    return tickers.filter(t => t.toLowerCase().includes(search))
  }, [tickers, tickerSearch])

  // Init chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: BG_COLOR },
        textColor: '#888',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e1e1e' },
        horzLines: { color: '#1e1e1e' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#444', width: 1, style: 2 },
        horzLine: { color: '#444', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    })
    ro.observe(chartContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Fetch and render candles
  const loadChart = useCallback(async () => {
    if (!seriesRef.current || !chartRef.current) return
    setLoading(true)
    setError(null)

    const now = Math.floor(Date.now() / 1000)
    const from = now - parseInt(days) * 86400
    const mmtSymbol = ticker.toLowerCase()
    const url = `/api/mmt-candles?exchange=${encodeURIComponent(exchange)}&symbol=${encodeURIComponent(mmtSymbol)}&tf=1h&from=${from}&to=${now}`

    try {
      const resp = await fetch(url)
      const json = await resp.json()
      if (json.error) throw new Error(json.error.message || JSON.stringify(json.error))

      const raw: RawCandle[] = json.data || []
      const sessions = aggregateToSessions(raw)
      const colored = sessions.map(sc => {
        const color = sc.close >= sc.open ? UP_COLOR : DOWN_COLOR
        return {
          time: sc.time as any,
          open: sc.open,
          high: sc.high,
          low: sc.low,
          close: sc.close,
          color,
          borderColor: color,
          wickColor: color,
        }
      })

      seriesRef.current.setData(colored)
      chartRef.current.timeScale().fitContent()
    } catch (err: any) {
      setError(err.message || 'Failed to load candles')
      console.error(err)
    }
    setLoading(false)
  }, [exchange, ticker, days])

  // Reload when params change
  useEffect(() => {
    loadChart()
  }, [loadChart])

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 md:flex-wrap">
          {/* Exchange */}
          <Select value={exchange} onValueChange={setExchange}>
            <SelectTrigger className="w-full md:w-44 font-mono text-xs h-8">
              <SelectValue placeholder="Exchange" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="binancef" className="font-mono text-xs">Binance Futures</SelectItem>
              <SelectItem value="bybitf" className="font-mono text-xs">Bybit Futures</SelectItem>
              <SelectItem value="okxf" className="font-mono text-xs">OKX Futures</SelectItem>
              <SelectItem value="deribitf" className="font-mono text-xs">Deribit Futures</SelectItem>
              <SelectItem value="hyperliquid" className="font-mono text-xs">Hyperliquid</SelectItem>
              <SelectItem value="hyperliquid-xyz" className="font-mono text-xs">Hyperliquid XYZ</SelectItem>
              <SelectItem value="bitmexf" className="font-mono text-xs">BitMEX Futures</SelectItem>
              <SelectItem value="bitfinexf" className="font-mono text-xs">Bitfinex Futures</SelectItem>
              <SelectItem value="lighterf" className="font-mono text-xs">Lighter</SelectItem>
              <SelectItem value="bybitf-inverse" className="font-mono text-xs">Bybit Inverse</SelectItem>
              <SelectItem value="bitmexf-inverse" className="font-mono text-xs">BitMEX Inverse</SelectItem>
              <SelectItem value="deribitf-inverse" className="font-mono text-xs">Deribit Inverse</SelectItem>
              <SelectItem value="binance" className="font-mono text-xs">Binance Spot</SelectItem>
              <SelectItem value="bybit" className="font-mono text-xs">Bybit Spot</SelectItem>
              <SelectItem value="coinbase" className="font-mono text-xs">Coinbase</SelectItem>
              <SelectItem value="okx" className="font-mono text-xs">OKX Spot</SelectItem>
              <SelectItem value="deribit" className="font-mono text-xs">Deribit Spot</SelectItem>
              <SelectItem value="kraken" className="font-mono text-xs">Kraken</SelectItem>
              <SelectItem value="bitfinex" className="font-mono text-xs">Bitfinex</SelectItem>
            </SelectContent>
          </Select>

          {/* Ticker */}
          <div className="w-full md:w-40">
            <Popover open={tickerOpen} onOpenChange={setTickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tickerOpen}
                  className="w-full justify-between font-mono text-xs h-8"
                  disabled={loadingSymbols}
                >
                  {loadingSymbols ? 'Loading...' : ticker}
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

          {/* Days */}
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-full md:w-24 font-mono text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" className="font-mono text-xs">7 days</SelectItem>
              <SelectItem value="14" className="font-mono text-xs">14 days</SelectItem>
              <SelectItem value="30" className="font-mono text-xs">30 days</SelectItem>
              <SelectItem value="90" className="font-mono text-xs">90 days</SelectItem>
              <SelectItem value="180" className="font-mono text-xs">180 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={loadChart}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>

          {loading && (
            <span className="text-xs text-muted-foreground font-mono">Loading...</span>
          )}
          {error && (
            <span className="text-xs text-destructive font-mono">{error}</span>
          )}
        </div>
      </div>

      {/* Session Legend */}
      <div className="border-b border-border bg-card px-4 py-1.5 flex items-center gap-4 overflow-x-auto">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Sessions (UTC):</span>
        <span className="text-[10px] font-mono"><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#4A90D9' }} />Asia 00–06</span>
        <span className="text-[10px] font-mono"><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#E6A817' }} />London 06–12</span>
        <span className="text-[10px] font-mono"><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#D94A4A' }} />NY 12–20</span>
        <span className="text-[10px] font-mono"><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#8B5CF6' }} />Close 20–00</span>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </div>
  )
}
