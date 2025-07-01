/**
 * Melhorias para storage.ts - Métodos em batch para busca de entidades
 * 
 * Este arquivo contém implementações adicionais dos métodos em batch
 * que foram adicionados à interface IStorage para suportar o gerenciador
 * de serviços de prestadores unificado.
 */

import { db } from "../db";
import { inArray, eq } from "drizzle-orm";
import { 
  services, 
  categories, 
  niches, 
  Service, 
  Category, 
  Niche 
} from "@shared/schema";

// Métodos para suportar a busca em batch de serviços
export async function getServicesByIds(ids: number[]): Promise<Service[]> {
  try {
    if (!ids || ids.length === 0) return [];
    
    const servicesFromDb = await db.select()
      .from(services)
      .where(inArray(services.id, ids));
    
    return servicesFromDb;
  } catch (error) {
    console.error(`Erro ao buscar serviços por IDs: ${ids.join(', ')}`, error);
    return [];
  }
}

// Métodos para suportar a busca em batch de categorias
export async function getCategoriesByIds(ids: number[]): Promise<Category[]> {
  try {
    if (!ids || ids.length === 0) return [];
    
    const categoriesFromDb = await db.select()
      .from(categories)
      .where(inArray(categories.id, ids));
    
    return categoriesFromDb;
  } catch (error) {
    console.error(`Erro ao buscar categorias por IDs: ${ids.join(', ')}`, error);
    return [];
  }
}

// Métodos para suportar a busca em batch de nichos
export async function getNichesByIds(ids: number[]): Promise<Niche[]> {
  try {
    if (!ids || ids.length === 0) return [];
    
    const nichesFromDb = await db.select()
      .from(niches)
      .where(inArray(niches.id, ids));
    
    return nichesFromDb;
  } catch (error) {
    console.error(`Erro ao buscar nichos por IDs: ${ids.join(', ')}`, error);
    return [];
  }
}

// Use estes métodos para estender a classe DatabaseStorage:
// 
// DatabaseStorage.prototype.getServicesByIds = getServicesByIds;
// DatabaseStorage.prototype.getCategoriesByIds = getCategoriesByIds;
// DatabaseStorage.prototype.getNichesByIds = getNichesByIds;