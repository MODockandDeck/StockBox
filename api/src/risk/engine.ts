import type { AppConfig } from '../config.js'
import type { AccountSnapshot, PositionSnapshot } from '../broker/types.js'
import type { StrategySignal } from '../strategy/momentum.js'

export type RiskDecision = {
  approved: boolean
  reasonCodes: string[]
  maxQty: number
  notional: number
  positionPct: number
  killSwitch: boolean
}

export type RiskState = {
  killSwitch: boolean
  killReason: string | null
  dayStartEquity: number | null
}

export function createRiskEngine(config: AppConfig) {
  const state: RiskState = {
    killSwitch: false,
    killReason: null,
    dayStartEquity: null,
  }

  function ensureDayStart(account: AccountSnapshot) {
    if (state.dayStartEquity == null) state.dayStartEquity = account.equity
  }

  return {
    getState(): RiskState {
      return { ...state }
    },

    engageKillSwitch(reason: string) {
      state.killSwitch = true
      state.killReason = reason
    },

    clearKillSwitch() {
      state.killSwitch = false
      state.killReason = null
    },

    evaluate(input: {
      signal: StrategySignal
      account: AccountSnapshot
      positions: PositionSnapshot[]
    }): RiskDecision {
      const { signal, account, positions } = input
      ensureDayStart(account)
      const reasons: string[] = []

      if (state.killSwitch) {
        return {
          approved: false,
          reasonCodes: ['KILL_SWITCH', state.killReason ?? 'ACTIVE'],
          maxQty: 0,
          notional: 0,
          positionPct: 0,
          killSwitch: true,
        }
      }

      if (signal.direction !== 'long') {
        return {
          approved: false,
          reasonCodes: ['DIRECTION_NOT_LONG'],
          maxQty: 0,
          notional: 0,
          positionPct: 0,
          killSwitch: false,
        }
      }

      if (signal.confidence < config.risk.minConfidence) {
        reasons.push('LOW_CONFIDENCE')
      }

      if (positions.length >= config.risk.maxOpenPositions) {
        reasons.push('MAX_POSITIONS')
      }

      if (positions.some((p) => p.symbol === signal.symbol)) {
        reasons.push('ALREADY_IN_POSITION')
      }

      const dayStart = state.dayStartEquity ?? account.equity
      const dailyLossPct = dayStart === 0 ? 0 : (dayStart - account.equity) / dayStart
      if (dailyLossPct >= config.risk.maxDailyLossPct) {
        state.killSwitch = true
        state.killReason = 'DAILY_LOSS_LIMIT'
        reasons.push('DAILY_LOSS_LIMIT')
      }

      const openExposure = positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0)
      const exposurePct = account.equity === 0 ? 1 : openExposure / account.equity
      if (exposurePct >= config.risk.maxPortfolioExposurePct) {
        reasons.push('MAX_EXPOSURE')
      }

      const targetNotional = Math.min(
        account.equity * config.risk.maxPositionPct,
        config.risk.maxOrderNotional,
        account.cash * 0.95,
      )
      const maxQty = Math.floor(targetNotional / signal.entryPrice)
      if (maxQty < 1) reasons.push('SIZE_TOO_SMALL')

      const approved = reasons.length === 0 && maxQty >= 1
      if (approved) reasons.push('RISK_OK')

      return {
        approved,
        reasonCodes: reasons,
        maxQty: approved ? maxQty : 0,
        notional: approved ? Number((maxQty * signal.entryPrice).toFixed(2)) : 0,
        positionPct: account.equity === 0 ? 0 : targetNotional / account.equity,
        killSwitch: state.killSwitch,
      }
    },
  }
}

export type RiskEngine = ReturnType<typeof createRiskEngine>
