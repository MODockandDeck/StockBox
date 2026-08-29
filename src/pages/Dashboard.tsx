import { useEffect, useState, useTransition } from 'react'
import {
  clearKillSwitch,
  engageKillSwitch,
  fetchDashboard,
  formatMoney,
  formatPct,
  runPipeline,
  type DashboardPayload,
} from '../lib/api'

type Props = {
  onBack: () => void
}

export function Dashboard({ onBack }: Props) {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      try {
        setError(null)
        setData(await fetchDashboard())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      }
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onRunScan() {
    startTransition(async () => {
      try {
        setError(null)
        await runPipeline()
        setData(await fetchDashboard())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pipeline failed')
      }
    })
  }

  async function onToggleKill() {
    startTransition(async () => {
      try {
        if (data?.risk.killSwitch) await clearKillSwitch()
        else await engageKillSwitch('MANUAL_UI')
        setData(await fetchDashboard())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kill switch update failed')
      }
    })
  }

  const run = data?.latestRun

  return (
    <div className="dash">
      <header className="dash__top">
        <div>
          <button type="button" className="linkish" onClick={onBack}>
            ← StockBox
          </button>
          <h1>Paper trading desk</h1>
          <p className="dash__sub">
            Vertical slice: bars → features → momentum signal → risk → order → audit trail
          </p>
        </div>
        <div className="dash__actions">
          <button type="button" className="btn btn--ghost-dark" onClick={refresh} disabled={pending}>
            Refresh
          </button>
          <button type="button" className="btn btn--ghost-dark" onClick={onToggleKill} disabled={pending}>
            {data?.risk.killSwitch ? 'Clear kill switch' : 'Engage kill switch'}
          </button>
          <button type="button" className="btn btn--primary" onClick={onRunScan} disabled={pending}>
            {pending ? 'Working…' : 'Run paper scan'}
          </button>
        </div>
      </header>

      {error ? <p className="dash__error">{error}</p> : null}

      {!data ? (
        <p className="dash__loading">Loading broker state…</p>
      ) : (
        <>
          <section className="metrics" aria-label="Account metrics">
            <article>
              <p className="metrics__label">Mode</p>
              <p className="metrics__value">{data.mode}</p>
              <p className="metrics__meta">{data.broker}</p>
            </article>
            <article>
              <p className="metrics__label">Equity</p>
              <p className="metrics__value">{formatMoney(data.account.equity)}</p>
              <p className="metrics__meta">Cash {formatMoney(data.account.cash)}</p>
            </article>
            <article>
              <p className="metrics__label">Buying power</p>
              <p className="metrics__value">{formatMoney(data.account.buyingPower)}</p>
              <p className="metrics__meta">{data.account.status}</p>
            </article>
            <article>
              <p className="metrics__label">Risk</p>
              <p className={`metrics__value ${data.risk.killSwitch ? 'loss' : 'gain'}`}>
                {data.risk.killSwitch ? 'HALTED' : 'ARMED'}
              </p>
              <p className="metrics__meta">{data.risk.killReason ?? 'Kill switch off'}</p>
            </article>
          </section>

          <div className="dash__grid">
            <section className="panel" aria-labelledby="trail-title">
              <div className="panel__head">
                <h2 id="trail-title">Decision trail</h2>
                {run ? (
                  <p>
                    Run {run.id.slice(0, 8)} · {run.status} · {run.symbolsScanned} symbols ·{' '}
                    {run.orders.length} orders
                  </p>
                ) : (
                  <p>No runs yet. Launch a paper scan.</p>
                )}
              </div>
              <ol className="trail">
                {(run?.trail ?? []).map((event) => (
                  <li key={event.id} className={`trail__item trail__item--${event.type}`}>
                    <div className="trail__meta">
                      <span className="trail__type">{event.type}</span>
                      {event.symbol ? <span className="mono">{event.symbol}</span> : null}
                      <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>
                    </div>
                    <p>{event.message}</p>
                  </li>
                ))}
              </ol>
            </section>

            <div className="dash__side">
              <section className="panel" aria-labelledby="positions-title">
                <div className="panel__head">
                  <h2 id="positions-title">Positions</h2>
                  <p>{data.positions.length} open</p>
                </div>
                {data.positions.length === 0 ? (
                  <p className="panel__empty">Flat. Approved signals will open paper positions.</p>
                ) : (
                  <ul className="pos-list">
                    {data.positions.map((p) => (
                      <li key={p.symbol}>
                        <div>
                          <p className="mono">{p.symbol}</p>
                          <p className="muted">
                            {p.side} · {p.qty} @ {p.avgEntryPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="pos-list__right">
                          <p className="mono">{formatMoney(p.marketValue)}</p>
                          <p className={p.unrealizedPl >= 0 ? 'gain' : 'loss'}>
                            {formatMoney(p.unrealizedPl)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="panel" aria-labelledby="signals-title">
                <div className="panel__head">
                  <h2 id="signals-title">Latest signals</h2>
                  <p>{run?.signals.length ?? 0} scored</p>
                </div>
                <ul className="signal-list">
                  {(run?.signals ?? []).slice(0, 8).map((signal, index) => (
                    <li key={`${signal.symbol}-${index}`}>
                      <div>
                        <p className="mono">{signal.symbol}</p>
                        <p className="muted">{signal.reasonCodes.join(' · ')}</p>
                      </div>
                      <div className="pos-list__right">
                        <p className="side">{signal.direction}</p>
                        <p className="mono">{(signal.confidence * 100).toFixed(0)}%</p>
                        <p className={signal.expectedReturn >= 0 ? 'gain' : 'loss'}>
                          {formatPct(signal.expectedReturn)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
