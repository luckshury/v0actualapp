'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppState, Watchlist } from '@/contexts/app-state-context'
import { Trash2, Edit2, Plus, X } from 'lucide-react'

interface WatchlistManagerProps {
  open: boolean
  onClose: () => void
}

export function WatchlistManager({ open, onClose }: WatchlistManagerProps) {
  const { watchlists, createWatchlist, updateWatchlist, deleteWatchlist, removeSymbolFromWatchlist, tickerList } = useAppState()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [addingSymbolToId, setAddingSymbolToId] = useState<string | null>(null)
  const [newSymbol, setNewSymbol] = useState('')

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      createWatchlist(newWatchlistName.trim())
      setNewWatchlistName('')
    }
  }

  const handleUpdateName = (id: string) => {
    if (editingName.trim()) {
      updateWatchlist(id, { name: editingName.trim() })
      setEditingId(null)
      setEditingName('')
    }
  }

  const handleAddSymbol = (watchlistId: string) => {
    if (newSymbol.trim()) {
      const symbol = newSymbol.trim().toUpperCase()
      const watchlist = watchlists.find(w => w.id === watchlistId)
      
      if (watchlist && !watchlist.symbols.includes(symbol)) {
        updateWatchlist(watchlistId, { symbols: [...watchlist.symbols, symbol] })
      }
      
      setNewSymbol('')
      setAddingSymbolToId(null)
    }
  }

  const handleDeleteWatchlist = (id: string) => {
    if (confirm('Are you sure you want to delete this watchlist?')) {
      deleteWatchlist(id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">Manage Watchlists</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Watchlist */}
          <div className="border-2 border-border p-4 bg-card">
            <h3 className="font-mono text-sm font-bold mb-3">Create New Watchlist</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter watchlist name..."
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWatchlist()}
                className="font-mono border-2"
              />
              <Button 
                onClick={handleCreateWatchlist}
                disabled={!newWatchlistName.trim()}
                className="font-mono border-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>
          </div>

          {/* Existing Watchlists */}
          <div className="space-y-4">
            <h3 className="font-mono text-sm font-bold">Your Watchlists ({watchlists.length})</h3>
            
            {watchlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                No watchlists yet. Create one to get started!
              </div>
            ) : (
              watchlists.map((watchlist) => (
                <div key={watchlist.id} className="border-2 border-border p-4 bg-card">
                  {/* Watchlist Header */}
                  <div className="flex items-center justify-between mb-3">
                    {editingId === watchlist.id ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateName(watchlist.id)
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditingName('')
                            }
                          }}
                          className="font-mono border-2"
                          autoFocus
                        />
                        <Button 
                          onClick={() => handleUpdateName(watchlist.id)}
                          className="font-mono border-2"
                          size="sm"
                        >
                          Save
                        </Button>
                        <Button 
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                          variant="outline"
                          className="font-mono border-2"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-mono font-bold text-lg">{watchlist.name}</h4>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingId(watchlist.id)
                              setEditingName(watchlist.name)
                            }}
                            variant="outline"
                            size="sm"
                            className="font-mono border-2"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteWatchlist(watchlist.id)}
                            variant="outline"
                            size="sm"
                            className="font-mono border-2 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Symbols */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {watchlist.symbols.length} symbol{watchlist.symbols.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        onClick={() => setAddingSymbolToId(watchlist.id)}
                        variant="outline"
                        size="sm"
                        className="font-mono border-2 h-7 px-2 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Symbol
                      </Button>
                    </div>

                    {addingSymbolToId === watchlist.id && (
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Enter symbol (e.g. BTC)..."
                          value={newSymbol}
                          onChange={(e) => setNewSymbol(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSymbol(watchlist.id)
                            if (e.key === 'Escape') {
                              setAddingSymbolToId(null)
                              setNewSymbol('')
                            }
                          }}
                          className="font-mono border-2 h-8 text-sm"
                          autoFocus
                        />
                        <Button 
                          onClick={() => handleAddSymbol(watchlist.id)}
                          size="sm"
                          className="font-mono border-2 h-8"
                        >
                          Add
                        </Button>
                        <Button 
                          onClick={() => {
                            setAddingSymbolToId(null)
                            setNewSymbol('')
                          }}
                          variant="outline"
                          size="sm"
                          className="font-mono border-2 h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {watchlist.symbols.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground font-mono text-xs">
                        No symbols added yet
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {watchlist.symbols.map((symbol) => (
                          <div
                            key={symbol}
                            className="flex items-center gap-1 bg-muted border border-border px-2 py-1 font-mono text-xs"
                          >
                            <span className="font-bold">{symbol}</span>
                            <button
                              onClick={() => removeSymbolFromWatchlist(watchlist.id, symbol)}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="font-mono border-2">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


