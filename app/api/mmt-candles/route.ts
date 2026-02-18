import { NextRequest, NextResponse } from 'next/server'

const MMT_API_KEY = process.env.MMT_API_KEY || 'sk_31d1c1a1ef3e55eaed1a6de7bf11ef22'
const MMT_BASE_URL = 'https://eu-central-1.mmt.gg/api/v1'

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const exchange = searchParams.get('exchange') || 'binancef'
  const symbol = searchParams.get('symbol') || 'btc/usd'
  const tf = searchParams.get('tf') || '1h'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'from and to are required (unix seconds)' } },
      { status: 400 }
    )
  }

  const cacheKey = `${exchange}-${symbol}-${tf}-${from}-${to}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data)
  }

  try {
    const url = `${MMT_BASE_URL}/candles?exchange=${encodeURIComponent(exchange)}&symbol=${encodeURIComponent(symbol)}&tf=${tf}&from=${from}&to=${to}`

    const response = await fetch(url, {
      headers: {
        'X-API-Key': MMT_API_KEY,
        'Accept-Encoding': 'gzip',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
      return NextResponse.json(errorData, { status: response.status })
    }

    const result = await response.json()
    cache.set(cacheKey, { data: result, timestamp: Date.now() })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('MMT API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Internal Server Error' } },
      { status: 500 }
    )
  }
}
