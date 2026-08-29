import 'dotenv/config'

export type TradingMode = 'PAPER' | 'LIVE' | 'SIMULATION'

function envBool(name: string, fallback = false): boolean {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

const hasAlpacaKeys = Boolean(
  process.env.ALPACA_API_KEY?.trim() && process.env.ALPACA_SECRET_KEY?.trim(),
)

const enableLive = envBool('ENABLE_LIVE_TRADING', false)
const requestedLive = process.env.TRADING_MODE?.toUpperCase() === 'LIVE'

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '0.0.0.0',
  hasAlpacaKeys,
  enableLiveTrading: enableLive,
  mode: ((): TradingMode => {
    if (requestedLive && enableLive && hasAlpacaKeys) return 'LIVE'
    if (hasAlpacaKeys) return 'PAPER'
    return 'SIMULATION'
  })(),
  alpaca: {
    keyId: process.env.ALPACA_API_KEY ?? '',
    secret: process.env.ALPACA_SECRET_KEY ?? '',
    baseUrl:
      process.env.ALPACA_BASE_URL ??
      (enableLive && requestedLive
        ? 'https://api.alpaca.markets'
        : 'https://paper-api.alpaca.markets'),
    dataUrl: process.env.ALPACA_DATA_URL ?? 'https://data.alpaca.markets',
    paper: !(enableLive && requestedLive),
  },
  risk: {
    maxPositionPct: Number(process.env.RISK_MAX_POSITION_PCT ?? 0.05),
    maxPortfolioExposurePct: Number(process.env.RISK_MAX_EXPOSURE_PCT ?? 0.4),
    maxOrderNotional: Number(process.env.RISK_MAX_ORDER_NOTIONAL ?? 5000),
    maxDailyLossPct: Number(process.env.RISK_MAX_DAILY_LOSS_PCT ?? 0.02),
    minConfidence: Number(process.env.RISK_MIN_CONFIDENCE ?? 0.55),
    maxOpenPositions: Number(process.env.RISK_MAX_OPEN_POSITIONS ?? 8),
  },
  universe: (process.env.SCAN_UNIVERSE ?? 'SPY,QQQ,IWM,AAPL,MSFT,NVDA,AMZN,META,TSLA,AMD')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
}

export type AppConfig = typeof config
