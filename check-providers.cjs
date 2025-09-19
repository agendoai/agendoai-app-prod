const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd'
});

async function checkProviders() {
  try {
    console.log('=== VERIFICANDO PRESTADORES NO BANCO ===');
    
    // Verificar usuários do tipo provider
    const providersResult = await pool.query(`
      SELECT id, name, email, user_type, is_active 
      FROM users 
      WHERE user_type = 'provider'
    `);
    
    console.log(`\nPrestadores encontrados: ${providersResult.rows.length}`);
    providersResult.rows.forEach(provider => {
      console.log(`- ID: ${provider.id}, Nome: ${provider.name}, Ativo: ${provider.is_active}`);
    });
    
    // Verificar serviços dos prestadores
    const servicesResult = await pool.query(`
      SELECT ps.*, st.name as service_name, st.duration
      FROM provider_services ps
      LEFT JOIN service_templates st ON ps.service_id = st.id
      ORDER BY ps.provider_id
    `);
    
    console.log(`\nServiços de prestadores encontrados: ${servicesResult.rows.length}`);
    servicesResult.rows.forEach(service => {
      console.log(`- Provider ID: ${service.provider_id}, Service: ${service.service_name} (${service.duration}min)`);
    });
    
    // Verificar disponibilidade
    const availabilityResult = await pool.query(`
      SELECT * FROM availability 
      ORDER BY provider_id, day_of_week
    `);
    
    console.log(`\nDisponibilidades encontradas: ${availabilityResult.rows.length}`);
    availabilityResult.rows.forEach(avail => {
      console.log(`- Provider ID: ${avail.provider_id}, Dia: ${avail.day_of_week}, ${avail.start_time}-${avail.end_time}`);
    });
    
    // Verificar templates de serviços
    const templatesResult = await pool.query(`
      SELECT id, name, duration, category_id
      FROM service_templates
      ORDER BY id
    `);
    
    console.log(`\nTemplates de serviços encontrados: ${templatesResult.rows.length}`);
    templatesResult.rows.forEach(template => {
      console.log(`- ID: ${template.id}, Nome: ${template.name}, Duração: ${template.duration}min, Categoria: ${template.category_id}`);
    });
    
  } catch (error) {
    console.error('Erro ao verificar dados:', error);
  } finally {
    await pool.end();
  }
}

checkProviders();