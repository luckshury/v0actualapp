'use client'

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Define Types - matching server-side types
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

interface FillAPIResponse {
  isConnected: boolean;
  fills: ProcessedFill[];
  timestamp: number;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

const formatTime = (timestamp: number) => 
  new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fraction: '0' });

// Helper to parse direction
const getDirectionBadge = (dir: string) => {
  const lowerDir = dir.toLowerCase();
  if (lowerDir.includes('open long')) return <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">Open Long</Badge>;
  if (lowerDir.includes('close long')) return <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-500 border-red-500/20">Close Long</Badge>;
  if (lowerDir.includes('open short')) return <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">Open Short</Badge>;
  if (lowerDir.includes('close short')) return <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-500 border-red-500/20">Close Short</Badge>;
  if (lowerDir.includes('long > short')) return <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">Flip Short</Badge>;
  if (lowerDir.includes('short > long')) return <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">Flip Long</Badge>;
  if (lowerDir.includes('liquidated')) return <Badge variant="destructive" className="text-[10px] h-5">LIQ</Badge>;
  
  return <span className="text-[10px] text-muted-foreground">{dir}</span>;
};

// 1. Optimized Row Component using React.memo
const FillRow = memo(({ fill, className }: { fill: ProcessedFill; className?: string }) => {
  const isBuy = fill.side === 'B';
  
  return (
    <>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs text-muted-foreground", className)}>{formatTime(fill.time)}</td>
      <td className={cn("p-2 whitespace-nowrap font-bold font-mono text-xs", className)}>{fill.coin}</td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs", isBuy ? "text-green-500" : "text-red-500", className)}>
        {isBuy ? 'BUY' : 'SELL'}
      </td>
      <td className={cn("p-2 whitespace-nowrap", className)}>
         {getDirectionBadge(fill.dir || '')}
      </td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs text-right", className)}>{formatCurrency(fill.price)}</td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs text-right", className)}>{fill.size.toFixed(4)}</td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs text-right", className)}>{formatCurrency(fill.value)}</td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs text-right hidden md:table-cell", className)}>
        <span className={fill.pnl > 0 ? "text-green-500" : fill.pnl < 0 ? "text-red-500" : "text-muted-foreground"}>
            {fill.pnl !== 0 ? formatCurrency(fill.pnl) : '-'}
        </span>
      </td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-xs text-right hidden md:table-cell", className)}>{formatCurrency(fill.fee)}</td>
      <td className={cn("p-2 whitespace-nowrap font-mono text-[10px] text-right hidden lg:table-cell truncate max-w-[100px]", className)}>
        <a 
          href={`https://www.flowscan.xyz/address/${fill.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 hover:underline transition-colors"
          title={fill.address}
        >
          {fill.address.substring(0, 6)}...{fill.address.substring(fill.address.length - 4)}
        </a>
      </td>
    </>
  );
}, (prev, next) => prev.fill.id === next.fill.id);

FillRow.displayName = 'FillRow';

export default function AllFillsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [rows, setRows] = useState<ProcessedFill[]>([]);
  
  // Filters
  const [coinFilter, setCoinFilter] = useState('');
  const [minSizeFilter, setMinSizeFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'B' | 'A'>('ALL');

  // Fetch fills from server-side API
  const fetchFills = useCallback(async () => {
    try {
      const response = await fetch('/api/all-fills');
      if (!response.ok) throw new Error('Failed to fetch fills');
      
      const data: FillAPIResponse = await response.json();
      
      setIsConnected(data.isConnected);
      setRows(data.fills);
    } catch (error) {
      console.error('Error fetching fills:', error);
      setIsConnected(false);
    }
  }, []);

  // Poll API for updates (server-side WebSocket handles actual connection)
  useEffect(() => {
    // Initial fetch
    fetchFills();

    // Poll every 75ms (~13fps) matching Flowscan's update rate
    const interval = setInterval(fetchFills, 75);

    return () => clearInterval(interval);
  }, [fetchFills]);

  // Client-side filtering
  // Optimization: Use useMemo to prevent recalculation unless deps change
  // Note: rows changes often (10hz), but filtering 5000 items is still fast enough for main thread.
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
                <CardTitle className="text-md font-medium font-mono tracking-tight">Real-Time Fills</CardTitle>
                <Badge variant="outline" className="font-mono tracking-tight">
                    {filteredRows.length} displayed
                </Badge>
            </div>
        </CardHeader>
        <div className="flex-1 min-h-0 bg-card font-mono">
             {/* Optimization #1: List Virtualization */}
            <TableVirtuoso
                data={filteredRows}
                fixedHeaderContent={() => (
                    <tr className="bg-muted/50 border-b border-border">
                        <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs w-[100px]">Time</th>
                        <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs w-[80px]">Coin</th>
                        <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs w-[60px]">Side</th>
                        <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs w-[100px]">Action</th>
                        <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground text-xs w-[100px]">Price</th>
                        <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground text-xs w-[100px]">Size</th>
                        <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground text-xs w-[120px]">Value</th>
                        <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground text-xs w-[100px] hidden md:table-cell">PnL</th>
                        <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground text-xs w-[80px] hidden md:table-cell">Fee</th>
                        <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground text-xs hidden lg:table-cell">Trader</th>
                    </tr>
                )}
                itemContent={(index, fill) => (
                    <FillRow fill={fill} />
                )}
                components={{
                    Table: (props) => <table {...props} className="w-full caption-bottom text-sm border-collapse" />,
                    TableRow: (props) => <tr {...props} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" />,
                }}
                // followOutput="auto" // We want newest at top usually for tickers, so we handle sorting manually and don't auto-scroll to bottom
            />
        </div>
      </Card>
    </div>
  );
}
