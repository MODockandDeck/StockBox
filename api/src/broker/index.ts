import type { AppConfig } from '../config.js'
import { createAlpacaBroker } from './alpaca.js'
import { createSimulatorBroker } from './simulator.js'
import type { BrokerAdapter } from './types.js'

export function createBroker(config: AppConfig): BrokerAdapter {
  if (config.hasAlpacaKeys) {
    return createAlpacaBroker(config)
  }
  return createSimulatorBroker(config.universe)
}

export type { BrokerAdapter, AccountSnapshot, PositionSnapshot, Bar, OrderResult } from './types.js'
