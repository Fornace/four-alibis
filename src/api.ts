import type { TurnRequest, TurnResponse } from '../shared/types'

export async function sendTurn(req: TurnRequest): Promise<TurnResponse> {
  const res = await fetch('/api/turn', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.error || `the room did not answer (${res.status})`
    throw new Error(message)
  }
  return body as TurnResponse
}
