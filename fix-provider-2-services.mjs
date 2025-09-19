import { storage } from './server/storage.ts';

async function fixProvider2Services() {
  try {
    console.log('=== CORRIGINDO SERVIÇOS DO PRESTADOR ID 2 ===\n');
    
    // 1. Mostrar estado atual
    console.log('1️⃣ Estado atual dos serviços:');
    const currentServices = await storage.getProviderServicesByProvider(2);
    currentServices.forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.id} | Template: ${service.serviceId} | Preço: R$ ${(service.price / 100).toFixed(2)} | Duração: ${service.executionTime}min`);
    });
    
    // 2. Identificar serviços incorretos (template ID 2 - Corte Feminino)
    const incorrectServices = currentServices.filter(s => s.serviceId === 2);
    console.log(`\n2️⃣ Serviços incorretos encontrados (template Corte Feminino): ${incorrectServices.length}`);
    incorrectServices.forEach(service => {
      console.log(`- Serviço ID ${service.id} (Template ${service.serviceId}) - será removido`);
    });
    
    // 3. Remover serviços incorretos
    console.log('\n3️⃣ Removendo serviços incorretos...');
    for (const service of incorrectServices) {
      try {
        await storage.deleteProviderService(service.id);
        console.log(`✅ Removido serviço ID ${service.id}`);
      } catch (error) {
        console.error(`❌ Erro ao remover serviço ID ${service.id}:`, error.message);
      }
    }
    
    // 4. Verificar estado final
    console.log('\n4️⃣ Estado final dos serviços:');
    const finalServices = await storage.getProviderServicesByProvider(2);
    if (finalServices.length === 0) {
      console.log('Nenhum serviço encontrado.');
    } else {
      finalServices.forEach((service, index) => {
        console.log(`${index + 1}. ID: ${service.id} | Template: ${service.serviceId} | Preço: R$ ${(service.price / 100).toFixed(2)} | Duração: ${service.executionTime}min`);
      });
    }
    
    // 5. Verificar templates disponíveis
    console.log('\n5️⃣ Templates agora disponíveis para o prestador:');
    const templates = await storage.getServiceTemplates();
    const corteTemplates = templates.filter(t => 
      t.name.toLowerCase().includes('corte') && 
      (t.name.toLowerCase().includes('feminino') || t.name.toLowerCase().includes('masculino'))
    );
    
    const usedTemplateIds = finalServices.map(s => s.serviceId);
    corteTemplates.forEach(template => {
      const isUsed = usedTemplateIds.includes(template.id);
      console.log(`- Template ${template.id} (${template.name}): ${isUsed ? '❌ JÁ USADO' : '✅ DISPONÍVEL'}`);
    });
    
    console.log('\n🎉 Correção concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixProvider2Services();