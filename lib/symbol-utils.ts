export function normalizeTickerSymbol(symbol: string): string {
  if (!symbol) {
    return ''
  }

  let normalized = symbol.toUpperCase().trim()

  // Remove DEX / venue prefixes (anything before the colon)
  const colonIndex = normalized.indexOf(':')
  if (colonIndex !== -1) {
    normalized = normalized.slice(colonIndex + 1)
  }

  // Strip common suffixes like -USD, -PERP, /USDT, etc.
  const stripped = normalized.replace(/[-/].*$/, '')

  return stripped.length > 0 ? stripped : normalized
}





