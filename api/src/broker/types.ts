export type Side = 'buy' | 'sell'
export type SignalDirection = 'long' | 'short' | 'flat'

export type Bar = {
  symbol: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type AccountSnapshot = {
  id: string
  status: string
  equity: number
  cash: number
  buyingPower: number
  portfolioValue: number
  currency: string
  patternDayTrader: boolean
  tradingBlocked: boolean
  source: 'alpaca' | 'simulation'
}

export type PositionSnapshot = {
  symbol: string
  qty: number
  side: 'long' | 'short'
  marketValue: number
  avgEntryPrice: number
  unrealizedPl: number
  currentPrice: number
}

export type OrderRequest = {
  symbol: string
  qty: number
  side: Side
  type: 'market'
  timeInForce: 'day'
  clientOrderId: string
}

export type OrderResult = {
  id: string
  clientOrderId: string
  symbol: string
  qty: number
  side: Side
  status: string
  filledAvgPrice: number | null
  submittedAt: string
  source: 'alpaca' | 'simulation'
}

export type BrokerAdapter = {
  name: string
  getAccount(): Promise<AccountSnapshot>
  getPositions(): Promise<PositionSnapshot[]>
  getBars(symbol: string, timeframe: '1Day', limit: number): Promise<Bar[]>
  submitOrder(order: OrderRequest): Promise<OrderResult>
  health(): Promise<{ ok: boolean; detail: string }>
}
