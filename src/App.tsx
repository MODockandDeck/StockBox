import { useId, useState, type FormEvent } from 'react'
import heroImg from './assets/hero.jpg'
import {
  SEED_TRADES,
  SEED_WATCHLIST,
  formatMoney,
  formatPct,
  pnl,
  type Side,
  type Trade,
} from './data'
import './App.css'

function App() {
  const formId = useId()
  const [trades, setTrades] = useState<Trade[]>(SEED_TRADES)
  const [symbol, setSymbol] = useState('NVDA')
  const [side, setSide] = useState<Side>('long')
  const [entry, setEntry] = useState('120')
  const [exit, setExit] = useState('130')
  const [size, setSize] = useState('10')
  const [notes, setNotes] = useState('')

  const totalPnl = trades.reduce((sum, trade) => sum + pnl(trade), 0)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Trade = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase() || 'TICKER',
      side,
      entry: Number(entry) || 0,
      exit: Number(exit) || 0,
      size: Number(size) || 0,
      notes: notes.trim() || 'Manual journal entry.',
      closedAt: new Date().toISOString().slice(0, 10),
    }
    setTrades((current) => [next, ...current])
    setNotes('')
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand-mark" href="#top" aria-label="StockBox home">
          <span className="brand-mark__box" aria-hidden="true">
            SB
          </span>
          StockBox
        </a>
        <nav className="topbar__nav" aria-label="Primary">
          <a href="#journal">Journal</a>
          <a href="#watchlist">Watchlist</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-brand">
          <img
            className="hero__media"
            src={heroImg}
            alt="Trading desk with soft-focus market charts in cool teal light"
          />
          <div className="hero__veil" aria-hidden="true" />
          <div className="hero__content">
            <p className="hero__brand" id="hero-brand">
              StockBox
            </p>
            <h1 className="hero__title">Capture every killer trade.</h1>
            <p className="hero__lede">
              A focused journal for setups, exits, and the edge you actually
              keep.
            </p>
            <div className="hero__actions">
              <a className="btn btn--primary" href="#journal">
                Open journal
              </a>
              <a className="btn btn--ghost" href="#watchlist">
                View watchlist
              </a>
            </div>
          </div>
        </section>

        <section className="section journal" id="journal" aria-labelledby="journal-title">
          <div className="section__intro">
            <h2 id="journal-title">Trade journal</h2>
            <p>
              Log closed trades and keep P&amp;L honest.{' '}
              <span className={totalPnl >= 0 ? 'gain' : 'loss'}>
                Session total {formatMoney(totalPnl)}
              </span>
            </p>
          </div>

          <form className="journal-form" onSubmit={onSubmit} aria-label="Add trade">
            <div className="field">
              <label htmlFor={`${formId}-symbol`}>Symbol</label>
              <input
                id={`${formId}-symbol`}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`${formId}-side`}>Side</label>
              <select
                id={`${formId}-side`}
                value={side}
                onChange={(e) => setSide(e.target.value as Side)}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${formId}-entry`}>Entry</label>
              <input
                id={`${formId}-entry`}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`${formId}-exit`}>Exit</label>
              <input
                id={`${formId}-exit`}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`${formId}-size`}>Shares</label>
              <input
                id={`${formId}-size`}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                required
              />
            </div>
            <div className="field field--wide">
              <label htmlFor={`${formId}-notes`}>Notes</label>
              <input
                id={`${formId}-notes`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Setup, catalyst, mistake…"
              />
            </div>
            <button className="btn btn--primary journal-form__submit" type="submit">
              Add trade
            </button>
          </form>

          <div className="trade-table-wrap" role="region" aria-label="Closed trades">
            <table className="trade-table">
              <thead>
                <tr>
                  <th scope="col">Closed</th>
                  <th scope="col">Symbol</th>
                  <th scope="col">Side</th>
                  <th scope="col">Entry</th>
                  <th scope="col">Exit</th>
                  <th scope="col">P&amp;L</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const result = pnl(trade)
                  return (
                    <tr key={trade.id}>
                      <td>{trade.closedAt}</td>
                      <td className="mono">{trade.symbol}</td>
                      <td className="side">{trade.side}</td>
                      <td className="mono">{trade.entry.toFixed(2)}</td>
                      <td className="mono">{trade.exit.toFixed(2)}</td>
                      <td className={`mono ${result >= 0 ? 'gain' : 'loss'}`}>
                        {formatMoney(result)}
                      </td>
                      <td className="notes">{trade.notes}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="section watchlist"
          id="watchlist"
          aria-labelledby="watchlist-title"
        >
          <div className="section__intro">
            <h2 id="watchlist-title">Watchlist</h2>
            <p>Names on deck for the next session.</p>
          </div>
          <ul className="watch-grid">
            {SEED_WATCHLIST.map((item, index) => (
              <li
                key={item.symbol}
                className="watch-row"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div>
                  <p className="watch-row__symbol">{item.symbol}</p>
                  <p className="watch-row__name">{item.name}</p>
                </div>
                <div className="watch-row__quote">
                  <p className="mono">{item.last.toFixed(2)}</p>
                  <p className={item.changePct >= 0 ? 'gain' : 'loss'}>
                    {formatPct(item.changePct)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>StockBox · Killer trades, logged clean.</p>
        <p className="footer__meta">Deploy with Render Blueprint (`render.yaml`).</p>
      </footer>
    </div>
  )
}

export default App
