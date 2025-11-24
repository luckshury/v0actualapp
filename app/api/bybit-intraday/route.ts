import { NextRequest, NextResponse } from 'next/server'

const BYBIT_API_URL = 'https://api.bybit.com'

// Cache for storing recent requests
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const interval = searchParams.get('interval') || '60' // 1 hour by default
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const limit = searchParams.get('limit') || '200'

  const cacheKey = `${symbol}-${interval}-${start}-${end}-${limit}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data)
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      category: 'linear',
      symbol: symbol.toUpperCase(),
      interval,
      limit,
    })

    if (start) params.append('start', start)
    if (end) params.append('end', end)

    const url = `${BYBIT_API_URL}/v5/market/kline?${params.toString()}`
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bybit API error:', errorText)
      return NextResponse.json(
        { retCode: response.status, retMsg: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching Bybit intraday data:', error)
    return NextResponse.json(
      { retCode: '500', retMsg: 'Internal Server Error' },
      { status: 500 }
    )
  }
}


