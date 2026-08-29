import { randomUUID } from 'node:crypto'
import type { BrokerAdapter } from '../broker/types.js'
import type { AppConfig } from '../config.js'
import { buildFeatures } from '../market/features.js'
import type { RiskEngine } from '../risk/engine.js'
import { momentumStrategy } from '../strategy/momentum.js'
import { createStore, pushEvent, type AppStore, type PipelineRun } from '../store/memory.js'

export type PipelineDeps = {
  config: AppConfig
  broker: BrokerAdapter
  risk: RiskEngine
  store: AppStore
}

export async function runPaperPipeline(deps: PipelineDeps): Promise<PipelineRun> {
  const { config, broker, risk, store } = deps
  const run: PipelineRun = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    mode: config.mode,
    broker: broker.name,
    status: 'running',
    symbolsScanned: 0,
    signals: [],
    riskDecisions: [],
    orders: [],
    trail: [],
    accountBefore: null,
    accountAfter: null,
    error: null,
  }

  store.runs.unshift(run)
  if (store.runs.length > 25) store.runs.length = 25

  try {
    pushEvent(run, {
      type: 'scan_started',
      message: `Scan started in ${config.mode} via ${broker.name}`,
      data: { universe: config.universe },
    })

    const account = await broker.getAccount()
    const positions = await broker.getPositions()
    run.accountBefore = account
    store.latestAccount = account
    store.latestPositions = positions

    const spyBars = await broker.getBars('SPY', '1Day', 120)
    const spyFeatures = buildFeatures(spyBars)

    const features = []
    for (const symbol of config.universe) {
      run.symbolsScanned += 1
      const bars = symbol === 'SPY' ? spyBars : await broker.getBars(symbol, '1Day', 120)
      const feature = buildFeatures(bars)
      if (!feature) {
        pushEvent(run, {
          type: 'skip',
          symbol,
          message: 'Insufficient bar history for features',
        })
        continue
      }
      features.push(feature)
      pushEvent(run, {
        type: 'features',
        symbol,
        message: `Features ready · 5d ${(feature.return5d * 100).toFixed(2)}% · RSI ${feature.rsi14.toFixed(1)}`,
        data: feature,
      })

      const signal = momentumStrategy.calculateSignal(feature, spyFeatures)
      if (!signal) continue
      run.signals.push(signal)
      pushEvent(run, {
        type: 'signal',
        symbol,
        message: `${signal.direction.toUpperCase()} signal · confidence ${(signal.confidence * 100).toFixed(1)}%`,
        data: signal,
      })

      if (signal.direction === 'flat') {
        pushEvent(run, {
          type: 'skip',
          symbol,
          message: `No trade · ${signal.reasonCodes.join(', ')}`,
        })
        continue
      }

      const decision = risk.evaluate({ signal, account, positions: store.latestPositions })
      run.riskDecisions.push({ signal, decision })
      pushEvent(run, {
        type: 'risk',
        symbol,
        message: decision.approved
          ? `Risk approved · qty ${decision.maxQty} · notional $${decision.notional}`
          : `Risk blocked · ${decision.reasonCodes.join(', ')}`,
        data: decision,
      })

      if (!decision.approved) continue

      const order = await broker.submitOrder({
        symbol,
        qty: decision.maxQty,
        side: 'buy',
        type: 'market',
        timeInForce: 'day',
        clientOrderId: `sb-${run.id.slice(0, 8)}-${symbol}`.toLowerCase(),
      })
      run.orders.push(order)
      pushEvent(run, {
        type: 'order',
        symbol,
        message: `Order ${order.status} · ${order.side} ${order.qty} @ ${order.filledAvgPrice ?? 'mkt'}`,
        data: order,
      })

      store.latestPositions = await broker.getPositions()
    }

    store.latestFeatures = features
    run.accountAfter = await broker.getAccount()
    store.latestAccount = run.accountAfter
    store.latestPositions = await broker.getPositions()
    run.status = 'completed'
    run.completedAt = new Date().toISOString()
    pushEvent(run, {
      type: 'scan_completed',
      message: `Completed · ${run.signals.length} signals · ${run.orders.length} orders`,
      data: {
        signals: run.signals.length,
        orders: run.orders.length,
        blocked: run.riskDecisions.filter((d) => !d.decision.approved).length,
      },
    })
    store.systemEvents.unshift({
      at: run.completedAt,
      level: 'info',
      message: `Pipeline ${run.id.slice(0, 8)} completed with ${run.orders.length} orders`,
    })
    return run
  } catch (error) {
    run.status = 'failed'
    run.completedAt = new Date().toISOString()
    run.error = error instanceof Error ? error.message : 'Pipeline failed'
    pushEvent(run, { type: 'error', message: run.error })
    store.systemEvents.unshift({
      at: run.completedAt,
      level: 'error',
      message: run.error,
    })
    return run
  }
}

export { createStore }
