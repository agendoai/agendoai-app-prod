import { storage } from './server/storage.js';

async function fixTemplateCategories() {
    console.log('🔧 Iniciando correção das categorias dos templates...\n');
    
    // Categoria correta para serviços de cabelo/barba
    const CABELOS_CATEGORY_ID = 1;
    
    // Templates que precisam ter a categoria corrigida
    const templatestoFix = [
        { id: 7, name: "Corte Masculino", currentCategory: "Manutenção de Computadores" },
        { id: 8, name: "Barba", currentCategory: "Manutenção de Computadores" },
        { id: 9, name: "Corte Feminino", currentCategory: "Desenvolvimento Web" }
    ];
    
    console.log('Templates que serão corrigidos:');
    templatestoFix.forEach(template => {
        console.log(`  - ID ${template.id}: "${template.name}" (${template.currentCategory} → Cabelos)`);
    });
    
    console.log('\n🔄 Aplicando correções...\n');
    
    for (const template of templatestoFix) {
        try {
            console.log(`Corrigindo template ID ${template.id} (${template.name})...`);
            
            // Atualizar a categoria do template
            await storage.updateServiceTemplate(template.id, {
                categoryId: CABELOS_CATEGORY_ID
            });
            
            console.log(`✅ Template ID ${template.id} atualizado com sucesso!`);
            
        } catch (error) {
            console.error(`❌ Erro ao corrigir template ID ${template.id}:`, error.message);
        }
    }
    
    console.log('\n📋 Verificando resultados...');
    
    // Verificar se as correções foram aplicadas
    const updatedTemplates = await storage.getServiceTemplates();
    const fixedTemplates = updatedTemplates.filter(t => 
        templatestoFix.some(fix => fix.id === t.id)
    );
    
    console.log('\nTemplates após correção:');
    for (const template of fixedTemplates) {
        const categories = await storage.getCategories();
        const category = categories.find(c => c.id === template.categoryId);
        console.log(`  - ID ${template.id}: "${template.name}" → Categoria: "${category?.name}" (ID ${template.categoryId})`);
    }
    
    console.log('\n✅ Correção das categorias concluída!');
}

fixTemplateCategories().catch(console.error);