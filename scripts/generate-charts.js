#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch') // Using node-fetch for API calls

// Simulate the chart generation logic for Node.js
class NodeChartGenerator {
  static generateSVGChart(data, options) {
    const { width, height, color, strokeWidth } = options
    
    if (data.length < 2) {
      return this.generateFlatLineSVG(options)
    }
    
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
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }
  
  static generateFlatLineSVG(options) {
    const { width, height, color, strokeWidth } = options
    
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
      <line x1="2" y1="${height/2}" x2="${width-2}" y2="${height/2}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </svg>`
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }
}

// Fetch historical data from APIs
async function fetchHistoricalData(symbol, range) {
  const API_KEY = 'CG-pMfXAwuUoNoaZ4GwQnfsA8T7'
  
  try {
    // Try Hyperliquid first
    console.log(`Fetching ${symbol} (${range}) from Hyperliquid...`)
    const hlResponse = await fetch(`http://localhost:3000/api/hyperliquid?symbols=${symbol}&range=${range}`)
    
    if (hlResponse.ok) {
      const hlData = await hlResponse.json()
      if (hlData[symbol] && hlData[symbol].length > 0) {
        console.log(`✅ Got ${hlData[symbol].length} points for ${symbol} from Hyperliquid`)
        return hlData[symbol]
      }
    }
  } catch (error) {
    console.log(`❌ Hyperliquid failed for ${symbol}: ${error.message}`)
  }
  
  try {
    // Fallback to CoinGecko
    console.log(`Fetching ${symbol} (${range}) from CoinGecko...`)
    const rangeToDays = { '1h': '1', '4h': '1', '1d': '1', '7d': '7', '30d': '30' }
    const days = rangeToDays[range] || '1'
    
    const cgResponse = await fetch(`http://localhost:3000/api/coingecko?symbols=${symbol}&days=${days}&range=${range}`)
    
    if (cgResponse.ok) {
      const cgData = await cgResponse.json()
      if (cgData[symbol] && cgData[symbol].length > 0) {
        console.log(`✅ Got ${cgData[symbol].length} points for ${symbol} from CoinGecko`)
        return cgData[symbol]
      }
    }
  } catch (error) {
    console.log(`❌ CoinGecko failed for ${symbol}: ${error.message}`)
  }
  
  // Generate synthetic data as fallback
  console.log(`⚠️  Generating synthetic data for ${symbol} (${range})`)
  return generateSyntheticData(range, 50) // Base price of $50
}

// Generate realistic synthetic chart data
function generateSyntheticData(range, basePrice = 50) {
  const rangeToHours = { '1h': 1, '4h': 4, '1d': 24, '7d': 168, '30d': 720 }
  const hours = rangeToHours[range] || 24
  const points = Math.min(Math.max(hours / 2, 12), 48) // 12-48 points
  
  const data = []
  const now = Date.now()
  const interval = (hours * 60 * 60 * 1000) / points
  
  let currentPrice = basePrice
  
  for (let i = 0; i < points; i++) {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * 0.02 // Slight upward bias
    currentPrice = Math.max(0.01, currentPrice * (1 + change))
    
    data.push({
      timestamp: now - (hours * 60 * 60 * 1000) + (i * interval),
      price: currentPrice
    })
  }
  
  return data
}

// Main chart generation function
async function generateChartDatabase() {
  console.log('🚀 Starting chart pre-generation...')
  
  // Common crypto symbols (expand as needed)
  const symbols = [
    'BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX',
    'LINK', 'MATIC', 'UNI', 'LTC', 'ATOM', 'DOT', 'NEAR', 'FTM', 'ALGO', 'MANA',
    'AAVE', 'CRV', 'COMP', 'SNX', 'GMX', 'SAND', 'GALA', 'APT', 'SUI', 'ARB'
  ]
  
  const ranges = ['1h', '4h', '1d', '7d', '30d']
  const chartDatabase = {}
  
  let totalCharts = symbols.length * ranges.length
  let completed = 0
  
  console.log(`📊 Generating ${totalCharts} charts...`)
  
  // Process in small batches to avoid rate limits
  const batchSize = 5
  const delay = 1000 // 1 second between batches
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    
    await Promise.all(batch.map(async (symbol) => {
      for (const range of ranges) {
        try {
          const data = await fetchHistoricalData(symbol, range)
          
          // Calculate if positive/negative trend
          const isPositive = data.length > 1 
            ? data[data.length - 1].price >= data[0].price 
            : true
          
          // Generate chart image
          const chartOptions = {
            width: 80,
            height: 40,
            color: isPositive ? '#22c55e' : '#ef4444',
            strokeWidth: 1.5,
          }
          
          const chartImage = NodeChartGenerator.generateSVGChart(data, chartOptions)
          
          // Store in database
          const key = `${symbol}-${range}`
          chartDatabase[key] = {
            image: chartImage,
            isPositive,
            dataPoints: data.length,
            generated: Date.now()
          }
          
          completed++
          if (completed % 10 === 0) {
            console.log(`📈 Generated ${completed}/${totalCharts} charts (${((completed/totalCharts)*100).toFixed(1)}%)`)
          }
        } catch (error) {
          console.error(`❌ Failed to generate chart for ${symbol}-${range}:`, error)
        }
      }
    }))
    
    // Delay between batches
    if (i + batchSize < symbols.length) {
      console.log(`⏱️  Waiting ${delay}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // Save to public directory
  const outputPath = path.join(process.cwd(), 'public', 'chart-data.json')
  
  const finalDatabase = {
    generated: new Date().toISOString(),
    totalCharts: Object.keys(chartDatabase).length,
    charts: chartDatabase
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(finalDatabase, null, 2))
  
  console.log(`✅ Chart database generated!`)
  console.log(`📁 Saved to: ${outputPath}`)
  console.log(`📊 Total charts: ${Object.keys(chartDatabase).length}`)
  console.log(`💾 File size: ${(Buffer.byteLength(JSON.stringify(finalDatabase)) / 1024).toFixed(1)}KB`)
  
  return finalDatabase
}

// Run if called directly
if (require.main === module) {
  generateChartDatabase()
    .then(() => {
      console.log('🎉 Chart pre-generation complete!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Chart generation failed:', error)
      process.exit(1)
    })
}

module.exports = { generateChartDatabase }