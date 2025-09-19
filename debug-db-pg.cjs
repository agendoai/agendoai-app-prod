const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    connectionString: 'postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd'
  });

  try {
    await client.connect();
    console.log('=== Verificando dados no banco ===');
    
    // 1. Verificar provider_services
    console.log('\n1. Provider Services:');
    const providerServicesResult = await client.query(`
      SELECT provider_id, service_id, price, is_active 
      FROM provider_services 
      ORDER BY provider_id, service_id
    `);
    
    console.log(`Total provider_services: ${providerServicesResult.rows.length}`);
    providerServicesResult.rows.forEach(row => {
      console.log(`- Provider ${row.provider_id} -> Service ${row.service_id} (price: ${row.price}, active: ${row.is_active})`);
    });
    
    // 2. Verificar service_templates
    console.log('\n2. Service Templates:');
    const serviceTemplatesResult = await client.query(`
      SELECT id, name, category_id, is_active 
      FROM service_templates 
      ORDER BY id
    `);
    
    console.log(`Total service_templates: ${serviceTemplatesResult.rows.length}`);
    serviceTemplatesResult.rows.forEach(row => {
      console.log(`- Template ${row.id}: ${row.name} (category: ${row.category_id}, active: ${row.is_active})`);
    });
    
    // 3. Verificar prestadores ativos
    console.log('\n3. Prestadores:');
    const providersResult = await client.query(`
      SELECT id, name, user_type, is_active 
      FROM users 
      WHERE user_type = 'provider'
      ORDER BY id
    `);
    
    console.log(`Total providers: ${providersResult.rows.length}`);
    providersResult.rows.forEach(row => {
      console.log(`- Provider ${row.id}: ${row.name} (active: ${row.is_active})`);
    });
    
    // 4. Verificar especificamente serviceId=1
    console.log('\n4. Provider Services com serviceId=1:');
    const serviceId1Result = await client.query(`
      SELECT ps.provider_id, ps.service_id, ps.price, ps.is_active, u.name as provider_name
      FROM provider_services ps
      JOIN users u ON ps.provider_id = u.id
      WHERE ps.service_id = 1
      ORDER BY ps.provider_id
    `);
    
    console.log(`Provider services com serviceId=1: ${serviceId1Result.rows.length}`);
    serviceId1Result.rows.forEach(row => {
      console.log(`- Provider ${row.provider_id} (${row.provider_name}) oferece serviceId ${row.service_id} (price: ${row.price}, active: ${row.is_active})`);
    });
    
    // 5. Verificar disponibilidades para 2025-09-19 (sexta-feira = dia 5)
    console.log('\n5. Disponibilidades para 2025-09-19 (sexta-feira):');
    const availabilitiesResult = await client.query(`
      SELECT provider_id, day_of_week, start_time, end_time, is_active
      FROM provider_availabilities
      WHERE day_of_week = 5 AND is_active = true
      ORDER BY provider_id, start_time
    `);
    
    console.log(`Disponibilidades para sexta-feira: ${availabilitiesResult.rows.length}`);
    availabilitiesResult.rows.forEach(row => {
      console.log(`- Provider ${row.provider_id}: ${row.start_time}-${row.end_time} (active: ${row.is_active})`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
  }
}

checkDatabase();