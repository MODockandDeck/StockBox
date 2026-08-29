import type { FeatureSnapshot } from '../market/features.js'

export type StrategySignal = {
  strategyId: string
  strategyName: string
  strategyVersion: string
  symbol: string
  timestamp: string
  direction: 'long' | 'short' | 'flat'
  entryPrice: number
  confidence: number
  expectedReturn: number
  holdingPeriodDays: number
  stopPrice: number
  targetPrice: number
  reasonCodes: string[]
  modelVersion: string
}

export type Strategy = {
  id: string
  name: string
  version: string
  calculateSignal(features: FeatureSnapshot, spyFeatures: FeatureSnapshot | null): StrategySignal | null
}

export const momentumStrategy: Strategy = {
  id: 'momentum-rs-v1',
  name: 'Short-term momentum + relative strength',
  version: '1.0.0',

  calculateSignal(features, spyFeatures) {
    const reasons: string[] = []
    let score = 0

    if (features.return5d > 0.015) {
      score += 0.25
      reasons.push('RET5_POS')
    }
    if (features.return20d > 0.03) {
      score += 0.2
      reasons.push('RET20_POS')
    }
    if (features.close > features.sma20 && features.sma20 > features.sma50) {
      score += 0.25
      reasons.push('MA_STACK_BULL')
    }
    if (features.rsi14 > 52 && features.rsi14 < 72) {
      score += 0.1
      reasons.push('RSI_TREND')
    }
    if (features.volumeRatio20 > 1.1) {
      score += 0.1
      reasons.push('VOL_EXPAND')
    }
    if (spyFeatures && features.return5d > spyFeatures.return5d + 0.005) {
      score += 0.15
      reasons.push('RS_VS_SPY')
    }

    if (score < 0.55 || reasons.length < 2) {
      return {
        strategyId: this.id,
        strategyName: this.name,
        strategyVersion: this.version,
        symbol: features.symbol,
        timestamp: features.asOf,
        direction: 'flat',
        entryPrice: features.close,
        confidence: score,
        expectedReturn: features.return5d,
        holdingPeriodDays: 5,
        stopPrice: Number((features.close - 1.5 * features.atr14).toFixed(2)),
        targetPrice: Number((features.close + 2.5 * features.atr14).toFixed(2)),
        reasonCodes: reasons.length ? reasons : ['NO_EDGE'],
        modelVersion: 'rules-v1',
      }
    }

    const expectedReturn = Math.min(0.04, Math.max(0.008, features.return5d * 0.6 + 0.01))
    return {
      strategyId: this.id,
      strategyName: this.name,
      strategyVersion: this.version,
      symbol: features.symbol,
      timestamp: features.asOf,
      direction: 'long',
      entryPrice: features.close,
      confidence: Number(Math.min(0.95, score).toFixed(3)),
      expectedReturn: Number(expectedReturn.toFixed(4)),
      holdingPeriodDays: 5,
      stopPrice: Number((features.close - 1.5 * features.atr14).toFixed(2)),
      targetPrice: Number((features.close + 2.5 * features.atr14).toFixed(2)),
      reasonCodes: reasons,
      modelVersion: 'rules-v1',
    }
  },
}
