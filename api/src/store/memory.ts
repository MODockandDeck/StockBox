import { randomUUID } from 'node:crypto'
import type { AccountSnapshot, OrderResult, PositionSnapshot } from '../broker/types.js'
import type { FeatureSnapshot } from '../market/features.js'
import type { RiskDecision } from '../risk/engine.js'
import type { StrategySignal } from '../strategy/momentum.js'

export type DecisionTrailEvent = {
  id: string
  at: string
  type:
    | 'scan_started'
    | 'features'
    | 'signal'
    | 'risk'
    | 'order'
    | 'skip'
    | 'error'
    | 'scan_completed'
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
  status: 'running' | 'completed' | 'failed'
  symbolsScanned: number
  signals: StrategySignal[]
  riskDecisions: Array<{ signal: StrategySignal; decision: RiskDecision }>
  orders: OrderResult[]
  trail: DecisionTrailEvent[]
  accountBefore: AccountSnapshot | null
  accountAfter: AccountSnapshot | null
  error: string | null
}

export type AppStore = {
  runs: PipelineRun[]
  latestAccount: AccountSnapshot | null
  latestPositions: PositionSnapshot[]
  latestFeatures: FeatureSnapshot[]
  systemEvents: Array<{ at: string; level: string; message: string }>
}

export function createStore(): AppStore {
  return {
    runs: [],
    latestAccount: null,
    latestPositions: [],
    latestFeatures: [],
    systemEvents: [],
  }
}

export function pushEvent(
  run: PipelineRun,
  partial: Omit<DecisionTrailEvent, 'id' | 'at'> & { at?: string },
) {
  run.trail.push({
    id: randomUUID(),
    at: partial.at ?? new Date().toISOString(),
    type: partial.type,
    symbol: partial.symbol,
    message: partial.message,
    data: partial.data,
  })
}
