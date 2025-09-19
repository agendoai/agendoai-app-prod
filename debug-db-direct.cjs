const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { sql } = require('drizzle-orm');

async function checkDatabase() {
  try {
    // Conectar ao banco
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/agendoai';
    const client = postgres(connectionString);
    const db = drizzle(client);
    
    console.log('=== Verificando dados no banco ===');
    
    // 1. Verificar provider_services
    console.log('\n1. Provider Services:');
    const providerServices = await db.execute(sql`
      SELECT provider_id, service_id, price, is_active 
      FROM provider_services 
      ORDER BY provider_id, service_id
    `);
    
    console.log(`Total provider_services: ${providerServices.rows.length}`);
    providerServices.rows.forEach(row => {
      console.log(`- Provider ${row.provider_id} -> Service ${row.service_id} (price: ${row.price}, active: ${row.is_active})`);
    });
    
    // 2. Verificar service_templates
    console.log('\n2. Service Templates:');
    const serviceTemplates = await db.execute(sql`
      SELECT id, name, category_id, is_active 
      FROM service_templates 
      ORDER BY id
    `);
    
    console.log(`Total service_templates: ${serviceTemplates.rows.length}`);
    serviceTemplates.rows.forEach(row => {
      console.log(`- Template ${row.id}: ${row.name} (category: ${row.category_id}, active: ${row.is_active})`);
    });
    
    // 3. Verificar prestadores ativos
    console.log('\n3. Prestadores:');
    const providers = await db.execute(sql`
      SELECT id, name, user_type, is_active 
      FROM users 
      WHERE user_type = 'provider'
      ORDER BY id
    `);
    
    console.log(`Total providers: ${providers.rows.length}`);
    providers.rows.forEach(row => {
      console.log(`- Provider ${row.id}: ${row.name} (active: ${row.is_active})`);
    });
    
    // 4. Verificar especificamente serviceId=1
    console.log('\n4. Provider Services com serviceId=1:');
    const serviceId1 = await db.execute(sql`
      SELECT ps.provider_id, ps.service_id, ps.price, ps.is_active, u.name as provider_name
      FROM provider_services ps
      JOIN users u ON ps.provider_id = u.id
      WHERE ps.service_id = 1
      ORDER BY ps.provider_id
    `);
    
    console.log(`Provider services com serviceId=1: ${serviceId1.rows.length}`);
    serviceId1.rows.forEach(row => {
      console.log(`- Provider ${row.provider_id} (${row.provider_name}) oferece serviceId ${row.service_id} (price: ${row.price}, active: ${row.is_active})`);
    });
    
    await client.end();
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkDatabase();