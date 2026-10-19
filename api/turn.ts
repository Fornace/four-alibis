import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runTurn } from './_run.js'
import { clientIp, guard } from './_guard.js'
import type { TurnRequest } from '../shared/types.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  const check = await guard({
    ip: clientIp(req.headers),
    cookie: req.headers.cookie,
    token: typeof req.headers['x-turnstile-token'] === 'string' ? req.headers['x-turnstile-token'] : undefined,
    action: 'interrogate',
  })
  if (!check.ok) {
    res.setHeader('cache-control', 'no-store')
    res.status(check.status).json(check.body)
    return
  }
  if (check.setCookie) res.setHeader('set-cookie', check.setCookie)
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
