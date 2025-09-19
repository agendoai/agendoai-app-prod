import { storage } from './server/storage.ts';

async function analyzeTemplateProblems() {
  try {
    console.log('=== ANÁLISE COMPLETA DOS PROBLEMAS DOS TEMPLATES ===\n');
    
    // 1. Buscar todos os templates
    console.log('1️⃣ Buscando todos os templates...');
    const allTemplates = await storage.getServiceTemplates();
    console.log(`Total de templates encontrados: ${allTemplates.length}\n`);
    
    // 2. Agrupar por nome para identificar duplicatas
    console.log('2️⃣ Identificando templates duplicados:');
    const templatesByName = {};
    allTemplates.forEach(template => {
      const name = template.name.toLowerCase().trim();
      if (!templatesByName[name]) {
        templatesByName[name] = [];
      }
      templatesByName[name].push(template);
    });
    
    const duplicates = Object.entries(templatesByName).filter(([name, templates]) => templates.length > 1);
    console.log(`Nomes duplicados encontrados: ${duplicates.length}`);
    
    duplicates.forEach(([name, templates]) => {
      console.log(`\n📋 "${name}" (${templates.length} templates):`);
      templates.forEach(t => {
        console.log(`  - ID: ${t.id} | Categoria: ${t.category} | Nicho: ${t.niche} | Duração: ${t.executionTime}min`);
      });
    });
    
    // 3. Buscar categorias para análise
    console.log('\n3️⃣ Buscando categorias para análise...');
    const categories = await storage.getCategories();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat.name;
    });
    
    console.log('Categorias disponíveis:');
    categories.forEach(cat => {
      console.log(`  - ID ${cat.id}: ${cat.name}`);
    });
    
    // Identificar templates com categorias incorretas
    const hairServices = allTemplates.filter(t => 
      t.name.toLowerCase().includes('corte') || 
      t.name.toLowerCase().includes('cabelo') ||
      t.name.toLowerCase().includes('barba')
    );
    
    console.log(`\nServiços de cabelo/barba encontrados: ${hairServices.length}`);
    hairServices.forEach(t => {
      const categoryName = categoryMap[t.categoryId] || 'Categoria não encontrada';
      console.log(`  - "${t.name}" (ID ${t.id}) → Categoria: "${categoryName}" (ID ${t.categoryId})`);
    });
    
    // 4. Buscar todos os serviços de prestadores
    console.log('\n4️⃣ Verificando uso dos templates pelos prestadores...');
    const allProviders = await storage.getUsersByType("provider");
    const usedTemplateIds = new Set();
    
    for (const provider of allProviders) {
      try {
        const services = await storage.getProviderServicesByProvider(provider.id);
        services.forEach(service => {
          usedTemplateIds.add(service.serviceId);
        });
      } catch (error) {
        // Ignorar erros de prestadores sem serviços
      }
    }
    
    console.log(`Templates em uso: ${usedTemplateIds.size}`);
    console.log('IDs dos templates em uso:', Array.from(usedTemplateIds).sort((a, b) => a - b));
    
    // 5. Identificar templates órfãos (não usados)
    const orphanTemplates = allTemplates.filter(t => !usedTemplateIds.has(t.id));
    console.log(`\nTemplates não utilizados: ${orphanTemplates.length}`);
    
    // 5. Sugestões de limpeza
    console.log('\n5️⃣ SUGESTÕES DE LIMPEZA:');
    
    console.log('\n🔄 Templates duplicados para consolidar:');
    duplicates.forEach(([name, templates]) => {
      const inUse = templates.filter(t => usedTemplateIds.has(t.id));
      const notInUse = templates.filter(t => !usedTemplateIds.has(t.id));
      
      console.log(`\n"${name}":`);
      if (inUse.length > 0) {
        console.log(`  ✅ Manter: ID ${inUse[0].id} (em uso)`);
        if (inUse.length > 1) {
          console.log(`  ⚠️  Migrar serviços dos IDs: ${inUse.slice(1).map(t => t.id).join(', ')}`);
        }
      } else {
        console.log(`  ✅ Manter: ID ${templates[0].id} (melhor categoria/descrição)`);
      }
      
      if (notInUse.length > 0) {
        console.log(`  🗑️  Remover: IDs ${notInUse.map(t => t.id).join(', ')} (não utilizados)`);
      }
    });
    
    console.log('\n🏷️  Correções de categoria necessárias:');
    hairServices.forEach(t => {
      const categoryName = categoryMap[t.categoryId] || 'Categoria não encontrada';
      if (!categoryName.toLowerCase().includes('cabelo') && 
          !categoryName.toLowerCase().includes('barbearia') &&
          !categoryName.toLowerCase().includes('beleza')) {
        console.log(`  - ID ${t.id} "${t.name}": "${categoryName}" → "Cabelos"`);
      }
    });
    
    console.log('\n📊 RESUMO:');
    console.log(`- Total de templates: ${allTemplates.length}`);
    console.log(`- Templates duplicados: ${duplicates.length} nomes com múltiplas versões`);
    const incorrectCategoriesCount = hairServices.filter(t => {
      const categoryName = categoryMap[t.categoryId] || '';
      return !categoryName.toLowerCase().includes('cabelo') && 
             !categoryName.toLowerCase().includes('barbearia') &&
             !categoryName.toLowerCase().includes('beleza');
    }).length;
    console.log(`- Categorias incorretas: ${incorrectCategoriesCount}`);
    console.log(`- Templates em uso: ${usedTemplateIds.size}`);
    console.log(`- Templates órfãos: ${orphanTemplates.length}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

analyzeTemplateProblems();