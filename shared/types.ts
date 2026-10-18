export type SuspectId = 'nadia' | 'ellis' | 'tobias' | 'ines'

export type ProbeKey =
  | 'at_2300'
  | 'at_2310'
  | 'at_2313'
  | 'cellar'
  | 'saw'
  | 'sound'
  | 'fuse'
  | 'bottle'
  | 'motive'

export type Claim = {
  id: string
  /** a suspect id, 'case' for a fact about the world, or a witness id */
  subject: string
  /** 'at:2310' for a location claim, otherwise the probe key or a source tag */
  slot: string
  value: string
  /** who asserted it: a suspect id, or an evidence card id */
  source: string
  turn: number
  text: string
}

export type Contradiction = {
  id: string
  a: Claim
  b: Claim
  kind: 'self' | 'testimony' | 'window' | 'record'
  subject: string
  about: string
}

export type Evidence = {
  id: string
  title: string
  detail: string
  claim: Claim
}

export type Line = {
  id: number
  who: SuspectId | 'detective' | 'game'
  tag?: string
  text: string
  claimIds: string[]
  strain?: string
  tell?: { level: string; confidence: number }
}

export type GameState = {
  caseOpen: boolean
  movesLeft: number
  turn: number
  suspectId: SuspectId
  claims: Claim[]
  evidence: Evidence[]
  composure: Record<SuspectId, number>
  cracked: SuspectId[]
  leaked: Record<SuspectId, string[]>
  /** how many times each probe has been put to each suspect */
  asks: Record<string, Partial<Record<string, number>>>
  over: null | { result: 'won' | 'lost'; title: string; text: string; truth?: string }
}

export type TurnRequest = {
  state: GameState
  suspectId: SuspectId
  /** free text typed by the detective */
  ask: string
  action: 'ask' | 'confront' | 'evidence' | 'accuse'
  contradictionId?: string
  evidenceId?: string
  accused?: SuspectId
  cited?: string[]
}

export type TurnResponse = {
  state: GameState
  lines: Line[]
  probeKey?: ProbeKey
  probeLabel?: string
  newContradictions: Contradiction[]
  strain?: string
  tell?: { level: string; confidence: number }
  error?: string
}

export const CASE_TITLE = 'Four Alibis'

export type PublicSuspect = {
  id: SuspectId
  name: string
  role: string
  age: number
  line: string
  portrait: string
  colour: string
  /** css object-position tuned to each photograph */
  focus: string
}

export const SUSPECTS: PublicSuspect[] = [
  {
    id: 'nadia',
    name: 'Nadia Marchetti',
    role: 'Sommelier',
    age: 34,
    line: 'Nine years running this cellar. She counts everything twice.',
    portrait: '/art/nadia.webp',
    colour: '#b8603f',
    focus: '50% 0%',
  },
  {
    id: 'ellis',
    name: 'Ellis Vega',
    role: 'Club manager',
    age: 41,
    line: 'Keeps the ledgers, keeps the keys, keeps his face still.',
    portrait: '/art/ellis.webp',
    colour: '#5f7d86',
    focus: '50% 0%',
  },
  {
    id: 'tobias',
    name: 'Tobias Reyes',
    role: 'Investor, guest of the house',
    age: 55,
    line: 'Flew in for the closing dinner. Has bought eleven clubs.',
    portrait: '/art/tobias.webp',
    colour: '#8b7f52',
    focus: '50% 10%',
  },
  {
    id: 'ines',
    name: 'Ines Duarte',
    role: 'Chef',
    age: 47,
    line: 'Her mother cooked in this kitchen before her. She never leaves it.',
    portrait: '/art/ines.webp',
    colour: '#79607f',
    focus: '50% 2%',
  },
]

export const PROBES: { key: ProbeKey; label: string; short: string; hint: string }[] = [
  { key: 'at_2300', label: 'Where were you at 23:00?', short: '23:00', hint: 'the last course' },
  { key: 'at_2310', label: 'Where were you at 23:10?', short: '23:10', hint: 'ten minutes in' },
  { key: 'at_2313', label: 'Where were you when the lights went?', short: 'The blackout', hint: '23:13' },
  { key: 'cellar', label: 'When did you last go down to the cellar?', short: 'The cellar', hint: 'the stairs' },
  { key: 'saw', label: 'Who did you see tonight?', short: 'Who did you see?', hint: 'and where' },
  { key: 'sound', label: 'What did you hear from below?', short: 'What did you hear?', hint: 'anything at all' },
  { key: 'fuse', label: 'Who cut the cellar lights?', short: 'The fuse board', hint: '23:13' },
  { key: 'bottle', label: "What happened to the '82?", short: "The '82", hint: 'the wine' },
  { key: 'motive', label: 'What did the sale mean for you?', short: 'The sale', hint: 'the terms' },
]

export const PLACE_LABEL: Record<string, string> = {
  dining: 'the dining room',
  kitchen: 'the kitchen',
  cellar: 'the cellar',
  office: 'the office',
  terrace: 'the sea terrace',
  yard: 'the service yard',
  passage: 'the service passage',
  upstairs: 'upstairs',
  outside: 'outside the club',
  not_here: "wasn't here",
  never: 'has never been down tonight',
  after: 'only after the body was found',
  nobody: 'nobody',
  storm: 'the storm',
  intact: 'nothing happened to it',
  missing: 'bottles were taken',
  broken: 'one was broken',
  unknown: "doesn't know",
  nothing: 'nothing at all',
  money: 'money',
  club: 'the club',
  sale: 'the sale',
  clara: 'Clara Vela',
}

export const SUSPECT_LABEL: Record<string, string> = {
  nadia: 'Nadia',
  ellis: 'Ellis',
  tobias: 'Tobias',
  ines: 'Ines',
  aurelio: 'Aurelio',
  clara: 'Clara',
  porter: 'the porter',
  everyone: 'everyone',
  nobody: 'no one',
}
