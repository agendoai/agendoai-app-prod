const { Client } = require('pg');

async function createProviderServices() {
  const client = new Client({
    connectionString: 'postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd'
  });

  try {
    await client.connect();
    console.log('=== Criando Provider Services ===');
    
    // Primeiro, vamos ver quais prestadores e serviços temos
    const providers = await client.query(`
      SELECT id, name FROM users WHERE user_type = 'provider' AND is_active = true
    `);
    
    const services = await client.query(`
      SELECT id, name FROM service_templates WHERE is_active = true
    `);
    
    console.log('\nPrestadores disponíveis:');
    providers.rows.forEach(p => console.log(`- ${p.id}: ${p.name}`));
    
    console.log('\nServiços disponíveis:');
    services.rows.forEach(s => console.log(`- ${s.id}: ${s.name}`));
    
    // Criar alguns provider_services de exemplo
    const providerServicesToCreate = [
      // Prestador 2 oferece Corte Masculino (serviceId=1)
      { providerId: 2, serviceId: 1, price: 3000, duration: 30, executionTime: 30 },
      // Prestador 5 oferece Corte Masculino (serviceId=1)
      { providerId: 5, serviceId: 1, price: 2500, duration: 30, executionTime: 30 },
      // Prestador 8 oferece Corte Masculino (serviceId=1)
      { providerId: 8, serviceId: 1, price: 4000, duration: 45, executionTime: 45 },
      
      // Adicionar outros serviços também
      { providerId: 2, serviceId: 2, price: 5000, duration: 60, executionTime: 60 }, // Corte Feminino
      { providerId: 8, serviceId: 8, price: 1500, duration: 20, executionTime: 20 }, // Barba
    ];
    
    console.log('\n=== Inserindo Provider Services ===');
    
    for (const ps of providerServicesToCreate) {
      try {
        const result = await client.query(`
          INSERT INTO provider_services (
            provider_id, service_id, price, duration, execution_time, 
            is_active, created_at, break_time
          ) VALUES ($1, $2, $3, $4, $5, true, NOW(), 0)
          RETURNING id
        `, [ps.providerId, ps.serviceId, ps.price, ps.duration, ps.executionTime]);
        
        console.log(`✓ Provider ${ps.providerId} -> Service ${ps.serviceId} (price: ${ps.price}, duration: ${ps.duration}min)`);
      } catch (error) {
        console.error(`✗ Erro ao criar Provider ${ps.providerId} -> Service ${ps.serviceId}:`, error.message);
      }
    }
    
    // Verificar o resultado
    console.log('\n=== Verificando Provider Services Criados ===');
    const createdServices = await client.query(`
      SELECT ps.provider_id, ps.service_id, ps.price, ps.duration, 
             u.name as provider_name, st.name as service_name
      FROM provider_services ps
      JOIN users u ON ps.provider_id = u.id
      JOIN service_templates st ON ps.service_id = st.id
      WHERE ps.is_active = true
      ORDER BY ps.provider_id, ps.service_id
    `);
    
    console.log(`\nTotal provider_services ativos: ${createdServices.rows.length}`);
    createdServices.rows.forEach(row => {
      console.log(`- ${row.provider_name} oferece ${row.service_name} por R$ ${row.price/100} (${row.duration}min)`);
    });
    
    // Verificar especificamente serviceId=1
    console.log('\n=== Provider Services para Corte Masculino (serviceId=1) ===');
    const corteServices = await client.query(`
      SELECT ps.provider_id, u.name as provider_name, ps.price, ps.duration
      FROM provider_services ps
      JOIN users u ON ps.provider_id = u.id
      WHERE ps.service_id = 1 AND ps.is_active = true
      ORDER BY ps.provider_id
    `);
    
    console.log(`Prestadores que oferecem Corte Masculino: ${corteServices.rows.length}`);
    corteServices.rows.forEach(row => {
      console.log(`- ${row.provider_name} (ID: ${row.provider_id}) - R$ ${row.price/100} - ${row.duration}min`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
  }
}

createProviderServices();