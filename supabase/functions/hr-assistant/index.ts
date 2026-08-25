import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests for browser security
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Fetch the secret API Key securely in Deno runtime
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing GEMINI_API_KEY environment secret on Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse the client request body
    const { message } = await req.json()
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing message parameter in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Query Google Gemini API (gemini-1.5-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: message,
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    
    // Check if Google returned an error
    if (data.error) {
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract text from Gemini response structure
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated."

    // 4. Return response to React app
    return new Response(
      JSON.stringify({ reply: aiText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
