export default async function handler(req) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const { id } = await req.json();

    const octaRes = await fetch(
      `https://app.octadesk.com/chat/${id}/messages?limit=100`,
      { headers: { 'X-API-KEY': process.env.OCTADESK_API_KEY } }
    );

    const octaText = await octaRes.text();

    return new Response(JSON.stringify({
      debug: true,
      status: octaRes.status,
      ok: octaRes.ok,
      body: octaText.substring(0, 500),
      hasApiKey: !!process.env.OCTADESK_API_KEY
    }), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: corsHeaders });
  }
}
