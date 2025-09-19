import { storage } from './server/storage.ts';

async function checkProviderServices() {
  try {
    
    console.log('=== SERVIÇOS DO PRESTADOR ID 2 ===');
    
    // Buscar serviços do prestador
    const providerServices = await storage.getProviderServicesByProvider(2);
    console.log('Serviços encontrados:', providerServices.length);
    
    providerServices.forEach((service, index) => {
      console.log(`\n${index + 1}. Serviço ID: ${service.id}`);
      console.log(`   - Service ID (template): ${service.serviceId}`);
      console.log(`   - Nome: ${service.serviceName || 'N/A'}`);
      console.log(`   - Preço: R$ ${(service.price / 100).toFixed(2)}`);
      console.log(`   - Duração: ${service.executionTime} min`);
      console.log(`   - Ativo: ${service.isActive}`);
    });
    
    console.log('\n=== TEMPLATES DISPONÍVEIS ===');
    
    // Buscar todos os templates
    const templates = await storage.getServiceTemplates();
    const relevantTemplates = templates.filter(t => 
      t.name.toLowerCase().includes('corte') || 
      t.name.toLowerCase().includes('feminino') || 
      t.name.toLowerCase().includes('masculino')
    );
    
    console.log('Templates relacionados a corte:');
    relevantTemplates.forEach(template => {
      console.log(`- ID: ${template.id}, Nome: ${template.name}, Ativo: ${template.isActive}`);
    });
    
    console.log('\n=== ANÁLISE DE CONFLITO ===');
    
    // Verificar se há conflito
    const usedTemplateIds = providerServices.map(ps => ps.serviceId);
    console.log('IDs de templates já usados:', usedTemplateIds);
    
    relevantTemplates.forEach(template => {
      const isUsed = usedTemplateIds.includes(template.id);
      console.log(`Template ${template.id} (${template.name}): ${isUsed ? 'JÁ USADO' : 'DISPONÍVEL'}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkProviderServices();