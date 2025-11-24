const WebSocket = require('ws');

const HYDROMANCER_API_URL = 'wss://api.hydromancer.xyz/ws';
// Replace with your actual key or use env var
const API_KEY = process.env.HYDROMANCER_API_KEY || 'sk_nNhuLkdGdW5sxnYec33C2FBPzLjXBnEd';

// Configuration
const AGGREGATION_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const TARGET_TICKERS = ['BTC', 'ETH']; // Main tickers to track individually

// State for aggregation
// Structure: { [ticker]: { openLong: { size: 0, count: 0 }, openShort: ..., closeLong: ..., closeShort: ... } }
let aggregationState = {};

// Helper to initialize state for a ticker
function initTickerState(ticker) {
    if (!aggregationState[ticker]) {
        aggregationState[ticker] = {
            'Open Long': { size: 0, count: 0, value: 0 },
            'Open Short': { size: 0, count: 0, value: 0 },
            'Close Long': { size: 0, count: 0, value: 0 },
            'Close Short': { size: 0, count: 0, value: 0 },
            'Liquidated': { size: 0, count: 0, value: 0 },
            'Other': { size: 0, count: 0, value: 0 }
        };
    }
}

// Helper to normalize direction string to our keys
function normalizeDirection(dir) {
    if (!dir) return 'Other';
    const lower = dir.toLowerCase();
    if (lower.includes('open long')) return 'Open Long';
    if (lower.includes('open short')) return 'Open Short';
    if (lower.includes('close long')) return 'Close Long';
    if (lower.includes('close short')) return 'Close Short';
    if (lower.includes('liquidated')) return 'Liquidated';
    return 'Other';
}

function connect() {
    const ws = new WebSocket(HYDROMANCER_API_URL);

    ws.on('open', () => {
        console.log('Connected to Hydromancer WS (Aggregator)');
        
        // Authenticate
        ws.send(JSON.stringify({
            type: 'auth',
            apiKey: API_KEY
        }));
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'connected') {
                console.log('Authenticated. Subscribing to allFills...');
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    subscription: {
                        type: 'allFills',
                        dex: 'main'
                    }
                }));
            } else if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            } else if (msg.type === 'allFills') {
                processFills(msg.fills);
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });

    ws.on('close', () => {
        console.log('WebSocket closed. Reconnecting in 5s...');
        setTimeout(connect, 5000);
    });
}

function processFills(fills) {
    if (!Array.isArray(fills)) return;

    fills.forEach(fill => {
        // Format: [address, details]
        if (Array.isArray(fill) && fill.length >= 2) {
            const details = fill[1];
            const ticker = details.coin;
            
            // We aggregate everything, but will only print specific ones or all if needed
            initTickerState(ticker);

            const dirKey = normalizeDirection(details.dir);
            const size = parseFloat(details.sz || 0);
            const price = parseFloat(details.px || 0);
            const value = size * price;

            // Update state
            const stats = aggregationState[ticker][dirKey];
            stats.size += size;
            stats.value += value;
            stats.count += 1;
        }
    });
}

function printAndResetStats() {
    const timestamp = new Date().toISOString();
    console.log(`\n=== Aggregation Report [${timestamp}] ===`);
    
    TARGET_TICKERS.forEach(ticker => {
        const stats = aggregationState[ticker];
        if (stats) {
            console.log(`\n--- ${ticker} ---`);
            // Print stats for each category
            ['Open Long', 'Open Short', 'Close Long', 'Close Short'].forEach(category => {
                const catStats = stats[category];
                // Convert size to roughly readable format if needed, keeping raw for accuracy
                console.log(`${category}:`);
                console.log(`  Size: ${catStats.size.toFixed(4)} ${ticker}`);
                console.log(`  Value: $${catStats.value.toLocaleString('en-US', {maximumFractionDigits: 2})}`);
                console.log(`  Orders: ${catStats.count}`);
            });
        } else {
            console.log(`\n--- ${ticker} ---`);
            console.log('  No activity recorded.');
        }
    });

    console.log('\n==========================================\n');

    // Reset state for next interval
    // We can either clear everything or just reset counters for existing tickers.
    // Clearing everything is safer for memory if many tickers appear.
    aggregationState = {}; 
}

// Start the process
console.log(`Starting Aggregator. Will print stats every ${AGGREGATION_INTERVAL_MS / 1000} seconds.`);
connect();

// Schedule printing
setInterval(printAndResetStats, AGGREGATION_INTERVAL_MS);


