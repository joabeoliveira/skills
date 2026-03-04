#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceDir = __dirname;
const targetDir = process.cwd();

const filesToCopy = [
  '.cursorrules',
  '.claude.md',
  '.skills'
];

console.log('\n🚀 Iniciando a instalação do HTML/CSS/JS Skills Kit...\n');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  filesToCopy.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);

    if (fs.existsSync(srcPath)) {
      console.log(`📦 Copiando ${file}...`);
      copyRecursiveSync(srcPath, destPath);
    }
  });

  // Copiar GitHub Copilot instructions
  const copilotSrc = path.join(sourceDir, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotSrc)) {
    const copilotDest = path.join(targetDir, '.github', 'copilot-instructions.md');
    if (!fs.existsSync(path.dirname(copilotDest))) {
      fs.mkdirSync(path.dirname(copilotDest), { recursive: true });
    }
    console.log(`📦 Copiando .github/copilot-instructions.md...`);
    copyRecursiveSync(copilotSrc, copilotDest);
  }

  console.log('\n✅ HTML/CSS/JS Skills Kit instalado com sucesso!\n');
  console.log('💡 Próximos passos:\n');
  console.log('   1. Abra o arquivo .cursorrules para ver as instruções globais.');
  console.log('   2. Copie .cursorrules para cada novo projeto.');
  console.log('   3. Explore a pasta .skills/ para entender as habilidades incluídas.');
  console.log('   4. Use em seu editor favorito (Cursor, Copilot, Claude Code, etc).\n');
  console.log('📚 Leia o README.md para instrução completa.\n');

} catch (err) {
  console.error('\n❌ Erro durante a instalação:', err.message);
  process.exit(1);
}
