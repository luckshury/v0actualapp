'use client'

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, AlertTriangle, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Define Types - matching server-side types
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

interface LiquidationAPIResponse {
  isConnected: boolean;
  liquidations: ProcessedLiquidation[];
  timestamp: number;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

const formatTime = (timestamp: number) => 
  new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fraction: '0' });

// Optimized Row Component using React.memo
const LiquidationRow = memo(({ liquidation, className }: { liquidation: ProcessedLiquidation; className?: string }) => {
  const isBuy = liquidation.side === 'B';
  
  return (
    <>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-muted-foreground", className)}>
        {formatTime(liquidation.time)}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-bold font-mono text-xs", className)}>
        {liquidation.coin}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-center", isBuy ? "text-green-500" : "text-red-500", className)}>
        {isBuy ? 'BUY' : 'SELL'}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-right", className)}>
        {formatCurrency(liquidation.price)}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-right", className)}>
        {liquidation.size.toFixed(4)}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-right", className)}>
        {formatCurrency(liquidation.value)}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-right hidden md:table-cell", className)}>
        <span className={liquidation.pnl > 0 ? "text-green-500" : liquidation.pnl < 0 ? "text-red-500" : "text-muted-foreground"}>
          {liquidation.pnl !== 0 ? formatCurrency(liquidation.pnl) : '-'}
        </span>
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-xs text-right hidden md:table-cell", className)}>
        {formatCurrency(liquidation.fee)}
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-[10px] text-center hidden lg:table-cell", className)}>
        <a 
          href={`https://www.flowscan.xyz/address/${liquidation.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 hover:underline transition-colors inline-block"
          title={liquidation.address}
        >
          {liquidation.address.substring(0, 6)}...{liquidation.address.substring(liquidation.address.length - 4)}
        </a>
      </td>
      <td className={cn("p-3 whitespace-nowrap font-mono text-[10px] text-center hidden xl:table-cell", className)}>
        <a 
          href={`https://www.flowscan.xyz/tx/${liquidation.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 hover:underline transition-colors inline-block"
          title={liquidation.hash}
        >
          {liquidation.hash.substring(0, 6)}...{liquidation.hash.substring(liquidation.hash.length - 4)}
        </a>
      </td>
    </>
  );
}, (prev, next) => prev.liquidation.id === next.liquidation.id);

LiquidationRow.displayName = 'LiquidationRow';

export default function LiquidationsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [rows, setRows] = useState<ProcessedLiquidation[]>([]);
  
  // Filters
  const [coinFilter, setCoinFilter] = useState('');
  const [minSizeFilter, setMinSizeFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'B' | 'A'>('ALL');

  // Fetch liquidations from server-side API
  const fetchLiquidations = useCallback(async () => {
    try {
      const response = await fetch('/api/liquidations');
      if (!response.ok) throw new Error('Failed to fetch liquidations');
      
      const data: LiquidationAPIResponse = await response.json();
      
      setIsConnected(data.isConnected);
      setRows(data.liquidations);
    } catch (error) {
      console.error('Error fetching liquidations:', error);
      setIsConnected(false);
    }
  }, []);

  // Poll API for updates (Optimization #2: Polling instead of live connection per client)
  useEffect(() => {
    // Initial fetch
    fetchLiquidations();

    // Poll every 75ms (~13fps) matching Flowscan's update rate
    const interval = setInterval(fetchLiquidations, 75);

    return () => clearInterval(interval);
  }, [fetchLiquidations]);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    if (!coinFilter && !minSizeFilter && sideFilter === 'ALL') return rows;
    
    const lowerCoin = coinFilter.toLowerCase();
    const minVal = minSizeFilter ? parseFloat(minSizeFilter) : 0;

    return rows.filter(r => {
      // Filter by Coin OR Address (search)
      if (coinFilter && 
          !r.coin.toLowerCase().includes(lowerCoin) && 
          !r.address.toLowerCase().includes(lowerCoin)) {
        return false;
      }
      
      // Filter by Min Value
      if (minVal > 0 && r.value < minVal) return false;
      
      // Filter by Side
      if (sideFilter !== 'ALL' && r.side !== sideFilter) return false;
      
      return true;
    });
  }, [rows, coinFilter, minSizeFilter, sideFilter]);

  return (
    <div className="h-screen flex flex-col bg-background p-4 gap-4">
      {/* Header Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 font-mono">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium tracking-tight">Status</CardTitle>
            <Activity className={cn("h-4 w-4", isConnected ? "text-green-500" : "text-red-500")} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tighter">{isConnected ? 'Live' : 'Disconnected'}</div>
            <p className="text-xs text-muted-foreground tracking-tight">
              $ stream_status
            </p>
          </CardContent>
        </Card>
        
        {/* Filters */}
        <Card className="col-span-1 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                    <Filter className="h-4 w-4" /> Filters
                </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 items-center">
                <Input 
                    placeholder="Search Coin or Address..." 
                    className="h-8 text-sm font-mono" 
                    value={coinFilter}
                    onChange={e => setCoinFilter(e.target.value)}
                />
                <Input 
                    placeholder="Min Value ($)" 
                    className="h-8 text-sm font-mono"
                    type="number"
                    value={minSizeFilter}
                    onChange={e => setMinSizeFilter(e.target.value)}
                />
                <Select value={sideFilter} onValueChange={(val: 'ALL' | 'B' | 'A') => setSideFilter(val)}>
                  <SelectTrigger className="h-8 w-[100px] font-mono text-xs">
                    <SelectValue placeholder="Side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="font-mono text-xs">All Sides</SelectItem>
                    <SelectItem value="B" className="font-mono text-xs text-green-500">Buy Only</SelectItem>
                    <SelectItem value="A" className="font-mono text-xs text-red-500">Sell Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                    variant="secondary" 
                    size="sm"
                    className="font-mono tracking-tight"
                    onClick={() => { setCoinFilter(''); setMinSizeFilter(''); setSideFilter('ALL'); }}
                >
                    Clear
                </Button>
            </CardContent>
        </Card>
      </div>

      {/* Main Table Area */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="py-3 px-4 border-b shrink-0">
            <div className="flex items-center justify-between">
                <CardTitle className="text-md font-medium font-mono tracking-tight">Real-Time Liquidations</CardTitle>
                <Badge variant="outline" className="font-mono tracking-tight">
                    {filteredRows.length} displayed
                </Badge>
            </div>
        </CardHeader>
        <div className="flex-1 min-h-0 bg-card font-mono">
            <TableVirtuoso
                data={filteredRows}
                fixedHeaderContent={() => (
                    <tr className="bg-muted/50 border-b border-border">
                        <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground text-xs">Time</th>
                        <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground text-xs">Coin</th>
                        <th className="h-12 px-3 text-center align-middle font-medium text-muted-foreground text-xs">Side</th>
                        <th className="h-12 px-3 text-right align-middle font-medium text-muted-foreground text-xs">Price</th>
                        <th className="h-12 px-3 text-right align-middle font-medium text-muted-foreground text-xs">Size</th>
                        <th className="h-12 px-3 text-right align-middle font-medium text-muted-foreground text-xs">Value</th>
                        <th className="h-12 px-3 text-right align-middle font-medium text-muted-foreground text-xs hidden md:table-cell">PnL</th>
                        <th className="h-12 px-3 text-right align-middle font-medium text-muted-foreground text-xs hidden md:table-cell">Fee</th>
                        <th className="h-12 px-3 text-center align-middle font-medium text-muted-foreground text-xs hidden lg:table-cell">Wallet</th>
                        <th className="h-12 px-3 text-center align-middle font-medium text-muted-foreground text-xs hidden xl:table-cell">Tx Hash</th>
                    </tr>
                )}
                itemContent={(index, liquidation) => (
                    <LiquidationRow liquidation={liquidation} />
                )}
                components={{
                    Table: (props) => <table {...props} className="w-full caption-bottom text-sm border-collapse" />,
                    TableRow: (props) => <tr {...props} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" />,
                }}
            />
        </div>
      </Card>
    </div>
  );
}

