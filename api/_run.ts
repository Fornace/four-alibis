import type { Claim, GameState, Line, ProbeKey, SuspectId, TurnRequest, TurnResponse } from '../shared/types'
import { MINDS, PLACES, PROBE_OPTIONS } from './_minds'
import { addClaim, addEvidence, applyStrain, charge } from './_judge'
import { contradictions, STRAIN_ORDER } from '../shared/judge'
import { decide, speak, evidenceProbe, evidenceText } from './_models'

const label = (list: { key: string; desc: string }[], key: string) =>
  list.find((o) => o.key === key)?.desc ?? key

const PLACE = (v: string) => PLACES.find((p) => p.key === v)?.desc ?? v
const NAME: Record<string, string> = {
  nadia: 'Nadia',
  ellis: 'Ellis',
  tobias: 'Tobias',
  ines: 'Ines',
  aurelio: 'Aurelio',
  clara: 'Clara',
  porter: 'the porter',
  everyone: 'everyone',
  nobody: 'no one',
  case: 'the record',
}
const nameOf = (id: string) => NAME[id] ?? id

const SLOT_PROBE: Record<string, ProbeKey> = {
  cellar: 'cellar',
  cellar_ever: 'cellar',
  at_2300: 'at_2300',
  at_2310: 'at_2310',
  at_2313: 'at_2313',
  fuse: 'fuse',
  bottle: 'bottle',
  sound: 'sound',
  motive: 'motive',
}

function probeForSlot(slot: string, value: string): ProbeKey {
  if (SLOT_PROBE[slot]) return SLOT_PROBE[slot]
  if (slot.startsWith('at:')) {
    const t = slot.slice(3)
    if (t === '2300') return 'at_2300'
    if (t === '2310') return 'at_2310'
    if (t === '2313') return 'at_2313'
    return value === 'cellar' ? 'cellar' : 'saw'
  }
  if (slot.startsWith('with:')) return 'at_2310'
  return 'saw'
}

function claimFor(d: Awaited<ReturnType<typeof decide>>, who: SuspectId, turn: number, n: number): Claim | null {
  if (d.probe === 'off_topic' || !d.assert) return null
  const me = nameOf(who)
  const id = `c${turn}-${n}`
  if (d.probe === 'saw') {
    if (!d.sawWho || d.sawWho === 'nobody' || d.sawWho === 'everyone') return null
    const subject = d.sawWho
    return {
      id,
      subject,
      slot: `at:${d.sawTime ?? 'none'}`,
      value: d.sawWhere ?? 'dining',
      source: who,
      turn,
      text: `${me}: ${nameOf(subject)} was in ${PLACE(d.sawWhere ?? 'dining')} at ${fmt(d.sawTime ?? 'none')}`,
    }
  }
  if (d.probe === 'cellar') {
    return {
      id,
      subject: who,
      slot: 'cellar',
      value: d.assert,
      source: who,
      turn,
      text:
        d.assert === 'never'
          ? `${me}: has not been down to the cellar tonight`
          : `${me}: went down to the cellar at ${fmt(d.assert)}`,
    }
  }
  if (d.probe === 'at_2300' || d.probe === 'at_2310' || d.probe === 'at_2313') {
    const t = d.probe.slice(3)
    return {
      id,
      subject: who,
      slot: `at:${t}`,
      value: d.assert,
      source: who,
      turn,
      text: `${me}: ${PLACE(d.assert)} at ${fmt(t)}`,
    }
  }
  if (d.probe === 'motive') {
    return {
      id,
      subject: who,
      slot: 'motive',
      value: d.assert,
      source: who,
      turn,
      text: `${me}: the sale meant ${label(PROBE_OPTIONS.motive, d.assert)}`,
    }
  }
  return {
    id,
    subject: 'case',
    slot: d.probe,
    value: d.assert,
    source: who,
    turn,
    text: `${me} on ${d.probe === 'fuse' ? 'the cellar lights' : d.probe === 'bottle' ? 'the 1982' : 'what was heard'}: ${label(
      PROBE_OPTIONS[d.probe],
      d.assert,
    )}`,
  }
}

function fmt(t: string): string {
  if (t === 'none' || !t) return 'no stated time'
  if (t === 'never') return 'never'
  if (t === 'after') return 'after the body was found'
  const s = String(t).padStart(4, '0')
  return `${s.slice(0, 2)}:${s.slice(2)}`
}

const cleanAsk = (s: string) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 240)

let lineId = 1
const line = (who: Line['who'], text: string, claimIds: string[] = [], tag?: string): Line => ({
  id: lineId++,
  who,
  text,
  claimIds,
  tag,
})

export async function runTurn(req: TurnRequest): Promise<TurnResponse> {
  const state: GameState = JSON.parse(JSON.stringify(req.state))
  const lines: Line[] = []
  const who = req.suspectId
  if (!MINDS[who]) throw new Error('unknown suspect')
  if (state.over) return { state, lines, newContradictions: [] }

  const before = new Set(contradictions(state.claims).map((c) => c.id))
  const turn = state.turn + 1
  state.turn = turn
  state.suspectId = who

  const recent = state.claims.filter((c) => c.source === who).slice(-4).map((c) => c.text)
  const prior = state.claims
    .filter((c) => c.source === who && (c.slot === 'cellar' || c.slot.startsWith('at:')))
    .filter((c) => c.slot !== 'cellar_ever')
    .map((c) => ({
      probe: probeForSlot(c.slot, c.value),
      value: c.slot === 'cellar' ? c.value : c.value,
      turn: c.turn,
    }))

  state.asks = state.asks ?? { nadia: {}, ellis: {}, tobias: {}, ines: {} }
  let strain: string | undefined
  let tell: { level: string; confidence: number } | undefined
  let probeKey: ProbeKey | undefined

  const raise = (a: string, floor: string) =>
    STRAIN_ORDER.indexOf(a) >= STRAIN_ORDER.indexOf(floor) ? a : floor
  const spend = (n = 1) => {
    state.movesLeft = Math.max(0, state.movesLeft - n)
  }

  if (req.action === 'ask') {
    const ask = cleanAsk(req.ask)
    if (!ask) throw new Error('empty question')
    lines.push(line('detective', ask))
    const d = await decide({
      who,
      ask,
      encounter: 'ask',
      composure: state.composure[who],
      cracked: state.cracked.includes(who),
      prior,
      leakText: MINDS[who].leaks.filter((l) => state.composure[who] <= l.at + 12).map((l) => l.says),
      contradictoryWords: '',
      repeatCount: 0,
    })
    spend()
    if (d.probe === 'off_topic') {
      const said = await speak({
        who,
        ask,
        probe: 'nothing in particular',
        assert: 'refuse to take the question seriously',
        certainLabel: d.certainty,
        strain: d.strain,
        encounter: 'ask',
        recent,
      })
      lines.push(line(who, said))
      strain = d.strain
      tell = { level: d.certainty, confidence: d.confidence }
    } else {
      probeKey = d.probe
      tell = { level: d.certainty, confidence: d.confidence }
      const said = await speak({
        who,
        ask,
        probe: d.probe,
        assert:
          d.probe === 'saw'
              ? `${nameOf(d.sawWho ?? 'nobody')} in ${PLACE(d.sawWhere ?? 'dining')} at ${fmt(d.sawTime ?? 'none')}`
              : label(PROBE_OPTIONS[d.probe], d.assert),
        certainLabel: d.certainty,
        strain: d.strain,
        encounter: 'ask',
        recent,
      })
      lines.push(line(who, said))
      const claim = claimFor(d, who, turn, 0)
      if (claim && addClaim(state, claim)) lines[lines.length - 1].claimIds = [claim.id]
      strain = d.strain
      const reps = state.asks[who]?.[d.probe] ?? 0
      state.asks[who] = { ...(state.asks[who] ?? {}), [d.probe]: reps + 1 }
      if (reps >= 2) strain = raise(strain, 'cracking')
      else if (reps >= 1) strain = raise(strain, 'rattled')
    }
  } else if (req.action === 'confront') {
    const all = contradictions(state.claims)
    const x = all.find((c) => c.id === req.contradictionId)
    if (!x) throw new Error('that contradiction is not in the record')
    const target = (x.subject === 'case' ? req.suspectId : x.subject) as SuspectId
    const own = [x.a, x.b].find((c) => c.source === target) ?? x.a
    const forced = probeForSlot(own.slot, own.value)
    const caught = `${nameOf(x.a.source)} ${x.a.text.split(': ').slice(1).join(': ')} / ${nameOf(x.b.source)} ${
      x.b.text.split(': ').slice(1).join(': ')
    }`
    lines.push(
      line(
        'detective',
        `${x.a.text}. And then: ${x.b.text}. One of those is a lie, and you are going to tell me which.`,
      ),
    )
    const d = await decide({
      who: target,
      ask: `${x.a.text}. ${x.b.text}.`,
      forcedProbe: forced,
      encounter: 'confront',
      composure: state.composure[target],
      cracked: state.cracked.includes(target),
      prior: state.claims
        .filter((c) => c.source === target && (c.slot === 'cellar' || c.slot.startsWith('at:')))
        .map((c) => ({ probe: probeForSlot(c.slot, c.value), value: c.value, turn: c.turn })),
      leakText: MINDS[target].leaks.filter((l) => state.composure[target] <= l.at + 12).map((l) => l.says),
      contradictoryWords: caught,
    })
    spend()
    probeKey = forced
    const said = await speak({
      who: target,
      ask: `You said one thing and the record says another.`,
      probe: forced,
      assert:
        label(PROBE_OPTIONS[forced], d.assert),
      certainLabel: d.certainty,
      strain: d.strain,
      encounter: 'confront',
      caughtOut: caught,
      recent,
    })
    lines.push(line(target, said))
    const claim = claimFor({ ...d, probe: forced }, target, turn, 0)
    if (claim && addClaim(state, claim)) lines[lines.length - 1].claimIds = [claim.id]
    strain = raise(d.strain, 'cracking')
    state.suspectId = target
  } else if (req.action === 'evidence') {
    const ev = state.evidence.find((e) => e.id === req.evidenceId)
    if (!ev) throw new Error('you do not have that evidence')
    const forced = evidenceProbe(ev.id)
    lines.push(line('detective', `Look at this again. ${ev.detail}`))
    const d = await decide({
      who,
      ask: `The detective puts this on the table: ${evidenceText(ev.id)}. What do you say to that?`,
      forcedProbe: forced,
      encounter: 'evidence',
      composure: state.composure[who],
      cracked: state.cracked.includes(who),
      prior,
      leakText: MINDS[who].leaks.filter((l) => state.composure[who] <= l.at + 12).map((l) => l.says),
      contradictoryWords: `${ev.title}: ${ev.detail}`,
      evidenceText: evidenceText(ev.id),
    })
    spend()
    probeKey = forced
    const said = await speak({
      who,
      ask: ev.detail,
      probe: forced,
      assert: label(PROBE_OPTIONS[forced], d.assert),
      certainLabel: d.certainty,
      strain: d.strain,
      encounter: 'evidence',
      caughtOut: `${ev.title}: ${ev.detail}`,
      recent,
    })
    lines.push(line(who, said))
    const claim = claimFor({ ...d, probe: forced }, who, turn, 0)
    if (claim && addClaim(state, claim)) lines[lines.length - 1].claimIds = [claim.id]
    strain = raise(d.strain, 'rattled')
  } else if (req.action === 'accuse') {
    const accused = req.accused || who
    const verdict = charge(state, accused, req.cited ?? [])
    state.caseOpen = false
    state.movesLeft = Math.max(0, state.movesLeft)
    state.over = {
      result: verdict.won ? 'won' : 'lost',
      title: verdict.won ? 'Charge upheld' : 'The file is closed',
      text: verdict.reason,
      truth: verdict.truth,
    }
    lines.push(line('game', verdict.reason))
    if (verdict.won && MINDS.ines.crack.says) {
      lines.push(line('ines', MINDS.ines.crack.says, [], 'on the record'))
    }
    return { state, lines, newContradictions: [] }
  } else {
    throw new Error('unknown action')
  }

  if (strain) {
    const res = applyStrain(state, state.suspectId, strain, turn)
    for (const note of res.notes) {
      lines.push(line(state.suspectId, note.says, note.claimIds, note.cracked ? 'broken' : 'slips'))
      for (const e of note.evidenceIds) {
        const ev = state.evidence.find((x) => x.id === e)
        if (ev) lines.push(line('game', `New in the file: ${ev.title}. ${ev.detail}`, [ev.claim.id], 'evidence'))
      }
    }
  }

  const after = contradictions(state.claims)
  const fresh = after.filter((c) => !before.has(c.id))
  for (const c of fresh.slice(0, 3)) {
    lines.push(line('game', `Contradiction on ${nameOf(c.subject)}: ${c.a.text} / ${c.b.text}`, [], 'contradiction'))
  }

  if (state.movesLeft <= 0 && !state.over) {
    state.caseOpen = false
    state.over = {
      result: 'lost',
      title: 'The night runs out',
      text: 'The DA takes the file back at dawn. Nobody is charged. Ines Duarte serves breakfast on the last morning of the season and says nothing at all.',
      truth: "Ines Duarte went down to the cellar at 23:09 for her mother's copper pan. Aurelio was already on the stairs with the broken 1982 bottle in his hand, and he told her the room was finished and the pans were hers. She took the bottle out of his hand and hit him once. Then she pulled the cellar lever at the board and walked up the service stairs and washed her hands at the sink.",
    }
    lines.push(line('game', state.over.text))
  }

  return { state, lines, probeKey, newContradictions: fresh, strain, tell, probeLabel: probeKey }
}
