#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd'
});

async function fixProviderServices() {
  try {
    console.log('🔧 Corrigindo provider_services...\n');

    // 1. Verificar quais service_templates existem
    console.log('1️⃣ Service Templates disponíveis:');
    const serviceTemplates = await pool.query('SELECT id, name, category_id FROM service_templates ORDER BY id');
    console.log(serviceTemplates.rows);
    console.log('');

    // 2. Verificar quais prestadores existem
    console.log('2️⃣ Prestadores disponíveis:');
    const providers = await pool.query("SELECT id, name FROM users WHERE user_type = 'provider' AND is_active = true");
    console.log(providers.rows);
    console.log('');

    // 3. Criar provider_services para conectar prestadores aos serviços
    console.log('3️⃣ Criando provider_services...');
    
    const providerServicesToCreate = [
      // Prestador ID 2 oferece serviços de beleza
      { providerId: 2, serviceId: 1, duration: 30, price: 2500, executionTime: 30 }, // Corte Masculino
      { providerId: 2, serviceId: 2, duration: 20, price: 1500, executionTime: 20 }, // Barba
      { providerId: 2, serviceId: 3, duration: 40, price: 3500, executionTime: 40 }, // Corte Feminino
      
      // Prestador ID 5 oferece serviços automotivos
      { providerId: 5, serviceId: 5, duration: 45, price: 4000, executionTime: 45 }, // Lavagem de Carro
      { providerId: 5, serviceId: 6, duration: 30, price: 3000, executionTime: 30 }, // Troca de Óleo
    ];

    for (const ps of providerServicesToCreate) {
      try {
        // Verificar se já existe
        const existing = await pool.query(
          'SELECT id FROM provider_services WHERE provider_id = $1 AND service_id = $2',
          [ps.providerId, ps.serviceId]
        );

        if (existing.rows.length === 0) {
          await pool.query(`
            INSERT INTO provider_services (provider_id, service_id, duration, price, execution_time, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
          `, [ps.providerId, ps.serviceId, ps.duration, ps.price, ps.executionTime]);
          
          console.log(`✅ Criado: Prestador ${ps.providerId} oferece serviço ${ps.serviceId}`);
        } else {
          console.log(`⚠️  Já existe: Prestador ${ps.providerId} oferece serviço ${ps.serviceId}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao criar provider service ${ps.providerId}-${ps.serviceId}:`, error.message);
      }
    }

    // 4. Verificar resultado final
    console.log('\n4️⃣ Provider Services após correção:');
    const finalProviderServices = await pool.query('SELECT * FROM provider_services ORDER BY provider_id, service_id');
    console.log('Total:', finalProviderServices.rows.length);
    finalProviderServices.rows.forEach(ps => {
      console.log(`- Prestador ${ps.provider_id} oferece serviço ${ps.service_id}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

fixProviderServices();
