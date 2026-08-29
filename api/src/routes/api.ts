import { Router } from 'express'
import type { BrokerAdapter } from '../broker/types.js'
import type { AppConfig } from '../config.js'
import { runPaperPipeline } from '../pipeline/runScan.js'
import type { RiskEngine } from '../risk/engine.js'
import type { AppStore } from '../store/memory.js'

export function createRoutes(deps: {
  config: AppConfig
  broker: BrokerAdapter
  risk: RiskEngine
  store: AppStore
}) {
  const router = Router()
  const { config, broker, risk, store } = deps
  let scanning = false

  router.get('/health', async (_req, res) => {
    const brokerHealth = await broker.health()
    res.json({
      ok: brokerHealth.ok,
      mode: config.mode,
      broker: broker.name,
      brokerHealth,
      killSwitch: risk.getState(),
      hasAlpacaKeys: config.hasAlpacaKeys,
      liveEnabled: config.enableLiveTrading,
    })
  })

  router.get('/dashboard', async (_req, res) => {
    if (!store.latestAccount) {
      try {
        store.latestAccount = await broker.getAccount()
        store.latestPositions = await broker.getPositions()
      } catch (error) {
        res.status(502).json({
          error: error instanceof Error ? error.message : 'Broker unavailable',
        })
        return
      }
    }

    const latestRun = store.runs[0] ?? null
    res.json({
      mode: config.mode,
      broker: broker.name,
      account: store.latestAccount,
      positions: store.latestPositions,
      features: store.latestFeatures,
      latestRun,
      runs: store.runs.slice(0, 10),
      risk: risk.getState(),
      systemEvents: store.systemEvents.slice(0, 20),
      universe: config.universe,
    })
  })

  router.get('/runs', (_req, res) => {
    res.json({ runs: store.runs })
  })

  router.get('/runs/:id', (req, res) => {
    const run = store.runs.find((r) => r.id === req.params.id)
    if (!run) {
      res.status(404).json({ error: 'Run not found' })
      return
    }
    res.json(run)
  })

  router.post('/pipeline/run', async (_req, res) => {
    if (scanning) {
      res.status(409).json({ error: 'A scan is already running' })
      return
    }
    scanning = true
    try {
      const run = await runPaperPipeline({ config, broker, risk, store })
      res.status(run.status === 'failed' ? 500 : 200).json(run)
    } finally {
      scanning = false
    }
  })

  router.post('/risk/kill-switch', (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'MANUAL'
    risk.engageKillSwitch(reason)
    store.systemEvents.unshift({
      at: new Date().toISOString(),
      level: 'warn',
      message: `Kill switch engaged: ${reason}`,
    })
    res.json(risk.getState())
  })

  router.delete('/risk/kill-switch', (_req, res) => {
    risk.clearKillSwitch()
    store.systemEvents.unshift({
      at: new Date().toISOString(),
      level: 'info',
      message: 'Kill switch cleared',
    })
    res.json(risk.getState())
  })

  return router
}
