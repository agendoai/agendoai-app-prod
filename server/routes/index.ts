import { Router } from "express";
import { supportTicketRoutes } from "./support-ticket-routes";
import { asaasMarketplaceRouter } from "./asaas-marketplace-routes";
import authRoutes from "./auth-routes";
import marketplaceRoutes from "./marketplace-routes";
import adminWithdrawalRoutes from "./admin-withdrawal-routes";
import appointmentStatusRoutes from "./appointment-status-routes";
import appointmentValidationRoutes from "./appointment-validation-routes";

// Criar roteador para todas as rotas administrativas
const adminRouter = Router();

// Registrar as rotas de tickets de suporte no roteador de admin
adminRouter.use("/support", supportTicketRoutes);

// Registrar as rotas de saques no roteador de admin
adminRouter.use("", adminWithdrawalRoutes);

// Exportar os roteadores para uso no routes.ts principal
export { adminRouter, asaasMarketplaceRouter, authRoutes, marketplaceRoutes, appointmentStatusRoutes, appointmentValidationRoutes };