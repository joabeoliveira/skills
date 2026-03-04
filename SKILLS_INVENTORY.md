# ��� Skills Inventory - HTML/CSS/JS Kit

## ✅ Skills Mantidas (Aplicáveis a HTML/CSS/JS Vanilla)

### Skills Centrais

| Skill | Caminho | Foco | Aplicabilidade |
|-------|---------|------|---|
| 📄 **HTML Structure** | `.skills/html-structure/` | Semântica, SEO, acessibilidade | ✅ Core |
| 🎨 **Tailwind CSS** | `.skills/tailwind-css/` | Responsive, dark mode, mobile-first | ✅ Core |
| ⚙️ **JavaScript Vanilla** | `.skills/javascript-vanilla/` | ES6+, modular, validação, performance | ✅ Core |
| 📊 **Graphics & Animations** | `.skills/graphics-animations/` | Chart.js, D3.js, SVG, CSS | ✅ Core |
| ♿ **Accessibility** | `.skills/accessibility-emag/` | WCAG AA, ARIA, navegação keyboard | ✅ Core |
| ⚡ **Performance** | `.skills/performance-optimization/` | Web Vitals, lazy load, bundles | ✅ Core |
| 🔍 **SEO Basics** | `.skills/seo-best-practices/` | Meta tags, Open Graph, structure | ✅ Core |
| 🌐 **API REST** | `.skills/arp-API/` | Integração com APIs (exemplo: Compras.gov.br) | ✅ Integração |

### Skills Opcionais

| Skill | Caminho | Foco | Aplicabilidade |
|-------|---------|------|---|
| 🤖 **n8n Integration** [NOVO] | `.skills/n8n-integration/` | Webhooks, automações via n8n | ✅ Integração (Opcional) |


**Total: 8 Skills centrais + 1 Opcional + 4 Gov-specific = 13 Skills ativas**

---

## ✅ Gov-specific Skills (relevantes para MVPs de compras públicas)

| Skill | Caminho | Foco | Aplicabilidade |
|------:|---------|------|---|
| 🛡️ **CORS & Proxy Gov** | `.skills/cors-proxy-gov/` | Estratégias para CORS, proxies e deploy em redes gov | ✅ Deploy & Infra |
| 🚀 **Deploy Gov MVP** | `.skills/deploy-gov-mvp/` | GitHub Pages, Netlify, Coolify/Easypanel e checklist de release | ✅ Publicação |
| 📥 **Export Gov MVP** | `.skills/export-gov-mvp/` | CSV/XLSX/DOCX/PDF client-side para evidências e relatórios | ✅ Relatórios |
| 🧭 **UX/UI Gov** | `.skills/ux-ui-gov/` | Formatação PT-BR, tabelas, badges, filtros e padrões de UX gov | ✅ Frontend |

---

## ❌ Skills Removidas (Não aplicáveis)

| Skill | Motivo |
|-------|--------|
| `ai-and-prompt-engineering/` | Genérica, fora do escopo |
| `design-system/` | Era Shadcn/React, abandono framework |
| ~~`n8n-integration/`~~ | **→ Readaptada como skill opcional** (apenas webhooks simples) |
| `nextjs-architecture/` | Framework-específico |
| `public-admin-rules/` | Gov-tech, não Web puro |
| `starter-nextjs/` | Next.js boilerplate, não vanilla |
| `testing-and-debugging/` | Genérica, fora do escopo |
| `security-and-lgpd/` | Gov-tech LGPD, contexto específico |

---

## ��� Estrutura Limpa

```
.skills/
├── accessibility-emag/        # WCAG AA, ARIA, keyboard
├── arp-API/                   # Exemplo de integração API
├── graphics-animations/       # Gráficos e animações web
├── html-structure/            # Semântica HTML5
├── javascript-vanilla/        # ES6+ vanilla JS
├── n8n-integration/           # [OPCIONAL] Automações e webhooks
├── performance-optimization/  # Web Vitals, otimizações
├── seo-best-practices/        # SEO, meta tags
├── tailwind-css/              # Tailwind utilities
├── cors-proxy-gov/            # Soluções CORS & proxy para ambientes gov
├── deploy-gov-mvp/            # Procedimentos de deploy para MVP gov
├── export-gov-mvp/            # Exportação CSV/XLSX/DOCX/PDF client-side
└── ux-ui-gov/                 # Padrões UX/UI para compras públicas
```

---

## ��� Uso em Projetos

Todas as 8 skills podem ser instaladas em **qualquer projeto** usando:

```bash
# Copiar para novo projeto
cp .cursorrules seu-projeto/
cp -r .skills seu-projeto/
cp .claude.md seu-projeto/
mkdir -p seu-projeto/.github
cp .github/copilot-instructions.md seu-projeto/.github/
```

---

## ✨ Última Atualização

**Data**: 23 de fevereiro de 2026  
**Status**: ✅ Estrutura otimizada e portável

