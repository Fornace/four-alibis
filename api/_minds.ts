import type { ProbeKey, SuspectId } from '../shared/types'

/**
 * The hidden side of the case. Never sent to the browser wholesale: the client
 * only ever receives claims a suspect actually made out loud.
 */

export type Option = { key: string; desc: string }

export const PLACES: Option[] = [
  { key: 'dining', desc: 'the dining room, clearing the last tables' },
  { key: 'kitchen', desc: 'the kitchen, at the pass or the sinks' },
  { key: 'cellar', desc: 'the cellar or its stairs' },
  { key: 'office', desc: 'the office behind the bar' },
  { key: 'terrace', desc: 'the sea terrace outside' },
  { key: 'yard', desc: 'the service yard at the back' },
  { key: 'passage', desc: 'the service passage by the fuse board' },
  { key: 'upstairs', desc: 'the bedrooms upstairs' },
  { key: 'outside', desc: 'outside the club altogether' },
]

const PLACE = (extra: Option[] = []): Option[] => [...PLACES, ...extra]

export const PROBE_OPTIONS: Record<ProbeKey, Option[]> = {
  at_2300: PLACE(),
  at_2310: PLACE(),
  at_2313: PLACE(),
  cellar: [
    { key: 'never', desc: 'has not been down to the cellar at all tonight' },
    { key: '2215', desc: 'went down early, around 22:15, before the last course' },
    { key: '2303', desc: 'went down at 23:03' },
    { key: '2307', desc: 'went down at 23:07' },
    { key: '2309', desc: 'went down at 23:09' },
    { key: '2311', desc: 'went down at 23:11' },
    { key: 'after', desc: 'only after the body was found' },
  ],
  saw: PLACE(),
  sound: [
    { key: 'glass', desc: 'glass breaking' },
    { key: 'nothing', desc: 'nothing from below' },
    { key: 'footsteps', desc: 'footsteps on stone' },
    { key: 'argument', desc: 'raised voices' },
    { key: 'door', desc: 'a door or a lift' },
    { key: 'voices', desc: 'voices, too low to make out' },
  ],
  fuse: [
    { key: 'nobody', desc: 'it was never cut, it simply went' },
    { key: 'storm', desc: 'the storm took the power' },
    { key: 'pulled', desc: 'a hand pulled the cellar lever at the board' },
    { key: 'nadia', desc: 'Nadia cut it' },
    { key: 'ellis', desc: 'Ellis cut it' },
    { key: 'tobias', desc: 'Tobias cut it' },
    { key: 'ines', desc: 'Ines cut it' },
  ],
  bottle: [
    { key: 'intact', desc: 'the crates were untouched' },
    { key: 'missing', desc: 'bottles had gone out of the cellar' },
    { key: 'broken', desc: 'one bottle was broken on the flags' },
    { key: 'unknown', desc: 'knows nothing about the wine' },
  ],
  motive: [
    { key: 'nothing', desc: 'Casa Vela meant nothing to them either way' },
    { key: 'money', desc: 'the sale was worth money to them' },
    { key: 'kitchen', desc: 'the sale would have taken the kitchen away' },
    { key: 'club', desc: 'the club was their life and it was ending' },
    { key: 'sale', desc: 'they wanted the sale to happen and it would not' },
    { key: 'clara', desc: 'their reason was Clara Vela' },
  ],
}

export const SAW_WHO: Option[] = [
  { key: 'nadia', desc: 'Nadia, the sommelier' },
  { key: 'ellis', desc: 'Ellis, the manager' },
  { key: 'tobias', desc: 'Tobias, the guest' },
  { key: 'ines', desc: 'Ines, the chef' },
  { key: 'aurelio', desc: 'Aurelio, the owner' },
  { key: 'clara', desc: 'Clara Vela, his wife' },
  { key: 'porter', desc: 'the night porter' },
  { key: 'everyone', desc: 'the whole table at once' },
  { key: 'nobody', desc: 'saw nobody worth naming' },
]

export const SAW_TIME: Option[] = [
  { key: '2245', desc: '22:45' },
  { key: '2252', desc: '22:52' },
  { key: '2300', desc: '23:00' },
  { key: '2305', desc: '23:05' },
  { key: '2307', desc: '23:07' },
  { key: '2308', desc: '23:08' },
  { key: '2310', desc: '23:10' },
  { key: '2313', desc: '23:13' },
  { key: '2316', desc: '23:16' },
  { key: '2325', desc: '23:25' },
  { key: 'none', desc: 'no time worth giving' },
]

export type Leak = {
  at: number
  /** what they let slip, in their own words */
  says: string
  claims: { subject: SuspectId | 'case'; slot: string; value: string; text: string }[]
  evidence?: string
}

export type Mind = {
  id: SuspectId
  name: string
  voice: string
  /** the story they are holding, in their own words */
  hold: string
  /** what they would assert when asked, if nothing moves them */
  push: Record<ProbeKey, string>
  /** what they can say about other people, once they are ready to */
  knows: Record<string, string>
  leaks: Leak[]
  crack: { says: string; evidence: string }
}

export const MINDS: Record<SuspectId, Mind> = {
  nadia: {
    id: 'nadia',
    name: 'Nadia Marchetti',
    voice:
      'Sommelier, 34, nine years at Casa Vela. Precise, dry, tired. Counts bottles and words. Never raises her voice; gets flatter as she gets angrier. Talks about wine the way other people talk about alibis.',
    hold:
      'She was working the floor until the blackout. She did not go down to the cellar tonight. Nothing is missing from the cellar.',
    push: {
      at_2300: 'dining',
      at_2310: 'dining',
      at_2313: 'dining',
      cellar: 'never',
      saw: 'nobody',
      sound: 'nothing',
      fuse: 'nobody',
      bottle: 'intact',
      motive: 'club',
    },
    knows: {
      ines:
        'She saw Ines go down the cellar stairs at about 23:08, wooden clogs, the service lift keys in her hand. She has not said it because saying it means saying where she was standing.',
      nadia:
        'She took six bottles of the 1982 out through the service door between 23:03 and 23:07 because she owes forty thousand euros to a man in Genoa. The cellar was already unlocked and a bottle was already broken on the flags when she got there.',
      ellis: 'Ellis and Clara Vela were behind the office door with the light off. She saw the door, not the people.',
      tobias: 'Tobias was on the terrace on the telephone for most of the night.',
    },
    leaks: [
      {
        at: 80,
        says:
          'Fine. I went down at three minutes past. I took a case of the 1982 through the yard door. It is not yours, it is not his, and it is not murder.',
        claims: [
          {
            subject: 'nadia',
            slot: 'cellar',
            value: '2303',
            text: 'Nadia: went down to the cellar at 23:03',
          },
        ],
      },
      {
        at: 55,
        says:
          'There was already a bottle broken on the flags when I got down there. I swept nothing. I left the glass where it was and I carried my case out.',
        claims: [
          {
            subject: 'case',
            slot: 'bottle',
            value: 'broken',
            text: 'Nadia: a bottle was already broken in the cellar at 23:03',
          },
        ],
        evidence: 'bottles',
      },
      {
        at: 30,
        says:
          'And when I came up the outside steps with the case, Ines was going down the inside stairs. Clogs. The lift keys in her hand. Eight minutes past, or near it.',
        claims: [
          {
            subject: 'ines',
            slot: 'at:2308',
            value: 'cellar',
            text: 'Nadia: saw Ines go down to the cellar at about 23:08',
          },
        ],
        evidence: 'stairs',
      },
    ],
    crack: {
      says:
        'Six bottles. Eight hundred euros a bottle and my name on the sheet. He knew. He always knew what went out of that cellar. If I had gone down a second later I would have been standing over him.',
      evidence: 'log',
    },
  },
  ellis: {
    id: 'ellis',
    name: 'Ellis Vega',
    voice:
      'Club manager, 41, two years at Casa Vela. Smooth, procedural, gives you exact times that he has invented. Answers the question he wishes you had asked. Polite to the point of insult.',
    hold:
      'He was alone in the office with the ledger from before eleven until the lights went out. He heard nothing. Clara Vela was not with him and has nothing to do with any of it.',
    push: {
      at_2300: 'office',
      at_2310: 'office',
      at_2313: 'office',
      cellar: 'never',
      saw: 'nobody',
      sound: 'nothing',
      fuse: 'nobody',
      bottle: 'unknown',
      motive: 'nothing',
    },
    knows: {
      clara:
        'Clara Vela, the widow, was in the office with him from 23:00 until 23:25. They are lovers. Her telephone rang twice at 23:12 and she silenced it.',
      nadia:
        'From the office window at 23:07 he saw a woman cross the service yard carrying a wine case. He assumed it was the sommelier and he decided not to see it.',
      ines:
        'Aurelio showed Ines the signed heads of terms at 22:55 in the service passage: the cellar becomes a wine library, the kitchen goes. Ellis saw the papers in Aurelio\'s hand and Ines\'s face.',
      tobias:
        'Aurelio and Tobias argued on the terrace at 22:50 about the sale. He watched them through the window with the sound off.',
    },
    leaks: [
      {
        at: 80,
        says:
          'At thirteen minutes past the passage door clicked and the lights went. That board does not trip. It is a lever, and a hand pulled it. The cellar circuit only.',
        claims: [
          {
            subject: 'case',
            slot: 'fuse',
            value: 'pulled',
            text: 'Ellis: the cellar lever was pulled by hand at 23:13',
          },
        ],
        evidence: 'fuse',
      },
      {
        at: 55,
        says:
          'Clara was in the office with me. I would rather be ruined than have you put her name in a report, and I am about to be both. We heard nothing until the lights went.',
        claims: [
          {
            subject: 'ellis',
            slot: 'with:2310',
            value: 'clara',
            text: 'Ellis: Clara Vela was with him in the office at 23:10',
          },
        ],
      },
      {
        at: 30,
        says:
          'Seven minutes past. A woman crossed the yard with a case of wine and did not look up at my window. I assumed the sommelier and I filed it under things I do not need to know.',
        claims: [
          {
            subject: 'nadia',
            slot: 'at:2307',
            value: 'yard',
            text: 'Ellis: saw Nadia cross the service yard with a case at 23:07',
          },
        ],
        evidence: 'yard',
      },
    ],
    crack: {
      says:
        'He signed the heads of terms at four o\'clock this afternoon. Zurich. He told me at dinner and told me not to tell the kitchen, which is the sort of instruction that means he had already told the kitchen. Clara was with me. She is not part of this.',
      evidence: 'terms',
    },
  },
  tobias: {
    id: 'tobias',
    name: 'Tobias Reyes',
    voice:
      'Investor, 55, a guest. Loud, fluent, over-explains. Says "frankly" and "in fairness". Treats an interrogation as a meeting he is chairing. Checks his watch because he is proud of having checked it.',
    hold:
      'He was at the table with the others until the lights went out. He is a guest of the house and has nothing to hide.',
    push: {
      at_2300: 'dining',
      at_2310: 'terrace',
      at_2313: 'terrace',
      cellar: 'never',
      saw: 'nobody',
      sound: 'nothing',
      fuse: 'storm',
      bottle: 'unknown',
      motive: 'money',
    },
    knows: {
      ines:
        'At 23:16 the kitchen lights came on and stayed on. Before that the whole back of the house was black. Somebody had been in there in the dark and put the lights on to work.',
      ellis:
        'At 23:10 he looked up at the office window from the terrace and saw two people standing close, not working. The manager and a woman with pale hair.',
      nadia: 'He saw a woman with a wine case go through the yard door at 23:05 and did not think about it.',
      tobias:
        'He was on the terrace from 23:08 to 23:16 on a call to a Zurich fund, arranging to buy Casa Vela out from under Aurelio. At 23:11 he heard glass break below and looked at his watch.',
    },
    leaks: [
      {
        at: 80,
        says:
          'Frankly, I stepped out at five past. The terrace door locks from inside, so nobody joined me. At eleven minutes past something broke below. Glass, not crockery. I looked at my watch.',
        claims: [
          {
            subject: 'case',
            slot: 'sound',
            value: 'glass',
            text: 'Tobias: heard glass break below at 23:11',
          },
          {
            subject: 'tobias',
            slot: 'at:2310',
            value: 'terrace',
            text: 'Tobias: on the sea terrace at 23:10',
          },
        ],
      },
      {
        at: 55,
        says:
          'In fairness I was not alone in the building, I was alone on the terrace. A quarter past, the kitchen lights came on. Nobody had been cooking. Somebody had gone in there in the dark and reached for the switch.',
        claims: [
          {
            subject: 'ines',
            slot: 'at:2316',
            value: 'kitchen',
            text: 'Tobias: saw the kitchen lights come on at 23:16',
          },
        ],
      },
      {
        at: 30,
        says:
          'Two of them in the office window at ten past. Close enough that I looked away. The manager, and a woman with pale hair who was not staff.',
        claims: [
          {
            subject: 'ellis',
            slot: 'with:2310',
            value: 'clara',
            text: 'Tobias: saw Ellis and Clara Vela together in the office at 23:10',
          },
        ],
        evidence: 'office',
      },
    ],
    crack: {
      says:
        'Zurich. Eight minutes past eleven to a quarter past. I was buying the building, not killing the man. The offer dies with him, which you may have noticed is not a motive, it is the opposite of a motive. And the chef came out of the yard door at ten to eleven and stood looking at the sea for a long time before she went back in.',
      evidence: 'call',
    },
  },
  ines: {
    id: 'ines',
    name: 'Ines Duarte',
    voice:
      'Chef, 47, eleven years, and her mother before her. Quiet, courteous, immovable. Answers a question with a question. Gives you exact kitchen timings she has clearly rehearsed. Goes very still when she is close to the edge.',
    hold:
      'She was in the kitchen the whole night, finishing the last service and washing down. She never went below stairs. She has nothing to say about the wine.',
    push: {
      at_2300: 'kitchen',
      at_2310: 'kitchen',
      at_2313: 'kitchen',
      cellar: 'never',
      saw: 'nobody',
      sound: 'nothing',
      fuse: 'storm',
      bottle: 'unknown',
      motive: 'nothing',
    },
    knows: {
      ines:
        'She went down at 23:09 with her card for her mother\'s copper pan and found Aurelio on the cellar stairs with the broken 1982 bottle in his hand. He told her the kitchen was finished, the terms were signed, she could keep the pans. She took the bottle out of his hand and hit him once, and he went down the stairs and did not get up. Then she pulled the cellar lever at the board to make the blackout and went up the service stairs and washed her hands at the sink.',
      aurelio: 'He was alive at 23:09 on the cellar stairs with a bottle in his hand.',
      clara: 'Clara was in the office with the manager. Ines saw the door shut at eleven.',
      nadia:
        'The sommelier had been in the cellar before her. One bottle was already broken and one crate of the 1982 was gone.',
    },
    leaks: [
      {
        at: 80,
        says:
          'I went down before the last course. A quarter past ten, for my mother\'s pan, and I came straight back up. Ask the kitchen. Ask what time the lamb went out.',
        claims: [
          {
            subject: 'ines',
            slot: 'cellar',
            value: '2215',
            text: 'Ines: went down to the cellar at 22:15 for a pan',
          },
        ],
      },
      {
        at: 55,
        says:
          'The bottle was already broken. I saw the glass from the top of the stairs when I came up. I did not go down to it, I did not touch it, and I did not think it was my business.',
        claims: [
          {
            subject: 'case',
            slot: 'bottle',
            value: 'broken',
            text: 'Ines: saw a broken bottle in the cellar from the top of the stairs',
          },
        ],
        evidence: 'pan',
      },
      {
        at: 30,
        says:
          'All right. Nine minutes past. I went down at nine minutes past, and I came up at ten, and that is the whole of it, and I do not know why you are making me say it twice.',
        claims: [
          {
            subject: 'ines',
            slot: 'cellar',
            value: '2309',
            text: 'Ines: now says she went down at 23:09, not 22:15',
          },
        ],
      },
    ],
    crack: {
      says:
        'He had the bottle in his hand like a man holding a flower. He said: the pans are yours, Ines, the room is not. Eleven years. My mother died in that kitchen. I hit him once and I am not sorry and I did not plan one minute of it, and then I went up and I put the lights out because I could not think of anything else to do.',
      evidence: 'confession',
    },
  },
}

export const EVIDENCE: Record<
  string,
  { title: string; detail: string; subject: SuspectId | 'case'; slot: string; value: string; text: string }
> = {
  bottles: {
    title: 'Six bottles short',
    detail: 'The 1982 crate in the cellar is short by six. Nadia\'s own count, on the record.',
    subject: 'case',
    slot: 'bottle',
    value: 'missing',
    text: 'The cellar is short six bottles of the 1982',
  },
  fuse: {
    title: 'The cellar lever',
    detail: 'The board in the service passage does not trip. At 23:13 a hand pulled the cellar lever and only the cellar went dark.',
    subject: 'case',
    slot: 'fuse',
    value: 'pulled',
    text: 'The cellar lights were cut by hand at 23:13, not by the storm',
  },
  yard: {
    title: 'A woman in the yard, 23:07',
    detail: 'Seen from the office window: a woman crossing the service yard with a wine case, at seven minutes past.',
    subject: 'nadia',
    slot: 'at:2307',
    value: 'yard',
    text: 'Nadia crossed the service yard with a wine case at 23:07',
  },
  stairs: {
    title: 'Clogs on the stairs',
    detail: 'Nadia came up the outside steps as Ines went down the inside stairs, 23:08, lift keys in her hand.',
    subject: 'ines',
    slot: 'at:2308',
    value: 'cellar',
    text: 'Ines went down to the cellar at about 23:08',
  },
  office: {
    title: 'Two in the office, 23:10',
    detail: 'A silhouette at the office window at ten past: Ellis, and a woman with pale hair.',
    subject: 'ellis',
    slot: 'with:2310',
    value: 'clara',
    text: 'Ellis was in the office with Clara Vela at 23:10',
  },
  log: {
    title: 'The cellar reader log',
    detail: 'The cellar door takes staff cards. Marchetti 23:03. Duarte 23:09. Nobody else until the porter at 23:41.',
    subject: 'ines',
    slot: 'at:2309',
    value: 'cellar',
    text: 'Ines opened the cellar door with her card at 23:09',
  },
  terms: {
    title: 'Heads of terms, signed',
    detail: 'Zurich. Signed by Aurelio at 16:00 on closing day. The cellar becomes a wine library; the kitchen is struck out.',
    subject: 'case',
    slot: 'motive',
    value: 'kitchen',
    text: 'The sale was signed and it would have taken the kitchen away',
  },
  pan: {
    title: 'The copper pan',
    detail: 'Her mother\'s pan, on the shelf in the cellar where it has hung for thirty years. Ines\'s hands were clean at 23:16.',
    subject: 'ines',
    slot: 'at:2311',
    value: 'cellar',
    text: 'Ines was in the cellar at 23:11',
  },
  call: {
    title: 'The Zurich call',
    detail: 'Eight minutes past eleven to a quarter past, on the terrace, buying the building. Not killing the man.',
    subject: 'tobias',
    slot: 'at:2310',
    value: 'terrace',
    text: 'Tobias was on the sea terrace on a call from 23:08 to 23:16',
  },
  confession: {
    title: 'The confession',
    detail: 'Recorded in the room, in her own words, at the end of eleven years.',
    subject: 'ines',
    slot: 'at:2309',
    value: 'cellar',
    text: 'Ines was in the cellar when Aurelio died',
  },
  motive: {
    title: 'The argument on the terrace, 22:50',
    detail: 'Aurelio refused the Zurich offer to the man\'s face, in front of the manager.',
    subject: 'case',
    slot: 'motive',
    value: 'sale',
    text: 'Tobias wanted the sale and Aurelio refused him at 22:50',
  },
}

export const VICTIM =
  'Aurelio Vela, 61, founder of Casa Vela. Found at 23:41 at the foot of the cellar stairs. struck once with a glass bottle, then fell.'
