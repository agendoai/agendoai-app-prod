#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/agendoai'
});

async function createSampleData() {
  try {
    console.log('🌱 Criando dados de exemplo...');

    // 1. Criar nichos
    console.log('📋 Criando nichos...');
    
    const niches = [
      {
        name: 'Beleza',
        description: 'Serviços de beleza e estética',
        icon: 'scissors'
      },
      {
        name: 'Saúde',
        description: 'Serviços de saúde e bem-estar',
        icon: 'heart'
      },
      {
        name: 'Casa',
        description: 'Serviços para casa e jardim',
        icon: 'home'
      },
      {
        name: 'Automotivo',
        description: 'Serviços automotivos',
        icon: 'car'
      },
      {
        name: 'Tecnologia',
        description: 'Serviços de tecnologia e informática',
        icon: 'laptop'
      }
    ];

    const createdNiches = [];
    
    for (const niche of niches) {
      try {
        const result = await pool.query(`
          INSERT INTO niches (name, description, icon, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id, name
        `, [niche.name, niche.description, niche.icon]);
        
        if (result.rows.length > 0) {
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
    const existingNiches = await pool.query('SELECT id, name FROM niches ORDER BY name');
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

        const result = await pool.query(`
          INSERT INTO categories (name, description, icon, color, niche_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id, name
        `, [category.name, category.description || '', category.icon, category.color, nicheId]);
        
        if (result.rows.length > 0) {
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

    // 4. Criar templates de serviços
    console.log('🛠️  Criando templates de serviços...');
    const serviceTemplates = [
      {
        name: 'Corte Masculino',
        description: 'Corte de cabelo masculino padrão',
        categoryId: 21, // Barbearia
        nicheId: 6, // Beleza
        icon: 'scissors',
        duration: 30,
        isActive: true
      },
      {
        name: 'Barba',
        description: 'Barba completa e acabamento',
        categoryId: 21, // Barbearia
        nicheId: 6, // Beleza
        icon: 'beard',
        duration: 20,
        isActive: true
      },
      {
        name: 'Corte Feminino',
        description: 'Corte de cabelo feminino',
        categoryId: 22, // Salão de Beleza
        nicheId: 6, // Beleza
        icon: 'scissors',
        duration: 40,
        isActive: true
      },
      {
        name: 'Manicure',
        description: 'Manicure e esmaltação',
        categoryId: 23, // Manicure
        nicheId: 6, // Beleza
        icon: 'nail-polish',
        duration: 30,
        isActive: true
      },
      {
        name: 'Lavagem de Carro',
        description: 'Lavagem completa de carro',
        categoryId: 33, // Lavagem
        nicheId: 10, // Tecnologia (exemplo)
        icon: 'car',
        duration: 45,
        isActive: true
      },
      {
        name: 'Troca de Óleo',
        description: 'Troca de óleo de motor',
        categoryId: 34, // Mecânica
        nicheId: 10, // Tecnologia (exemplo)
        icon: 'oil',
        duration: 30,
        isActive: true
      }
    ];

    for (const template of serviceTemplates) {
      try {
        await pool.query(
          `INSERT INTO service_templates (name, description, category_id, niche_id, icon, duration, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [template.name, template.description, template.categoryId, template.nicheId, template.icon, template.duration, template.isActive]
        );
        console.log(`✅ Template criado: ${template.name}`);
      } catch (err) {
        console.log(`❌ Erro ao criar template ${template.name}:`, err.message);
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
    await pool.end();
    process.exit(0);
  }
}

createSampleData(); 