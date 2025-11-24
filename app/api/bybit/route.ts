import { NextRequest, NextResponse } from 'next/server'

interface ChartDataPoint {
  timestamp: number
  price: number
}

interface RangeConfig {
  interval: string
  durationMs: number
}

const BYBIT_API_URL = 'https://api.bybit.com'
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minute cache for faster updates
const RATE_LIMIT_DELAY = 100 // 100ms delay between batches to avoid rate limiting
const MAX_CONCURRENT_REQUESTS = 3 // Limit concurrent requests to avoid rate limits

const RANGE_CONFIG: Record<string, RangeConfig> = {
  '1h': { interval: '1', durationMs: 60 * 60 * 1000 },
  '4h': { interval: '5', durationMs: 4 * 60 * 60 * 1000 },
  '1d': { interval: '15', durationMs: 24 * 60 * 60 * 1000 },
  '7d': { interval: '60', durationMs: 7 * 24 * 60 * 60 * 1000 },
  '30d': { interval: '240', durationMs: 30 * 24 * 60 * 60 * 1000 },
}

const DEFAULT_RANGE = '1d'

const klineCache = new Map<string, { data: ChartDataPoint[]; timestamp: number }>()

function resolveRange(rangeParam: string | null): { range: string; config: RangeConfig } {
  const normalized = rangeParam?.toLowerCase() ?? DEFAULT_RANGE
  const config = RANGE_CONFIG[normalized]
  if (config) {
    return { range: normalized, config }
  }
  return { range: DEFAULT_RANGE, config: RANGE_CONFIG[DEFAULT_RANGE] }
}

async function fetchBybitKlines(
  symbol: string,
  config: RangeConfig,
  category: string = 'linear'
): Promise<ChartDataPoint[]> {
  const now = Date.now()
  const startTime = now - config.durationMs

  // Bybit expects symbols in format like BTCUSDT (no separator)
  const bybitSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')

  try {
    const url = new URL(`${BYBIT_API_URL}/v5/market/kline`)
    url.searchParams.set('category', category)
    url.searchParams.set('symbol', bybitSymbol)
    url.searchParams.set('interval', config.interval)
    url.searchParams.set('start', startTime.toString())
    url.searchParams.set('end', now.toString())
    url.searchParams.set('limit', '1000')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`Bybit kline error for ${bybitSymbol}: ${response.status}`)
      return []
    }

    const data = await response.json()
    
    if (data.retCode !== 0 || !data.result || !Array.isArray(data.result.list)) {
      console.warn(`Unexpected Bybit response for ${bybitSymbol}:`, data)
      return []
    }

    // Bybit returns: [startTime, open, high, low, close, volume, turnover]
    const chartData: ChartDataPoint[] = data.result.list
      .map((candle: any[]) => {
        const timestamp = Number(candle[0])
        const close = Number(candle[4])
        if (!Number.isFinite(timestamp) || !Number.isFinite(close)) {
          return null
        }
        return { timestamp, price: close }
      })
      .filter((item): item is ChartDataPoint => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp)

    return chartData
  } catch (error) {
    console.error(`Error fetching Bybit klines for ${bybitSymbol}:`, error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbolsParam = searchParams.get('symbols')
    const categoryParam = searchParams.get('category') || 'linear'
    const { range, config } = resolveRange(searchParams.get('range'))

    if (!symbolsParam) {
      return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 })
    }

    const now = Date.now()
    const symbolList = symbolsParam
      .split(',')
      .map((symbol) => symbol.trim().toUpperCase())
      .filter((symbol, index, arr) => symbol && arr.indexOf(symbol) === index)

    const results: Record<string, ChartDataPoint[]> = {}

    // First check cache and separate cached vs uncached symbols
    const cachedResults: Record<string, ChartDataPoint[]> = {}
    const uncachedSymbols: string[] = []
    
    symbolList.forEach(symbol => {
      const cacheKey = `${symbol}-${range}-${categoryParam}`
      const cached = klineCache.get(cacheKey)
      
      if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
        cachedResults[symbol] = cached.data
      } else {
        uncachedSymbols.push(symbol)
      }
    })
    
    console.log(`📊 Bybit: ${Object.keys(cachedResults).length} cached, ${uncachedSymbols.length} to fetch`)
    
    // If we have too many uncached symbols, prioritize the most common ones
    const prioritySymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT']
    const sortedUncached = uncachedSymbols.sort((a, b) => {
      const aIndex = prioritySymbols.indexOf(a)
      const bIndex = prioritySymbols.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })
    
    // Limit concurrent requests and add delays
    const symbolResults: { symbol: string; data: ChartDataPoint[] }[] = []
    
    for (let i = 0; i < sortedUncached.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = sortedUncached.slice(i, i + MAX_CONCURRENT_REQUESTS)
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          const data = await fetchBybitKlines(symbol, config, categoryParam)
          const cacheKey = `${symbol}-${range}-${categoryParam}`
          klineCache.set(cacheKey, { data, timestamp: Date.now() })
          return { symbol, data }
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error)
          return { symbol, data: [] }
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          symbolResults.push(result.value)
        }
      })
      
      // Add delay between batches to avoid rate limiting
      if (i + MAX_CONCURRENT_REQUESTS < sortedUncached.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
      }
    }
    
    // Combine cached and fetched results
    Object.assign(results, cachedResults)
    symbolResults.forEach((result) => {
      results[result.symbol] = result.data
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Bybit historical route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





