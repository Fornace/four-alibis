import { useEffect, useState } from 'react'
import type { Contradiction, GameState, Line, PublicSuspect, SuspectId } from '../../shared/types'
import { PROBES, SUSPECTS } from '../../shared/types'

const first = (name: string) => name.split(' ')[0]
const who = (id: string) =>
  id === 'case' ? 'The record' : SUSPECTS.find((s) => s.id === id)?.name.split(' ')[0] ?? id

export function Cover({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onOpen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpen])

  return (
    <div className="cover">
      <div className="cover-left">
        <div className="cover-stamp mono-sm">Case 96/11 · Casa Vela · Liguria</div>
        <div className="cover-mid">
          <h1 className="cover-title">Four Alibis</h1>
          <p className="cover-premise">
            Aurelio Vela is dead at the foot of his own cellar stairs. Four people were still in the building
            at twenty past eleven. <em>All of them are lying about something.</em>
          </p>
          <ol className="cover-index">
            {SUSPECTS.map((s, i) => (
              <li key={s.id}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <span>
                  <em>{s.name}</em>, {s.role.toLowerCase()} — {s.line}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="cover-foot">
          <div className="cover-facts mono">
            <div>
              <b>23:41</b>
              <span>body found</span>
            </div>
            <div>
              <b>23:05–20</b>
              <span>time of death</span>
            </div>
            <div>
              <b>26</b>
              <span>moves, one charge</span>
            </div>
          </div>
          <div className="cover-cta">
            <button className="btn btn-amber mono" onClick={onOpen}>
              Open the file
            </button>
            <span className="mono-sm mute">Ask anything. Watch what they say twice.</span>
          </div>
        </div>
      </div>
      <div className="cover-cast">
        {SUSPECTS.map((s) => (
          <figure key={s.id}>
            <img src={s.portrait} alt={`${s.name}, ${s.role}`} style={{ objectPosition: s.focus }} />
            <figcaption>
              <span className="name">{s.name}</span>
              <span className="mono-sm mute">{s.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

export function Ask({
  state,
  suspect,
  busy,
  error,
  inputRef,
  onAsk,
  onProbe,
  onRetry,
  onReset,
}: {
  state: GameState
  suspect: PublicSuspect
  busy: boolean
  error: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onAsk: (text: string) => void
  onProbe: (label: string) => void
  onRetry: () => void
  onReset: () => void
}) {
  const [text, setText] = useState('')
  const asked = state.asks?.[suspect.id] ?? {}
  const over = Boolean(state.over)

  const submit = () => {
    const t = text.trim()
    if (!t || busy || over) return
    setText('')
    onAsk(t)
  }

  return (
    <div className="ask">
      <div className="ask-inner">
        {error && (
          <div className="err" role="alert">
            <span>{error}</span>
            <button className="mono-sm erase" onClick={onRetry}>
              Try the room again
            </button>
          </div>
        )}
        <div className="ask-row">
          <span className="caret" aria-hidden>
            ›
          </span>
          <input
            ref={inputRef}
            value={text}
            disabled={busy || over}
            placeholder={over ? 'The file is closed.' : `Ask ${first(suspect.name)} anything`}
            aria-label={`Ask ${suspect.name} anything`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
          <button className="mono-sm btn" onClick={submit} disabled={busy || over || !text.trim()}>
            Ask
          </button>
        </div>
        <div className="chips">
          {PROBES.map((p) => (
            <button
              key={p.key}
              className="chip"
              data-asked={asked[p.key] ? '1' : '0'}
              title={p.label}
              disabled={busy || over}
              onClick={() => onProbe(p.label)}
            >
              {p.short}
            </button>
          ))}
        </div>
        <div className="ask-meta">
          <span className="mono-sm mute">
            {over ? 'No more questions.' : `${first(suspect.name)} · ${state.evidence.length} exhibits in the file`}
          </span>
          <button className="mono-sm erase" onClick={onReset}>
            Start the night again
          </button>
        </div>
      </div>
    </div>
  )
}

export function Accuse({
  state,
  xs,
  suspect,
  onClose,
  onFile,
}: {
  state: GameState
  xs: Contradiction[]
  suspect: PublicSuspect
  onClose: () => void
  onFile: (accused: SuspectId, cited: string[]) => void
}) {
  const [accused, setAccused] = useState<SuspectId>(suspect.id)
  const mine = xs.filter((x) => x.subject === accused)
  const [cited, setCited] = useState<string[]>(mine.map((x) => x.id))

  useEffect(() => {
    setCited(xs.filter((x) => x.subject === accused).map((x) => x.id))
  }, [accused, xs])

  const toggle = (id: string) =>
    setCited((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="accuse" role="dialog" aria-modal="true" aria-label="Accuse">
      <div className="accuse-inner">
        <div className="mono-sm mute">Charge · one only</div>
        <h2>Name them.</h2>
        <p className="lede">
          The DA will not read a hunch. Cite what contradicts the person you name, and the window they cannot
          explain.
        </p>
        <div className="pick">
          {SUSPECTS.map((s) => (
            <button key={s.id} aria-pressed={accused === s.id} onClick={() => setAccused(s.id)}>
              <img src={s.portrait} alt="" />
              <span>{first(s.name)}</span>
            </button>
          ))}
        </div>

        {mine.length === 0 ? (
          <p className="mono-sm mute" style={{ marginBottom: 16 }}>
            Nothing in the record contradicts {first(SUSPECTS.find((s) => s.id === accused)?.name ?? '')} yet.
          </p>
        ) : (
          mine.map((x) => (
            <label className="cite" key={x.id} data-on={cited.includes(x.id) ? '1' : '0'}>
              <input type="checkbox" checked={cited.includes(x.id)} onChange={() => toggle(x.id)} />
              <span>
                <q>{x.a.text}</q>
                <q>{x.b.text}</q>
                <span className="mono-sm" style={{ color: 'var(--amber)', display: 'block', marginTop: 6 }}>
                  {x.kind === 'window' ? 'Inside the window' : x.kind === 'self' ? 'Changed story' : x.kind === 'record' ? 'Against the file' : 'Two accounts'}
                </span>
              </span>
            </label>
          ))
        )}

        <div className="accuse-actions">
          <button
            className="btn btn-amber mono-sm"
            disabled={!cited.length}
            onClick={() => onFile(accused, cited)}
          >
            File the charge
          </button>
          <button className="btn mono-sm" onClick={onClose}>
            Not yet
          </button>
          <span className="mono-sm mute" style={{ marginLeft: 'auto' }}>
            {state.movesLeft} moves left
          </span>
        </div>
      </div>
    </div>
  )
}

export function Verdict({
  state,
  log,
  onRestart,
}: {
  state: GameState
  log: Line[]
  onRestart: () => void
}) {
  const [hidden, setHidden] = useState(false)
  const over = state.over
  if (!over) return null
  const confession = [...log].reverse().find((l) => l.who === 'ines' && l.tag === 'on the record')
  const xs = state.claims.length
  if (hidden) {
    return (
      <button
        className="btn mono-sm"
        style={{ position: 'fixed', right: 16, bottom: 96, zIndex: 42 }}
        onClick={() => setHidden(false)}
      >
        Verdict
      </button>
    )
  }
  return (
    <>
      <div className="verdict-scrim" onClick={() => setHidden(true)} />
      <div className="verdict">
        <div className="verdict-inner">
          <div className="mono-sm" style={{ color: over.result === 'won' ? 'var(--amber)' : 'var(--bad)' }}>
            {over.result === 'won' ? 'Case closed · charge upheld' : 'Case closed · no charge'}
          </div>
          <h2>{over.title}</h2>
          <p className="reason">{over.text}</p>
          {over.truth && (
            <div className="confession">
              <b>What happened at 23:09</b>
              {over.truth}
            </div>
          )}
          {confession && (
            <div className="confession">
              <b>Her words, on the record</b>
              {confession.text}
            </div>
          )}
          <div className="verdict-stats">
            <div>
              <span className="mono-sm mute">Moves used</span>
              <b>{26 - state.movesLeft}</b>
            </div>
            <div>
              <span className="mono-sm mute">Statements</span>
              <b>{xs}</b>
            </div>
            <div>
              <span className="mono-sm mute">Broken</span>
              <b>{state.cracked.length}</b>
            </div>
          </div>
          <div className="verdict-actions">
            <button className="btn btn-amber mono-sm" onClick={onRestart}>
              Play the night again
            </button>
            <button className="btn mono-sm" onClick={() => setHidden(true)}>
              Read the transcript
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
