import { storage } from './server/storage.js';

async function migrateTemplateServices() {
    console.log('🔄 Iniciando migração de serviços entre templates duplicados...\n');
    
    // Template duplicado que será removido (ID 7) e o template correto (ID 1)
    const FROM_TEMPLATE_ID = 7; // "Corte Masculino" incorreto
    const TO_TEMPLATE_ID = 1;   // "Corte Masculino" correto
    
    console.log(`Migrando serviços do template ID ${FROM_TEMPLATE_ID} para o template ID ${TO_TEMPLATE_ID}...\n`);
    
    // 1. Buscar todos os prestadores
    const allProviders = await storage.getUsersByType("provider");
    console.log(`📋 Encontrados ${allProviders.length} prestadores para verificar`);
    
    let servicesFound = 0;
    let servicesMigrated = 0;
    
    // 2. Para cada prestador, verificar se tem serviços usando o template ID 7
    for (const provider of allProviders) {
        try {
            const providerServices = await storage.getProviderServicesByProvider(provider.id);
            
            // Filtrar serviços que usam o template ID 7
            const servicesToMigrate = providerServices.filter(service => 
                service.templateId === FROM_TEMPLATE_ID
            );
            
            if (servicesToMigrate.length > 0) {
                console.log(`\n👤 Prestador: ${provider.name} (ID: ${provider.id})`);
                console.log(`   Serviços encontrados usando template ID ${FROM_TEMPLATE_ID}: ${servicesToMigrate.length}`);
                
                servicesFound += servicesToMigrate.length;
                
                // Migrar cada serviço
                for (const service of servicesToMigrate) {
                    console.log(`   🔄 Migrando serviço ID ${service.id}: "${service.name}"`);
                    
                    // Atualizar o templateId do serviço
                    await storage.updateProviderService(service.id, {
                        templateId: TO_TEMPLATE_ID
                    });
                    
                    servicesMigrated++;
                    console.log(`   ✅ Serviço migrado com sucesso!`);
                }
            }
        } catch (error) {
            console.error(`❌ Erro ao processar prestador ${provider.id}:`, error.message);
        }
    }
    
    console.log(`\n📊 RESUMO DA MIGRAÇÃO:`);
    console.log(`   - Serviços encontrados: ${servicesFound}`);
    console.log(`   - Serviços migrados: ${servicesMigrated}`);
    
    // 3. Verificar se a migração foi bem-sucedida
    console.log(`\n🔍 Verificando se ainda existem serviços usando o template ID ${FROM_TEMPLATE_ID}...`);
    
    let remainingServices = 0;
    for (const provider of allProviders) {
        const providerServices = await storage.getProviderServicesByProvider(provider.id);
        const remaining = providerServices.filter(service => service.templateId === FROM_TEMPLATE_ID);
        remainingServices += remaining.length;
    }
    
    if (remainingServices === 0) {
        console.log(`✅ Migração concluída! Nenhum serviço restante usando o template ID ${FROM_TEMPLATE_ID}`);
        console.log(`\n🗑️  O template ID ${FROM_TEMPLATE_ID} agora pode ser removido com segurança.`);
    } else {
        console.log(`⚠️  Ainda existem ${remainingServices} serviços usando o template ID ${FROM_TEMPLATE_ID}`);
    }
}

migrateTemplateServices().catch(console.error);