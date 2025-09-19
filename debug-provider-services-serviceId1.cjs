const { storage } = require('./server/storage.ts');

async function checkProviderServices() {
  try {
    console.log('=== Verificando provider_services para serviceId=1 ===');
    
    // Buscar todos os provider_services
    const allProviderServices = await storage.getAllProviderServices();
    console.log('Total de provider_services:', allProviderServices.length);
    
    // Filtrar por serviceId=1
    const serviceId1 = allProviderServices.filter(ps => ps.serviceId === 1);
    console.log('Provider_services com serviceId=1:', serviceId1.length);
    serviceId1.forEach(ps => {
      console.log(`- Provider ${ps.providerId} oferece serviceId ${ps.serviceId} (price: ${ps.price})`);
    });
    
    // Verificar se existem prestadores ativos
    const providers = await storage.getAllProviders();
    const activeProviders = providers.filter(p => p.isActive);
    console.log('\nPrestadores ativos:', activeProviders.length);
    activeProviders.forEach(p => {
      console.log(`- Provider ${p.id}: ${p.name} (ativo: ${p.isActive})`);
    });
    
    // Verificar service templates
    const serviceTemplate1 = await storage.getServiceTemplate(1);
    console.log('\nService template ID 1:', serviceTemplate1);
    
    // Verificar provider_services de cada prestador ativo
    console.log('\n=== Provider services por prestador ===');
    for (const provider of activeProviders) {
      const providerServices = await storage.getProviderServicesByProvider(provider.id);
      console.log(`Provider ${provider.id} (${provider.name}) tem ${providerServices.length} serviços:`);
      providerServices.forEach(ps => {
        console.log(`  - ServiceId: ${ps.serviceId}, Price: ${ps.price}`);
      });
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkProviderServices();