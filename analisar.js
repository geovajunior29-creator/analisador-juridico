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

    // 1. Buscar mensagens no Octadesk
    const octaRes = await fetch(
      `https://${OCTADESK_SUBDOMAIN}.octadesk.com/chat/${id}/messages?limit=100`,
      {
        headers: {
          'X-API-KEY': OCTADESK_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!octaRes.ok) {
      const errText = await octaRes.text();
      return new Response(
        JSON.stringify({ error: `Erro ao buscar no Octadesk (${octaRes.status}): ${errText}` }),
        { status: 502, headers: corsHeaders }
      );
    }

    const msgs = await octaRes.json();
    const mensagens = Array.isArray(msgs) ? msgs : (msgs.data || msgs.messages || []);

    if (!mensagens || mensagens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Conversa encontrada mas sem mensagens. Verifique o ID.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Montar texto da conversa
    const texto = mensagens.map(m => {
      const quem = m.author?.type === 'contact' ? (m.author?.name || 'Cliente') : 'Atendente';
      if (m.attachments && m.attachments.length > 0) {
        return `[${quem}]: [Áudio/Arquivo: ${m.attachments.map(a => a.name || 'anexo').join(', ')}]`;
      }
      return `[${quem}]: ${m.body || ''}`;
    }).filter(l => l.length > 10).join('\n');

    // 3. Analisar com Claude
    const prompt = `Você é um advogado trabalhista sênior especializado na defesa de trabalhadores no Brasil. Analise o histórico de conversa abaixo e produza um relatório jurídico completo em JSON.

HISTÓRICO DA CONVERSA:
${texto}

INSTRUÇÕES:
- Identifique todos os direitos trabalhistas violados com base na CLT, Súmulas do TST e jurisprudência
- Aponte pontos que precisam ser aprofundados na entrevista com o cliente
- Liste dados faltantes essenciais para a petição inicial
- Elabore uma minuta da reclamatória trabalhista (qualificação, fatos, fundamentos jurídicos, pedidos)
- Se houver menção a áudios ou anexos, sinalize que precisam ser transcritos

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{
  "cliente": { "nome": "string ou Não informado", "funcao": "string ou Não informada", "tempo_trabalho": "string", "situacao": "resumo em 1-2 frases" },
  "direitos": [{ "titulo": "string", "descricao": "base legal e fundamentação" }],
  "alertas": [{ "titulo": "string", "descricao": "o que precisa ser aprofundado e por quê" }],
  "dados_faltantes": [{ "titulo": "string", "descricao": "por que esse dado é necessário" }],
  "minuta": "texto da minuta com quebras de linha"
}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return new Response(
        JSON.stringify({ error: `Erro na análise IA (${claudeRes.status}): ${errText}` }),
        { status: 502, headers: corsHeaders }
      );
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.find(b => b.type === 'text')?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(clean);

    return new Response(JSON.stringify(resultado), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Erro interno do servidor' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
