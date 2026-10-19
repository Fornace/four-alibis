/** Turnstile on demand: the server asks for it once per play pass; most visitors never see a widget. */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<void> | null = null

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('could not load the human check'))
    }
    document.head.appendChild(s)
  })
  return loading
}

async function humanToken(sitekey: string, action: string): Promise<string> {
  await load()
  const ts = window.turnstile
  if (!ts) throw new Error('could not load the human check')
  return new Promise<string>((resolve, reject) => {
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647'
    document.body.appendChild(box)
    let id: string | undefined
    let errors = 0
    const finish = (settle: () => void) => {
      try {
        if (id !== undefined) ts.remove(id)
      } catch {
        /* already gone */
      }
      box.remove()
      settle()
    }
    id = ts.render(box, {
      sitekey,
      action,
      appearance: 'interaction-only',
      callback: (token: string) => finish(() => resolve(token)),
      // Turnstile retries on its own; give up only after repeated failures.
      'error-callback': () => {
        errors += 1
        if (errors >= 3) finish(() => reject(new Error('the human check failed, reload and try again')))
        return true
      },
      'timeout-callback': () => finish(() => reject(new Error('the human check timed out, try again'))),
    })
  })
}

/** POST once; if the server asks for a human check, solve it and send the same request again. */
export async function guardedFetch(url: string, init: RequestInit): Promise<Response> {
  const first = await fetch(url, init)
  if (first.status !== 403) return first
  const body = (await first.clone().json().catch(() => null)) as { verify?: boolean; sitekey?: string; action?: string } | null
  if (!body?.verify || !body.sitekey || !body.action) return first
  const token = await humanToken(body.sitekey, body.action)
  const headers = new Headers(init.headers)
  headers.set('x-turnstile-token', token)
  return fetch(url, { ...init, headers })
}
