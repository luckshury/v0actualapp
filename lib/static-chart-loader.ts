// Static chart database loader for instant chart rendering

interface StaticChartData {
  image: string
  isPositive: boolean
  dataPoints: number
  generated: number
}

interface ChartDatabase {
  generated: string
  totalCharts: number
  charts: Record<string, StaticChartData>
}

// In-memory cache for chart database
let chartDatabase: ChartDatabase | null = null
let loadingPromise: Promise<ChartDatabase> | null = null

// Load chart database from static file
async function loadChartDatabase(): Promise<ChartDatabase> {
  if (chartDatabase) {
    return chartDatabase
  }
  
  if (loadingPromise) {
    return loadingPromise
  }
  
  loadingPromise = (async () => {
    try {
      console.log('📊 Loading static chart database...')
      const response = await fetch('/chart-data.json')
      
      if (!response.ok) {
        throw new Error(`Failed to load chart database: ${response.status}`)
      }
      
      const data = await response.json()
      chartDatabase = data
      
      console.log(`✅ Loaded ${data.totalCharts} pre-generated charts`)
      console.log(`📅 Generated: ${data.generated}`)
      
      return data
    } catch (error) {
      console.error('❌ Failed to load chart database:', error)
      
      // Return empty database as fallback
      const fallback: ChartDatabase = {
        generated: new Date().toISOString(),
        totalCharts: 0,
        charts: {}
      }
      
      chartDatabase = fallback
      return fallback
    } finally {
      loadingPromise = null
    }
  })()
  
  return loadingPromise
}

// Get static chart for symbol and range
export async function getStaticChart(
  symbol: string, 
  range: string
): Promise<string | null> {
  try {
    const db = await loadChartDatabase()
    const key = `${symbol.toUpperCase()}-${range}`
    
    const chartData = db.charts[key]
    if (chartData) {
      console.log(`📈 Using static chart for ${key} (${chartData.dataPoints} points)`)
      return chartData.image
    }
    
    console.log(`⚠️  No static chart found for ${key}`)
    return null
  } catch (error) {
    console.error(`❌ Error getting static chart for ${symbol}-${range}:`, error)
    return null
  }
}

// Get chart trend (positive/negative) from static data
export async function getStaticChartTrend(
  symbol: string, 
  range: string
): Promise<boolean | null> {
  try {
    const db = await loadChartDatabase()
    const key = `${symbol.toUpperCase()}-${range}`
    
    const chartData = db.charts[key]
    return chartData ? chartData.isPositive : null
  } catch (error) {
    return null
  }
}

// Check if static chart exists
export async function hasStaticChart(
  symbol: string, 
  range: string
): Promise<boolean> {
  try {
    const db = await loadChartDatabase()
    const key = `${symbol.toUpperCase()}-${range}`
    return key in db.charts
  } catch (error) {
    return false
  }
}

// Get database stats
export async function getChartDatabaseStats(): Promise<{
  totalCharts: number
  generated: string
  symbols: string[]
  ranges: string[]
}> {
  try {
    const db = await loadChartDatabase()
    
    // Extract unique symbols and ranges
    const keys = Object.keys(db.charts)
    const symbols = [...new Set(keys.map(key => key.split('-')[0]))]
    const ranges = [...new Set(keys.map(key => key.split('-').slice(1).join('-')))]
    
    return {
      totalCharts: db.totalCharts,
      generated: db.generated,
      symbols: symbols.sort(),
      ranges: ranges.sort()
    }
  } catch (error) {
    return {
      totalCharts: 0,
      generated: 'Error',
      symbols: [],
      ranges: []
    }
  }
}

// Preload chart database for instant access
export function preloadChartDatabase(): void {
  loadChartDatabase().catch(error => {
    console.error('Failed to preload chart database:', error)
  })
}

// Generate fallback chart (simple SVG)
export function generateFallbackChart(
  symbol: string,
  isPositive: boolean,
  width = 80,
  height = 40
): string {
  const color = isPositive ? '#22c55e' : '#ef4444'
  
  // Simple ascending or descending line
  const startY = isPositive ? height * 0.7 : height * 0.3
  const endY = isPositive ? height * 0.3 : height * 0.7
  
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
    <path d="M 4 ${startY} Q ${width/2} ${startY + (endY-startY)*0.3} ${width-4} ${endY}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}