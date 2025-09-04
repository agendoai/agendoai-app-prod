#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

// Configuração do banco - usar o DATABASE_URL do .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://agendoai:agendoaibd123dev@191.252.196.5:5432/agendoaibd'
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

    // 5. Criar usuários prestadores
    console.log('👨‍💼 Criando prestadores...');
    const providers = [
      {
        name: 'João Silva',
        email: 'joao@barbearia.com',
        phone: '11999999999',
        userType: 'provider',
        isActive: true,
        isVerified: true
      },
      {
        name: 'Maria Santos',
        email: 'maria@salon.com',
        phone: '11888888888',
        userType: 'provider',
        isActive: true,
        isVerified: true
      },
      {
        name: 'Carlos Oliveira',
        email: 'carlos@mecanica.com',
        phone: '11777777777',
        userType: 'provider',
        isActive: true,
        isVerified: true
      }
    ];

    const createdProviders = [];
    for (const provider of providers) {
      try {
        const result = await pool.query(`
          INSERT INTO users (name, email, phone, user_type, is_active, is_verified, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, name, email
        `, [provider.name, provider.email, provider.phone, provider.userType, provider.isActive, provider.isVerified]);
        
        if (result.rows.length > 0) {
          createdProviders.push(result.rows[0]);
          console.log(`✅ Prestador criado: ${provider.name} (ID: ${result.rows[0].id})`);
        }
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  Prestador já existe: ${provider.name}`);
        } else {
          console.error(`❌ Erro ao criar prestador ${provider.name}:`, error.message);
        }
      }
    }

    // 6. Criar provider services (conexão prestador-serviço)
    console.log('🔗 Criando conexões prestador-serviço...');
    const providerServices = [
      // João Silva - Barbearia
      { providerId: 1, serviceId: 1, duration: 30, price: 2500, executionTime: 30 }, // Corte Masculino
      { providerId: 1, serviceId: 2, duration: 20, price: 1500, executionTime: 20 }, // Barba
      
      // Maria Santos - Salão
      { providerId: 2, serviceId: 3, duration: 40, price: 3500, executionTime: 40 }, // Corte Feminino
      { providerId: 2, serviceId: 4, duration: 30, price: 2500, executionTime: 30 }, // Manicure
      
      // Carlos Oliveira - Mecânica
      { providerId: 3, serviceId: 5, duration: 45, price: 4000, executionTime: 45 }, // Lavagem de Carro
      { providerId: 3, serviceId: 6, duration: 30, price: 3000, executionTime: 30 }, // Troca de Óleo
    ];

    for (const ps of providerServices) {
      try {
        await pool.query(`
          INSERT INTO provider_services (provider_id, service_id, duration, price, execution_time, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [ps.providerId, ps.serviceId, ps.duration, ps.price, ps.executionTime]);
        console.log(`✅ Provider Service criado: Prestador ${ps.providerId} - Serviço ${ps.serviceId}`);
      } catch (err) {
        console.log(`❌ Erro ao criar provider service:`, err.message);
      }
    }

    // 7. Criar disponibilidade para os prestadores
    console.log('📅 Criando disponibilidade dos prestadores...');
    const availabilities = [
      // João Silva - Segunda a Sexta, 8h às 18h
      { providerId: 1, dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
      { providerId: 1, dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
      { providerId: 1, dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
      { providerId: 1, dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
      { providerId: 1, dayOfWeek: 5, startTime: '08:00', endTime: '18:00' },
      
      // Maria Santos - Segunda a Sábado, 9h às 19h
      { providerId: 2, dayOfWeek: 1, startTime: '09:00', endTime: '19:00' },
      { providerId: 2, dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
      { providerId: 2, dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
      { providerId: 2, dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
      { providerId: 2, dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
      { providerId: 2, dayOfWeek: 6, startTime: '09:00', endTime: '19:00' },
      
      // Carlos Oliveira - Segunda a Sexta, 7h às 17h
      { providerId: 3, dayOfWeek: 1, startTime: '07:00', endTime: '17:00' },
      { providerId: 3, dayOfWeek: 2, startTime: '07:00', endTime: '17:00' },
      { providerId: 3, dayOfWeek: 3, startTime: '07:00', endTime: '17:00' },
      { providerId: 3, dayOfWeek: 4, startTime: '07:00', endTime: '17:00' },
      { providerId: 3, dayOfWeek: 5, startTime: '07:00', endTime: '17:00' },
    ];

    for (const avail of availabilities) {
      try {
        await pool.query(`
          INSERT INTO availability (provider_id, day_of_week, start_time, end_time, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [avail.providerId, avail.dayOfWeek, avail.startTime, avail.endTime]);
        console.log(`✅ Disponibilidade criada: Prestador ${avail.providerId} - Dia ${avail.dayOfWeek}`);
      } catch (err) {
        console.log(`❌ Erro ao criar disponibilidade:`, err.message);
      }
    }

    console.log('\n🎉 Dados de exemplo criados com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`- Nichos criados: ${existingNiches.rows.length}`);
    console.log(`- Categorias criadas: ${categories.length}`);
    console.log(`- Templates de serviços criados: ${serviceTemplates.length}`);
    console.log(`- Prestadores criados: ${providers.length}`);
    console.log(`- Provider Services criados: ${providerServices.length}`);
    console.log(`- Disponibilidades criadas: ${availabilities.length}`);

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createSampleData(); 