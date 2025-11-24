import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

const BUILDER_ADDRESS = '0x2868fc0d9786a740b491577a43502259efa78a39';

// Types for Builder Fills (from Hydromancer docs)
interface BuilderFillDetails {
  coin: string;
  px: string;              // price
  sz: string;              // size
  side: 'B' | 'A';        // B=buy, A=sell
  time: number;           // timestamp (ms)
  startPosition: string;  // position before fill
  dir: string;            // direction
  closedPnl: string;      // realized PnL
  hash: string;           // fill hash
  oid: number;            // order ID
  crossed: boolean;       // was crossed
  fee: string;            // fee amount
  tid: number;            // trade ID
  cloid?: string;         // client order ID (optional)
  builderFee?: string;    // builder fee (optional)
  feeToken: string;       // fee token
  builder: string;        // builder address
  twapId?: number | null; // null if not a twap
}

interface ProcessedFill {
  id: string;
  user: string;
  coin: string;
  side: 'B' | 'A';
  price: number;
  amount: number;
  value: number;
  fee: number;
  timestamp: number;
  hash?: string;
  type: 'fill';
}

// Types for Builder Order Updates
interface BuilderOrderUpdate {
  time: number;
  user: string;
  hash: string;
  builder?: {
    b: string;
    f: number;
  };
  status: string;
  order: {
    coin: string;
    side: 'B' | 'A';
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    orderType: string;
    origSz?: string;
    tif?: string;
    cloid?: string;
  };
}

interface ProcessedOrderUpdate {
  id: string;
  user: string;
  coin: string;
  side: 'B' | 'A';
  price: number;
  size: number;
  status: string;
  orderType: string;
  timestamp: number;
  hash: string;
  oid: number;
  type: 'order';
}

// Global state for persistent WebSocket connections
let ws: WebSocket | null = null;
let fills: ProcessedFill[] = [];
let orders: ProcessedOrderUpdate[] = [];
let isConnected = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
const MAX_ITEMS = 2500; // Store 2500 of each type

function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) {
    console.log('✅ Insilico Intel WebSocket already connected');
    return;
  }

  console.log('🔌 Connecting to Hydromancer WebSocket for Insilico Intel...');
  ws = new WebSocket('wss://api.hydromancer.xyz/ws');

  ws.on('open', () => {
    console.log('✅ Insilico Intel WebSocket opened, authenticating...');
    ws?.send(JSON.stringify({
      type: 'auth',
      apiKey: 'sk_nNhuLkdGdW5sxnYec33C2FBPzLjXBnEd'
    }));
  });

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connected') {
        console.log('✅ Insilico Intel authenticated! Subscribing to builder streams...');
        isConnected = true;
        
        // Subscribe to builderFills
        ws?.send(JSON.stringify({
          type: 'subscribe',
          subscription: {
            type: 'builderFills',
            builder: BUILDER_ADDRESS
          }
        }));
        
        // Subscribe to builderOrderUpdates
        ws?.send(JSON.stringify({
          type: 'subscribe',
          subscription: {
            type: 'builderOrderUpdates',
            builder: BUILDER_ADDRESS
          }
        }));
      } else if (msg.type === 'subscriptionUpdate') {
        console.log('📊 Insilico Intel subscription update:', msg);
      } else if (msg.type === 'error') {
        console.error('❌ Insilico Intel WS Error:', msg);
        isConnected = false;
      } else if (msg.type === 'builderFills') {
        // builderFills subscription sends messages with type "builderFills"
        console.log(`⚡ Received ${msg.fills?.length || 0} builder fills`);
        
        const newFills: ProcessedFill[] = [];
        
        if (msg.fills && Array.isArray(msg.fills)) {
          // Each fill is a tuple: [address, fillDetails]
          msg.fills.forEach((fillTuple: [string, BuilderFillDetails]) => {
            const [userAddress, fillDetails] = fillTuple;
            
            const price = parseFloat(fillDetails.px || '0');
            const amount = parseFloat(fillDetails.sz || '0');
            const value = price * amount;
            const fee = parseFloat(fillDetails.fee || '0');

            const processed: ProcessedFill = {
              id: `fill-${fillDetails.oid}-${fillDetails.time}`,
              user: userAddress,
              coin: fillDetails.coin || 'UNKNOWN',
              side: fillDetails.side,
              price,
              amount,
              value,
              fee,
              timestamp: fillDetails.time,
              hash: fillDetails.hash,
              type: 'fill'
            };

            newFills.push(processed);
          });
        }

        if (newFills.length > 0) {
          fills = [...newFills.reverse(), ...fills].slice(0, MAX_ITEMS);
        }
      } else if (msg.type === 'builderOrderUpdates') {
        console.log(`⚡ Received ${msg.updates?.length || 0} builder order updates`);
        
        const newOrders: ProcessedOrderUpdate[] = [];
        
        if (msg.updates && Array.isArray(msg.updates)) {
          msg.updates.forEach((update: BuilderOrderUpdate) => {
            const price = parseFloat(update.order.limitPx || '0');
            const size = parseFloat(update.order.sz || '0');

            const processed: ProcessedOrderUpdate = {
              id: `order-${update.order.oid}-${Date.now()}`,
              user: update.user,
              coin: update.order.coin,
              side: update.order.side,
              price,
              size,
              status: update.status,
              orderType: update.order.orderType,
              timestamp: update.time || update.order.timestamp,
              hash: update.hash,
              oid: update.order.oid,
              type: 'order'
            };

            newOrders.push(processed);
          });
        }

        if (newOrders.length > 0) {
          orders = [...newOrders.reverse(), ...orders].slice(0, MAX_ITEMS);
        }
      } else if (msg.type === 'ping') {
        ws?.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('❌ Insilico Intel parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Insilico Intel WebSocket closed, will reconnect in 5s...');
    isConnected = false;
    
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, 5000);
  });

  ws.on('error', (error) => {
    console.error('❌ Insilico Intel WebSocket error:', error);
    isConnected = false;
  });
}

// Initialize WebSocket connection when module loads
connectWebSocket();

// Keep connection alive
setInterval(() => {
  if (ws?.readyState !== WebSocket.OPEN) {
    console.log('🔄 Insilico Intel WebSocket not open, reconnecting...');
    connectWebSocket();
  }
}, 30000);

// API Route Handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '2500');
  
  return NextResponse.json({
    isConnected,
    builder: BUILDER_ADDRESS,
    fills: fills.slice(0, limit),
    orders: orders.slice(0, limit),
    timestamp: Date.now()
  });
}

