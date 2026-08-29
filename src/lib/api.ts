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

export type DecisionTrailEvent = {
  id: string
  at: string
  type: string
  symbol?: string
  message: string
  data?: unknown
}

export type PipelineRun = {
  id: string
  startedAt: string
  completedAt: string | null
  mode: string
  broker: string
  status: string
  symbolsScanned: number
  signals: Array<{
    symbol: string
    direction: string
    confidence: number
    reasonCodes: string[]
    expectedReturn: number
  }>
  riskDecisions: Array<{
    signal: { symbol: string }
    decision: { approved: boolean; reasonCodes: string[]; maxQty: number; notional: number }
  }>
  orders: Array<{
    id: string
    symbol: string
    qty: number
    side: string
    status: string
    filledAvgPrice: number | null
    source: string
  }>
  trail: DecisionTrailEvent[]
  accountBefore: AccountSnapshot | null
  accountAfter: AccountSnapshot | null
  error: string | null
}

export type DashboardPayload = {
  mode: string
  broker: string
  account: AccountSnapshot
  positions: PositionSnapshot[]
  latestRun: PipelineRun | null
  runs: PipelineRun[]
  risk: { killSwitch: boolean; killReason: string | null }
  systemEvents: Array<{ at: string; level: string; message: string }>
  universe: string[]
}

const rawApi = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const API_BASE = rawApi
  ? rawApi.replace(/\/$/, '').startsWith('http')
    ? rawApi.replace(/\/$/, '')
    : `https://${rawApi.replace(/\/$/, '')}`
  : ''

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`)
  }
  return body as T
}

export function fetchDashboard() {
  return api<DashboardPayload>('/api/dashboard')
}

export function runPipeline() {
  return api<PipelineRun>('/api/pipeline/run', { method: 'POST' })
}

export function engageKillSwitch(reason = 'MANUAL_UI') {
  return api('/api/risk/kill-switch', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function clearKillSwitch() {
  return api('/api/risk/kill-switch', { method: 'DELETE' })
}

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatPct(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(2)}%`
}
