'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API_URL = '/api/all-fills'

export type FillSide = 'B' | 'A'

export interface HydromancerFill {
  id: string
  address: string
  symbol: string
  price: number
  size: number
  notional: number
  side: FillSide
  direction?: string
  timestamp: number
  orderId?: number
  tradeId?: number
  builder?: string
  builderFee?: number
  fee?: number
  feeToken?: string
  builderFeeToken?: string
  builderPayout?: string
  hash?: string
  startPosition?: number
  closedPnl?: number
  crossed?: boolean
  raw: Record<string, unknown>
}

export interface UseAllFillsOptions {
  limit?: number
  dex?: string
  aggregateByTime?: boolean
}

export interface UseAllFillsResult {
  fills: HydromancerFill[]
  isConnected: boolean
  lastUpdate: number | null
  totalReceived: number
  fillsPerMinute: number
  error?: string
  reconnecting: boolean
  clearFills: () => void
}

export function useAllFills(options: UseAllFillsOptions = {}): UseAllFillsResult {
  const {
    limit = 200,
    dex,
    aggregateByTime = false,
  } = options

  const [fills, setFills] = useState<HydromancerFill[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [totalReceived, setTotalReceived] = useState(0)
  const [fillsPerMinute, setFillsPerMinute] = useState(0)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fillsRef = useRef<HydromancerFill[]>([])
  const recentFillTimesRef = useRef<number[]>([])
  const limitRef = useRef(limit)
  const totalReceivedRef = useRef(0)
  const lastUpdateRef = useRef<number | null>(null)

  const clearFills = useCallback(() => {
    fillsRef.current = []
    recentFillTimesRef.current = []
    totalReceivedRef.current = 0
    lastUpdateRef.current = null
    
    setFills([])
    setFillsPerMinute(0)
    setTotalReceived(0)
    setLastUpdate(null)
  }, [])

  useEffect(() => {
    limitRef.current = limit
    fillsRef.current = fillsRef.current.slice(0, limit)
    setFills([...fillsRef.current])
  }, [limit])

  // REST API polling - replaces WebSocket connection
  useEffect(() => {
    let mounted = true

    const fetchFills = async () => {
      if (!mounted) return

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
        })

        if (dex) {
          params.append('dex', dex)
        }

        if (aggregateByTime) {
          params.append('aggregateByTime', 'true')
        }

        const response = await fetch(`${API_URL}?${params.toString()}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch fills: ${response.status}`)
        }

        const data = await response.json()

        // Note: The REST API doesn't provide real-time fills like WebSocket did
        // This is a limitation of moving from WebSocket to REST
        if (data.fills && Array.isArray(data.fills)) {
          setFills(data.fills)
          setIsConnected(true)
          setReconnecting(false)
          setError(undefined)
        } else if (data.message) {
          // API returned a message (likely about WebSocket being required)
          setError(data.message)
          setIsConnected(false)
        }

        const now = Date.now()
        lastUpdateRef.current = now
        setLastUpdate(now)
      } catch (err) {
        console.error('Error fetching fills:', err)
        setError('Failed to fetch fills data')
        setIsConnected(false)
        setReconnecting(true)
      }
    }

    // Initial fetch
    fetchFills()

    // Set up polling interval (5 seconds)
    pollingIntervalRef.current = setInterval(() => {
      fetchFills()
    }, 5000)

    return () => {
      mounted = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [limit, dex, aggregateByTime])

  return {
    fills,
    isConnected,
    lastUpdate,
    totalReceived,
    fillsPerMinute,
    error,
    reconnecting,
    clearFills,
  }
}
