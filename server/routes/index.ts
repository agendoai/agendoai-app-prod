import { Router } from "express";
import { supportTicketRoutes } from "./support-ticket-routes";
import { asaasMarketplaceRouter } from "./asaas-marketplace-routes";

// Criar roteador para todas as rotas administrativas
const adminRouter = Router();

// Registrar as rotas de tickets de suporte no roteador de admin
adminRouter.use("/support", supportTicketRoutes);

// Exportar os roteadores para uso no routes.ts principal
export { adminRouter, asaasMarketplaceRouter };