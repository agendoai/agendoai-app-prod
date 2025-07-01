-- Adiciona coluna para o tempo de intervalo entre serviços
ALTER TABLE provider_services 
ADD COLUMN IF NOT EXISTS break_time INTEGER DEFAULT 0;