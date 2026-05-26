// Supabase Edge Function: verify-turnstile
// Validates a Cloudflare Turnstile token server-side.
// Used by service submission forms (services.html).
//
// ── Setup required ─────────────────────────────────────────────────────────────
// In Supabase Dashboard → Settings → Edge Functions → Add new secret:
//   Name:  TURNSTILE_SECRET_KEY
//   Value: (same Turnstile SECRET key as signup-check uses)
//
// ── Deploy command ─────────────────────────────────────────────────────────────
//   supabase functions deploy verify-turnstile
// ──────────────────────────────────────────────────────────────────────────────

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { token } = await req.json() as { token: string }
    const ip =
      req.headers.get('cf-connecting-ip') ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      ''

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret:   TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    })
    const data = await resp.json() as { success: boolean }

    return new Response(JSON.stringify({ success: data.success }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('verify-turnstile error:', err)
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
