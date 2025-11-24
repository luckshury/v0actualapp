interface ChartDataPoint {
  timestamp: number
  price: number
}

interface FastChartOptions {
  width: number
  height: number
  color: string
  strokeWidth: number
}

// Ultra-fast Canvas-based chart renderer
export class FastChartGenerator {
  private static canvas: HTMLCanvasElement | null = null
  private static ctx: CanvasRenderingContext2D | null = null
  
  // Initialize shared canvas context (reuse for performance)
  private static initCanvas(): CanvasRenderingContext2D {
    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d')!
      this.ctx.imageSmoothingEnabled = true
      this.ctx.imageSmoothingQuality = 'high'
    }
    return this.ctx
  }
  
  // Generate chart as base64 data URL (ultra-fast rendering)
  static generateChart(
    data: ChartDataPoint[], 
    options: FastChartOptions
  ): string {
    if (data.length < 2) {
      return this.generateFlatLine(options)
    }
    
    const { width, height, color, strokeWidth } = options
    const ctx = this.initCanvas()
    
    // Set canvas dimensions
    this.canvas!.width = width * 2 // 2x for retina
    this.canvas!.height = height * 2
    ctx.scale(2, 2)
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Calculate bounds
    const prices = data.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    
    // Add padding (10% on each side)
    const padding = 2
    const chartWidth = width - (padding * 2)
    const chartHeight = height - (padding * 2)
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
    
    // Generate path
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    sortedData.forEach((point, index) => {
      const x = padding + (index / (sortedData.length - 1)) * chartWidth
      const y = padding + (1 - (point.price - minPrice) / priceRange) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // Convert to base64 data URL
    return this.canvas!.toDataURL('image/png', 0.8)
  }
  
  // Generate flat line for empty/invalid data
  private static generateFlatLine(options: FastChartOptions): string {
    const { width, height, color, strokeWidth } = options
    const ctx = this.initCanvas()
    
    this.canvas!.width = width * 2
    this.canvas!.height = height * 2
    ctx.scale(2, 2)
    
    ctx.clearRect(0, 0, width, height)
    
    // Draw horizontal line in middle
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.moveTo(2, height / 2)
    ctx.lineTo(width - 2, height / 2)
    ctx.stroke()
    
    return this.canvas!.toDataURL('image/png', 0.8)
  }
  
  // Generate SVG chart (even faster for simple cases)
  static generateSVGChart(
    data: ChartDataPoint[],
    options: FastChartOptions
  ): string {
    if (data.length < 2) {
      return this.generateFlatLineSVG(options)
    }
    
    const { width, height, color, strokeWidth } = options
    
    // Calculate bounds
    const prices = data.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    
    // Add padding
    const padding = 2
    const chartWidth = width - (padding * 2)
    const chartHeight = height - (padding * 2)
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
    
    // Generate path string
    const pathData = sortedData
      .map((point, index) => {
        const x = padding + (index / (sortedData.length - 1)) * chartWidth
        const y = padding + (1 - (point.price - minPrice) / priceRange) * chartHeight
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
    
    // Generate optimized SVG
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
      <path d="${pathData}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }
  
  // Generate flat line SVG
  private static generateFlatLineSVG(options: FastChartOptions): string {
    const { width, height, color, strokeWidth } = options
    
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
      <line x1="2" y1="${height/2}" x2="${width-2}" y2="${height/2}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </svg>`
    
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }
}

// Cache for generated charts (LRU with size limit)
export class ChartCache {
  private cache = new Map<string, string>()
  private accessOrder: string[] = []
  private maxSize = 500 // Cache up to 500 charts
  
  get(key: string): string | undefined {
    const value = this.cache.get(key)
    if (value) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(k => k !== key)
      this.accessOrder.push(key)
    }
    return value
  }
  
  set(key: string, value: string): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter(k => k !== key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const lru = this.accessOrder.shift()
      if (lru) {
        this.cache.delete(lru)
      }
    }
    
    this.cache.set(key, value)
    this.accessOrder.push(key)
  }
  
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }
  
  size(): number {
    return this.cache.size
  }
}

// Global chart cache instance
export const chartCache = new ChartCache()

// Fast chart generation with caching
export function generateFastChart(
  data: ChartDataPoint[],
  symbol: string,
  range: string,
  isPositive: boolean,
  width = 80,
  height = 40
): string {
  // Create cache key
  const dataHash = data.length > 0 
    ? `${data[0].price.toFixed(4)}-${data[data.length-1].price.toFixed(4)}-${data.length}`
    : 'empty'
  const cacheKey = `${symbol}-${range}-${dataHash}-${width}x${height}-${isPositive}`
  
  // Check cache first
  const cached = chartCache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  // Generate new chart (use SVG for speed)
  const options: FastChartOptions = {
    width,
    height,
    color: isPositive ? '#22c55e' : '#ef4444',
    strokeWidth: 1.5,
  }
  
  const chartDataUrl = FastChartGenerator.generateSVGChart(data, options)
  
  // Cache the result
  chartCache.set(cacheKey, chartDataUrl)
  
  return chartDataUrl
}