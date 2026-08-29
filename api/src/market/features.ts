import type { Bar } from '../broker/types.js'

export type FeatureSnapshot = {
  symbol: string
  asOf: string
  close: number
  return1d: number
  return5d: number
  return20d: number
  sma10: number
  sma20: number
  sma50: number
  rsi14: number
  atr14: number
  volumeRatio20: number
  trendStrength: number
}

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const delta = closes[i]! - closes[i - 1]!
    if (delta >= 0) gains += delta
    else losses -= delta
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

function atr(bars: Bar[], period = 14): number {
  if (bars.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < bars.length; i += 1) {
    const cur = bars[i]!
    const prev = bars[i - 1]!
    trs.push(
      Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prev.close),
        Math.abs(cur.low - prev.close),
      ),
    )
  }
  return sma(trs, Math.min(period, trs.length))
}

export function buildFeatures(bars: Bar[]): FeatureSnapshot | null {
  if (bars.length < 55) return null
  const closes = bars.map((b) => b.close)
  const volumes = bars.map((b) => b.volume)
  const last = bars[bars.length - 1]!
  const close = last.close
  const close1 = closes[closes.length - 2]!
  const close5 = closes[closes.length - 6]!
  const close20 = closes[closes.length - 21]!
  const sma10 = sma(closes, 10)
  const sma20 = sma(closes, 20)
  const sma50 = sma(closes, 50)
  const vol20 = sma(volumes, 20)

  return {
    symbol: last.symbol,
    asOf: last.timestamp,
    close,
    return1d: close / close1 - 1,
    return5d: close / close5 - 1,
    return20d: close / close20 - 1,
    sma10,
    sma20,
    sma50,
    rsi14: rsi(closes, 14),
    atr14: atr(bars, 14),
    volumeRatio20: vol20 === 0 ? 1 : last.volume / vol20,
    trendStrength: (sma10 - sma50) / sma50,
  }
}
