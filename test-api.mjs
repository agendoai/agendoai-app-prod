#!/usr/bin/env node

import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🔍 Testando API de serviços disponíveis...');
    
    const response = await fetch('http://localhost:5000/api/provider-services/available-services', {
      headers: {
        'Cookie': 'connect.sid=test'
      }
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados recebidos:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erro:', errorText);
    }
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

testAPI(); 