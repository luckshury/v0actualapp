import { NextResponse } from 'next/server'

const BYBIT_API_URL = 'https://api.bybit.com'
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour cache

interface InstrumentInfo {
  symbol: string
  contractType: string
  status: string
}

let cachedTickers: string[] = []
let lastFetchTime = 0

export async function GET() {
  try {
    // Return cached data if still valid
    const now = Date.now()
    if (cachedTickers.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
      console.log(`✅ Returning ${cachedTickers.length} cached Bybit tickers`)
      return NextResponse.json({ tickers: cachedTickers })
    }

    console.log('📊 Fetching all Bybit linear (USDT perpetual) tickers...')
    
    const allSymbols: string[] = []
    let cursor = ''
    let hasMore = true

    // Paginate through all instruments
    while (hasMore) {
      const url = new URL(`${BYBIT_API_URL}/v5/market/instruments-info`)
      url.searchParams.set('category', 'linear')
      url.searchParams.set('limit', '1000')
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error(`Bybit instruments API error: ${response.status}`)
        break
      }

      const data = await response.json()

      if (data.retCode !== 0 || !data.result || !Array.isArray(data.result.list)) {
        console.error('Unexpected Bybit instruments response:', data)
        break
      }

      // Filter for active trading instruments
      const activeSymbols = data.result.list
        .filter((instrument: InstrumentInfo) => 
          instrument.status === 'Trading' && 
          instrument.contractType === 'LinearPerpetual'
        )
        .map((instrument: InstrumentInfo) => instrument.symbol)

      allSymbols.push(...activeSymbols)

      // Check if there's more data
      cursor = data.result.nextPageCursor || ''
      hasMore = cursor !== ''
    }

    console.log(`✅ Fetched ${allSymbols.length} active Bybit linear perpetual tickers`)

    // Cache the results
    cachedTickers = allSymbols
    lastFetchTime = Date.now()

    return NextResponse.json({ tickers: allSymbols })
  } catch (error) {
    console.error('Error fetching Bybit tickers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





