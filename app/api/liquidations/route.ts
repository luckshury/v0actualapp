import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

// Types
interface LiquidationFillDetails {
  coin: string;
  px: string;
  sz: string;
  side: 'B' | 'A';
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
}

interface ProcessedLiquidation {
  id: string;
  address: string;
  coin: string;
  price: number;
  size: number;
  side: 'B' | 'A';
  time: number;
  value: number;
  fee: number;
  pnl: number;
  dir: string;
  hash: string;
}

// Global state for persistent WebSocket connection
let ws: WebSocket | null = null;
let liquidations: ProcessedLiquidation[] = [];
let isConnected = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
const MAX_LIQUIDATIONS = 5000;

function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) {
    console.log('✅ WebSocket already connected');
    return;
  }

  console.log('🔌 Connecting to Hydromancer WebSocket for liquidations...');
  ws = new WebSocket('wss://api.hydromancer.xyz/ws');

  ws.on('open', () => {
    console.log('✅ WebSocket opened, authenticating...');
    ws?.send(JSON.stringify({
      type: 'auth',
      apiKey: 'sk_nNhuLkdGdW5sxnYec33C2FBPzLjXBnEd'
    }));
  });

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connected') {
        console.log('✅ Authenticated! Subscribing to liquidationFills...');
        isConnected = true;
        ws?.send(JSON.stringify({
          type: 'subscribe',
          subscription: {
            type: 'liquidationFills'
          }
        }));
      } else if (msg.type === 'subscriptionUpdate') {
        console.log('📊 Subscription update:', msg);
      } else if (msg.type === 'error') {
        console.error('❌ WS Error:', msg);
        isConnected = false;
      } else if (msg.type === 'liquidationFills') {
        console.log(`⚡ Received ${msg.fills.length} liquidations`);
        
        const newLiquidations: ProcessedLiquidation[] = [];
        
        msg.fills.forEach((item: any) => {
          if (Array.isArray(item) && item.length >= 2) {
            const address = item[0];
            const d = item[1] as LiquidationFillDetails;
            
            const price = parseFloat(d.px);
            const size = parseFloat(d.sz);
            const value = price * size;

            const processed: ProcessedLiquidation = {
              id: `${d.oid}-${d.tid}-${Date.now()}`,
              address,
              coin: d.coin,
              price,
              size,
              side: d.side,
              time: d.time,
              value,
              fee: parseFloat(d.fee || '0'),
              pnl: parseFloat(d.closedPnl || '0'),
              dir: d.dir,
              hash: d.hash
            };

            newLiquidations.push(processed);
          }
        });

        // Prepend new liquidations (newest first) and limit array size
        if (newLiquidations.length > 0) {
          liquidations = [...newLiquidations.reverse(), ...liquidations].slice(0, MAX_LIQUIDATIONS);
        }
      } else if (msg.type === 'ping') {
        ws?.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('❌ Parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket closed, will reconnect in 5s...');
    isConnected = false;
    
    // Reconnect after 5 seconds
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, 5000);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    isConnected = false;
  });
}

// Initialize WebSocket connection when module loads
connectWebSocket();

// Keep connection alive
setInterval(() => {
  if (ws?.readyState !== WebSocket.OPEN) {
    console.log('🔄 WebSocket not open, reconnecting...');
    connectWebSocket();
  }
}, 30000); // Check every 30 seconds

// API Route Handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '5000');
  
  // Return current state
  return NextResponse.json({
    isConnected,
    liquidations: liquidations.slice(0, limit),
    timestamp: Date.now()
  });
}

