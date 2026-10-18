import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runTurn } from './_run.js'
import type { TurnRequest } from '../shared/types.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as TurnRequest
    if (!body?.state || !body?.suspectId || !body?.action) {
      res.status(400).json({ error: 'missing state, suspectId or action' })
      return
    }
    const out = await runTurn(body)
    res.setHeader('cache-control', 'no-store')
    res.status(200).json(out)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('turn failed', message)
    res.status(502).json({ error: message })
  }
}
