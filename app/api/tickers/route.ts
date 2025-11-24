import { NextResponse } from 'next/server'

const API_KEY = 'sk_nNhuLkdGdW5sxnYec33C2FBPzLjXBnEd'
const API_URL = 'https://api.hydromancer.xyz/info'

export async function GET() {
  try {
    // Fetch all tickers from all DEXs (including HIP 3 tokens)
    // Using "ALL_DEXS" will return tickers with DEX prefixes like "xyz:TOKEN", "vntls:TOKEN", etc.
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'allMids',
        dex: 'ALL_DEXS',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hydromancer API error:', errorText)
      return NextResponse.json(
        { error: `Failed to fetch tickers: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Count regular vs HIP 3 tickers
    const regularTickers = Object.keys(data).filter(key => !key.includes(':')).length
    const hip3Tickers = Object.keys(data).filter(key => key.includes(':')).length
    
    console.log(`Fetched ${Object.keys(data).length} total tickers:`)
    console.log(`  - ${regularTickers} regular tickers`)
    console.log(`  - ${hip3Tickers} HIP 3 tickers`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in tickers API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
