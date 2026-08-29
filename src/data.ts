export type Side = 'long' | 'short'

export type Trade = {
  id: string
  symbol: string
  side: Side
  entry: number
  exit: number
  size: number
  notes: string
  closedAt: string
}

export type WatchItem = {
  symbol: string
  name: string
  last: number
  changePct: number
}

export const SEED_WATCHLIST: WatchItem[] = [
  { symbol: 'NVDA', name: 'NVIDIA', last: 128.42, changePct: 2.14 },
  { symbol: 'AAPL', name: 'Apple', last: 227.18, changePct: -0.46 },
  { symbol: 'MSFT', name: 'Microsoft', last: 418.75, changePct: 0.82 },
  { symbol: 'TSLA', name: 'Tesla', last: 248.9, changePct: 1.37 },
  { symbol: 'AMD', name: 'AMD', last: 162.05, changePct: -1.12 },
]

export const SEED_TRADES: Trade[] = [
  {
    id: 't1',
    symbol: 'NVDA',
    side: 'long',
    entry: 118.2,
    exit: 128.42,
    size: 40,
    notes: 'Breakout above prior high with volume confirmation.',
    closedAt: '2026-08-27',
  },
  {
    id: 't2',
    symbol: 'AAPL',
    side: 'long',
    entry: 231.4,
    exit: 227.18,
    size: 25,
    notes: 'Stopped out into soft open.',
    closedAt: '2026-08-26',
  },
  {
    id: 't3',
    symbol: 'TSLA',
    side: 'short',
    entry: 255.1,
    exit: 248.9,
    size: 15,
    notes: 'Fade into resistance after gap.',
    closedAt: '2026-08-25',
  },
]

export function pnl(trade: Trade): number {
  const direction = trade.side === 'long' ? 1 : -1
  return (trade.exit - trade.entry) * trade.size * direction
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
  return value < 0 ? `-${formatted}` : formatted
}

export function formatPct(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
