export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { id } = await req.json();

    const octaRes = await fetch(
      `https://app.octadesk.com/chat/${id}/messages?limit=100`,
      { headers: { 'X-API-KEY': process.env.OCTADESK_API_KEY } }
    );

    const octaText = await octaRes.text();

    if (!octaRes.ok) {
      return new Response(
        JSON.stringify({ error: `Octadesk ${octaRes.status}: ${octaText}` }),
        { status: 502, headers: corsHeaders }
      );
    }

    let msgs;
    try { msgs = JSON.parse(octaText); } catch(e) {
      return new Response(JSON.stringify({ error: `JSON inválido: ${octaText.substring(0, 200)}` }), { status: 502, headers: corsHeaders });
    }

    const mensagens = Array.isArray(msgs) ? msgs : (msgs.data || msgs.messages || msgs.items || []);

    if (!mensagens.length) {
      return new Response(JSON.stringify({ error: `Sem mensagens. Resposta: ${JSON.stringify(msgs).substring(0, 300)}` }), { status: 404, headers: corsHeaders });
    }

    const texto = mensagens.map(m => {
      const quem = m.author?.type === 'contact' ? (m.author?.name || 'Cliente') : 'Atendente';
      if (m.attachments?.length) return `[${quem}]: [Áudio/Arquivo]`;
      return `[${quem}]: ${m.body || m.text || ''}`;
    }).filter(l => l.length > 5).join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: `Você é advogado trabalhista. Analise e responda SOMENTE JSON válido:\n\n${texto}\n\n{"cliente":{"nome":"string","funcao":"string","tempo_trabalho":"string","situacao":"string"},"direitos":[{"titulo":"string","descricao":"string"}],"alertas":[{"titulo":"string","descricao":"string"}],"dados_faltantes":[{"titulo":"string","descricao":"string"}],"minuta":"string"}` }],
      }),
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.find(b => b.type === 'text')?.text || '';
    const resultado = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return new Response(JSON.stringify(resultado), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
}
