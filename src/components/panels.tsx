import type { Claim, Contradiction, GameState, Line, PublicSuspect, SuspectId } from '../../shared/types'
import { SUSPECTS } from '../../shared/types'

const first = (name: string) => name.split(' ')[0]
const short = (c: Claim) => c.text.replace(/^[^:]{1,24}: /, '')
const who = (id: string) =>
  id === 'case' ? 'The record' : SUSPECTS.find((s) => s.id === id)?.name.split(' ')[0] ?? id

const STATE_LABEL = (id: SuspectId, state: GameState) => {
  if (state.cracked.includes(id)) return 'BROKEN'
  const c = state.composure[id]
  if (c <= 30) return 'GOING'
  if (c <= 55) return 'PRESSED'
  return 'HOLDING'
}

export function Rail({
  state,
  selected,
  onSelect,
}: {
  state: GameState
  selected: SuspectId
  onSelect: (id: SuspectId) => void
}) {
  return (
    <nav className="rail" aria-label="The four">
      <div className="rail-head mono-sm">In the room</div>
      {SUSPECTS.map((s, i) => {
        const composure = state.composure[s.id] ?? 100
        const filled = Math.round((composure / 100) * 14)
        return (
          <button
            key={s.id}
            className="who"
            aria-pressed={selected === s.id}
            onClick={() => onSelect(s.id)}
            title={`${s.name}, ${s.role}`}
          >
            <img src={s.portrait} alt="" width={64} height={86} style={{ objectPosition: s.focus }} />
            <div>
              <div className="name">
                {s.name}
                <span className="mono-sm mute" style={{ marginLeft: 6, fontSize: 9 }}>
                  {i + 1}
                </span>
              </div>
              <div className="role mono-sm">{s.role}</div>
              <div className="feet">
                <div className="ticks-v" data-heat={composure <= 30 ? 1 : 0} aria-hidden>
                  {Array.from({ length: 14 }).map((_, t) => (
                    <i key={t} data-off={t >= filled ? '1' : '0'} />
                  ))}
                </div>
                <span className="mono-sm state" data-broken={state.cracked.includes(s.id) ? 1 : 0}>
                  {STATE_LABEL(s.id, state)}
                </span>
              </div>
            </div>
          </button>
        )
      })}
      <div className="rail-night">
        <div className="mono-sm" style={{ marginBottom: 8 }}>
          The night
        </div>
        <ol>
          <li>
            <b>22:50</b> Vela refuses the Zurich offer on the terrace
          </li>
          <li>
            <b>23:00</b> last course cleared
          </li>
          <li>
            <b>23:13</b> the cellar lights go out
          </li>
          <li>
            <b>23:41</b> the porter finds him
          </li>
        </ol>
      </div>
    </nav>
  )
}

const TILT: Record<string, number> = { vague: -26, hedged: -11, flat: 0, emphatic: 15 }

const NOTE_TAG: Record<string, string> = {
  contradiction: 'Contradiction',
  evidence: 'New in the file',
  slips: 'It slips out',
  broken: 'Broken',
}

export function Recorder({
  log,
  busy,
  pending,
  pronoun,
}: {
  log: Line[]
  busy: boolean
  pending: string | null
  pronoun: string
}) {
  return (
    <div className="stack">
      {log.length === 0 && (
        <div className="brief">
          <div className="mono-sm steel" style={{ marginBottom: 10 }}>
            The room · 01:20
          </div>
          <p className="brief-lede">
            Nobody has been charged. The four of them are sitting in the dining room with the lights on, and
            the file on the table is a medical report and a broken bottle.
          </p>
          <div className="brief-rules">
            <p>
              <b>Ask anything</b> of the person in the chair. Every answer becomes a statement on the record.
            </p>
            <p>
              <b>Two statements that cannot both be true</b> are a contradiction. The record keeps them for
              you, on the right.
            </p>
            <p>
              <b>A charge needs one inside the window.</b> 23:05 to 23:20. Nothing else will hold.
            </p>
          </div>
          <div className="mono-sm mute">Enter sends. 1 to 4 changes the chair.</div>
        </div>
      )}

      {log.map((l, i) => {
        const s = SUSPECTS.find((x) => x.id === l.who)
        if (l.who === 'game') {
          return (
            <div key={`${i}-${l.id}`} className={`note ${l.tag ? '' : 'plain'}`}>
              {l.tag && <b>{NOTE_TAG[l.tag] ?? l.tag}</b>}
              {l.text}
            </div>
          )
        }
        if (l.who === 'detective') {
          return (
            <div key={`${i}-${l.id}`} className="said me">
              <div className="said-head">
                <span className="mono-sm steel">You</span>
              </div>
              <p className="spoken">{l.text}</p>
            </div>
          )
        }
        return (
          <div key={`${i}-${l.id}`} className="said">
            <div className="said-head">
              <span className="mono-sm" style={{ color: s?.colour ?? 'var(--paper-dim)' }}>
                {s?.name ?? l.who}
              </span>
              {l.tell && (
                <>
                  <span className="tell" aria-hidden>
                    <i style={{ transform: `rotate(${TILT[l.tell.level] ?? 0}deg)` }} />
                  </span>
                  <span className="mono-sm dim">{l.tell.level}</span>
                </>
              )}
            </div>
            <p className="spoken">{l.text}</p>
          </div>
        )
      })}

      {busy && (
        <div className="thinking mono" aria-live="polite">
          <span className="pulse" />
          {pending ? `${pronoun === 'he' ? 'he' : 'she'} is deciding what to say` : 'the room is working'}
        </div>
      )}
    </div>
  )
}

const KIND: Record<Contradiction['kind'], string> = {
  window: 'Inside the window',
  record: 'Against the file',
  self: 'Changed story',
  testimony: 'Two accounts',
}

export function Record({
  state,
  xs,
  suspect,
  open,
  onClose,
  onConfront,
  onShow,
}: {
  state: GameState
  xs: Contradiction[]
  suspect: PublicSuspect
  open: boolean
  onClose: () => void
  onConfront: (id: string) => void
  onShow: (id: string) => void
}) {
  const claims = [...state.claims].sort((a, b) => a.turn - b.turn || a.subject.localeCompare(b.subject))
  const hot = new Set<string>()
  for (const x of xs) {
    hot.add(x.a.id)
    hot.add(x.b.id)
  }
  return (
    <aside className="record" data-open={open ? '1' : '0'} aria-label="The record">
      <div className="record-head">
        <span className="mono-sm">The record</span>
        <span className="mono-sm mute">
          {xs.length} {xs.length === 1 ? 'contradiction' : 'contradictions'}
        </span>
        {open && (
          <button className="mono-sm erase" onClick={onClose} style={{ display: 'inline' }}>
            Close
          </button>
        )}
      </div>

      {xs.length > 0 && (
        <div className="sect">
          <h3>
            <span>Catch them out</span>
            <span>{xs.length}</span>
          </h3>
          {xs.map((x) => (
            <div className="x" key={x.id} data-kind={x.kind}>
              <div className="tag">
                <span>{KIND[x.kind]}</span>
                <span>{who(x.subject)}</span>
              </div>
              <q>{x.a.text}</q>
              <q>{x.b.text}</q>
              <button className="put" onClick={() => onConfront(x.id)}>
                Put it to {who(x.subject)} →
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sect">
        <h3>
          <span>On the record</span>
          <span>{claims.length}</span>
        </h3>
        {claims.length === 0 && <p className="mono-sm mute">Nothing yet.</p>}
        {claims.map((c) => (
          <div className="claim" key={c.id} data-hot={hot.has(c.id) ? '1' : '0'}>
            <b>{who(c.subject)}</b>
            <span>{short(c)}</span>
          </div>
        ))}
      </div>

      <div className="sect">
        <h3>
          <span>In the file</span>
          <span>{state.evidence.length}</span>
        </h3>
        {state.evidence.length === 0 && <p className="mono-sm mute">No exhibits yet.</p>}
        {state.evidence.map((e) => (
          <div className="ev" key={e.id}>
            <h4>{e.title}</h4>
            <p>{e.detail}</p>
            <button onClick={() => onShow(e.id)}>Show {first(suspect.name)} →</button>
          </div>
        ))}
      </div>
      <div className="record-foot">
        <p className="mono-sm mute" style={{ margin: '0 0 8px' }}>
          {state.cracked.length > 0
            ? `Broken: ${state.cracked.map(who).join(', ')}`
            : 'Nobody has broken yet. Pressure shows in the ticks on the left.'}
        </p>
        <p className="mono-sm mute" style={{ margin: 0 }}>
          A charge needs a contradiction inside the window.
        </p>
      </div>
    </aside>
  )
}
