import cors from 'cors'
import express from 'express'
import { createBroker } from './broker/index.js'
import { config } from './config.js'
import { runPaperPipeline, createStore } from './pipeline/runScan.js'
import { createRiskEngine } from './risk/engine.js'
import { createRoutes } from './routes/api.js'

const broker = createBroker(config)
const risk = createRiskEngine(config)
const store = createStore()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    name: 'StockBox Trading API',
    mode: config.mode,
    broker: broker.name,
    docs: {
      health: '/api/health',
      dashboard: '/api/dashboard',
      runPipeline: 'POST /api/pipeline/run',
    },
  })
})

app.use('/api', createRoutes({ config, broker, risk, store }))

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unexpected error'
  res.status(500).json({ error: message })
})

async function boot() {
  app.listen(config.port, config.host, () => {
    console.log(
      `StockBox API listening on http://${config.host}:${config.port} · mode=${config.mode} · broker=${broker.name}`,
    )
  })

  // Warm dashboard state and leave an initial decision trail for local demos.
  try {
    store.latestAccount = await broker.getAccount()
    store.latestPositions = await broker.getPositions()
    await runPaperPipeline({ config, broker, risk, store })
  } catch (error) {
    console.warn('Initial pipeline warm-up failed:', error)
  }
}

boot()
