// Supabase Edge Function: signup-check
// Validates Cloudflare Turnstile, enforces IP rate limits, then creates the user.
//
// ── Setup required ─────────────────────────────────────────────────────────────
// In Supabase Dashboard → Settings → Edge Functions → Add new secret:
//   Name:  TURNSTILE_SECRET_KEY
//   Value: (your Turnstile SECRET key from Cloudflare Dashboard → Turnstile → your site)
//
// These are injected automatically — you don't need to add them:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// ── Deploy command ─────────────────────────────────────────────────────────────
//   supabase functions deploy signup-check
// ──────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const TURNSTILE_SECRET     = Deno.env.get('TURNSTILE_SECRET_KEY')!

const MAX_PER_HOUR = 2  // max new accounts per IP per hour
const MAX_TOTAL    = 5  // max accounts per IP ever

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, password, display_name, turnstile_token } = await req.json()

    // ── 1. Get client IP ──────────────────────────────────────────────────────
    const ip =
      req.headers.get('cf-connecting-ip') ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      'unknown'

    // ── 2. Validate Turnstile token server-side ───────────────────────────────
    const tsResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret:   TURNSTILE_SECRET,
        response: turnstile_token,
        remoteip: ip,
      }),
    })
    const tsData = await tsResp.json() as { success: boolean }
    if (!tsData.success) {
      return json({ error: 'Human verification failed. Please reload the page and try again.' })
    }

    // ── 3. IP rate limiting ───────────────────────────────────────────────────
    const admin   = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: recentCount } = await admin
      .from('ip_signups')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', hourAgo)

    if ((recentCount ?? 0) >= MAX_PER_HOUR) {
      return json({
        error:
          'Too many accounts created from this network in the last hour. Please wait and try again, or contact hello@geosin.be for help.',
      })
    }

    const { count: totalCount } = await admin
      .from('ip_signups')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)

    if ((totalCount ?? 0) >= MAX_TOTAL) {
      return json({
        error:
          'Maximum number of accounts from this network has been reached. Contact hello@geosin.be for help.',
      })
    }

    // ── 4. Create user — proxied through Supabase auth REST API ──────────────
    //    (Proxy preserves the normal email-confirmation flow; no custom email needed.)
    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password, data: { display_name } }),
    })
    const authData = await authResp.json() as Record<string, unknown>

    // Supabase surfaces errors as { error: { message } } or { msg: "..." }
    if (authData.error || (authData as { msg?: string }).msg) {
      const errMsg =
        (authData.error as { message?: string } | null)?.message ||
        (authData as { msg?: string }).msg ||
        'Signup failed. Please try again.'
      return json({ error: errMsg })
    }

    // ── 5. Record the IP (only after successful signup) ───────────────────────
    await admin.from('ip_signups').insert({ ip })

    // ── 6. Normalise response → { user, session } ────────────────────────────
    //    With email confirmation ON:  authData is the user object directly (no access_token)
    //    With email confirmation OFF: authData has access_token + user inside
    const user    = (authData.user as Record<string, unknown>) || authData
    const session = authData.access_token
      ? {
          access_token:  authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in:    authData.expires_in,
          token_type:    authData.token_type,
        }
      : null

    return json({ user, session })
  } catch (err) {
    console.error('signup-check error:', err)
    return json({ error: 'Internal server error. Please try again.' })
  }
})
