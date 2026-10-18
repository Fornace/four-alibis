import type { Claim, Evidence, GameState, SuspectId } from '../shared/types.js'
import { STRAIN_DELTA, contradictions } from '../shared/judge.js'
import { EVIDENCE, MINDS } from './_minds.js'

export const MOVES = 26
export const SUSPECT_IDS: SuspectId[] = ['nadia', 'ellis', 'tobias', 'ines']

export function newGame(): GameState {
  return {
    caseOpen: true,
    movesLeft: MOVES,
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

export function guardEvidence(id: string, turn: number): Evidence | null {
  const e = EVIDENCE[id]
  if (!e) return null
  return {
    id,
    title: e.title,
    detail: e.detail,
    claim: {
      id: `ev:${id}`,
      subject: e.subject,
      slot: e.slot,
      value: e.value,
      source: `ev:${id}`,
      turn,
      text: e.text,
    },
  }
}

export type Note = { says: string; claimIds: string[]; evidenceIds: string[]; cracked: boolean }

/** Push a claim unless the same speaker already said exactly this. */
export function addClaim(state: GameState, claim: Claim): boolean {
  const dup = state.claims.some(
    (c) => c.source === claim.source && c.subject === claim.subject && c.slot === claim.slot && c.value === claim.value,
  )
  if (dup) return false
  state.claims.push(claim)
  return true
}

export function addEvidence(state: GameState, id: string, turn: number): string | null {
  if (state.evidence.some((e) => e.id === id)) return null
  const ev = guardEvidence(id, turn)
  if (!ev) return null
  state.evidence.push(ev)
  state.claims.push(ev.claim)
  return id
}

/** Apply a strain level, then let the new composure release whatever it releases. */
export function applyStrain(state: GameState, who: SuspectId, level: string, turn: number): { notes: Note[] } {
  const delta = STRAIN_DELTA[level] ?? 0
  state.composure[who] = Math.max(0, Math.min(100, state.composure[who] + delta))
  const notes: Note[] = []
  const mind = MINDS[who]
  const c = state.composure[who]
  for (const leak of mind.leaks) {
    const key = `${leak.at}`
    if (c > leak.at || state.leaked[who].includes(key)) continue
    state.leaked[who].push(key)
    const claimIds = leak.claims
      .map((cl, i) => {
        const claim: Claim = {
          id: `l${turn}-${who}-${key}-${i}`,
          subject: cl.subject,
          slot: cl.slot,
          value: cl.value,
          source: who,
          turn,
          text: cl.text,
        }
        return addClaim(state, claim) ? claim.id : ''
      })
      .filter(Boolean)
    const evidenceIds: string[] = []
    if (leak.evidence) {
      const id = addEvidence(state, leak.evidence, turn)
      if (id) evidenceIds.push(id)
    }
    notes.push({ says: leak.says, claimIds, evidenceIds, cracked: false })
  }
  if (c <= 0 && !state.cracked.includes(who)) {
    state.cracked.push(who)
    const claim: Claim = {
      id: `k${turn}-${who}`,
      subject: who,
      slot: 'cellar',
      value: '2309',
      source: who,
      turn,
      text: `${mind.name}: statement on the record`,
    }
    addClaim(state, claim)
    const evidenceIds: string[] = []
    const id = addEvidence(state, mind.crack.evidence, turn)
    if (id) evidenceIds.push(id)
    const log = addEvidence(state, 'log', turn)
    if (log) evidenceIds.push(log)
    notes.push({ says: mind.crack.says, claimIds: [claim.id], evidenceIds, cracked: true })
  }
  return { notes }
}

export const TRUTH =
  'Ines Duarte went down to the cellar at 23:09 for her mother\'s copper pan. Aurelio was already on the stairs with the broken 1982 bottle in his hand, and he told her the room was finished and the pans were hers. She took the bottle out of his hand and hit him once. Then she pulled the cellar lever at the board, so the lights went out and only the cellar went dark, and walked up the service stairs and washed her hands at the sink.'

export function charge(state: GameState, accused: SuspectId, cited: string[]): { won: boolean; reason: string; truth: string } {
  if (accused !== 'ines') {
    return {
      won: false,
      reason: `The DA reads the file on ${MINDS[accused].name} for four minutes and puts it down. Nothing in it puts anybody at the top of the cellar stairs between five and twenty past eleven. The charge dies, and the house closes for the season.`,
      truth: TRUTH,
    }
  }
  const all = contradictions(state.claims)
  const killerWindow = cited
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.subject === 'ines' && c!.kind === 'window')
  if (!killerWindow.length) {
    return {
      won: false,
      reason:
        'You name her, and the room waits, and the file you hand up does not contradict her once. Her own words never touch the cellar. The DA thanks you for the evening and drives back to Genoa alone.',
      truth: TRUTH,
    }
  }
  return {
    won: true,
    reason:
      'Ines Duarte is charged with the death of Aurelio Vela. She was below stairs at 23:09, and every version of her night says otherwise. She does not ask for a lawyer. She asks whether the kitchen keeps its name.',
    truth: TRUTH,
  }
}
