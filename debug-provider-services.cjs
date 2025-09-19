const { Pool } = require('pg');

const pool = new Pool({
  user: 'agendoai',
  host: '191.252.196.5',
  database: 'agendoaibd',
  password: 'agendoaibd123dev',
  port: 5432,
});

async function debugProviderServices() {
  try {
    console.log('=== DEBUG PROVIDER SERVICES ===\n');
    
    // 1. Verificar provider_services
    console.log('1. PROVIDER SERVICES:');
    const providerServicesResult = await pool.query(`
      SELECT ps.*, st.name as service_name, u.name as provider_name
      FROM provider_services ps
      LEFT JOIN service_templates st ON ps.service_id = st.id
      LEFT JOIN users u ON ps.provider_id = u.id
      ORDER BY ps.provider_id, ps.service_id
    `);
    
    console.log(`Total provider_services: ${providerServicesResult.rows.length}`);
    providerServicesResult.rows.forEach(row => {
      console.log(`- Provider: ${row.provider_name} (ID: ${row.provider_id}) -> Service: ${row.service_name} (ID: ${row.service_id}) - Preço: R$ ${row.price}`);
    });
    
    // 2. Verificar prestadores ativos
    console.log('\n2. PRESTADORES ATIVOS:');
    const providersResult = await pool.query(`
      SELECT id, name, user_type, is_active
      FROM users 
      WHERE user_type = 'provider' AND is_active = true
      ORDER BY id
    `);
    
    console.log(`Total prestadores ativos: ${providersResult.rows.length}`);
    providersResult.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Nome: ${row.name}, Ativo: ${row.is_active}`);
    });
    
    // 3. Verificar service_templates
    console.log('\n3. SERVICE TEMPLATES:');
    const templatesResult = await pool.query(`
      SELECT id, name, category_id, duration_minutes
      FROM service_templates
      ORDER BY id
    `);
    
    console.log(`Total service templates: ${templatesResult.rows.length}`);
    templatesResult.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Nome: ${row.name}, Categoria: ${row.category_id}, Duração: ${row.duration_minutes}min`);
    });
    
    // 4. Verificar se há prestadores que oferecem o serviço ID 7
    console.log('\n4. PRESTADORES QUE OFERECEM SERVIÇO ID 7 (Corte Masculino):');
    const service7Result = await pool.query(`
      SELECT ps.provider_id, u.name as provider_name, ps.price, ps.is_active
      FROM provider_services ps
      JOIN users u ON ps.provider_id = u.id
      WHERE ps.service_id = 7 AND u.is_active = true
      ORDER BY ps.provider_id
    `);
    
    console.log(`Prestadores com serviço ID 7: ${service7Result.rows.length}`);
    service7Result.rows.forEach(row => {
      console.log(`- Provider: ${row.provider_name} (ID: ${row.provider_id}) - Preço: R$ ${row.price} - Ativo: ${row.is_active}`);
    });
    
    // 5. Verificar categorias
    console.log('\n5. CATEGORIAS:');
    const categoriesResult = await pool.query(`
      SELECT id, name
      FROM categories
      ORDER BY id
    `);
    
    console.log(`Total categorias: ${categoriesResult.rows.length}`);
    categoriesResult.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Nome: ${row.name}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

debugProviderServices();