
# AgendoAI - Instruções para Implantação com Docker

## Pré-requisitos

- Docker instalado
- Docker Compose instalado
- Variáveis de ambiente configuradas:
  - STRIPE_SECRET_KEY
  - VITE_STRIPE_PUBLIC_KEY
  - DATABASE_URL (postgres://postgres:postgres@db:5432/agendoai)

## Estrutura

- `docker-compose.yml`: Define os serviços (app e banco de dados)
- `Dockerfile`: Configura o ambiente Node.js
- `.dockerignore`: Exclui arquivos desnecessários
- `docker-deploy.sh`: Script de implantação automatizada

## Serviços

### Aplicação (app)
- Imagem: Node.js 20 Alpine
- Porta: 5000 (externa)
- Volume para uploads
- Depende do serviço de banco de dados

### Banco de Dados (db)
- Imagem: PostgreSQL 15 Alpine
- Porta: 5432
- Volume persistente para dados
- Credenciais padrão:
  - Usuario: postgres
  - Senha: postgres
  - Database: agendoai

## Comandos Principais

```bash
# Iniciar os serviços
./docker-deploy.sh

# OU manualmente:
docker compose up -d --build

# Verificar status
docker compose ps

# Logs da aplicação
docker compose logs -f app

# Parar serviços
docker compose down

# Backup do banco
docker exec agendoai-db pg_dump -U postgres agendoai > backup.sql

# Restaurar banco
cat backup.sql | docker exec -i agendoai-db psql -U postgres -d agendoai
```

## Migrações e Seeds

Após iniciar os serviços:

```bash
# Gerar migrations
npm run generate

# Aplicar migrations
npm run migrate

# Popular dados iniciais
node migrations/populate-niches.js
```

## Usuários Padrão

- Admin: admin@agendoai.com / admin123
- Cliente: cliente@agendoai.com / cliente123
- Prestador: prestador@agendoai.com / prestador123

## Volumes Persistentes

- `postgres_data`: Dados do PostgreSQL
- `uploads`: Arquivos enviados pelos usuários

## Redes

- `agendoai-network`: Rede bridge para comunicação entre serviços
