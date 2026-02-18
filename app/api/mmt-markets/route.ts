import { NextRequest, NextResponse } from 'next/server'

const MMT_API_KEY = process.env.MMT_API_KEY || 'sk_31d1c1a1ef3e55eaed1a6de7bf11ef22'
const MMT_BASE_URL = 'https://eu-central-1.mmt.gg/api/v1'

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes

export async function GET(request: NextRequest) {
  const exchange = request.nextUrl.searchParams.get('exchange') || 'binancef'

  const cached = cache.get(exchange)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data)
  }

  try {
    const url = `${MMT_BASE_URL}/markets?exchange=${encodeURIComponent(exchange)}`
    const response = await fetch(url, {
      headers: { 'X-API-Key': MMT_API_KEY, 'Accept-Encoding': 'gzip' },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
      return NextResponse.json(errorData, { status: response.status })
    }

    const result = await response.json()
    const symbols = (result.exchanges?.[0]?.symbols || [])
      .map((s: any) => s.symbol.toUpperCase())
      .sort()

    const data = { symbols }
    cache.set(exchange, { data, timestamp: Date.now() })
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('MMT Markets API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Internal Server Error' } },
      { status: 500 }
    )
  }
}
