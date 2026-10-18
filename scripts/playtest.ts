/**
 * Real playtest: drives runTurn exactly as the browser does, with live models.
 * Step syntax:  ask:nadia|Where were you at 23:10?
 *               confront:<contradiction substring>|          e.g. confront:ines
 *               evidence:ines|log
 *               accuse:ines|cellar_ever
 */
import { runTurn } from '../api/_run'
import { newGame } from '../api/_judge'
import { contradictions } from '../shared/judge'
import type { GameState, SuspectId, TurnRequest } from '../shared/types'

const plan = process.argv.slice(2)
if (!plan.length) {
  plan.push(
    'ask:nadia|Where were you at 23:10, when the lights were still on?',
    'ask:nadia|When did you last go down to the cellar?',
    'ask:nadia|Somebody went down there tonight. Somebody with a key to the yard door. Was it you?',
    'ask:nadia|I will ask you once more. Did you go below that cellar tonight?',
    'ask:nadia|Did you see Ines tonight? Where?',
    'ask:nadia|Tell me exactly where Ines was when you saw her.',
    'confront:ines',
    'accuse:ines',
  )
}

let state: GameState = newGame()
const t0 = Date.now()
for (const step of plan) {
  const [head, ...rest] = step.split('|')
  const [action, who] = head.split(':')
  const ask = rest.join('|')
  const xs = contradictions(state.claims)
  let req: TurnRequest
  if (action === 'confront') {
    const x = xs.find((c) => c.subject === who)
    if (!x) {
      console.log(`\n(no contradiction is on ${who} yet)`)
      continue
    }
    req = { state, suspectId: who as SuspectId, ask: '', action: 'confront', contradictionId: x.id }
  } else if (action === 'evidence') {
    req = { state, suspectId: who as SuspectId, ask: '', action: 'evidence', evidenceId: ask }
  } else if (action === 'accuse') {
    const cited = xs.filter((c) => c.subject === who).map((c) => c.id)
    req = { state, suspectId: who as SuspectId, ask: '', action: 'accuse', accused: who as SuspectId, cited }
  } else {
    req = { state, suspectId: who as SuspectId, ask, action: 'ask' }
  }
  const t = Date.now()
  const res = await runTurn(req)
  console.log(`\n── ${head}  (${((Date.now() - t) / 1000).toFixed(1)}s, moves ${res.state.movesLeft})`)
  for (const l of res.lines) console.log(`  ${l.who}${l.tag ? ` [${l.tag}]` : ''}: ${l.text}`)
  console.log(`  composure ${JSON.stringify(res.state.composure)}  strain=${res.strain}  probe=${res.probeKey}`)
  state = res.state
  if (state.over) break
}
const xs = contradictions(state.claims)
console.log(`\nCONTRADICTIONS (${xs.length})`)
for (const x of xs) console.log(`  [${x.kind}] ${x.subject}: ${x.a.text}  /  ${x.b.text}`)
for (const c of state.claims) console.log(`  claim ${c.id} ${c.source} -> ${c.subject}|${c.slot}=${c.value}`)
console.log(`EVIDENCE ${state.evidence.map((e) => e.id).join(', ')}`)
console.log(`CLAIMS ${state.claims.length}  OVER ${state.over?.result ?? 'no'}  total ${((Date.now() - t0) / 1000).toFixed(1)}s`)
