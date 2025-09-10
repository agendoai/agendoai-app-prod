import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { services, categories, niches } from './shared/schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agendoai';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkServices() {
  try {
    console.log('🔍 Verificando serviços no banco de dados...\n');
    
    // Verificar se há serviços
    const allServices = await db.select().from(services);
    console.log(`📊 Total de serviços cadastrados: ${allServices.length}`);
    
    if (allServices.length > 0) {
      console.log('\n📋 Primeiros 5 serviços:');
      allServices.slice(0, 5).forEach((service, index) => {
        console.log(`${index + 1}. ${service.name} - R$ ${service.price} - Categoria ID: ${service.categoryId}`);
      });
    }
    
    // Verificar categorias
    const allCategories = await db.select().from(categories);
    console.log(`\n📊 Total de categorias: ${allCategories.length}`);
    
    if (allCategories.length > 0) {
      console.log('\n📋 Categorias disponíveis:');
      allCategories.forEach((category, index) => {
        console.log(`${index + 1}. ${category.name} (ID: ${category.id})`);
      });
    }
    
    // Verificar nichos
    const allNiches = await db.select().from(niches);
    console.log(`\n📊 Total de nichos: ${allNiches.length}`);
    
    if (allNiches.length > 0) {
      console.log('\n📋 Nichos disponíveis:');
      allNiches.forEach((niche, index) => {
        console.log(`${index + 1}. ${niche.name} (ID: ${niche.id})`);
      });
    }
    
    // Testar busca específica
    console.log('\n🔍 Testando busca por "demo":');
    const searchResults = allServices.filter(service => 
      service.name.toLowerCase().includes('demo') ||
      (service.description && service.description.toLowerCase().includes('demo'))
    );
    console.log(`Resultados encontrados: ${searchResults.length}`);
    
    if (searchResults.length > 0) {
      searchResults.forEach((service, index) => {
        console.log(`${index + 1}. ${service.name} - ${service.description}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar serviços:', error);
  } finally {
    await client.end();
  }
}

checkServices();
