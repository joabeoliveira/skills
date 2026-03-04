# `.agents/skills` — Atalho para `.skills`

Esta pasta está intencionalmente reservada para *agents* que procuram skills em `.agents/skills`.

No momento, a fonte canonical das skills deste repositório está em `.skills/`.

Opções recomendadas:

- Manter as skills em `.skills/` (sem alterações) — recomendado quando não houver um agent
  que exija o caminho `.agents/skills`.
- Se você precisar compatibilidade imediata com ferramentas que procuram `.agents/skills`, copie
  os arquivos necessários ou crie um link simbólico do conteúdo de `.skills/` para cá.

Exemplos:

```bash
# copiar tudo (Unix/Windows WSL)
cp -r .skills/* .agents/skills/

# criar junction (Windows cmd.exe - admin)
mklink /J .agents\skills .skills
```

Observação: atualizar `README.md` e `SKILLS_INVENTORY.md` se decidir mover permanentemente.
