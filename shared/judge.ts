import type { Claim, Contradiction } from './types'

export const WINDOW_START = 2305
export const WINDOW_END = 2320

export const STRAIN_DELTA: Record<string, number> = {
  unmoved: 0,
  guarded: -5,
  rattled: -16,
  cracking: -28,
}
export const STRAIN_ORDER = ['unmoved', 'guarded', 'rattled', 'cracking']

/** slots that carry a real disagreement; the bottle and the sounds can all be true at once */
const DISPUTED = new Set(['cellar_ever', 'fuse', 'motive'])

export const inWindow = (t: string) => {
  const n = Number(t)
  return Number.isFinite(n) && n >= WINDOW_START && n <= WINDOW_END
}

const timeOf = (c: Claim): string => {
  if (c.slot.startsWith('at:')) return c.slot.slice(3)
  if (c.slot === 'cellar') return c.value
  return ''
}

const clock = (t: string) => (t && t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t)

type Row = { subject: string; slot: string; value: string; origin: Claim; time: string }

/** A claim plus what it implies about whether this person went below at all. */
function rows(claims: Claim[]): Row[] {
  const out: Row[] = []
  for (const c of claims) {
    if (c.slot === 'cellar') {
      if (c.value === 'never') out.push({ subject: c.subject, slot: 'cellar_ever', value: 'out', origin: c, time: '' })
      else if (c.value !== 'after')
        out.push({ subject: c.subject, slot: 'cellar_ever', value: 'in', origin: c, time: c.value })
      continue
    }
    if (c.slot.startsWith('at:')) {
      out.push({ ...c, origin: c, time: c.slot.slice(3) })
      if (c.value === 'cellar')
        out.push({ subject: c.subject, slot: 'cellar_ever', value: 'in', origin: c, time: c.slot.slice(3) })
      continue
    }
    out.push({ ...c, origin: c, time: '' })
  }
  return out
}

const isEvidence = (id: string) => id.startsWith('ev:')

function kindOf(slot: string, slotValue: string, a: Row, b: Row): Contradiction['kind'] {
  if (slot === 'cellar_ever') {
    const inside = [a, b].find((r) => r.value === 'in' && inWindow(r.time))
    if (inside) return 'window'
  }
  if (isEvidence(a.origin.source) || isEvidence(b.origin.source)) return 'record'
  if (a.origin.source === b.origin.source) return 'self'
  return 'testimony'
}

const GROUP_LABEL: Record<string, string> = {
  cellar_ever: 'went below stairs',
  fuse: 'who cut the cellar lights',
  motive: 'what the sale meant',
}

/** Every live contradiction in the record, strongest first, repeats collapsed. */
export function contradictions(claims: Claim[]): Contradiction[] {
  const byKey = new Map<string, Row[]>()
  for (const r of rows(claims)) {
    if (!DISPUTED.has(r.slot) && !r.slot.startsWith('at:') && !r.slot.startsWith('with:')) continue
    const k = `${r.subject}|${r.slot}`
    const list = byKey.get(k) ?? []
    list.push(r)
    byKey.set(k, list)
  }
  const best = new Map<string, Contradiction>()
  const rank: Record<Contradiction['kind'], number> = { window: 0, record: 1, self: 2, testimony: 3 }
  for (const [key, list] of byKey) {
    const [subject, slot] = key.split('|')
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i]
        const B = list[j]
        if (A.value === B.value) continue
        if (A.origin.id === B.origin.id) continue
        if (slot === 'motive' && A.origin.source !== B.origin.source) continue
        const pair = [A.value, B.value].sort().join('|')
        const dedupe = `${key}|${pair}`
        const inside = slot === 'cellar_ever' ? [A, B].find((r) => r.value === 'in' && inWindow(r.time)) : undefined
        const about =
          slot === 'cellar_ever'
            ? inside
              ? `went down to the cellar at ${clock(inside.time)}, inside the window`
              : 'went down to the cellar'
            : GROUP_LABEL[slot] ?? `${slot.startsWith('with:') ? 'who they were with at ' + clock(slot.slice(5)) : 'where they were at ' + clock(slot.slice(3))}`
        const candidate: Contradiction = {
          id: `x:${subject}:${slot}:${pair}`,
          a: A.origin,
          b: B.origin,
          kind: kindOf(slot, A.value, A, B),
          subject: subject as string,
          about,
        }
        const prev = best.get(dedupe)
        if (!prev || rank[candidate.kind] < rank[prev.kind]) best.set(dedupe, candidate)
      }
    }
  }
  return [...best.values()].sort(
    (x, y) => rank[x.kind] - rank[y.kind] || x.subject.localeCompare(y.subject),
  )
}
