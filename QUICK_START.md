# 🚀 Quick Start - 5 Minutos

Comece com o HTML/CSS/JS Skills Kit em 5 minutos!

---

## 1️⃣ Copiar arquivos essenciais

```bash
# Para seu novo projeto, copie:
cp .cursorrules seu-projeto/
cp .claude.md seu-projeto/
cp -r .skills seu-projeto/
mkdir -p seu-projeto/.github
cp .github/copilot-instructions.md seu-projeto/.github/
```

---

## 2️⃣ Criar HTML inicial

Use o exemplo em `.skills/html-structure/example.html` como template:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Projeto</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white dark:bg-gray-900">
    <header>
        <nav ara-label="Principal">...</nav>
    </header>
    
    <main id="main">
        <h1>Olá, Mundo!</h1>
    </main>
    
    <script src="js/main.js" defer></script>
</body>
</html>
```

---

## 3️⃣ Adicionar JavaScript

Veja o exemplo em `.skills/javascript-vanilla/example.js`:

```javascript
// Módulo Dark Mode
const DarkMode = (() => {
  const toggle = () => {
    document.documentElement.classList.toggle('dark');
  };
  return { toggle };
})();

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('App inicializada!');
});
```

---

## 4️⃣ Usar em seu Editor

### GitHub Copilot
```
Copie: .github/copilot-instructions.md para .github/
Resultado: Copilot seguirá as regras automaticamente
```

### Cursor
```
Copie: .cursorrules para a raiz do projeto
Resultado: Cursor aplica as regras autocamento
Atalho: Ctrl+Shift+L (Windows) / Cmd+Shift+L (Mac)
```

### Claude Code
```
Copie: .claude.md para a raiz do projeto
Resultado: Claude Code lerá as instruções
Peça: "Create a responsive navbar"
```

### Antigravity / Lovable
```
Copie: .cursorrules para a raiz do projeto
Use prompts em português
```

---

## 5️⃣ Deploy

### HTML estático
```bash
# Netlify, Vercel, ou GitHub Pages
git push
# Deploy automático
```

### Com build process
```bash
# Build Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss -i ./css/input.css -o ./css/style.css

# Minificar JavaScript
npm install -D terser
npx terser js/main.js -o js/main.min.js
```

---

## 📚 Recursos Rápidos

| Precisa de | Vá para |
|-----------|---------|
| HTML semântica | `.skills/html-structure/SKILL.md` |
| Classes Tailwind | `.skills/tailwind-css/SKILL.md` |
| JavaScript puro | `.skills/javascript-vanilla/SKILL.md` |
| Gráficos | `.skills/graphics-animations/SKILL.md` |
| Acessibilidade | `.skills/accessibility-emag/SKILL.md` |
| Performance | `.skills/performance-optimization/SKILL.md` |

---

## ✅ Checklist Mínimo

- [ ] HTML com tags semânticas (`<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] Meta viewport: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- [ ] Tailwind CSS configurado
- [ ] Dark mode testado (adicione `class="dark"` ao `<html>`)
- [ ] Navegação por teclado funcional (Tab, Enter, Esc)
- [ ] Alt text em imagens
- [ ] Focus visível em botões/links

---

## 💡 Dicas Importantes

1. **Mobile-first sempre**: `responsive md:` `lg:` no Tailwind
2. **Validação obrigatória**: Sempre valide entrada de usuário
3. **Acessibilidade não é opcional**: Teste com teclado e leitor de tela
4. **Dark mode grátis**: Tailwind + `class="dark"` = 80% do trabalho
5. **Performance importa**: Lazy load imagens, defer scripts

---

## 🎯 Próximas Etapas

1. Leia o README.md completo
2. Explore cada skill em `.skills/`
3. Use exemplos como referência
4. Peça help ao seu editor: "Implement according to skills"

---

**Boa sorte! 🚀**

Dúvidas? Abra uma issue no GitHub ou consulte os recursos em cada SKILL.md.
