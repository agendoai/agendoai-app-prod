#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/agendoai'
});

async function checkTemplates() {
  try {
    console.log('🔍 Verificando templates de serviço...');
    
    const result = await pool.query('SELECT * FROM service_templates');
    console.log(`📊 Total de templates encontrados: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Templates disponíveis:');
      result.rows.forEach(template => {
        console.log(`- ${template.name} (ID: ${template.id}, Category: ${template.category_id}, Niche: ${template.niche_id})`);
      });
    } else {
      console.log('❌ Nenhum template encontrado!');
    }
    
    console.log('\n🔍 Verificando nichos...');
    const niches = await pool.query('SELECT * FROM niches');
    console.log(`📊 Total de nichos: ${niches.rows.length}`);
    niches.rows.forEach(niche => {
      console.log(`- ${niche.name} (ID: ${niche.id})`);
    });
    
    console.log('\n🔍 Verificando categorias...');
    const categories = await pool.query('SELECT * FROM categories');
    console.log(`📊 Total de categorias: ${categories.rows.length}`);
    categories.rows.forEach(category => {
      console.log(`- ${category.name} (ID: ${category.id}, Niche: ${category.niche_id})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTemplates(); 