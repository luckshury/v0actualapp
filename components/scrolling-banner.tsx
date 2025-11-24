'use client'

import { TickerPrice } from '@/contexts/app-state-context'

interface ScrollingBannerProps {
  tickers?: TickerPrice[]
}

// Format price with dynamic decimal places based on magnitude
const formatPrice = (price: number): string => {
  if (price === 0) return '$0.00'
  if (price < 0.00001) return `$${price.toFixed(8)}` // Very very small
  if (price < 0.0001) return `$${price.toFixed(7)}`  // Very small
  if (price < 0.001) return `$${price.toFixed(6)}`   // Very small
  if (price < 0.01) return `$${price.toFixed(5)}`    // Small
  if (price < 1) return `$${price.toFixed(4)}`       // Less than $1
  if (price < 100) return `$${price.toFixed(3)}`     // Less than $100
  return `$${price.toFixed(2)}`                      // Normal prices
}

export function ScrollingBanner({ tickers = [] }: ScrollingBannerProps) {
  // Format tickers for display - show all tickers
  const formattedTickers = tickers.length > 0 
    ? tickers.map((ticker) => ({
        symbol: ticker.symbol,
        price: formatPrice(ticker.price),
        change: `${ticker.change !== undefined && ticker.change >= 0 ? '+' : ''}${(ticker.change || 0).toFixed(2)}%`,
        status: (ticker.change || 0) >= 0 ? 'up' as const : 'down' as const,
      }))
    : [{ symbol: 'Loading tickers...', price: '$0.00', change: '+0.00%', status: 'up' as const }]

  // Duplicate the tickers array multiple times for seamless loop
  const duplicatedTickers = [...formattedTickers, ...formattedTickers, ...formattedTickers]

  if (duplicatedTickers.length === 0) {
    return (
      <div className="w-full bg-card border-b-2 border-border min-h-[60px] flex items-center px-4">
        <span className="text-sm font-mono text-muted-foreground">No tickers available</span>
      </div>
    )
  }

  return (
    <div className="w-full bg-card border-b-2 border-border overflow-hidden min-h-[60px] relative">
      <div className="absolute inset-0 flex items-center">
        <div className="flex animate-scroll gap-6 py-3 px-4 will-change-transform">
          {duplicatedTickers.map((ticker, index) => (
            <div
              key={`${ticker.symbol}-${index}`}
              className="flex items-center gap-3 px-4 whitespace-nowrap font-mono border-r-2 border-border/50"
            >
              <span className="text-sm font-bold text-foreground">
                {ticker.symbol}
              </span>
              <span className="text-sm text-muted-foreground">
                {ticker.price}
              </span>
              <span
                className={`text-sm font-medium ${
                  ticker.status === 'up' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {ticker.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
