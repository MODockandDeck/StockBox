import type { AppConfig } from '../config.js'
import type {
  AccountSnapshot,
  Bar,
  BrokerAdapter,
  OrderRequest,
  OrderResult,
  PositionSnapshot,
} from './types.js'

type AlpacaAccount = {
  id: string
  status: string
  equity: string
  cash: string
  buying_power: string
  portfolio_value: string
  currency: string
  pattern_day_trader: boolean
  trading_blocked: boolean
}

type AlpacaPosition = {
  symbol: string
  qty: string
  side: 'long' | 'short'
  market_value: string
  avg_entry_price: string
  unrealized_pl: string
  current_price: string
}

type AlpacaOrder = {
  id: string
  client_order_id: string
  symbol: string
  qty: string
  side: 'buy' | 'sell'
  status: string
  filled_avg_price: string | null
  submitted_at: string
}

type AlpacaBar = {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

async function alpacaFetch<T>(
  config: AppConfig,
  path: string,
  init?: RequestInit,
  useDataHost = false,
): Promise<T> {
  const host = useDataHost ? config.alpaca.dataUrl : config.alpaca.baseUrl
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      'APCA-API-KEY-ID': config.alpaca.keyId,
      'APCA-API-SECRET-KEY': config.alpaca.secret,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Alpaca ${response.status}: ${body.slice(0, 400)}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function createAlpacaBroker(config: AppConfig): BrokerAdapter {
  return {
    name: config.alpaca.paper ? 'alpaca-paper' : 'alpaca-live',

    async getAccount() {
      const account = await alpacaFetch<AlpacaAccount>(config, '/v2/account')
      return {
        id: account.id,
        status: account.status,
        equity: Number(account.equity),
        cash: Number(account.cash),
        buyingPower: Number(account.buying_power),
        portfolioValue: Number(account.portfolio_value),
        currency: account.currency,
        patternDayTrader: account.pattern_day_trader,
        tradingBlocked: account.trading_blocked,
        source: 'alpaca' as const,
      } satisfies AccountSnapshot
    },

    async getPositions() {
      const positions = await alpacaFetch<AlpacaPosition[]>(config, '/v2/positions')
      return positions.map(
        (p): PositionSnapshot => ({
          symbol: p.symbol,
          qty: Number(p.qty),
          side: p.side,
          marketValue: Number(p.market_value),
          avgEntryPrice: Number(p.avg_entry_price),
          unrealizedPl: Number(p.unrealized_pl),
          currentPrice: Number(p.current_price),
        }),
      )
    },

    async getBars(symbol, _timeframe, limit) {
      const params = new URLSearchParams({
        timeframe: '1Day',
        limit: String(limit),
        adjustment: 'raw',
        feed: 'iex',
      })
      const payload = await alpacaFetch<{ bars?: Record<string, AlpacaBar[]> }>(
        config,
        `/v2/stocks/${encodeURIComponent(symbol)}/bars?${params}`,
        undefined,
        true,
      )
      const bars = payload.bars?.[symbol] ?? []
      return bars.map(
        (b): Bar => ({
          symbol,
          timestamp: b.t,
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v,
        }),
      )
    },

    async submitOrder(order: OrderRequest) {
      const created = await alpacaFetch<AlpacaOrder>(config, '/v2/orders', {
        method: 'POST',
        body: JSON.stringify({
          symbol: order.symbol,
          qty: String(order.qty),
          side: order.side,
          type: order.type,
          time_in_force: order.timeInForce,
          client_order_id: order.clientOrderId,
        }),
      })
      return {
        id: created.id,
        clientOrderId: created.client_order_id,
        symbol: created.symbol,
        qty: Number(created.qty),
        side: created.side,
        status: created.status,
        filledAvgPrice: created.filled_avg_price
          ? Number(created.filled_avg_price)
          : null,
        submittedAt: created.submitted_at,
        source: 'alpaca' as const,
      } satisfies OrderResult
    },

    async health() {
      try {
        const account = await this.getAccount()
        return {
          ok: account.status === 'ACTIVE' && !account.tradingBlocked,
          detail: `Alpaca ${account.status} · equity ${account.equity.toFixed(2)}`,
        }
      } catch (error) {
        return {
          ok: false,
          detail: error instanceof Error ? error.message : 'Alpaca health failed',
        }
      }
    },
  }
}
