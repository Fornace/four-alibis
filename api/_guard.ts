import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

/**
 * Abuse guard for the public model-backed endpoint.
 * A visitor proves once with Turnstile, then carries a signed play pass for two hours.
 * Every turn is counted per IP and per pass in Upstash Redis; the gateway key has its own hard cap.
 */

const COOKIE = 'play_pass'
const PASS_SECONDS = 2 * 60 * 60
const LIMITS: Array<[name: string, seconds: number, max: number]> = [
  ['10m', 600, 30],
  ['1d', 86400, 150],
]

export interface GuardInput {
  ip: string
  cookie: string | undefined
  token: string | undefined
  action: string
}

export type GuardResult =
  | { ok: true; setCookie?: string }
  | { ok: false; status: number; body: { error: string; verify?: boolean; sitekey?: string; action?: string } }

function signingKey(): string {
  const key = process.env.GUARD_SECRET
  if (!key || key.length < 32) throw new Error('GUARD_SECRET is not configured')
  return key
}

function sign(value: string): string {
  return createHmac('sha256', signingKey()).update(value).digest('base64url')
}

function readPass(cookie: string | undefined): string | null {
  const raw = cookie
    ?.split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  if (!raw) return null
  const [id, exp, mac] = raw.split('.')
  if (!id || !exp || !mac || Number(exp) * 1000 < Date.now()) return null
  const want = Buffer.from(sign(`${id}.${exp}`))
  const got = Buffer.from(mac)
  return want.length === got.length && timingSafeEqual(want, got) ? id : null
}

function issuePass(): { id: string; cookie: string } {
  const id = randomUUID()
  const exp = Math.floor(Date.now() / 1000) + PASS_SECONDS
  const value = `${id}.${exp}.${sign(`${id}.${exp}`)}`
  return { id, cookie: `${COOKIE}=${value}; Path=/api; Max-Age=${PASS_SECONDS}; HttpOnly; Secure; SameSite=Strict` }
}

async function humanVerified(token: string, ip: string, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  const hosts = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
  )
  if (!secret || hosts.size === 0 || token.length === 0 || token.length > 2048) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return false
    const out = (await res.json()) as { success?: boolean; action?: string; hostname?: string }
    return out.success === true && out.action === action && hosts.has(out.hostname ?? '')
  } catch {
    return false
  }
}

/** True when any counter is over its limit. Redis trouble lets the turn through: the gateway cap still holds. */
async function overLimit(subjects: string[]): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('rate limit store is not configured')
  const prefix = process.env.GUARD_PREFIX || 'game'
  const commands: unknown[][] = []
  const maxima: number[] = []
  for (const subject of subjects) {
    for (const [name, seconds, max] of LIMITS) {
      const key = `rl:${prefix}:${name}:${subject}`
      commands.push(['SET', key, '0', 'EX', String(seconds), 'NX'], ['INCR', key])
      maxima.push(max)
    }
  }
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3_000),
    })
    if (!res.ok) throw new Error(`redis ${res.status}`)
    const out = (await res.json()) as Array<{ result?: unknown }>
    return maxima.some((max, i) => Number(out[i * 2 + 1]?.result) > max)
  } catch (err) {
    console.error('rate limit store unavailable:', err instanceof Error ? err.message : String(err))
    return false
  }
}

export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const real = first(headers['x-real-ip'])
  if (real) return real.trim()
  const fwd = first(headers['x-forwarded-for'])
  return fwd ? fwd.split(',')[0].trim() : 'unknown'
}

export async function guard(input: GuardInput): Promise<GuardResult> {
  let passId = readPass(input.cookie)
  let setCookie: string | undefined
  if (!passId) {
    const verify = {
      error: 'confirm you are human to continue',
      verify: true,
      sitekey: process.env.TURNSTILE_SITE_KEY,
      action: input.action,
    }
    if (!input.token) return { ok: false, status: 403, body: verify }
    if (!(await humanVerified(input.token, input.ip, input.action))) return { ok: false, status: 403, body: verify }
    const pass = issuePass()
    passId = pass.id
    setCookie = pass.cookie
  }
  if (await overLimit([`ip:${input.ip}`, `pass:${passId}`])) {
    return { ok: false, status: 429, body: { error: 'too many questions from here, take a breath and come back later' } }
  }
  return { ok: true, setCookie }
}
