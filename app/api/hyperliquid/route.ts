import { NextRequest, NextResponse } from 'next/server'
import { normalizeTickerSymbol } from '@/lib/symbol-utils'

interface ChartDataPoint {
  timestamp: number
  price: number
}

interface RangeConfig {
  interval: string
  durationMs: number
}

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info'
const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minute cache for instant performance

const RANGE_CONFIG: Record<string, RangeConfig> = {
  '1h': { interval: '1m', durationMs: 60 * 60 * 1000 },
  '4h': { interval: '3m', durationMs: 4 * 60 * 60 * 1000 },
  '1d': { interval: '5m', durationMs: 24 * 60 * 60 * 1000 },
  '7d': { interval: '1h', durationMs: 7 * 24 * 60 * 60 * 1000 },
  '30d': { interval: '4h', durationMs: 30 * 24 * 60 * 60 * 1000 },
  '1y': { interval: '1d', durationMs: 365 * 24 * 60 * 60 * 1000 },
}

const DEFAULT_RANGE = '1d'

const candleCache = new Map<string, { data: ChartDataPoint[]; timestamp: number }>()

function resolveRange(rangeParam: string | null): { range: string; config: RangeConfig } {
  const normalized = rangeParam?.toLowerCase() ?? DEFAULT_RANGE
  const config = RANGE_CONFIG[normalized]
  if (config) {
    return { range: normalized, config }
  }
  return { range: DEFAULT_RANGE, config: RANGE_CONFIG[DEFAULT_RANGE] }
}

async function fetchHyperliquidCandles(symbol: string, config: RangeConfig): Promise<ChartDataPoint[]> {
  const now = Date.now()
  const startTime = now - config.durationMs

  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: {
        coin: symbol,
        interval: config.interval,
        startTime,
        endTime: now,
      },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error(`Hyperliquid candle snapshot error for ${symbol}: ${response.status}`)
    return []
  }

  const candles = await response.json()
  if (!Array.isArray(candles)) {
    console.warn(`Unexpected candle response format for ${symbol}`, candles)
    return []
  }

  const chartData: ChartDataPoint[] = candles
    .map((candle) => {
      const timestamp = Number(candle?.t ?? candle?.T)
      const close = Number(candle?.c ?? candle?.close)
      if (!Number.isFinite(timestamp) || !Number.isFinite(close)) {
        return null
      }
      return { timestamp, price: close }
    })
    .filter((item): item is ChartDataPoint => item !== null)
    .sort((a, b) => a.timestamp - b.timestamp)

  return chartData
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbolsParam = searchParams.get('symbols')
    const { range, config } = resolveRange(searchParams.get('range'))

    if (!symbolsParam) {
      return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 })
    }

    const now = Date.now()
    const symbolList = symbolsParam
      .split(',')
      .map((symbol) => normalizeTickerSymbol(symbol) || symbol.toUpperCase())
      .filter((symbol, index, arr) => symbol && arr.indexOf(symbol) === index)

    const results: Record<string, ChartDataPoint[]> = {}

    // Process all symbols in parallel for maximum speed
    const symbolPromises = symbolList.map(async (symbol) => {
      const cacheKey = `${symbol}-${range}`
      const cached = candleCache.get(cacheKey)
      
      if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
        return { symbol, data: cached.data }
      }

      try {
        const data = await fetchHyperliquidCandles(symbol, config)
        candleCache.set(cacheKey, { data, timestamp: Date.now() })
        return { symbol, data }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error)
        return { symbol, data: [] }
      }
    })

    // Wait for all symbols to complete in parallel
    const symbolResults = await Promise.allSettled(symbolPromises)
    
    symbolResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results[result.value.symbol] = result.value.data
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Hyperliquid historical route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


