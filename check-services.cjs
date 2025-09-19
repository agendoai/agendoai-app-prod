const { storage } = require('./server/storage.ts');

async function checkServices() {
  try {
    await storage.init();
    
    console.log('=== VERIFICANDO SERVIÇOS ===');
    
    // Buscar todos os serviços
    const services = await storage.getAllServices();
    console.log(`Total de serviços: ${services.length}`);
    
    services.forEach(service => {
      console.log(`- ID: ${service.id}, Nome: ${service.name}, Categoria: ${service.categoryId}`);
    });
    
    console.log('\n=== VERIFICANDO CATEGORIAS ===');
    
    // Buscar todas as categorias
    const categories = await storage.getAllCategories();
    console.log(`Total de categorias: ${categories.length}`);
    
    categories.forEach(category => {
      console.log(`- ID: ${category.id}, Nome: ${category.name}`);
    });
    
    console.log('\n=== VERIFICANDO PROVIDER SERVICES ===');
    
    // Buscar provider services
    const providerServices = await storage.getAllProviderServices();
    console.log(`Total de provider services: ${providerServices.length}`);
    
    providerServices.forEach(ps => {
      console.log(`- Provider ID: ${ps.providerId}, Service ID: ${ps.serviceId}, Preço: ${ps.price}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkServices();