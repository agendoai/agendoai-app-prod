import { storage } from './server/storage.js';

async function checkProviderImages() {
    console.log('🖼️  Verificando imagens de perfil dos prestadores...\n');
    
    // Buscar todos os prestadores
    const providers = await storage.getUsersByType("provider");
    
    console.log(`📋 Total de prestadores encontrados: ${providers.length}\n`);
    
    providers.forEach((provider, index) => {
        console.log(`${index + 1}. Prestador: ${provider.name || 'Sem nome'} (ID: ${provider.id})`);
        console.log(`   Email: ${provider.email || 'Não informado'}`);
        console.log(`   Imagem de perfil: ${provider.profileImage || '❌ Não possui'}`);
        
        if (provider.profileImage) {
            console.log(`   ✅ Tem imagem: ${provider.profileImage}`);
        } else {
            console.log(`   ❌ Sem imagem - será exibido fallback com letra "${provider.name?.charAt(0) || 'P'}"`);
        }
        console.log('');
    });
    
    const providersWithImages = providers.filter(p => p.profileImage);
    const providersWithoutImages = providers.filter(p => !p.profileImage);
    
    console.log('📊 RESUMO:');
    console.log(`   - Prestadores com imagem: ${providersWithImages.length}`);
    console.log(`   - Prestadores sem imagem: ${providersWithoutImages.length}`);
    
    if (providersWithoutImages.length > 0) {
        console.log('\n💡 SUGESTÃO:');
        console.log('   Para que as imagens apareçam, os prestadores precisam:');
        console.log('   1. Fazer upload de uma foto de perfil no painel deles');
        console.log('   2. Ou você pode adicionar imagens manualmente no banco de dados');
    }
}

checkProviderImages().catch(console.error);