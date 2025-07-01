/**
 * Utilitário para gerar chaves VAPID para notificações push
 *
 * Este script gera e exibe um par de chaves VAPID (pública e privada)
 * para uso no serviço de notificações push.
 *
 * As chaves geradas são salvas:
 * 1. Como variáveis de ambiente:
 *    - VAPID_PUBLIC_KEY
 *    - VAPID_PRIVATE_KEY
 *
 * 2. No banco de dados (system_settings):
 *    - Permitindo configuração via painel de administração
 *
 * Executar:
 * npx tsx server/tools/generate-vapid-keys.ts
 */
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { systemSettings } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";
import { createLogger } from "../logger";

const logger = createLogger("VapidKeyGenerator");

/**
 * Limpa uma chave VAPID para garantir que esteja no formato URL safe Base64 sem caracteres '='
 * @param key A chave VAPID a ser limpa
 * @returns A chave no formato adequado
 */
function cleanVapidKey(key: string): string {
  if (!key) return "";

  // Remove espaços em branco, quebras de linha e tabulações
  let cleanKey = key.trim().replace(/[\r\n\t]/g, "");

  // Substitui caracteres não URL safe (+ para - e / para _)
  cleanKey = cleanKey.replace(/\+/g, "-").replace(/\//g, "_");

  // Remove caracteres de igual (=) do final da chave
  cleanKey = cleanKey.replace(/=+$/, "");

  // Verificação adicional para garantir que não há caracteres '=' restantes
  if (cleanKey.includes("=")) {
    cleanKey = cleanKey.replace(/=/g, "");
    console.warn(
      'A chave VAPID continha caracteres "=" no meio do texto e foi limpa.',
    );
  }

  return cleanKey;
}

/**
 * Salva as chaves VAPID no banco de dados
 */
async function saveKeysToDatabase(publicKey: string, privateKey: string) {
  try {
    // Chave pública
    const existingPublicKey = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "VAPID_PUBLIC_KEY"));

    if (existingPublicKey.length > 0) {
      await db
        .update(systemSettings)
        .set({ value: publicKey, updatedAt: new Date() })
        .where(eq(systemSettings.key, "VAPID_PUBLIC_KEY"));
      console.log("✅ Chave pública VAPID atualizada no banco de dados");
    } else {
      await db.insert(systemSettings).values({
        key: "VAPID_PUBLIC_KEY",
        value: publicKey,
        label: "Chave VAPID Pública",
        description: "Chave pública para notificações push",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Chave pública VAPID inserida no banco de dados");
    }

    // Chave privada
    const existingPrivateKey = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "VAPID_PRIVATE_KEY"));

    if (existingPrivateKey.length > 0) {
      await db
        .update(systemSettings)
        .set({ value: privateKey, updatedAt: new Date() })
        .where(eq(systemSettings.key, "VAPID_PRIVATE_KEY"));
      console.log("✅ Chave privada VAPID atualizada no banco de dados");
    } else {
      await db.insert(systemSettings).values({
        key: "VAPID_PRIVATE_KEY",
        value: privateKey,
        label: "Chave VAPID Privada",
        description: "Chave privada para notificações push (sensível)",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Chave privada VAPID inserida no banco de dados");
    }

    // Contato VAPID
    const existingSubject = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "VAPID_SUBJECT"));

    if (existingSubject.length === 0) {
      await db.insert(systemSettings).values({
        key: "VAPID_SUBJECT",
        value: "mailto:notifications@agendoai.com",
        label: "Contato VAPID",
        description: "Email de contato para notificações push",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Contato VAPID inserido no banco de dados");
    }

    return true;
  } catch (error) {
    console.error("❌ Erro ao salvar chaves no banco de dados:", error);
    return false;
  }
}

// Função principal
async function main() {
  // Gera um novo par de chaves VAPID
  const vapidKeys = webpush.generateVAPIDKeys();

  // Limpa as chaves para garantir compatibilidade
  const cleanPublicKey = cleanVapidKey(vapidKeys.publicKey);
  const cleanPrivateKey = cleanVapidKey(vapidKeys.privateKey);

  // Exibe as chaves no console
  console.log("\n==================== VAPID KEYS ====================");
  console.log(`VAPID_PUBLIC_KEY=${cleanPublicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${cleanPrivateKey}`);
  console.log("====================================================\n");

  // Verifica a validade das chaves
  console.log("Validando chaves...");
  try {
    webpush.setVapidDetails(
      "mailto:notifications@agendoai.com",
      cleanPublicKey,
      cleanPrivateKey,
    );
    console.log("✅ Chaves VAPID válidas!");
  } catch (error) {
    console.error("❌ Erro de validação das chaves:", error);
    process.exit(1);
  }

  // Salvar no banco de dados
  console.log("\nSalvando chaves no banco de dados...");
  await saveKeysToDatabase(cleanPublicKey, cleanPrivateKey);

  // Cria um arquivo .env com as chaves (se não existir)
  const envFilePath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envFilePath)) {
    console.log("\nCriando arquivo .env com as novas chaves...");

    const envContent = `# Chaves VAPID para notificações push - geradas em ${new Date().toISOString()}
VAPID_PUBLIC_KEY=${cleanPublicKey}
VAPID_PRIVATE_KEY=${cleanPrivateKey}
VAPID_SUBJECT=mailto:notifications@agendoai.com
`;

    fs.writeFileSync(envFilePath, envContent);
    console.log("✅ Arquivo .env criado com sucesso!");
  } else {
    console.log(
      "\nO arquivo .env já existe. As chaves NÃO foram adicionadas automaticamente.",
    );
    console.log(
      "Adicione manualmente as chaves acima ao seu arquivo .env existente.",
    );
  }

  // Instruções para o usuário
  console.log("\n📋 INSTRUÇÕES:");
  console.log(
    "1. As chaves foram salvas no banco de dados para acesso via painel de administração",
  );
  console.log(
    "2. Adicione as chaves acima como variáveis de ambiente ou no arquivo .env para acesso direto",
  );
  console.log("3. Reinicie sua aplicação para aplicar as novas chaves");
  console.log("4. A comunicação via notificações push estará disponível");
}

// Executar função principal
main().catch((error) => {
  console.error("Erro ao gerar chaves VAPID:", error);
  process.exit(1);
});
