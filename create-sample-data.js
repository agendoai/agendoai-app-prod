#!/usr/bin/env node

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function createSampleData() {
  try {
    console.log('🌱 Criando dados de exemplo...');

    // 1. Criar nichos
    console.log('📋 Criando nichos...');
    
    const niches = [
      {
        name: 'Beleza',
        description: 'Serviços de beleza e estética',
        icon: 'scissors',
        color: '#C8A2C8'
      },
      {
        name: 'Saúde',
        description: 'Serviços de saúde e bem-estar',
        icon: 'heart',
        color: '#A2C8A2'
      },
      {
        name: 'Casa',
        description: 'Serviços para casa e jardim',
        icon: 'home',
        color: '#A2A2C8'
      },
      {
        name: 'Automotivo',
        description: 'Serviços automotivos',
        icon: 'car',
        color: '#FF6B6B'
      },
      {
        name: 'Tecnologia',
        description: 'Serviços de tecnologia e informática',
        icon: 'laptop',
        color: '#4ECDC4'
      }
    ];

    const createdNiches = [];
    
    for (const niche of niches) {
      try {
        const result = await db.execute(sql`
          INSERT INTO niches (name, description, icon, color, created_at, updated_at)
          VALUES (${niche.name}, ${niche.description}, ${niche.icon}, ${niche.color}, NOW(), NOW())
          RETURNING id, name
        `);
        
        if (result && result.rows && result.rows.length > 0) {
          createdNiches.push(result.rows[0]);
          console.log(`✅ Nicho criado: ${niche.name} (ID: ${result.rows[0].id})`);
        }
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  Nicho já existe: ${niche.name}`);
        } else {
          console.error(`❌ Erro ao criar nicho ${niche.name}:`, error.message);
        }
      }
    }

    // 2. Buscar nichos criados para usar nos IDs
    const existingNiches = await db.execute(sql`SELECT id, name FROM niches ORDER BY name`);
    const nicheMap = {};
    existingNiches.rows.forEach(niche => {
      nicheMap[niche.name] = niche.id;
    });

    console.log('\n📂 Criando categorias...');

    // 3. Criar categorias para cada nicho
    const categories = [
      // Beleza
      { name: 'Barbearia', icon: 'scissors', color: '#C8A2C8', nicheName: 'Beleza' },
      { name: 'Salão de Beleza', icon: 'scissors', color: '#FFD580', nicheName: 'Beleza' },
      { name: 'Manicure', icon: 'hand', color: '#87CEEB', nicheName: 'Beleza' },
      { name: 'Maquiagem', icon: 'palette', color: '#FFB6C1', nicheName: 'Beleza' },
      
      // Saúde
      { name: 'Clínica Médica', icon: 'stethoscope', color: '#FFB6C1', nicheName: 'Saúde' },
      { name: 'Veterinário', icon: 'paw', color: '#FF9E9E', nicheName: 'Saúde' },
      { name: 'Fisioterapia', icon: 'activity', color: '#98FB98', nicheName: 'Saúde' },
      { name: 'Psicologia', icon: 'brain', color: '#DDA0DD', nicheName: 'Saúde' },
      
      // Casa
      { name: 'Limpeza', icon: 'sparkles', color: '#B5D99C', nicheName: 'Casa' },
      { name: 'Jardinagem', icon: 'tree', color: '#90EE90', nicheName: 'Casa' },
      { name: 'Manutenção', icon: 'wrench', color: '#F0E68C', nicheName: 'Casa' },
      { name: 'Decoração', icon: 'home', color: '#B0C4DE', nicheName: 'Casa' },
      
      // Automotivo
      { name: 'Lavagem', icon: 'droplets', color: '#87CEEB', nicheName: 'Automotivo' },
      { name: 'Mecânica', icon: 'wrench', color: '#FFA500', nicheName: 'Automotivo' },
      { name: 'Funilaria', icon: 'car', color: '#FF6347', nicheName: 'Automotivo' },
      { name: 'Elétrica', icon: 'zap', color: '#FFD700', nicheName: 'Automotivo' },
      
      // Tecnologia
      { name: 'Manutenção de Computadores', icon: 'laptop', color: '#4ECDC4', nicheName: 'Tecnologia' },
      { name: 'Desenvolvimento Web', icon: 'code', color: '#45B7D1', nicheName: 'Tecnologia' },
      { name: 'Suporte Técnico', icon: 'headphones', color: '#96CEB4', nicheName: 'Tecnologia' },
      { name: 'Design Gráfico', icon: 'image', color: '#FFEAA7', nicheName: 'Tecnologia' }
    ];

    for (const category of categories) {
      try {
        const nicheId = nicheMap[category.nicheName];
        if (!nicheId) {
          console.log(`⚠️  Nicho não encontrado para categoria: ${category.name}`);
          continue;
        }

        const result = await db.execute(sql`
          INSERT INTO categories (name, description, icon, color, niche_id, created_at, updated_at)
          VALUES (${category.name}, ${category.description || ''}, ${category.icon}, ${category.color}, ${nicheId}, NOW(), NOW())
          RETURNING id, name
        `);
        
        if (result && result.rows && result.rows.length > 0) {
          console.log(`✅ Categoria criada: ${category.name} (ID: ${result.rows[0].id})`);
        }
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  Categoria já existe: ${category.name}`);
        } else {
          console.error(`❌ Erro ao criar categoria ${category.name}:`, error.message);
        }
      }
    }

    // 4. Criar alguns templates de serviços
    console.log('\n🛠️  Criando templates de serviços...');
    
    const serviceTemplates = [
      {
        name: 'Corte Masculino',
        description: 'Corte de cabelo masculino tradicional',
        duration: 30,
        price: 2500, // R$ 25,00
        categoryId: nicheMap['Beleza'] ? 1 : null // Barbearia
      },
      {
        name: 'Barba',
        description: 'Acabamento e modelagem de barba',
        duration: 20,
        price: 1500, // R$ 15,00
        categoryId: nicheMap['Beleza'] ? 1 : null
      },
      {
        name: 'Corte Feminino',
        description: 'Corte de cabelo feminino',
        duration: 45,
        price: 3500, // R$ 35,00
        categoryId: nicheMap['Beleza'] ? 2 : null // Salão
      },
      {
        name: 'Manicure',
        description: 'Cuidados com as unhas das mãos',
        duration: 60,
        price: 3000, // R$ 30,00
        categoryId: nicheMap['Beleza'] ? 3 : null
      },
      {
        name: 'Lavagem de Carro',
        description: 'Lavagem completa do veículo',
        duration: 45,
        price: 2500, // R$ 25,00
        categoryId: nicheMap['Automotivo'] ? 13 : null
      },
      {
        name: 'Troca de Óleo',
        description: 'Troca de óleo e filtros',
        duration: 60,
        price: 8000, // R$ 80,00
        categoryId: nicheMap['Automotivo'] ? 14 : null
      }
    ];

    for (const template of serviceTemplates) {
      try {
        if (!template.categoryId) {
          console.log(`⚠️  Categoria não encontrada para template: ${template.name}`);
          continue;
        }

        const result = await db.execute(sql`
          INSERT INTO service_templates (name, description, duration, price, category_id, is_active, created_at, updated_at)
          VALUES (${template.name}, ${template.description}, ${template.duration}, ${template.price}, ${template.categoryId}, true, NOW(), NOW())
          RETURNING id, name
        `);
        
        if (result && result.rows && result.rows.length > 0) {
          console.log(`✅ Template criado: ${template.name} (ID: ${result.rows[0].id})`);
        }
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  Template já existe: ${template.name}`);
        } else {
          console.error(`❌ Erro ao criar template ${template.name}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Dados de exemplo criados com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`- Nichos criados: ${existingNiches.rows.length}`);
    console.log(`- Categorias criadas: ${categories.length}`);
    console.log(`- Templates de serviços criados: ${serviceTemplates.length}`);

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  } finally {
    process.exit(0);
  }
}

createSampleData(); 