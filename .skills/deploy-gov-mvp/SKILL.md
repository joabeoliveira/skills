---
name: Deploy Gov MVP
description: >
  Guia completo de deploy para MVPs gov em HTML/JS Vanilla: execução local sem servidor,
  GitHub Pages (estático), Netlify (estático com formulários), e VPS com Coolify ou Easypanel
  (para MVPs que precisam de proxy Node.js ou backend leve). Use esta skill SEMPRE que o usuário
  precisar publicar, hospedar ou distribuir um MVP — mesmo que diga apenas "colocar no ar",
  "compartilhar o link" ou "instalar no servidor". Inclui checklist pré-deploy, configuração de
  variáveis de ambiente sem backend, e CI/CD mínimo via GitHub Actions.
---

# Skill: Deploy Gov MVP

## Decisão de Deploy (escolha por restrição)

```
Precisa de backend/proxy? ─── Não ──→ GitHub Pages ou Netlify (grátis, zero infra)
        │ Sim
        ▼
Tem VPS/Coolify/Easypanel? ─── Sim ──→ Deploy containerizado (Nível 3)
        │ Não
        ▼
Usar Render.com free tier ──→ Node.js grátis com 512MB RAM
```

---

## Nível 0 — Execução Local (arquivo `file://`)

Máxima simplicidade: zero servidor, zero deploy, abre no Chrome.

... (conteúdo completo da skill segue — ver SKILL.md original)

---

## Checklist Pré-Deploy

```markdown
### Frontend
- [ ] Remover `console.log` de debug
- [ ] Verificar se `API_BASE` está correto para o ambiente
- [ ] Testar fluxo completo (busca → tabela → detalhes → exportar CSV)
- [ ] Verificar formatação: R$, datas DD/MM/YYYY, CNPJ
- [ ] Testar em resolução 1024x768 (monitores gov antigos)
- [ ] Testar no Edge (modo padrão e compatibilidade)
- [ ] Verificar se exportação CSV abre corretamente no Excel

### Performance
- [ ] Imagens comprimidas (se houver)
- [ ] JS/CSS minificados (opcional para MVP)
- [ ] Primeira carga < 3s em 4G

### Segurança
- [ ] Nenhum token/senha hardcoded no HTML/JS
- [ ] CSP básico se necessário
- [ ] HTTPS ativo (obrigatório — gov.br exige)
```

---

## Distribuição para Servidores sem Internet

```bash
# Gerar pacote offline
zip -r mvp-offline-v1.0.zip . \
  --exclude "*.git*" \
  --exclude "node_modules/*" \
  --exclude ".env"

# Servidor abre index.html com Chrome/Edge diretamente
# Ou instala via: npx serve . (se tiver Node)
```

---

## Constraints

- **HTTPS obrigatório**: APIs gov.br frequentemente rejeitam origens `http://` por política HSTS.
- **`.env` nunca no repositório**: Usar `.gitignore` + GitHub Secrets ou Coolify Env Vars.
- **GitHub Pages**: Não suporta execução de código server-side — apenas arquivos estáticos.
- **Netlify Redirects**: A regra de proxy (`[[redirects]]`) só funciona com `status = 200` e `force = true`.
- **Coolify/Easypanel**: Requerem que o repositório seja acessível (GitHub/GitLab). Suportam deploys automáticos via webhook.
