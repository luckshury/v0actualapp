import { NextRequest, NextResponse } from 'next/server'
import { getCoinGeckoId } from '@/lib/coingecko-mapping'
import { normalizeTickerSymbol } from '@/lib/symbol-utils'

const COINGECKO_API_KEY = 'CG-pMfXAwuUoNoaZ4GwQnfsA8T7'
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

// Data structure for chart data with timestamps
interface ChartDataPoint {
  timestamp: number // Unix timestamp in milliseconds
  price: number
}

// Cache for market chart data to avoid hitting rate limits
const marketChartCache = new Map<string, { data: ChartDataPoint[], timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes for instant cache hits

const RANGE_DURATION_MS: Record<string, number | null> = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
  '5y': 5 * 365 * 24 * 60 * 60 * 1000,
  'max': null,
}

const DEFAULT_RANGE = '1d'

function normalizeRange(rangeParam: string | null): string {
  const normalized = rangeParam?.toLowerCase() ?? DEFAULT_RANGE
  return normalized in RANGE_DURATION_MS ? normalized : DEFAULT_RANGE
}

function filterChartDataByRange(data: ChartDataPoint[], range: string): ChartDataPoint[] {
  if (data.length === 0) {
    return data
  }

  const duration = RANGE_DURATION_MS[range]
  if (duration === null) {
    // 'max' or unknown large range – return everything
    return data
  }

  const latestTimestamp = data[data.length - 1]?.timestamp ?? Date.now()
  const cutoff = latestTimestamp - duration
  const filtered = data.filter(point => point.timestamp >= cutoff)
  
  // Ensure we always return at least two points for the chart to render
  if (filtered.length >= 2) {
    return filtered
  }

  return data.slice(-Math.min(data.length, 2))
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbols = searchParams.get('symbols')
    const days = searchParams.get('days') || '1'
    const range = normalizeRange(searchParams.get('range'))
    
    if (!symbols) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      )
    }

    const symbolList = symbols.split(',').map(s => s.trim())
    const results: Record<string, ChartDataPoint[]> = {}
    
    // Process all symbols in parallel for maximum speed
    const symbolPromises = symbolList.map(async (symbol) => {
      const canonicalSymbol = normalizeTickerSymbol(symbol) || symbol.toUpperCase()
      const cacheKey = `${canonicalSymbol}-${days}-${range}`
      
      // Check cache first
      const cached = marketChartCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return { symbol: canonicalSymbol, data: cached.data }
      }
      
      // Get CoinGecko ID for the symbol
      const coinGeckoId = getCoinGeckoId(canonicalSymbol)
      
      if (!coinGeckoId) {
        console.log(`⚠️ No CoinGecko mapping found for: ${symbol} (canonical ${canonicalSymbol})`)
        return { symbol: canonicalSymbol, data: [] }
      }
      
      try {
        // Use market_chart endpoint for better intraday granularity
        const url = `${COINGECKO_BASE_URL}/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=${days}`
        
        const response = await fetch(url, {
          headers: {
            'x-cg-pro-api-key': COINGECKO_API_KEY,
            'Accept': 'application/json',
          },
        })

        if (!response.ok) {
          console.error(`❌ CoinGecko API error for ${symbol} (${coinGeckoId}):`, response.status)
          return { symbol: canonicalSymbol, data: [] }
        }

        const data: { prices: number[][], market_caps: number[][], total_volumes: number[][] } = await response.json()
        
        // Extract timestamps and prices
        const chartData: ChartDataPoint[] = data.prices.map(item => ({
          timestamp: item[0], // Unix timestamp in milliseconds
          price: item[1]
        }))

        const filteredData = filterChartDataByRange(chartData, range)
        
        // Store in cache
        marketChartCache.set(cacheKey, {
          data: filteredData,
          timestamp: Date.now()
        })
        
        console.log(`✅ Parallel fetch: ${symbol} ${filteredData.length} points (${range}, days=${days})`)
        return { symbol: canonicalSymbol, data: filteredData }
        
      } catch (error) {
        console.error(`❌ Error fetching data for ${symbol}:`, error)
        return { symbol: canonicalSymbol, data: [] }
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
    console.error('❌ CoinGecko API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

