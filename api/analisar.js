export const config = { runtime: 'edge' };

const OCTADESK_API_KEY = process.env.OCTADESK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OCTADESK_SUBDOMAIN = process.env.OCTADESK_SUBDOMAIN || 'app';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { id } = await req.json();
    if (!id) return new Response(JSON.stringify({ error: 'ID da conversa é obrigatório' }), { status: 400, headers: corsHeaders });

    const octaRes = await fetch(
      `https://${OCTADESK_SUBDOMAIN}.octadesk.com/chat/${id}/messages?limit=100`,
      { headers: { 'X-API-KEY': OCTADESK_API_KEY, 'Content-Type': 'application/json' } }
    );

    if (!octaRes.ok) {
      const errText = await octaRes.text();
      return new Response(JSON.stringify({ error: `Erro Octadesk (${octaRes.status}): ${errText}` }), { status: 502, headers: corsHeaders });
    }

    const msgs = await octaRes.json();
    const mensagens = Array.isArray(msgs) ? msgs : (msgs.data || msgs.messages || []);

    if (!mensagens || mensagens.length === 0) {
      return new Response(JSON.stringify({ error: 'Sem mensagens. Verifique o ID.' }), { status: 404, headers: corsHeaders });
    }

    const texto = mensagens.map(m => {
      const quem = m.author?.type === 'contact' ? (m.author?.name || 'Cliente') : 'Atendente';
      if (m.attachments && m.attachments.length > 0) return `[${quem}]: [Áudio/Arquivo]`;
      return `[${quem}]: ${m.body || ''}`;
    }).filter(l => l.length > 10).join('\n');

    const prompt = `Você é um advogado trabalhista sênior especializado na defesa de trabalhadores no Brasil. Analise o histórico abaixo e produza um relatório jurídico em JSON.

HISTÓRICO:
${texto}

Responda SOMENTE com JSON válido, sem markdown:
{"cliente":{"nome":"string","funcao":"string","tempo_trabalho":"string","situacao":"string"},"direitos":[{"titulo":"string","descricao":"string"}],"alertas":[{"titulo":"string","descricao":"string"}],"dados_faltantes":[{"titulo":"string","descricao":"string"}],"minuta":"string"}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return new Response(JSON.stringify({ error: `Erro IA (${claudeRes.status}): ${errText}` }), { status: 502, headers: corsHeaders });
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.find(b => b.type === 'text')?.text || '';
    const resultado = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return new Response(JSON.stringify(resultado), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
}
