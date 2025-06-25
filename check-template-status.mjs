#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/agendoai'
});

async function checkTemplateStatus() {
  try {
    console.log('🔍 Verificando status dos templates...');
    
    const result = await pool.query('SELECT id, name, is_active FROM service_templates');
    console.log(`📊 Total de templates: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Status dos templates:');
      result.rows.forEach(template => {
        console.log(`- ${template.name} (ID: ${template.id}, Active: ${template.is_active})`);
      });
      
      const activeTemplates = result.rows.filter(t => t.is_active === true);
      const inactiveTemplates = result.rows.filter(t => t.is_active === false);
      
      console.log(`\n✅ Templates ativos: ${activeTemplates.length}`);
      console.log(`❌ Templates inativos: ${inactiveTemplates.length}`);
    } else {
      console.log('❌ Nenhum template encontrado!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('💥 Erro:', error.message);
    await pool.end();
  }
}

checkTemplateStatus(); 