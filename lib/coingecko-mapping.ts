import { normalizeTickerSymbol } from './symbol-utils'

// Mapping from Hyperliquid/Hydromancer symbols to CoinGecko IDs
// This is a comprehensive mapping of common crypto symbols
export const symbolToCoinGeckoId: Record<string, string> = {
  // Major cryptocurrencies
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'SOL': 'solana',
  'TRX': 'tron',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'POLYGON': 'matic-network',
  'LTC': 'litecoin',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'UNI': 'uniswap',
  'LINK': 'chainlink',
  'XLM': 'stellar',
  'ATOM': 'cosmos',
  'XMR': 'monero',
  'BCH': 'bitcoin-cash',
  'ETC': 'ethereum-classic',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'NEAR': 'near',
  'FIL': 'filecoin',
  'VET': 'vechain',
  'ALGO': 'algorand',
  'ICP': 'internet-computer',
  'HBAR': 'hedera-hashgraph',
  'APE': 'apecoin',
  'QNT': 'quant-network',
  'LDO': 'lido-dao',
  'AAVE': 'aave',
  'MKR': 'maker',
  'SNX': 'havven',
  'GRT': 'the-graph',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'FTM': 'fantom',
  'EGLD': 'elrond-erd-2',
  'EOS': 'eos',
  'XTZ': 'tezos',
  'THETA': 'theta-token',
  'CAKE': 'pancakeswap-token',
  'RUNE': 'thorchain',
  'ZEC': 'zcash',
  'KLAY': 'klay-token',
  'INJ': 'injective-protocol',
  'STX': 'blockstack',
  'FLOW': 'flow',
  'CHZ': 'chiliz',
  'ENJ': 'enjincoin',
  'GALA': 'gala',
  'MINA': 'mina-protocol',
  'CRV': 'curve-dao-token',
  'BAT': 'basic-attention-token',
  'ZIL': 'zilliqa',
  'DASH': 'dash',
  'COMP': 'compound-governance-token',
  '1INCH': '1inch',
  'YFI': 'yearn-finance',
  'SUSHI': 'sushi',
  'BAL': 'balancer',
  'REN': 'republic-protocol',
  'UMA': 'uma',
  'ZRX': '0x',
  'KNC': 'kyber-network-crystal',
  'BNT': 'bancor',
  'LRC': 'loopring',
  'STORJ': 'storj',
  'OMG': 'omisego',
  'ANKR': 'ankr',
  'SKL': 'skale',
  'CELR': 'celer-network',
  'CTSI': 'cartesi',
  'RLC': 'iexec-rlc',
  'OCEAN': 'ocean-protocol',
  'NMR': 'numeraire',
  'BAND': 'band-protocol',
  'ONE': 'harmony',
  'IOTX': 'iotex',
  'CELO': 'celo',
  'KAVA': 'kava',
  'ROSE': 'oasis-network',
  'SC': 'siacoin',
  'ICX': 'icon',
  'ONT': 'ontology',
  'QTUM': 'qtum',
  'ZEN': 'horizen',
  'DGB': 'digibyte',
  'RVN': 'ravencoin',
  'BTG': 'bitcoin-gold',
  'DCR': 'decred',
  'LSK': 'lisk',
  'WAVES': 'waves',
  'IOTA': 'iota',
  'NEO': 'neo',
  'XEM': 'nem',
  
  // Meme coins & trending
  'PEPE': 'pepe',
  'WIF': 'dogwifcoin',
  'FLOKI': 'floki',
  'BONK': 'bonk',
  'WOJAK': 'wojak',
  'TURBO': 'turbo',
  'MEME': 'memecoin',
  'BABYDOGE': 'baby-doge-coin',
  'ELON': 'dogelon-mars',
  'AKITA': 'akita-inu',
  'KISHU': 'kishu-inu',
  
  // DeFi tokens
  'GMX': 'gmx',
  'RDNT': 'radiant-capital',
  'PENDLE': 'pendle',
  'JOE': 'joe',
  'MAGIC': 'magic',
  'VELO': 'velodrome-finance',
  'DYDX': 'dydx',
  'PERP': 'perpetual-protocol',
  'LYRA': 'lyra-finance',
  
  // Layer 2 & Scaling
  'METIS': 'metis-token',
  'BOBA': 'boba-network',
  
  // Gaming & Metaverse
  'IMX': 'immutable-x',
  'BLUR': 'blur',
  'LOOKS': 'looksrare',
  'ILV': 'illuvium',
  'GMT': 'stepn',
  'GST': 'green-satoshi-token',
  
  // AI & Data
  'FET': 'fetch-ai',
  'AGIX': 'singularitynet',
  'RNDR': 'render-token',
  'GNO': 'gnosis',
  'TAO': 'bittensor',
  
  // Newer tokens (may or may not exist on CoinGecko)
  'PURR': 'purr', // Example - may not exist
  'HFUN': 'hyperfun', // Example - may not exist
  'JEFF': 'jeff', // Example - may not exist
  'GRIFFAIN': 'griffain', // Example - may not exist
  
  // Stablecoins
  'DAI': 'dai',
  'FRAX': 'frax',
  'TUSD': 'true-usd',
  'USDP': 'paxos-standard',
  'GUSD': 'gemini-dollar',
  'BUSD': 'binance-usd',
  
  // Wrapped tokens
  'WBTC': 'wrapped-bitcoin',
  'WETH': 'weth',
  'WBNB': 'wbnb',
  'WMATIC': 'wmatic',
  'WAVAX': 'wrapped-avax',
  
  // Exchange tokens
  'CRO': 'crypto-com-chain',
  'LEO': 'leo-token',
  'OKB': 'okb',
  'HT': 'huobi-token',
  'GT': 'gatechain-token',
  'KCS': 'kucoin-shares',
  'FTT': 'ftx-token', // May be delisted
  
  // Privacy coins
  'SCRT': 'secret',
  
  // Infrastructure
  'MASK': 'mask-network',
  'API3': 'api3',
  
  // Liquid staking
  'RETH': 'rocket-pool-eth',
  'STETH': 'staked-ether',
  'CBETH': 'coinbase-wrapped-staked-eth',
  
  // Real World Assets
  'ONDO': 'ondo-finance',
  'PAXG': 'pax-gold',
  'XAUT': 'tether-gold',
}

// Function to get CoinGecko ID from symbol
// Handles variations like "DEX:BTC-USD", "BTC-USD", "BTCUSD", etc.
export function getCoinGeckoId(symbol: string): string | undefined {
  if (!symbol) {
    return undefined
  }

  const normalized = normalizeTickerSymbol(symbol)
  const candidates = [
    normalized,
    normalized.replace(/USD(T)?$/, ''),
    normalized.replace(/PERP$/, ''),
    normalized.replace(/USDC$/, ''),
  ].map(value => value.trim()).filter(Boolean)

  for (const candidate of candidates) {
    const id = symbolToCoinGeckoId[candidate]
    if (id) {
      return id
    }
  }

  return undefined
}

// Function to batch symbols into CoinGecko IDs
export function batchSymbolsToIds(symbols: string[]): Map<string, string> {
  const mapping = new Map<string, string>()
  
  for (const symbol of symbols) {
    const coinGeckoId = getCoinGeckoId(symbol)
    if (coinGeckoId) {
      mapping.set(symbol, coinGeckoId)
    }
  }
  
  return mapping
}

