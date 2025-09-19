const { storage } = require('./server/storage.ts');

async function testProviderServiceRecreation() {
  try {
    await storage.init();
    
    console.log('=== TESTE DE RECRIAÇÃO DE SERVIÇOS DELETADOS ===\n');
    
    const providerId = 2; // Usar um prestador existente
    const serviceId = 1;  // Usar um serviço existente
    
    // 1. Verificar se já existe um provider_service
    console.log('1️⃣ Verificando se já existe provider_service...');
    let existingService = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
    console.log('Serviço existente:', existingService ? `ID: ${existingService.id}` : 'Não encontrado');
    
    // 2. Se não existir, criar um primeiro
    if (!existingService) {
      console.log('\n2️⃣ Criando provider_service inicial...');
      const newService = await storage.createProviderService({
        providerId,
        serviceId,
        executionTime: 30,
        price: 50.00,
        duration: 30,
        breakTime: 5,
        isActive: true
      });
      console.log('Serviço criado:', newService);
      existingService = newService;
    }
    
    // 3. Deletar o serviço
    console.log('\n3️⃣ Deletando o provider_service...');
    const deleteResult = await storage.deleteProviderService(existingService.id);
    console.log('Resultado da exclusão:', deleteResult);
    
    // 4. Verificar se foi realmente deletado
    console.log('\n4️⃣ Verificando se foi deletado...');
    const afterDelete = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
    console.log('Após exclusão:', afterDelete ? `Ainda existe: ID ${afterDelete.id}` : 'Deletado com sucesso');
    
    // 5. Tentar recriar o serviço
    console.log('\n5️⃣ Tentando recriar o provider_service...');
    try {
      const recreatedService = await storage.createProviderService({
        providerId,
        serviceId,
        executionTime: 45,
        price: 60.00,
        duration: 45,
        breakTime: 10,
        isActive: true
      });
      console.log('✅ Serviço recriado com sucesso:', recreatedService);
    } catch (error) {
      console.log('❌ Erro ao recriar serviço:', error.message);
    }
    
    // 6. Verificar o estado final
    console.log('\n6️⃣ Verificando estado final...');
    const finalService = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
    console.log('Estado final:', finalService ? `Existe: ID ${finalService.id}, Preço: ${finalService.price}` : 'Não existe');
    
    // 7. Listar todos os provider_services do prestador
    console.log('\n7️⃣ Todos os serviços do prestador:');
    const allServices = await storage.getProviderServicesByProvider(providerId);
    console.log(`Total: ${allServices.length}`);
    allServices.forEach(ps => {
      console.log(`- Service ID: ${ps.serviceId}, Preço: ${ps.price}, Ativo: ${ps.isActive}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testProviderServiceRecreation();