import fs from 'fs';
import path from 'path';

// Função para processar um arquivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Padrões para substituir fetch por apiCall
    const patterns = [
      // fetch(`/api/...`) -> apiCall(`/...`)
      {
        regex: /fetch\(`\/api\/([^`]+)`/g,
        replacement: 'apiCall(`/$1`'
      },
      // fetch(`/api/...`, { -> apiCall(`/...`, {
      {
        regex: /fetch\(`\/api\/([^`]+)`,/g,
        replacement: 'apiCall(`/$1`,'
      }
    ];

    // Aplicar substituições
    patterns.forEach(pattern => {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // Adicionar import da apiCall se não existir
    if (modified && !content.includes("import { apiCall }")) {
      // Encontrar a linha após os imports do React
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import') && (lines[i].includes('react') || lines[i].includes('@/components') || lines[i].includes('@/hooks'))) {
          insertIndex = i + 1;
        }
      }
      
      // Inserir o import da apiCall
      lines.splice(insertIndex, 0, "import { apiCall } from '@/lib/api';");
      content = lines.join('\n');
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para processar diretório recursivamente
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalModified = 0;

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalModified += processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (processFile(filePath)) {
        totalModified++;
      }
    }
  });

  return totalModified;
}

// Processar arquivos do cliente
console.log('🔧 Corrigindo requisições fetch para apiCall...');
const clientDir = './client/src';
const modifiedCount = processDirectory(clientDir);

console.log(`\n✅ Concluído! ${modifiedCount} arquivos foram modificados.`);
console.log('🔄 Agora você pode testar as rotas que estavam retornando 401.');
