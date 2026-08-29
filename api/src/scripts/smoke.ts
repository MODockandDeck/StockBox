import { createBroker } from '../broker/index.js'
import { config } from '../config.js'
import { runPaperPipeline, createStore } from '../pipeline/runScan.js'
import { createRiskEngine } from '../risk/engine.js'

async function main() {
  const broker = createBroker(config)
  const risk = createRiskEngine(config)
  const store = createStore()
  const run = await runPaperPipeline({ config, broker, risk, store })

  const summary = {
    mode: config.mode,
    broker: broker.name,
    status: run.status,
    symbolsScanned: run.symbolsScanned,
    signals: run.signals.length,
    longSignals: run.signals.filter((s) => s.direction === 'long').length,
    orders: run.orders.length,
    trailEvents: run.trail.length,
    error: run.error,
  }

  console.log(JSON.stringify(summary, null, 2))
  if (run.status !== 'completed' || run.trail.length < 3) {
    process.exitCode = 1
  }
}

main()
