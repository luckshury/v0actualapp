import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

// Types based on Hydromancer Docs
interface FillDetails {
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
  cloid?: string;
  builderFee?: string;
  feeToken?: string;
  builder?: string;
  twapId?: number | null;
}

interface ProcessedFill {
  id: string;
  address: string;
  coin: string;
  price: number;
  size: number;
  side: 'B' | 'A';
  time: number;
  value: number;
  isLong: boolean;
  fee: number;
  pnl: number;
  dir: string;
}

// Global state for persistent WebSocket connection
let ws: WebSocket | null = null;
let fills: ProcessedFill[] = [];
let isConnected = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
const MAX_FILLS = 5000;

function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) {
    console.log('✅ All-Fills WebSocket already connected');
    return;
  }

  console.log('🔌 Connecting to Hydromancer WebSocket for all fills...');
  ws = new WebSocket('wss://api.hydromancer.xyz/ws');

  ws.on('open', () => {
    console.log('✅ All-Fills WebSocket opened, authenticating...');
    ws?.send(JSON.stringify({
      type: 'auth',
      apiKey: 'sk_nNhuLkdGdW5sxnYec33C2FBPzLjXBnEd'
    }));
  });

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connected') {
        console.log('✅ All-Fills authenticated! Subscribing to allFills...');
        isConnected = true;
        ws?.send(JSON.stringify({
          type: 'subscribe',
          subscription: {
            type: 'allFills',
            dex: 'main'
          }
        }));
      } else if (msg.type === 'subscriptionUpdate') {
        console.log('📊 All-Fills subscription update:', msg);
      } else if (msg.type === 'error') {
        console.error('❌ All-Fills WS Error:', msg);
        isConnected = false;
      } else if (msg.type === 'allFills') {
        console.log(`⚡ Received ${msg.fills.length} fills`);
        
        const newFills: ProcessedFill[] = [];
        
        msg.fills.forEach((item: any) => {
          if (Array.isArray(item) && item.length >= 2) {
            const address = item[0];
            const d = item[1] as FillDetails;
            
            const price = parseFloat(d.px);
            const size = parseFloat(d.sz);
            const value = price * size;

            const processed: ProcessedFill = {
              id: `${d.oid}-${d.tid}-${Date.now()}`,
              address,
              coin: d.coin,
              price,
              size,
              side: d.side,
              time: d.time,
              value,
              isLong: d.dir?.includes('Long') || false,
              fee: parseFloat(d.fee || '0'),
              pnl: parseFloat(d.closedPnl || '0'),
              dir: d.dir
            };

            newFills.push(processed);
          }
        });

        // Prepend new fills (newest first) and limit array size
        if (newFills.length > 0) {
          fills = [...newFills.reverse(), ...fills].slice(0, MAX_FILLS);
        }
      } else if (msg.type === 'ping') {
        ws?.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('❌ All-Fills parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log('🔌 All-Fills WebSocket closed, will reconnect in 5s...');
    isConnected = false;
    
    // Reconnect after 5 seconds
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, 5000);
  });

  ws.on('error', (error) => {
    console.error('❌ All-Fills WebSocket error:', error);
    isConnected = false;
  });
}

// Initialize WebSocket connection when module loads
connectWebSocket();

// Keep connection alive
setInterval(() => {
  if (ws?.readyState !== WebSocket.OPEN) {
    console.log('🔄 All-Fills WebSocket not open, reconnecting...');
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
    fills: fills.slice(0, limit),
    timestamp: Date.now()
  });
}
