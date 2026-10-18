import type { ProbeKey, SuspectId } from '../shared/types.js'
import { MINDS, PROBE_OPTIONS, SAW_TIME, SAW_WHO, type Option } from './_minds.js'

const BASE = process.env.MANTICE_BASE_URL || 'https://llm.fornace.net'
const KEY = process.env.MANTICE_API_KEY || process.env.FORNACE_LLM_API_KEY || ''
const JEV_MODEL = process.env.JEV_MODEL || 'fornace-jev'
const LINE_MODEL = process.env.LINE_MODEL || 'fornace-fast'

export const PROBE_LABEL: Record<ProbeKey, string> = {
  at_2300: 'where they were at 23:00',
  at_2310: 'where they were at 23:10',
  at_2313: 'where they were when the lights went out at 23:13',
  cellar: 'when they last went down to the cellar tonight',
  saw: 'who they saw tonight and where',
  sound: 'what they heard from below',
  fuse: 'who cut the cellar lights',
  bottle: 'what happened to the 1982 Barolo',
  motive: 'what the sale of Casa Vela meant to them',
}

const PROBE_DESC: Record<ProbeKey, string> = {
  at_2300: 'the detective asks where the suspect was at 23:00, at the end of the last course',
  at_2310: 'the detective asks where the suspect was at 23:10, ten minutes before the body was found',
  at_2313: 'the detective asks where the suspect was at 23:13, when the cellar lights went out',
  cellar: 'the detective asks when the suspect last went down to the cellar, and whether they went down at all tonight',
  saw: 'the detective asks whom the suspect saw tonight, and where and when they saw them',
  sound: 'the detective asks what the suspect heard from the cellar or below stairs',
  fuse: 'the detective asks who cut the cellar lights at 23:13',
  bottle: 'the detective asks about the 1982 Barolo in the cellar: whether bottles were taken or broken',
  motive: 'the detective asks what the sale of Casa Vela meant to the suspect',
}

const EVIDENCE_PROBE: Record<string, ProbeKey> = {
  bottles: 'bottle',
  fuse: 'fuse',
  yard: 'at_2310',
  stairs: 'cellar',
  office: 'at_2310',
  log: 'cellar',
  terms: 'motive',
  pan: 'cellar',
  call: 'at_2310',
  confession: 'cellar',
  motive: 'motive',
}

const EVIDENCE_TEXT: Record<string, string> = {
  bottles: 'the 1982 crate is six bottles short',
  fuse: 'the cellar lever at the board was pulled by hand at 23:13, not tripped by the storm',
  yard: 'a woman crossed the service yard with a wine case at 23:07',
  stairs: 'the sommelier saw Ines go down the cellar stairs at about 23:08 with the lift keys',
  office: 'two people stood in the office window at 23:10: the manager and a woman with pale hair',
  log: 'the cellar card reader logs Nadia Marchetti at 23:03 and Ines Duarte at 23:09, and nobody else until the porter found the body',
  terms: 'Aurelio signed heads of terms at 16:00 that would turn the cellar into a wine library and strike out the kitchen',
  pan: 'the copper pan from the cellar shelf, and Ines Duarte\'s hands, clean, at 23:16',
  call: 'the terrace call to a Zurich fund ran from 23:08 to 23:16',
  confession: 'her own account of going down at 23:09 with the card',
  motive: 'Aurelio refused the Zurich offer to Tobias on the terrace at 22:50',
}

export const evidenceProbe = (id: string): ProbeKey => EVIDENCE_PROBE[id] ?? 'cellar'
export const evidenceText = (id: string): string => EVIDENCE_TEXT[id] ?? 'a fact from the file'

function optionsBlock(opts: Option[]): string {
  return opts.map((o) => `  - ${o.key}: ${o.desc}`).join('\n')
}

export type Decision = {
  probe: ProbeKey | 'off_topic'
  assert: string
  sawWho?: string
  sawTime?: string
  sawWhere?: string
  certainty: string
  strain: string
  points: string
  confidence: number
}

type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: 'score'; score: number; confidence: number; legend: Record<string, string>; probabilities: Record<string, number> }

async function once(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${BASE}/v1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0, 300)}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${path}: unreadable response`)
  }
}

/** One retry on a transport failure or a truncated body; the caller still sees a hard error after that. */
async function post(path: string, body: unknown): Promise<any> {
  if (!KEY) throw new Error('MANTICE_API_KEY is not configured on the server')
  try {
    return await once(path, body)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const retryable = /timeout|abort|fetch failed|ECONN|5\d\d|429/.test(msg)
    if (!retryable) throw err
    console.warn(`retrying ${path} after: ${msg.slice(0, 120)}`)
    return await once(path, body)
  }
}

const levelOf = (a: JevAnswer | undefined): string => {
  if (!a) return ''
  if (a.type === 'score') return a.legend[String(Math.round(a.score))] ?? ''
  return ''
}

/** One typed decision from Jev: what the detective is asking, and what this person says to it. */
export async function decide(args: {
  who: SuspectId
  ask: string
  forcedProbe?: ProbeKey
  encounter: 'ask' | 'confront' | 'evidence'
  composure: number
  cracked: boolean
  prior: { probe: ProbeKey; value: string; turn: number }[]
  leakText: string[]
  contradictoryWords: string
  evidenceText?: string
  repeatCount?: number
}): Promise<Decision> {
  const mind = MINDS[args.who]
  const isKiller = args.who === 'ines'
  const state = {
    you_are: mind.name,
    your_voice: mind.voice,
    the_truth_you_know: mind.knows[args.who] ?? '',
    the_story_you_are_holding: mind.hold,
    your_default_answers: mind.push,
    your_composure: `${args.composure} out of 100. Under 50 you are no longer steady. Under 30 your story starts coming apart. At 0 you have broken completely.`,
    times_the_detective_has_asked_you_this_exact_thing: args.repeatCount ?? 0,
    you_have_broken_and_are_telling_the_truth_now: args.cracked,
    your_prior_answers_tonight: args.prior.length
      ? args.prior.map((p) => `${PROBE_LABEL[p.probe]} -> ${p.value}`).join('; ')
      : 'none yet',
    the_detective_asks: args.ask,
    this_is: args.encounter,
    caught_out: args.contradictoryWords || 'no',
    evidence_on_the_table: args.evidenceText || 'nothing',
    what_you_may_let_slip_under_pressure: args.leakText,
    world:
      'Casa Vela, a members club on the Ligurian coast, closing night. Aurelio Vela was found dead at the foot of the cellar stairs at 23:41. Time of death is between 23:05 and 23:20. The detective is in the room with you and has the file.',
    rules: isKiller
      ? 'You killed him and you will not say so. Hold your story. Answer with what a woman who has eleven years in that kitchen would say. Give nothing away that you are not forced to give.'
      : 'You did not kill anyone. You are hiding something smaller and you would rather lose your job than say it. Answer with the story you are holding unless the pressure genuinely beats you.',
  }

  const questions: Record<string, any> = {
    probe: {
      type: 'choice',
      instructions: `What is the detective actually asking about? The detective said: "${args.ask}"`,
      criteria: {
        ...Object.fromEntries(Object.entries(PROBE_DESC).map(([k, v]) => [k, v])),
        off_topic: 'none of these: a remark, a threat, small talk, or a question about something that did not happen that night',
      },
    },
    certainty: {
      type: 'score',
      instructions:
        'How does this person deliver the answer they are about to give? vague: trailing off, half a sentence; hedged: qualifiers and maybes; flat: level and deliberate; emphatic: pressing the words down on the table.',
      criteria: ['vague', 'hedged', 'flat', 'emphatic'],
    },
    strain: {
      type: 'score',
      instructions: `How much does this question cost this person right now? Their composure is ${args.composure} out of 100 and they have been asked this exact thing ${args.repeatCount} time(s) before tonight. ${
        args.encounter === 'confront'
          ? 'They have just been caught in a difference between two things they said. A caught lie is expensive.'
          : args.encounter === 'evidence'
            ? 'A physical fact from the file has just been put on the table in front of them.'
            : 'A first, gentle question about the evening costs almost nothing.'
      } unmoved: harmless, they answer without effort. guarded: an ordinary question about the evening, they answer smoothly and it costs them little. rattled: the question touches the exact thing they are lying about, or names somebody who could expose them, or the detective is asking it again. cracking: they are being caught out, the thing they are hiding is named out loud, or they are already below half composure and cannot keep their account straight.`,
      criteria: ['unmoved', 'guarded', 'rattled', 'cracking'],
    },
    points: {
      type: 'choice',
      instructions: 'Does this answer put someone else in the frame?',
      criteria: {
        nobody: 'no, this answer is only about themselves or the wine',
        nadia: 'yes, it implicates or exposes Nadia',
        ellis: 'yes, it implicates or exposes Ellis',
        tobias: 'yes, it implicates or exposes Tobias',
        ines: 'yes, it implicates or exposes Ines',
        clara: 'yes, it involves Clara Vela',
      },
    },
  }

  for (const key of Object.keys(PROBE_OPTIONS) as ProbeKey[]) {
    questions[`answer_${key}`] = {
      type: 'choice',
      instructions: `If the question is ${PROBE_LABEL[key]}, what does ${mind.name} assert? Their default answer is "${mind.push[key]}" because of the story they are holding. The truth you know is in the state. Choose what they actually put on the record right now, given their composure, what they have already said, and what is on the table. They always give an answer that can be written down, even when the words come out as a question.`,
      criteria: Object.fromEntries(PROBE_OPTIONS[key].map((o) => [o.key, o.desc])),
    }
  }
  questions.saw_who = {
    type: 'choice',
    instructions: `If they are asked whom they saw tonight, whom do they actually name? Use the sighting in the knowledge you were given, if there is one. Do not invent a sighting that is not in your knowledge; a person with nothing to tell says they saw nobody.`,
    criteria: Object.fromEntries(SAW_WHO.map((o) => [o.key, o.desc])),
  }
  questions.saw_time = {
    type: 'choice',
    instructions: `If they name someone, at what clock time do they place them? Use the time from their knowledge, not a new one.`,
    criteria: Object.fromEntries(SAW_TIME.map((o) => [o.key, o.desc])),
  }
  questions.saw_where = {
    type: 'choice',
    instructions: `If they name someone, in what place do they put them? Use the place from their knowledge.`,
    criteria: Object.fromEntries(
      PROBE_OPTIONS.saw.map((o) => [o.key, o.desc]),
    ),
  }

  const body = { model: JEV_MODEL, state, questions }
  const t0 = Date.now()
  const data = await post('/systemone', body)
  if (process.env.TIMINGS) console.error(`jev ${Date.now() - t0}ms tokens=${data?.usage?.prompt_tokens}`)
  const ans = data.answers as Record<string, JevAnswer>
  const forced = args.forcedProbe
  const probe = (forced ?? (ans.probe?.type === 'choice' ? ans.probe.choice : 'off_topic')) as ProbeKey | 'off_topic'
  let assert = ''
  if (probe !== 'off_topic') {
    const a = ans[`answer_${probe}`]
    if (a?.type === 'choice') assert = a.choice
  }
  const sawWho = ans.saw_who?.type === 'choice' ? ans.saw_who.choice : 'nobody'
  const sawTime = ans.saw_time?.type === 'choice' ? ans.saw_time.choice : 'none'
  const sawWhere = ans.saw_where?.type === 'choice' ? ans.saw_where.choice : 'dining'
  return {
    probe,
    assert,
    sawWho,
    sawTime,
    sawWhere,
    certainty: levelOf(ans.certainty) || 'flat',
    strain: levelOf(ans.strain) || 'guarded',
    points: ans.points?.type === 'choice' ? ans.points.choice : 'nobody',
    confidence: ans.probe?.type === 'choice' ? ans.probe.confidence : 0,
  }
}

const clean = (s: string) =>
  s
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** The line the suspect actually says, in their voice, from the decision already made. */
export async function speak(args: {
  who: SuspectId
  ask: string
  probe: string
  assert: string
  certainLabel: string
  strain: string
  encounter: string
  caughtOut?: string
  recent: string[]
}): Promise<string> {
  const mind = MINDS[args.who]
  const system =
    'You write one spoken line for a character in a noir interrogation game set in an Italian members club, 1990s. ' +
    'The line is said out loud to the detective across a table. No narration, no stage directions, no quotation marks, no name prefix, no italics. ' +
    'One sentence, at most 24 words. First person. Do not explain the mechanic. Do not volunteer facts the character would not volunteer.'
  const user = [
    `CHARACTER: ${mind.voice}`,
    `THE STORY THEY ARE HOLDING: ${mind.hold}`,
    `THE DETECTIVE JUST SAID: ${args.ask}`,
    `WHAT THEY ARE CONVEYING: they assert "${args.assert}". Their delivery is ${args.certainLabel}. Their strain is ${args.strain}.`,
    args.encounter === 'confront' ? `THEY HAVE JUST BEEN CAUGHT: ${args.caughtOut}. Do not confess. React like a person caught.` : '',
    args.encounter === 'evidence' ? 'A physical fact has just been put on the table in front of them.' : '',
    args.recent.length ? `DO NOT REPEAT THESE EARLIER LINES: ${args.recent.join(' | ')}` : '',
    'Write the line only.',
  ]
    .filter(Boolean)
    .join('\n')
  const t1 = Date.now()
  const data = await post('/chat/completions', {
    model: LINE_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.9,
    max_tokens: 512,
  })
  if (process.env.TIMINGS) console.error(`line ${Date.now() - t1}ms`)
  let out = data?.choices?.[0]?.message?.content
  if (typeof out !== 'string' || !out.trim()) {
    const again = await post('/chat/completions', {
      model: LINE_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.9,
      max_tokens: 512,
    })
    out = again?.choices?.[0]?.message?.content
  }
  if (typeof out !== 'string' || !out.trim())
    throw new Error(`line model returned nothing twice: ${JSON.stringify(data).slice(0, 200)}`)
  const said = clean(out)
  if (!said) throw new Error(`line model returned only stage business: ${out.slice(0, 120)}`)
  return said
}
