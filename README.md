# Analisador Jurídico Trabalhista

Ferramenta de análise automática de direitos trabalhistas integrada ao Octadesk.

## Como publicar no Vercel (5 minutos)

### Passo 1 — Criar conta no GitHub
1. Acesse github.com e crie uma conta gratuita
2. Clique em "New repository"
3. Nome: `analisador-juridico`
4. Clique em "Create repository"

### Passo 2 — Enviar os arquivos
Faça upload das 3 pastas/arquivos:
- pasta `api/` com o arquivo `analisar.js`
- pasta `public/` com o arquivo `index.html`
- arquivo `vercel.json`

### Passo 3 — Publicar no Vercel
1. Acesse vercel.com e crie conta gratuita (pode entrar com o GitHub)
2. Clique em "Add New Project"
3. Selecione o repositório `analisador-juridico`
4. Clique em "Deploy"

### Passo 4 — Configurar as variáveis de ambiente
No painel do Vercel, vá em Settings → Environment Variables e adicione:

| Nome | Valor |
|------|-------|
| `OCTADESK_API_KEY` | sua chave API do Octadesk |
| `ANTHROPIC_API_KEY` | sua chave API da Anthropic |
| `OCTADESK_SUBDOMAIN` | `app` |

### Passo 5 — Pronto!
Acesse o link gerado pelo Vercel e a ferramenta estará funcionando.
