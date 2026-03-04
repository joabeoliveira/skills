---
name: CORS & Proxy Gov
description: >
  Resolução de problemas de CORS e bloqueios de rede em ambientes de órgãos públicos para MVPs
  que consomem APIs externas (Compras.gov.br, PNCP, ViaCEP, BrasilAPI etc.) via HTML/JS Vanilla.
  Use esta skill SEMPRE que o MVP precisar chamar uma API externa a partir do browser, especialmente
  quando o ambiente de deploy é rede corporativa gov, GitHub Pages, Netlify ou arquivo local (file://).
  Inclui estratégias escalonadas: sem proxy, proxy público, proxy próprio no Coolify/Easypanel.
---

# Skill: CORS & Proxy para Ambientes Gov

## Contexto do Problema

Redes de órgãos públicos frequentemente bloqueiam:
- Requisições `fetch()` diretas a domínios externos (CORS + firewall)
- WebSockets, SSE
- Domínios não-whitelisted pelo proxy corporativo (Squid, BlueCoat etc.)

**Regra de ouro**: sempre testar primeiro sem proxy. A API `dadosabertos.compras.gov.br` é pública e frequentemente permite CORS direto do browser.

---

## Estratégia Escalonada (escolha da menos para a mais complexa)

### Nível 0 — Sem Proxy (testar primeiro)

```javascript
// Testar se a API já permite CORS direto
async function testDirectAccess() {
  try {
    const res = await fetch(
      'https://dadosabertos.compras.gov.br/modulo-arp/1.2_consultarARP_FimVigencia' +
      '?pagina=1&tamanhoPagina=1&dataVigenciaFinalMin=2025-01-01&dataVigenciaFinalMax=2026-12-31',
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    );
    if (res.ok) console.log('✅ CORS direto funciona');
  } catch (e) {
    console.warn('❌ CORS bloqueado — usar proxy', e.message);
  }
}
```

**Se funcionar**: não use proxy. Menos infraestrutura = menos falha.

---

### Nível 1 — Proxy Público (sem servidor próprio)

> ⚠️ Use apenas para desenvolvimento/protótipos. Nunca para dados sensíveis.

```javascript
// Opções de proxy público (testar disponibilidade — podem cair)
const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function fetchWithFallback(apiUrl) {
  // Tenta direto primeiro
  try {
    const res = await fetch(apiUrl);
    if (res.ok) return res.json();
  } catch (_) {}

  // Fallback para proxies públicos em ordem
  for (const proxyFn of PROXIES) {
    try {
      const res = await fetch(proxyFn(apiUrl), { signal: AbortSignal.timeout(8000) });
      if (res.ok) return res.json();
    } catch (_) {}
  }
  throw new Error('Todos os proxies falharam');
}
```

---

### Nível 2 — Proxy Próprio Leve (Node.js — Coolify/Easypanel)

Deploy de um micro-proxy em ~30 linhas. Resolve CORS + cache + rate-limit.

**`proxy-server.js`** (Node.js nativo, zero dependências externas além de `node-fetch`):

```javascript
// proxy-server.js — Node 18+ (fetch nativo)
import http from 'http';
import { URL } from 'url';

const ALLOWED_ORIGINS = [
  'http://localhost',
  'https://seu-dominio.gov.br',
  'https://seu-app.netlify.app',
  'null', // file:// abre com origin "null"
];

const TARGET_BASE = 'https://dadosabertos.compras.gov.br';

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'GET') { res.writeHead(405); res.end('Method Not Allowed'); return; }

  const path = req.url; // ex: /modulo-arp/1.2_consultarARP_FimVigencia?...
  const targetUrl = `${TARGET_BASE}${path}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    const data = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(data);
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'Upstream indisponível', detalhe: e.message }));
  }
});

server.listen(3000, () => console.log('🚀 Proxy rodando na porta 3000'));
```

**`Dockerfile`** para Coolify/Easypanel:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY proxy-server.js .
EXPOSE 3000
CMD ["node", "proxy-server.js"]
```

**No frontend**, troque a base URL:

```javascript
// config.js — controla qual base usar
const IS_PROXY = window.location.hostname !== 'localhost';
const API_BASE = IS_PROXY
  ? 'https://proxy.seu-dominio.com'          // Coolify/Easypanel
  : 'https://dadosabertos.compras.gov.br';   // direto

export { API_BASE };
```

---

### Nível 3 — Nginx Reverse Proxy (se já tem VPS com Nginx)

Adicionar ao bloco do site no Nginx:

```nginx
location /api-compras/ {
    proxy_pass https://dadosabertos.compras.gov.br/;
    proxy_ssl_server_name on;
    proxy_set_header Host dadosabertos.compras.gov.br;
    proxy_set_header Accept "application/json";
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;
    proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=5m;
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
}
```

Frontend usa `/api-compras/modulo-arp/...` em vez da URL completa.

---

## Detecção Automática de Ambiente

```javascript
// utils/env.js — detecta onde o app está rodando
export function detectEnv() {
  const host = window.location.hostname;
  if (host === '' || host === 'localhost' || host === '127.0.0.1') return 'local';
  if (host.endsWith('.github.io') || host.endsWith('.netlify.app')) return 'static';
  return 'vps';
}

export function getApiBase() {
  const env = detectEnv();
  // Sobrescreve via meta tag se definido no HTML
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta) return meta.content;

  const bases = {
    local:  'https://dadosabertos.compras.gov.br', // direto, sem CORS em dev
    static: window.PROXY_URL || 'https://corsproxy.io/?https://dadosabertos.compras.gov.br',
    vps:    '/api-compras', // Nginx reverse proxy no mesmo domínio
  };
  return bases[env];
}
```

No `index.html`, configurável sem recompilar:

```html
<!-- Sobrescreve API base sem mudar código -->
<meta name="api-base" content="https://meu-proxy.coolify.io">
```

---

## Constraints

- **CRITICAL**: Nunca use proxy público (`corsproxy.io` etc.) em produção com dados de órgãos.
- **file:// origin**: Browser envia `origin: null` — o proxy Node.js deve aceitar `"null"` explicitamente na lista de origens.
- **Cache no proxy**: Adicionar cache de 5 minutos no Nível 2 evita hammering na API gov e melhora performance em rede lenta.
- **Timeout**: Sempre usar `AbortSignal.timeout(N)` — APIs gov podem ser lentas (10-15s aceitável).
- **HTTP vs HTTPS**: APIs gov podem ter certificados SSL com problemas em proxies — testar com `NODE_TLS_REJECT_UNAUTHORIZED=0` apenas em dev.
