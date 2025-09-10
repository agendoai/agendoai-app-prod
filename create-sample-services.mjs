import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { services, categories, niches } from './shared/schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agendoai';
const client = postgres(connectionString);
const db = drizzle(client);

async function createSampleServices() {
  try {
    console.log('🔍 Verificando e criando serviços de exemplo...\n');
    
    // Verificar se já existem serviços
    const existingServices = await db.select().from(services);
    console.log(`📊 Serviços existentes: ${existingServices.length}`);
    
    if (existingServices.length > 0) {
      console.log('✅ Já existem serviços no banco. Não é necessário criar novos.');
      return;
    }
    
    // Verificar categorias
    const existingCategories = await db.select().from(categories);
    console.log(`📊 Categorias existentes: ${existingCategories.length}`);
    
    if (existingCategories.length === 0) {
      console.log('❌ Não há categorias cadastradas. Criando categorias primeiro...');
      
      // Criar categorias básicas
      const newCategories = await db.insert(categories).values([
        { name: 'Barbearia', description: 'Serviços de barbearia' },
        { name: 'Salão de Beleza', description: 'Serviços de salão de beleza' },
        { name: 'Massagem', description: 'Serviços de massagem' },
        { name: 'Manicure/Pedicure', description: 'Serviços de manicure e pedicure' }
      ]).returning();
      
      console.log(`✅ Criadas ${newCategories.length} categorias`);
    }
    
    // Buscar categorias para usar nos serviços
    const categoriesList = await db.select().from(categories);
    const barbeariaCategory = categoriesList.find(cat => cat.name === 'Barbearia');
    const salaoCategory = categoriesList.find(cat => cat.name === 'Salão de Beleza');
    const massagemCategory = categoriesList.find(cat => cat.name === 'Massagem');
    const manicureCategory = categoriesList.find(cat => cat.name === 'Manicure/Pedicure');
    
    // Criar serviços de exemplo
    const sampleServices = [
      {
        name: 'Corte Masculino',
        description: 'Corte moderno e estiloso para homens',
        price: 35.00,
        duration: 30,
        categoryId: barbeariaCategory?.id || 1,
        providerId: 1, // Assumindo que existe um prestador com ID 1
        isActive: true
      },
      {
        name: 'Barba e Bigode',
        description: 'Aparar e modelar barba e bigode',
        price: 25.00,
        duration: 20,
        categoryId: barbeariaCategory?.id || 1,
        providerId: 1,
        isActive: true
      },
      {
        name: 'Corte Feminino',
        description: 'Corte moderno para mulheres',
        price: 60.00,
        duration: 45,
        categoryId: salaoCategory?.id || 2,
        providerId: 2,
        isActive: true
      },
      {
        name: 'Coloração',
        description: 'Coloração completa com produtos de qualidade',
        price: 180.00,
        duration: 120,
        categoryId: salaoCategory?.id || 2,
        providerId: 2,
        isActive: true
      },
      {
        name: 'Massagem Relaxante',
        description: 'Massagem terapêutica para relaxamento',
        price: 120.00,
        duration: 90,
        categoryId: massagemCategory?.id || 3,
        providerId: 3,
        isActive: true
      },
      {
        name: 'Manicure Completa',
        description: 'Manicure com esmaltação e cuidados especiais',
        price: 45.00,
        duration: 60,
        categoryId: manicureCategory?.id || 4,
        providerId: 4,
        isActive: true
      }
    ];
    
    console.log('📝 Criando serviços de exemplo...');
    const newServices = await db.insert(services).values(sampleServices).returning();
    
    console.log(`✅ Criados ${newServices.length} serviços de exemplo:`);
    newServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - R$ ${service.price} - ${service.duration}min`);
    });
    
    console.log('\n🎉 Serviços criados com sucesso! Agora você pode testar a busca.');
    
  } catch (error) {
    console.error('❌ Erro ao criar serviços:', error);
  } finally {
    await client.end();
  }
}

createSampleServices();
