#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd'
});

async function checkData() {
  try {
    console.log('🔍 Verificando dados no banco...\n');

    // 1. Verificar service template ID 1
    console.log('1️⃣ Service Template ID 1:');
    const serviceTemplate = await pool.query('SELECT * FROM service_templates WHERE id = 1');
    console.log(serviceTemplate.rows[0] || '❌ Não encontrado');
    console.log('');

    // 2. Verificar provider services para service_id 1
    console.log('2️⃣ Provider Services para service_id 1:');
    const providerServices = await pool.query('SELECT * FROM provider_services WHERE service_id = 1');
    console.log(providerServices.rows);
    console.log('');

    // 3. Verificar prestadores ativos
    console.log('3️⃣ Prestadores ativos:');
    const providers = await pool.query("SELECT * FROM users WHERE user_type = 'provider' AND is_active = true");
    console.log(providers.rows);
    console.log('');

    // 4. Verificar disponibilidade dos prestadores
    console.log('4️⃣ Disponibilidade dos prestadores:');
    const availability = await pool.query('SELECT * FROM availability LIMIT 5');
    console.log(availability.rows);
    console.log('');

    // 5. Verificar se há algum provider_service com service_id = 1
    console.log('5️⃣ Verificando provider_services:');
    const allProviderServices = await pool.query('SELECT * FROM provider_services');
    console.log('Total de provider_services:', allProviderServices.rows.length);
    console.log(allProviderServices.rows);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkData();
