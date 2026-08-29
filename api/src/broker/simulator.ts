import { randomUUID } from 'node:crypto'
import type {
  AccountSnapshot,
  Bar,
  BrokerAdapter,
  OrderRequest,
  OrderResult,
  PositionSnapshot,
} from './types.js'

const SEED: Record<string, { price: number; vol: number }> = {
  SPY: { price: 560, vol: 0.01 },
  QQQ: { price: 490, vol: 0.014 },
  IWM: { price: 220, vol: 0.016 },
  AAPL: { price: 227, vol: 0.018 },
  MSFT: { price: 420, vol: 0.015 },
  NVDA: { price: 128, vol: 0.03 },
  AMZN: { price: 195, vol: 0.02 },
  META: { price: 520, vol: 0.022 },
  TSLA: { price: 248, vol: 0.035 },
  AMD: { price: 162, vol: 0.028 },
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSymbol(symbol: string): number {
  return [...symbol].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

export function createSimulatorBroker(universe: string[]): BrokerAdapter {
  const positions = new Map<string, PositionSnapshot>()
  let cash = 100_000
  let equity = 100_000

  function markPrices(): Record<string, number> {
    const now = Date.now()
    const out: Record<string, number> = {}
    for (const symbol of universe) {
      const seed = SEED[symbol] ?? { price: 100, vol: 0.02 }
      const wave = Math.sin(now / 3_600_000 + hashSymbol(symbol)) * seed.vol
      out[symbol] = Number((seed.price * (1 + wave)).toFixed(2))
    }
    return out
  }

  function revalue() {
    const marks = markPrices()
    let marketValue = 0
    for (const [symbol, position] of positions) {
      const price = marks[symbol] ?? position.currentPrice
      const signedQty = position.side === 'long' ? position.qty : -position.qty
      position.currentPrice = price
      position.marketValue = Number((signedQty * price).toFixed(2))
      position.unrealizedPl = Number(
        ((price - position.avgEntryPrice) * signedQty).toFixed(2),
      )
      marketValue += position.marketValue
    }
    equity = Number((cash + marketValue).toFixed(2))
  }

  return {
    name: 'simulation',

    async getAccount(): Promise<AccountSnapshot> {
      revalue()
      return {
        id: 'sim-account',
        status: 'ACTIVE',
        equity,
        cash,
        buyingPower: cash,
        portfolioValue: equity,
        currency: 'USD',
        patternDayTrader: false,
        tradingBlocked: false,
        source: 'simulation',
      }
    },

    async getPositions() {
      revalue()
      return [...positions.values()]
    },

    async getBars(symbol, _timeframe, limit) {
      const base = SEED[symbol] ?? { price: 100, vol: 0.02 }
      const rand = mulberry32(hashSymbol(symbol) * 997)
      const bars: Bar[] = []
      let price = base.price * 0.9
      const now = Date.now()

      for (let i = limit - 1; i >= 0; i -= 1) {
        const drift = (rand() - 0.45) * base.vol
        const open = price
        const close = Number((price * (1 + drift)).toFixed(2))
        const high = Number((Math.max(open, close) * (1 + rand() * 0.005)).toFixed(2))
        const low = Number((Math.min(open, close) * (1 - rand() * 0.005)).toFixed(2))
        const timestamp = new Date(now - i * 86_400_000).toISOString()
        bars.push({
          symbol,
          timestamp,
          open,
          high,
          low,
          close,
          volume: Math.floor(1_000_000 + rand() * 4_000_000),
        })
        price = close
      }
      return bars
    },

    async submitOrder(order: OrderRequest): Promise<OrderResult> {
      revalue()
      const marks = markPrices()
      const price = marks[order.symbol] ?? 100
      const notional = price * order.qty

      if (order.side === 'buy') {
        if (notional > cash) throw new Error('Simulation: insufficient cash')
        cash = Number((cash - notional).toFixed(2))
        const existing = positions.get(order.symbol)
        if (existing && existing.side === 'long') {
          const totalQty = existing.qty + order.qty
          existing.avgEntryPrice = Number(
            (
              (existing.avgEntryPrice * existing.qty + price * order.qty) /
              totalQty
            ).toFixed(4),
          )
          existing.qty = totalQty
        } else {
          positions.set(order.symbol, {
            symbol: order.symbol,
            qty: order.qty,
            side: 'long',
            marketValue: notional,
            avgEntryPrice: price,
            unrealizedPl: 0,
            currentPrice: price,
          })
        }
      } else {
        const existing = positions.get(order.symbol)
        if (!existing || existing.qty < order.qty) {
          throw new Error('Simulation: insufficient shares to sell')
        }
        cash = Number((cash + notional).toFixed(2))
        existing.qty -= order.qty
        if (existing.qty === 0) positions.delete(order.symbol)
      }

      revalue()
      return {
        id: `sim-${randomUUID()}`,
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        status: 'filled',
        filledAvgPrice: price,
        submittedAt: new Date().toISOString(),
        source: 'simulation',
      }
    },

    async health() {
      return { ok: true, detail: 'Simulation broker active (no Alpaca keys)' }
    },
  }
}
