import { pgTable, text, serial, integer, timestamp, boolean, jsonb, doublePrecision, decimal, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for both clients and providers)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  profileImage: text("profile_image"),
  userType: text("user_type").notNull().default("client"), // "client", "provider", "admin" ou "support"
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  asaasCustomerId: varchar('asaas_customer_id', { length: 64 }),
  cpf: varchar('cpf', { length: 18 }).notNull(), // CPF/CNPJ obrigatório
  valortaxa: doublePrecision("valor_taxa").default(1.75), // Taxa personalizada do usuário em reais (padrão R$ 1,75)
});

// Endereços dos usuários
export const userAddresses = pgTable("user_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("home"), // "home", "work", "other"
  name: text("name").notNull(),
  street: text("street").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela gerenciada na seção de métodos de pagamento (abaixo)

// Niches (top level category groups)
export const niches = pgTable("niches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories of services
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  nicheId: integer("niche_id").notNull().references(() => niches.id), // Relação com o nicho pai
  parentId: integer("parent_id"), // Relação com a categoria pai (para subcategorias)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Standard services/templates (system wide)
export const serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  nicheId: integer("niche_id").references(() => niches.id), // Relação opcional com o nicho (para melhor hierarquia)
  icon: text("icon"),
  duration: integer("duration").default(60), // Duração padrão do serviço em minutos
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services offered by providers
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  nicheId: integer("niche_id").references(() => niches.id), // Relação opcional com o nicho (para melhor hierarquia)
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").default(0), // Mantido como 0 por compatibilidade, mas não será exibido na UI
  duration: integer("duration").notNull(), // in minutes - tempo padrão
  isActive: boolean("is_active").default(true),
});

// Provider services with customized execution time and price
export const providerServices = pgTable("provider_services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  serviceId: integer("service_id").notNull().references(() => services.id), 
  executionTime: integer("execution_time").notNull(), // Tempo de execução personalizado em minutos
  duration: integer("duration").notNull(), // Duração total do serviço em minutos
  price: integer("price").notNull(), // Preço personalizado pelo prestador
  breakTime: integer("break_time").default(0), // Tempo de intervalo/descanso após o serviço em minutos
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Provider availability
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  startTime: text("start_time").notNull(), // "HH:MM" format
  endTime: text("end_time").notNull(), // "HH:MM" format
  isAvailable: boolean("is_available").default(true),
  date: text("date"), // "YYYY-MM-DD" format for specific days
  intervalMinutes: integer("interval_minutes").default(30), // Intervalo entre horários disponíveis
});

// Blocked time slots within available hours
export const blockedTimeSlots = pgTable("blocked_time_slots", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  availabilityId: integer("availability_id").notNull(), // Referência à disponibilidade principal 
  date: text("date"), // "YYYY-MM-DD" format para data específica ou null para recorrente
  startTime: text("start_time").notNull(), // "HH:MM" format
  endTime: text("end_time").notNull(), // "HH:MM" format
  reason: text("reason"), // Razão opcional para o bloqueio
  blockedByUserId: integer("blocked_by_user_id"), // ID do usuário que criou o bloqueio
  metadata: jsonb("metadata"), // Metadados adicionais do bloqueio em formato JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// Intervalos personalizados do prestador (almoço, janta, etc.)
export const providerBreaks = pgTable("provider_breaks", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  name: text("name").notNull(), // Nome do intervalo (ex: "Almoço", "Janta", "Pausa para café")
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Domingo, 6 = Sábado
  startTime: text("start_time").notNull(), // "HH:MM" format
  endTime: text("end_time").notNull(), // "HH:MM" format
  isRecurring: boolean("is_recurring").default(true), // Intervalo recorrente ou apenas uma vez
  date: text("date"), // "YYYY-MM-DD" se for um intervalo específico
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments/bookings
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  providerId: integer("provider_id").notNull(),
  serviceId: integer("service_id").notNull(),
  providerServiceId: integer("provider_service_id"), // ID do serviço específico do prestador 
  date: text("date").notNull(), // "YYYY-MM-DD" format
  startTime: text("start_time").notNull(), // "HH:MM" format
  endTime: text("end_time").notNull(), // "HH:MM" format
  availabilityId: integer("availability_id"), // ID da disponibilidade (agendamento)
  status: text("status").default("pending"), // "pending", "confirmed", "executing", "completed", "canceled"
  notes: text("notes"),
  paymentMethod: text("payment_method"), // "local", "credit_card", "pix"
  paymentStatus: text("payment_status"), // "pending", "paid", "failed", "refunded" 
  paymentId: varchar("paymentid", { length: 64 }), // ID do pagamento (Stripe payment_intent_id)
  payment_id: text("payment_id"), // Campo legado - manter para compatibilidade
  isManuallyCreated: boolean("is_manually_created").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  // Campos adicionais para exibição
  serviceName: text("service_name"),
  providerName: text("provider_name"),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  totalPrice: integer("total_price"),
  // NOVOS CAMPOS PARA VALIDAÇÃO
  validationCodeHash: text("validation_code_hash"),
  validationCode: text("validation_code"), // Código em texto para o cliente visualizar
  validationAttempts: integer("validation_attempts").default(0),
});

// Provider settings
export const providerSettings = pgTable("provider_settings", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().unique(),
  stripeAccountId: text("stripe_account_id"),
  isOnline: boolean("is_online").default(false),
  businessName: text("business_name"),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  zip: text("zip"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  coverImage: text("cover_image"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  businessHours: text("business_hours"), // JSON string with business hours
  specialties: text("specialties"), // Comma-separated list of specialties
  acceptsCards: boolean("accepts_cards").default(true),
  acceptsPix: boolean("accepts_pix").default(true),
  acceptsCash: boolean("accepts_cash").default(true),
  acceptOnlinePayments: boolean("accept_online_payments").default(false), // Aceita pagamentos online via API SumUp
  merchantCode: text("merchant_code"), // Código do comerciante na SumUp
  rating: integer("rating"), // Stored as rating * 10 (e.g., 4.5 = 45)
  ratingCount: integer("rating_count").default(0),
  bio: text("bio"),
  defaultServiceDuration: integer("default_service_duration").default(60), // Duração padrão dos serviços em minutos
});

// Provider payment preferences
export const providerPaymentPreferences = pgTable("provider_payment_preferences", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().unique(),
  // Métodos de recebimento
  acceptsCreditCard: boolean("accepts_credit_card").default(true),
  acceptsDebitCard: boolean("accepts_debit_card").default(true),
  acceptsPix: boolean("accepts_pix").default(true),
  acceptsCash: boolean("accepts_cash").default(true),
  acceptsTransfer: boolean("accepts_transfer").default(false),
  // Preferências de processamento
  preferStripe: boolean("prefer_stripe").default(true),
  preferAsaas: boolean("prefer_asaas").default(false),
  preferManual: boolean("prefer_manual").default(false),
  // Preferências adicionais
  autoConfirm: boolean("auto_confirm").default(false), // Confirmar automaticamente pagamentos
  requestPrePayment: boolean("request_pre_payment").default(false), // Solicitar pagamento antecipado
  allowPartialPayment: boolean("allow_partial_payment").default(false), // Permite pagamento parcial/parcelado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client payment preferences
export const clientPaymentPreferences = pgTable("client_payment_preferences", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique(),
  // Métodos de pagamento preferidos
  preferCreditCard: boolean("prefer_credit_card").default(true),
  preferDebitCard: boolean("prefer_debit_card").default(false),
  preferPix: boolean("prefer_pix").default(false),
  preferCash: boolean("prefer_cash").default(false),
  // Cartão padrão
  defaultCardId: text("default_card_id"),
  // Outras preferências
  savePaymentInfo: boolean("save_payment_info").default(true), // Salvar informações de pagamento
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform payment settings
export const paymentSettings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  // Configurações gerais
  serviceFeePercentage: integer("service_fee_percentage").default(175), // Taxa fixa da plataforma em centavos (R$ 1,75)
  serviceFee: integer("service_fee").default(175), // Campo mantido para compatibilidade (R$ 1,75)
  minServiceFee: integer("min_service_fee").default(100), // Valor mínimo da taxa em centavos (R$ 1,00)
  maxServiceFee: integer("max_service_fee").default(5000), // Valor máximo da taxa em centavos (R$ 50,00)
  payoutSchedule: text("payout_schedule").default("weekly"), // "instant", "daily", "weekly", "monthly"
  
  // Configurações do Stripe
  stripeEnabled: boolean("stripe_enabled").default(false),
  stripeLiveMode: boolean("stripe_live_mode").default(false),
  stripePublicKey: text("stripe_public_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeConnectEnabled: boolean("stripe_connect_enabled").default(false),
  
  // Configurações do Asaas
  asaasEnabled: boolean("asaas_enabled").default(false),
  asaasLiveMode: boolean("asaas_live_mode").default(false),
  asaasApiKey: text("asaas_api_key"),
  asaasWebhookToken: text("asaas_webhook_token"),
  asaasWalletId: text("asaas_wallet_id"),
  asaasSplitEnabled: boolean("asaas_split_enabled").default(false),
});

// Configurações de integrações externas
export const integrationsSettings = pgTable("integrations_settings", {
  id: serial("id").primaryKey(),
  // SendGrid (Email)
  sendGridEnabled: boolean("sendgrid_enabled").default(false),
  sendGridApiKey: text("sendgrid_api_key"),
  // Web Push (Notificações)
  pushNotificationsEnabled: boolean("push_notifications_enabled").default(false),
  vapidPublicKey: text("vapid_public_key"),
  vapidPrivateKey: text("vapid_private_key"),
  // WhatsApp
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappVerifyToken: text("whatsapp_verify_token"),
  whatsappBusinessId: text("whatsapp_business_id"),
  whatsappChatbotEnabled: boolean("whatsapp_chatbot_enabled").default(false),
  whatsappChatbotWelcomeMessage: text("whatsapp_chatbot_welcome_message"),
  whatsappChatbotSchedulingEnabled: boolean("whatsapp_chatbot_scheduling_enabled").default(false),
  // Metadata
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // ID do usuário que criou o ticket
  adminId: integer("admin_id"), // ID do administrador responsável (null se não atribuído)
  subject: text("subject").notNull(),
  category: text("category").default("general"), // general, technical, billing, etc.
  priority: text("priority").default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("pending"), // pending, in-progress, resolved, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  lastResponseAt: timestamp("last_response_at"),
  readByUser: boolean("read_by_user").default(false),
  readByAdmin: boolean("read_by_admin").default(false),
});

// Support messages (conversas dentro de um ticket)
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  userId: integer("user_id"), // ID do usuário que enviou a mensagem (null se foi um admin)
  adminId: integer("admin_id"), // ID do administrador que enviou a mensagem (null se foi o usuário)
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"), // URL para anexo, se houver
  isInternal: boolean("is_internal").default(false), // Notas internas visíveis apenas para admins
  createdAt: timestamp("created_at").defaultNow(),
  readByUser: boolean("read_by_user").default(false),
  readByAdmin: boolean("read_by_admin").default(false),
});

// Reviews/ratings for service providers
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(), // Cliente que fez a avaliação
  providerId: integer("provider_id").notNull(), // Prestador que foi avaliado
  appointmentId: integer("appointment_id").notNull(), // Agendamento relacionado à avaliação
  rating: integer("rating").notNull(), // Classificação de 1-5
  comment: text("comment"), // Comentário opcional
  publishedAt: timestamp("published_at").defaultNow(),
  isPublic: boolean("is_public").default(true), // Se a avaliação é pública
  providerResponse: text("provider_response"), // Resposta do prestador de serviço
  status: text("status").notNull().default("published"), // published, hidden, reported
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Insert schema para providerServices (customização de serviços por prestador)
export const insertProviderServiceSchema = createInsertSchema(providerServices).omit({
  id: true,
  createdAt: true
});

// Insert Schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true, 
  createdAt: true
});

export const insertNicheSchema = createInsertSchema(niches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true
});

export const insertBlockedTimeSlotSchema = createInsertSchema(blockedTimeSlots).omit({
  id: true,
  createdAt: true
});

export const insertProviderBreakSchema = createInsertSchema(providerBreaks).omit({
  id: true,
  createdAt: true
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true
});

export const insertProviderSettingsSchema = createInsertSchema(providerSettings).omit({
  id: true
});

// Schemas para paymentSettings
export const insertPaymentSettingsSchema = createInsertSchema(paymentSettings).omit({
  id: true
});

// Schema para supportTickets
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  lastResponseAt: true,
  adminId: true
});

// Schema para supportMessages
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true
});

// Schema para reviews
export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  publishedAt: true,
  updatedAt: true,
  providerResponse: true,
  status: true
});

// Schema para serviceTemplates
export const insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  // Garantir que a duração é sempre um número
  duration: z.number().min(5).default(60)
});

// Estatísticas de prestador individual
export type ProviderAnalytics = {
  // Estatísticas gerais
  totalAppointments: number;
  completedAppointments: number; 
  canceledAppointments: number;
  pendingAppointments: number;
  totalReviews: number;
  averageRating: number;
  totalRevenue: number;
  
  // Estatísticas por período
  appointmentsByDay: { date: string; count: number }[];
  appointmentsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; total: number }[];
  
  // Estatísticas de serviços
  topServices: {
    serviceId: number;
    name: string;
    count: number;
    revenue: number;
  }[];
  
  // Estatísticas de tempo
  busyHours: { hour: number; count: number }[];
  busyDays: { day: number; count: number }[]; // 0 = Sunday, 6 = Saturday
  
  // Tendências
  appointmentTrends: { month: string; count: number; previousCount: number; percentChange: number }[];
  revenueTrends: { month: string; total: number; previousTotal: number; percentChange: number }[];
}

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Niche = typeof niches.$inferSelect;
export type InsertNiche = z.infer<typeof insertNicheSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type ProviderService = typeof providerServices.$inferSelect;
export type InsertProviderService = z.infer<typeof insertProviderServiceSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type BlockedTimeSlot = typeof blockedTimeSlots.$inferSelect;
export type InsertBlockedTimeSlot = z.infer<typeof insertBlockedTimeSlotSchema>;

export type ProviderBreak = typeof providerBreaks.$inferSelect;
export type InsertProviderBreak = z.infer<typeof insertProviderBreakSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type ProviderSettings = typeof providerSettings.$inferSelect;
export type InsertProviderSettings = z.infer<typeof insertProviderSettingsSchema>;

export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;

// Provider payment preferences types
export type ProviderPaymentPreference = typeof providerPaymentPreferences.$inferSelect;
export const insertProviderPaymentPreferenceSchema = createInsertSchema(providerPaymentPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderPaymentPreference = z.infer<typeof insertProviderPaymentPreferenceSchema>;

// Client payment preferences types
export type ClientPaymentPreference = typeof clientPaymentPreferences.$inferSelect;
export const insertClientPaymentPreferenceSchema = createInsertSchema(clientPaymentPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertClientPaymentPreference = z.infer<typeof insertClientPaymentPreferenceSchema>;

// Support ticket types
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

// Support message types
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;

// Review types
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// Onboarding steps tracking
export const onboardingSteps = pgTable("onboarding_steps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userType: text("user_type").notNull(), // client, provider, admin
  order: integer("order").notNull(),
  isRequired: boolean("is_required").default(true),
  icon: text("icon"),
  helpText: text("help_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User onboarding progress
export const userOnboardingProgress = pgTable("user_onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stepId: integer("step_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, skipped
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for onboarding
export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserOnboardingProgressSchema = createInsertSchema(userOnboardingProgress).omit({
  id: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true
});

// Service Template types
export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;

// Onboarding types
export type OnboardingStep = typeof onboardingSteps.$inferSelect;
export type InsertOnboardingStep = z.infer<typeof insertOnboardingStepSchema>;

export type UserOnboardingProgress = typeof userOnboardingProgress.$inferSelect;
export type InsertUserOnboardingProgress = z.infer<typeof insertUserOnboardingProgressSchema>;

// Login data type
export type LoginData = Pick<InsertUser, "email" | "password">;

// Tabela de métodos de pagamento
export const userPaymentMethods = pgTable("user_payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  defaultPaymentMethodId: text("default_payment_method_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema para userPaymentMethods
export const insertUserPaymentMethodsSchema = createInsertSchema(userPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema para userAddresses
export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// UserPaymentMethods types
export type UserPaymentMethod = typeof userPaymentMethods.$inferSelect;
export type InsertUserPaymentMethod = z.infer<typeof insertUserPaymentMethodsSchema>;

// UserAddress types
export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"), // info, appointment, payment, system, alert, etc.
  read: boolean("read").default(false),
  linkTo: text("link_to"), // URL para direcionar o usuário quando clicar na notificação
  appointmentId: integer("appointment_id"), // ID do agendamento relacionado (se houver)
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schema para notifications
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Tabela para redefinição de senha
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at")
});

// Password reset schema
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true
});

// Schema para integrationsSettings
export const insertIntegrationsSettingsSchema = createInsertSchema(integrationsSettings).omit({
  id: true,
  updatedAt: true
});

// Password reset types
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Integration settings types
export type IntegrationsSettings = typeof integrationsSettings.$inferSelect;
export type InsertIntegrationsSettings = z.infer<typeof insertIntegrationsSettingsSchema>;

// Tabela de promoções e descontos
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  discountPercentage: integer("discount_percentage"), // Percentual de desconto
  discountValue: integer("discount_value"), // Valor fixo de desconto em centavos
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  providerId: integer("provider_id").references(() => users.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  nicheId: integer("niche_id").references(() => niches.id, { onDelete: "set null" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  image: text("image"),
  couponCode: text("coupon_code"),
  isActive: boolean("is_active").notNull().default(true),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema para promotions
export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Promotion types
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

// Saldos dos prestadores (modelo marketplace)
export const providerBalances = pgTable('provider_balances', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => users.id),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
  availableBalance: decimal('available_balance', { precision: 10, scale: 2 }).default('0'),
  pendingBalance: decimal('pending_balance', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transações financeiras dos prestadores
export const providerTransactions = pgTable('provider_transactions', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: text('type').notNull(), // 'payment', 'commission', 'withdrawal'
  status: text('status').notNull(), // 'pending', 'completed', 'failed'
  appointmentId: integer('appointment_id').references(() => appointments.id),
  createdAt: timestamp('created_at').defaultNow(),
  description: text('description'),
  metadata: jsonb('metadata'),
});

// Solicitações de saque
export const paymentWithdrawals = pgTable('payment_withdrawals', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
  paymentMethod: text('payment_method').notNull(), // 'bank_transfer', 'pix'
  paymentDetails: jsonb('payment_details'), // Dados bancários ou chave PIX
  requestedAt: timestamp('requested_at').defaultNow(),
  processedAt: timestamp('processed_at'),
  transactionId: text('transaction_id'),
  notes: text('notes'),
});

// Schemas de inserção e tipos para marketplace
export const insertProviderBalanceSchema = createInsertSchema(providerBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderTransactionSchema = createInsertSchema(providerTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentWithdrawalSchema = createInsertSchema(paymentWithdrawals).omit({
  id: true,
  requestedAt: true,
  processedAt: true,
});

export type ProviderBalance = typeof providerBalances.$inferSelect;
export type InsertProviderBalance = z.infer<typeof insertProviderBalanceSchema>;

export type ProviderTransaction = typeof providerTransactions.$inferSelect;
export type InsertProviderTransaction = z.infer<typeof insertProviderTransactionSchema>;

export type PaymentWithdrawal = typeof paymentWithdrawals.$inferSelect;
export type InsertPaymentWithdrawal = z.infer<typeof insertPaymentWithdrawalSchema>;

// Tabela de configurações do sistema (incluindo chaves VAPID para notificações push)
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  label: text('label').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`)
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// Tabela para armazenar taxas de serviço específicas por prestador
export const providerServiceFees = pgTable('provider_service_fees', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => users.id),
  fixedFee: integer('fixed_fee').notNull().default(0), // Valor fixo da taxa em centavos
  description: text('description'), // Descrição opcional para justificar a taxa personalizada
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertProviderServiceFeeSchema = createInsertSchema(providerServiceFees).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ProviderServiceFee = typeof providerServiceFees.$inferSelect;
export type InsertProviderServiceFee = z.infer<typeof insertProviderServiceFeeSchema>;
