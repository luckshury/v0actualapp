'use client'

import { memo, useEffect, useRef, useState } from 'react'
import React from 'react'
import { generateFastChart } from '@/lib/fast-chart-generator'
import { getStaticChart, generateFallbackChart, preloadChartDatabase } from '@/lib/static-chart-loader'

interface ChartDataPoint {
  timestamp: number
  price: number
}

interface StockData {
  symbol: string
  change: number
  price: number
  data: ChartDataPoint[]
  exchange: string
}

interface RawStockGridProps {
  stocks: StockData[]
  range: string
  onStockClick: (stock: StockData) => void
  crazyMode?: boolean
  hybridMode?: boolean
  exchange?: 'hyperliquid' | 'bybit' | 'binance'
}

// Format price with dynamic decimal places
const formatPrice = (price: number): string => {
  if (price === 0) return '$0.00'
  if (price < 0.00001) return `$${price.toFixed(8)}`
  if (price < 0.0001) return `$${price.toFixed(7)}`
  if (price < 0.001) return `$${price.toFixed(6)}`
  if (price < 0.01) return `$${price.toFixed(5)}`
  if (price < 1) return `$${price.toFixed(4)}`
  if (price < 100) return `$${price.toFixed(3)}`
  return `$${price.toFixed(2)}`
}

// Hybrid chart generation: static first, then dynamic fallback
const getChartImage = async (
  data: ChartDataPoint[],
  symbol: string,
  range: string,
  isPositive: boolean,
  width = 80,
  height = 40
): Promise<string> => {
  // Try static chart first for instant loading
  try {
    const staticChart = await getStaticChart(symbol, range)
    if (staticChart) {
      return staticChart
    }
  } catch (error) {
    // Fallback to dynamic chart
  }
  
  // Fallback to dynamic chart generation with actual data
  if (data && data.length > 0) {
    return generateFastChart(data, symbol, range, isPositive, width, height)
  }
  
  // Final fallback to simple chart
  return generateFallbackChart(symbol, isPositive, width, height)
}

// Generate HTML for a single widget with hybrid chart approach and instant CSS tooltip
const generateWidgetHTML = (
  stock: StockData, 
  index: number, 
  crazyMode: boolean,
  range: string,
  chartImage?: string,
  exchange?: 'hyperliquid' | 'bybit' | 'binance'
): string => {
  const isPositive = stock.change >= 0
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500'
  const changeSign = isPositive ? '+' : ''
  
  // Use provided chart image or generate from data
  const finalChartImage = chartImage || generateFastChart(
    stock.data, 
    stock.symbol, 
    range, 
    isPositive, 
    crazyMode ? 60 : 80, 
    crazyMode ? 30 : 40
  )
  
  // Show "Coming Soon" only for Binance (not yet implemented)
  const showComingSoon = exchange === 'binance'
  
  if (showComingSoon) {
    return `<div 
      class="bg-card border-2 border-border p-2 sm:p-3 cursor-not-allowed min-w-0 opacity-60" 
      data-symbol="${stock.symbol}"
      data-index="${index}"
    >
      <div class="flex items-start justify-between gap-1 mb-1 sm:mb-2 min-w-0">
        <h3 class="text-xs sm:text-sm font-mono font-bold text-foreground truncate flex-1 min-w-0">
          ${stock.symbol}
        </h3>
        <span class="text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap text-muted-foreground">
          --
        </span>
      </div>
      
      <div class="h-10 sm:h-12 mb-1 sm:mb-2 min-w-0 flex items-center justify-center">
        <span class="text-xs font-mono text-muted-foreground">Coming Soon</span>
      </div>
      
      <div class="text-sm sm:text-base md:text-lg font-mono font-bold text-muted-foreground truncate">
        --
      </div>
    </div>`
  }
  
  // Simple browser native tooltip - zero lag
  const tooltipContent = `${stock.symbol}: ${formatPrice(stock.price)} (${changeSign}${stock.change.toFixed(2)}%)`
  
  return `<div 
    class="bg-card border-2 border-border p-2 sm:p-3 cursor-pointer min-w-0 stock-widget"
    data-symbol="${stock.symbol}"
    data-index="${index}"
    title="${tooltipContent}"
  >
    <div class="flex items-start justify-between gap-1 mb-1 sm:mb-2 min-w-0">
      <h3 class="text-xs sm:text-sm font-mono font-bold text-foreground truncate flex-1 min-w-0">
        ${stock.symbol}
      </h3>
      <span class="text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap ${changeColor}">
        ${changeSign}${stock.change.toFixed(2)}%
      </span>
    </div>
    
    <div class="h-10 sm:h-12 mb-1 sm:mb-2 min-w-0 flex items-center justify-center">
      <img 
        src="${finalChartImage}" 
        alt="${stock.symbol} chart" 
        class="w-full h-full object-contain" 
        style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
      />
    </div>
    
    <div class="text-sm sm:text-base md:text-lg font-mono font-bold text-foreground truncate">
      ${formatPrice(stock.price)}
    </div>
  </div>`
}

const RawStockGridComponent = ({ 
  stocks, 
  range, 
  onStockClick, 
  crazyMode = false,
  hybridMode = false,
  exchange = 'hyperliquid'
}: RawStockGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stocksRef = useRef<StockData[]>(stocks)
  const rafRef = useRef<number | null>(null)
  const [chartImages, setChartImages] = useState<Map<string, string>>(new Map())
  const [renderVersion, setRenderVersion] = useState(0)

  // Update stocks ref
  stocksRef.current = stocks
  
  // Preload static chart database on mount
  useEffect(() => {
    preloadChartDatabase()
  }, [])

  // Load hybrid charts (static first, dynamic fallback)
  useEffect(() => {
    if (stocks.length === 0) return
    
    const loadCharts = async () => {
      const startTime = performance.now()
      const newChartImages = new Map<string, string>()
      
      // Load all charts in parallel with hybrid approach
      const chartPromises = stocks.map(async (stock) => {
        const chartWidth = crazyMode ? 60 : 80
        const chartHeight = crazyMode ? 30 : 40
        const chartImage = await getChartImage(
          stock.data,  // Pass the actual chart data
          stock.symbol, 
          range, 
          stock.change >= 0, 
          chartWidth, 
          chartHeight
        )
        newChartImages.set(`${stock.symbol}-${range}`, chartImage)
      })
      
      await Promise.all(chartPromises)
      
      setChartImages(newChartImages)
      setRenderVersion(v => v + 1)
    }
    
    loadCharts()
  }, [stocks, range, crazyMode])
  
  // Ultra-fast HTML rendering with hybrid charts
  useEffect(() => {
    if (!containerRef.current) return

    // Performance timing
    const startTime = performance.now()
    
    // Generate all widget HTML with hybrid chart images
    const html = stocks
      .map((stock, index) => {
        const chartKey = `${stock.symbol}-${range}`
        const chartImage = chartImages.get(chartKey)
        return generateWidgetHTML(stock, index, crazyMode, range, chartImage, exchange)
      })
      .join('')
    
    // Single DOM update - ultra-fast
    containerRef.current.innerHTML = html
  }, [stocks, crazyMode, range, chartImages, renderVersion, exchange])

  // Handle clicks - instant response, no debouncing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const widget = target.closest('.stock-widget') as HTMLElement
      
      if (widget) {
        const index = parseInt(widget.dataset.index || '0', 10)
        const stock = stocksRef.current[index]
        if (stock) {
          onStockClick(stock)
        }
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onStockClick])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const gridClass = crazyMode
    ? "stock-grid-container grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1 relative"
    : hybridMode 
      ? "stock-grid-container grid grid-cols-2 lg:grid-cols-3 gap-2 relative"
      : "stock-grid-container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 relative"

  return (
    <div ref={containerRef} className={gridClass} />
  )
}

export const RawStockGrid = memo(RawStockGridComponent, (prevProps, nextProps) => {
  // Only re-render if props actually change
  return (
    prevProps.stocks === nextProps.stocks &&
    prevProps.range === nextProps.range &&
    prevProps.crazyMode === nextProps.crazyMode &&
    prevProps.hybridMode === nextProps.hybridMode &&
    prevProps.exchange === nextProps.exchange
  )
})

RawStockGrid.displayName = 'RawStockGrid'

