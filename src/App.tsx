import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Contradiction, GameState, Line, SuspectId, TurnRequest, TurnResponse } from '../shared/types'
import { SUSPECTS } from '../shared/types'
import { contradictions as findContradictions } from '../shared/judge'
import { sendTurn } from './api'
import { Ask } from './components/controls'
import { Cover, Verdict } from './components/controls'
import { Accuse } from './components/controls'
import { Rail, Recorder, Record as RecordPanel } from './components/panels'

const STORE = 'four-alibis-v1'

type Saved = { state: GameState; log: Line[]; screen: 'game' }

function blank(): GameState {
  return {
    caseOpen: true,
    movesLeft: 26,
    turn: 0,
    suspectId: 'nadia',
    claims: [],
    evidence: [],
    composure: { nadia: 100, ellis: 100, tobias: 100, ines: 100 },
    cracked: [],
    leaked: { nadia: [], ellis: [], tobias: [], ines: [] },
    asks: { nadia: {}, ellis: {}, tobias: {}, ines: {} },
    over: null,
  }
}

const first = (name: string) => name.split(' ')[0]

export default function App() {
  const [state, setState] = useState<GameState>(blank)
  const [log, setLog] = useState<Line[]>([])
  const [screen, setScreen] = useState<'cover' | 'game'>('cover')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [accusing, setAccusing] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const lastReq = useRef<TurnRequest | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suspect = SUSPECTS.find((s) => s.id === state.suspectId) ?? SUSPECTS[0]
  const xs = useMemo<Contradiction[]>(() => findContradictions(state.claims), [state.claims])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE)
      if (!raw) return
      const saved = JSON.parse(raw) as Saved
      if (saved?.state?.claims && saved.state.over === null) {
        setState(saved.state)
        setLog(saved.log ?? [])
        setScreen(saved.screen ?? 'game')
      }
    } catch {
      localStorage.removeItem(STORE)
    }
  }, [])

  useEffect(() => {
    if (screen !== 'game') return
    const payload: Saved = { state, log, screen: 'game' }
    try {
      localStorage.setItem(STORE, JSON.stringify(payload))
    } catch {
      /* storage full or blocked: the session still plays */
    }
  }, [state, log, screen])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length, busy])

  const turn = useCallback(
    async (req: Omit<TurnRequest, 'state'>) => {
      if (busy || state.over) return
      const full: TurnRequest = { state, ...req }
      lastReq.current = full
      setBusy(true)
      setError(null)
      setPending(req.action === 'ask' ? req.ask : null)
      try {
        const res: TurnResponse = await sendTurn(full)
        const lines = res.lines.map((l, i) =>
          i === 0 && l.who !== 'detective' && res.tell ? { ...l, tell: res.tell } : l,
        )
        const firstSuspect = lines.findIndex((l) => l.who === req.suspectId)
        if (firstSuspect >= 0 && res.tell) lines[firstSuspect] = { ...lines[firstSuspect], tell: res.tell }
        setLog((prev) => [...prev, ...lines])
        setState(res.state)
        setAccusing(false)
        requestAnimationFrame(() => inputRef.current?.focus())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'the room did not answer')
      } finally {
        setBusy(false)
        setPending(null)
      }
    },
    [busy, state],
  )

  const retry = useCallback(async () => {
    const req = lastReq.current
    if (!req) return
    setBusy(true)
    setError(null)
    try {
      const res = await sendTurn(req)
      setLog((prev) => [...prev, ...res.lines])
      setState(res.state)
      setAccusing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the room did not answer')
    } finally {
      setBusy(false)
    }
  }, [])

  const start = useCallback(() => {
    localStorage.removeItem(STORE)
    setState(blank())
    setLog([])
    setError(null)
    setScreen('game')
    setAccusing(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const select = useCallback(
    (id: SuspectId) => {
      setState((s) => ({ ...s, suspectId: id }))
      inputRef.current?.focus()
    },
    [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'game' || state.over) return
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT'
      if (typing) return
      const n = Number(e.key)
      if (n >= 1 && n <= 4) select(SUSPECTS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, state.over, select])

  if (screen === 'cover') return <Cover onOpen={start} />

  const over = state.over

  return (
    <div className="shell">
      <header className="masthead">
        <div className="mark">
          Four Alibis
          <span>
            Case 96/11 · Casa Vela · {first(suspect.name)} in the room
          </span>
        </div>
        <div className="masthead-right">
          <div className="moves" title={`${state.movesLeft} moves left`}>
            <span className="mono-sm mute" style={{ display: 'none' }}>
              moves
            </span>
            <div className="ticks" aria-label={`${state.movesLeft} moves left`}>
              {Array.from({ length: 26 }).map((_, i) => (
                <i
                  key={i}
                  data-spent={i >= state.movesLeft ? '1' : '0'}
                  data-low={state.movesLeft <= 6 ? '1' : '0'}
                />
              ))}
            </div>
            <span className="mono-sm mute">{state.movesLeft}</span>
          </div>
          <button className="mono-sm erase mobile-record-btn" onClick={() => setRecordOpen(true)}>
            Record
          </button>
          <button
            className="btn btn-amber mono-sm"
            disabled={Boolean(over) || busy}
            onClick={() => setAccusing(true)}
          >
            Accuse
          </button>
        </div>
      </header>

      <div className="board">
        <Rail state={state} selected={state.suspectId} onSelect={select} />
        <div className="recorder" ref={scroller}>
          <Recorder log={log} busy={busy} pending={pending} pronoun={suspect.pronoun} claims={state.claims} />
        </div>
        <RecordPanel
          state={state}
          xs={xs}
          suspect={suspect}
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          onConfront={(id) => {
            setRecordOpen(false)
            void turn({ ask: '', action: 'confront', contradictionId: id, suspectId: state.suspectId })
          }}
          onShow={(id) => {
            setRecordOpen(false)
            void turn({ ask: '', action: 'evidence', evidenceId: id, suspectId: state.suspectId })
          }}
        />
      </div>

      <Ask
        state={state}
        suspect={suspect}
        busy={busy}
        error={error}
        inputRef={inputRef}
        onRetry={retry}
        onAsk={(text) => void turn({ ask: text, action: 'ask', suspectId: state.suspectId })}
        onProbe={(label) => void turn({ ask: label, action: 'ask', suspectId: state.suspectId })}
        onReset={start}
      />

      {accusing && !over && (
        <Accuse
          state={state}
          xs={xs}
          suspect={suspect}
          onClose={() => setAccusing(false)}
          onFile={(accused, cited) => {
            void turn({ ask: '', action: 'accuse', accused, cited, suspectId: accused })
          }}
        />
      )}

      {over && <Verdict state={state} log={log} onRestart={start} />}
    </div>
  )
}
