# Four Alibis

A live interrogation game. Aurelio Vela is dead at the foot of his own cellar stairs at Casa Vela, a members' club on the Ligurian coast, closing night. Four people were still in the building. Every one of them is lying about something, and one of them is lying about the cellar.

You have 26 moves and one charge. You win by catching a contradiction inside the murder window (23:05–23:20) and putting it to the person it belongs to.

Live: https://four-alibis.vercel.app

## Why the model is the game

There is no script. Each suspect is a hidden character sheet plus a **typed decision** that the model makes every time you speak:

- **Jev** (`fornace-jev`, `/v1/systemone`) answers a battery of closed-form questions in one call: which of the nine things you are actually asking about, what they assert about it, how much the question costs them, how they deliver it, whether they name anyone. Its output is not prose, it is the game state: `{probe, assert, strain, certainty}`.
- **`fornace-fast`** turns that decided fact into one spoken line in the character's voice. It never decides anything.
- The engine owns the parts that must be exact: consistency of the record, contradiction detection, composure, what breaks and when, and the verdict.

So the interrogation is generative, and the case is still winnable and losable for reasons, not vibes.

### The loop

1. Ask anything, in your own words, or use a suggested line. Jev parses the question into one of nine probes and decides what this person says.
2. Every answer becomes a statement on the record: `subject · slot · value`.
3. The engine derives what those statements imply. "I never went below" and "she went down at 23:08" cannot both be true. That is a contradiction, and it is filed on the right.
4. Put it to them. A caught lie costs composure. Composure releases what they are hiding, in order, until they break.
5. Breaking a witness produces exhibits: the yard door at 23:07, the cellar lever, the card reader log. Exhibits are statements too, so they contradict people.
6. Name one person and cite what contradicts them. The charge only holds if the contradiction is about the cellar, inside the window.

## Layout

```
shared/types.ts     wire types and what the browser may know
shared/judge.ts     pure contradiction engine (same code both sides)
api/_minds.ts       the hidden case: characters, lies, leak ladders, exhibits
api/_models.ts      Jev request/response, the line writer, evidence probes
api/_judge.ts       state, composure, what breaks, the charge
api/_run.ts         one turn, end to end
api/turn.ts         the serverless handler
src/                the room
```

## Run it

```bash
npm install
vercel env pull .env.local      # or put MANTICE_API_KEY=... in .env.local
vercel dev --listen 3100
```

Playtest the engine without a browser, live models:

```bash
npx tsx scripts/playtest.ts 'ask:ines|when did you last go down to the cellar?' \
  'ask:nadia|Where were you at 23:10?' 'ask:nadia|The cellar. Again. Tonight.' \
  'confront:ines' 'accuse:ines'
```

## Notes

- Portraits and the cellar plate are generated (`fornace-image-high`); prompts are in the commit that added them.
- No gradients, no shadows, two typefaces, one accent.
- A refresh keeps the night you are in. "Start the night again" clears it.
