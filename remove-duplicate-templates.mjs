import { storage } from './server/storage.js';

async function removeDuplicateTemplates() {
    console.log('🗑️  Iniciando remoção de templates duplicados e não utilizados...\n');
    
    // Templates que devem ser removidos baseado na análise anterior
    const templatesToRemove = [
        { id: 2, name: "Corte Feminino", reason: "Duplicado - não utilizado (manter ID 9)" },
        { id: 7, name: "Corte Masculino", reason: "Duplicado - serviços já migrados para ID 1" }
    ];
    
    console.log('Templates que serão removidos:');
    templatesToRemove.forEach(template => {
        console.log(`  - ID ${template.id}: "${template.name}" (${template.reason})`);
    });
    
    // 1. Verificar novamente se os templates não estão sendo usados
    console.log('\n🔍 Verificação final de uso dos templates...');
    
    const allProviders = await storage.getUsersByType("provider");
    const usedTemplateIds = new Set();
    
    for (const provider of allProviders) {
        const providerServices = await storage.getProviderServicesByProvider(provider.id);
        providerServices.forEach(service => {
            usedTemplateIds.add(service.templateId);
        });
    }
    
    console.log(`Templates em uso: [${Array.from(usedTemplateIds).sort().join(', ')}]`);
    
    // 2. Verificar se é seguro remover cada template
    const safeToRemove = [];
    const notSafeToRemove = [];
    
    for (const template of templatesToRemove) {
        if (usedTemplateIds.has(template.id)) {
            notSafeToRemove.push(template);
            console.log(`⚠️  Template ID ${template.id} ainda está em uso - NÃO será removido`);
        } else {
            safeToRemove.push(template);
            console.log(`✅ Template ID ${template.id} não está em uso - pode ser removido`);
        }
    }
    
    if (notSafeToRemove.length > 0) {
        console.log(`\n❌ ATENÇÃO: ${notSafeToRemove.length} templates ainda estão em uso e não serão removidos.`);
        return;
    }
    
    // 3. Remover os templates seguros
    console.log(`\n🗑️  Removendo ${safeToRemove.length} templates...`);
    
    for (const template of safeToRemove) {
        try {
            console.log(`Removendo template ID ${template.id} (${template.name})...`);
            
            await storage.deleteServiceTemplate(template.id);
            
            console.log(`✅ Template ID ${template.id} removido com sucesso!`);
            
        } catch (error) {
            console.error(`❌ Erro ao remover template ID ${template.id}:`, error.message);
        }
    }
    
    // 4. Verificar resultado final
    console.log('\n📋 Verificando templates restantes...');
    
    const remainingTemplates = await storage.getServiceTemplates();
    const hairTemplates = remainingTemplates.filter(t => 
        t.name.toLowerCase().includes('corte') || 
        t.name.toLowerCase().includes('barba')
    );
    
    console.log('\nTemplates de cabelo/barba restantes:');
    for (const template of hairTemplates) {
        const categories = await storage.getCategories();
        const category = categories.find(c => c.id === template.categoryId);
        const isUsed = usedTemplateIds.has(template.id) ? '(EM USO)' : '(DISPONÍVEL)';
        console.log(`  - ID ${template.id}: "${template.name}" - ${category?.name} ${isUsed}`);
    }
    
    console.log('\n✅ Limpeza de templates duplicados concluída!');
    console.log(`📊 Total de templates removidos: ${safeToRemove.length}`);
}

removeDuplicateTemplates().catch(console.error);