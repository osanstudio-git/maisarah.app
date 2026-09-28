/// <reference path="../deno.d.ts" />

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests for browser security
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Fetch the secret API Key securely in Deno runtime
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured in Supabase environment secrets.')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing RESEND_API_KEY environment secret on Supabase',
          details: 'Please set RESEND_API_KEY in your Supabase project settings -> Edge Functions -> Secrets.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body parameters
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, subject, html, from } = body || {}

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: to, subject, or html in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Clean recipient list
    const recipients = (Array.isArray(to) ? to : [to])
      .map((email: unknown) => String(email || '').trim().toLowerCase())
      .filter(Boolean)

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid recipient email addresses provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Send email request securely via Resend API
    // If no custom domain is verified in Resend yet, 'onboarding@resend.dev' works automatically for testing
    const defaultSender = from || Deno.env.get('RESEND_FROM_EMAIL') || 'Maisarah <onboarding@resend.dev>'
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: defaultSender,
        to: recipients,
        subject,
        html,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.warn('Resend API response error:', data)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data?.message || 'Failed to send email via Resend',
          statusCode: response.status,
          details: data
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unhandled edge function exception in send-email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Internal Edge Function Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
