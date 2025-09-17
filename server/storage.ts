import { 
  User, InsertUser, 
  Category, InsertCategory,
  Niche, InsertNiche,
  Service, InsertService, 
  Availability, InsertAvailability,
  Appointment, InsertAppointment,
  PaymentSettings, InsertPaymentSettings,
  ProviderSettings, InsertProviderSettings,
  SupportMessage, InsertSupportMessage,
  Review, InsertReview,
  ServiceTemplate, InsertServiceTemplate,
  OnboardingStep, InsertOnboardingStep,
  UserOnboardingProgress, InsertUserOnboardingProgress,
  Notification, InsertNotification,
  PasswordResetToken, InsertPasswordResetToken,
  BlockedTimeSlot, InsertBlockedTimeSlot,
  ProviderBreak, InsertProviderBreak,
  UserPaymentMethod, InsertUserPaymentMethod,
  UserAddress, InsertUserAddress,
  IntegrationsSettings, InsertIntegrationsSettings,
  ProviderService, InsertProviderService,
  Promotion, InsertPromotion,
  ProviderAnalytics,
  // Sistema
  SystemSetting, InsertSystemSetting,
  // Marketplace
  ProviderBalance, InsertProviderBalance,
  ProviderTransaction, InsertProviderTransaction,
  PaymentWithdrawal, InsertPaymentWithdrawal,
  // Provider Fees
  ProviderServiceFee, InsertProviderServiceFee,
  // Tables
  users,
  niches,
  categories,
  services,
  supportMessages,
  availability,
  appointments,
  providerSettings,
  reviews,
  paymentSettings,
  serviceTemplates,
  onboardingSteps,
  userOnboardingProgress,
  notifications,
  passwordResetTokens,
  blockedTimeSlots,
  providerBreaks,
  userPaymentMethods,
  userAddresses,
  integrationsSettings,
  providerServices,
  systemSettings,
  providerBalances,
  providerTransactions,
  paymentWithdrawals
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, like, count, or, inArray, gte, isNull, lte } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import createMemoryStore from "memorystore";
import { pool } from "./db";
import { hashPassword } from "./auth";
import { promotions } from "@shared/schema";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Interface for storage operations
// Interface para registro de bloqueios de horários com detalhes
export interface BlockedTimeSlotHistory {
  id: number;
  providerId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: Date;
  blockedByUserId?: number;
  isActive: boolean;
  metadata?: {
    type: 'lunch' | 'manual' | 'appointment' | 'system';
    recurrentId?: string;
    appointmentId?: number;
  };
}

// Tipos para relatórios
export interface AdminSummaryReport {
  totalUsers: number;
  totalProviders: number;
  totalClients: number;
  totalServices: number;
  totalCategories: number;
  totalAppointments: number;
  appointmentsByStatus: { [key: string]: number };
  recentAppointments: Appointment[];
}

export interface ProviderReport {
  providers: {
    id: number;
    name: string;
    email: string;
    totalAppointments: number;
    rating: number | null;
    isOnline: boolean;
  }[];
}

export interface ServiceReport {
  categories: {
    id: number;
    name: string;
    serviceCount: number;
    services: {
      id: number;
      name: string;
      appointmentCount: number;
      providerCount: number;
    }[];
  }[];
}

export interface BlockedTimeSlotHistory {
  id: number;
  blockedTimeSlotId: number;
  providerId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  blockedByUserId: number | null;
  actionType: 'create' | 'update' | 'delete';
  actionTimestamp: Date;
  metadata: {
    type: 'lunch' | 'manual' | 'appointment' | 'system';
    recurrentId?: string;
    appointmentId?: number;
    originalReason?: string;
    notes?: string;
  } | null;
}

export interface IStorage {
  // Provider fees (taxas específicas por prestador)
  getAllProviderFees(): Promise<ProviderServiceFee[]>;
  getProviderFee(id: number): Promise<ProviderServiceFee | undefined>;
  getProviderFeeByProviderId(providerId: number): Promise<ProviderServiceFee | undefined>;
  createProviderFee(fee: InsertProviderServiceFee): Promise<ProviderServiceFee>;
  updateProviderFee(id: number, fee: Partial<InsertProviderServiceFee>): Promise<ProviderServiceFee>;
  deleteProviderFee(id: number): Promise<void>;
  getAllProviders(): Promise<User[]>;
  // Armazenamento de sessão
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByType(userType: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserPassword(userId: number, newPassword: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersCount(userType?: string): Promise<number>;
  getNewUsersByDay(startDate: Date, endDate: Date): Promise<{ date: string, count: number }[]>;
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  updatePasswordResetToken(id: number, data: Partial<PasswordResetToken>): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>; // Admin: obter todos os usuários
  
  // Operações de pagamento com Stripe
  updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, stripeInfo: { customerId: string, subscriptionId: string }): Promise<boolean>;
  getUserPaymentMethods(userId: number): Promise<UserPaymentMethod[]>;
  getUserPaymentMethodById(id: number): Promise<UserPaymentMethod | undefined>;
  createUserPaymentMethod(data: InsertUserPaymentMethod): Promise<UserPaymentMethod>;
  getAllProviders(): Promise<User[]>; // Obter todos os prestadores de serviço
  getClientUsers(): Promise<User[]>; // Obter todos os usuários do tipo cliente
  
  // Calendar operations
  getProviderClients(providerId: number): Promise<{ id: number, name: string, email: string }[]>;
  getAppointmentsByProviderId(providerId: number): Promise<Appointment[]>;

  // Niche operations
  getNiches(): Promise<Niche[]>;
  getNichesWithCategoriesAndServices(): Promise<Niche[]>;
  getNiche(id: number): Promise<Niche | undefined>;
  getNichesByIds(ids: number[]): Promise<Niche[]>;
  createNiche(niche: InsertNiche): Promise<Niche>;
  updateNiche(id: number, niche: Partial<Niche>): Promise<Niche | undefined>;
  deleteNiche(id: number): Promise<boolean>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoriesWithNicheInfo(): Promise<any[]>; // Retorna categorias com informações de nicho
  getCategoriesWithServices(): Promise<any[]>; // Retorna categorias com seus serviços
  getCategoriesByNicheId(nicheId: number): Promise<Category[]>;
  getCategoriesByIds(ids: number[]): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryWithServices(id: number): Promise<any | undefined>; // Retorna uma categoria específica com seus serviços
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined>; // Admin: atualizar categoria
  deleteCategory(id: number): Promise<boolean>; // Admin: excluir categoria
  
  // Service Template operations
  getServiceTemplates(): Promise<ServiceTemplate[]>;
  getServiceTemplatesByCategoryId(categoryId: number): Promise<ServiceTemplate[]>;
  getServiceTemplatesByNiche(nicheId: number): Promise<ServiceTemplate[]>;
  getServiceTemplate(id: number): Promise<ServiceTemplate | undefined>;
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  updateServiceTemplate(id: number, template: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;

  // Service operations
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByIds(ids: number[]): Promise<Service[]>;
  getServicesByCategory(categoryId: number): Promise<Service[]>;
  getServicesByProvider(providerId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Provider Service operations (customized execution time)
  getProviderService(id: number): Promise<ProviderService | undefined>;
  getProviderServiceByProviderAndService(providerId: number, serviceId: number): Promise<ProviderService | undefined>;
  getProviderServicesByProvider(providerId: number): Promise<ProviderService[]>;
  createProviderService(providerService: InsertProviderService): Promise<ProviderService>;
  updateProviderService(id: number, providerService: Partial<ProviderService>): Promise<ProviderService | undefined>;
  deleteProviderService(id: number): Promise<boolean>;

  // Availability operations
  getAvailability(id: number): Promise<Availability | undefined>;
  getAvailabilitiesByProviderId(providerId: number): Promise<Availability[]>;
  getAvailabilityByDay(providerId: number, dayOfWeek: number): Promise<Availability | undefined>;
  getAvailabilityByDate(providerId: number, date: string): Promise<Availability | undefined>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, availability: Partial<Availability>): Promise<Availability | undefined>;
  deleteAvailability(id: number): Promise<boolean>;
  createAvailabilityBatch(availabilityList: InsertAvailability[]): Promise<Availability[]>;
  
  // Time Slots operations
  getAvailableTimeSlots(providerId: number, date: string, serviceId?: number): Promise<{ startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number }[]>;
  blockTimeSlot(slotData: { 
    providerId: number, 
    date: string, 
    startTime: string, 
    endTime: string, 
    reason?: string,
    blockedByUserId?: number,
    metadata?: {
      type: 'lunch' | 'manual' | 'appointment' | 'system';
      recurrentId?: string;
      appointmentId?: number;
    }
  }): Promise<BlockedTimeSlot>;
  unblockTimeSlot(slotData: { providerId: number, date: string, startTime: string, endTime: string, availabilityId?: number }): Promise<boolean>;
  
  // Blocked Time Slots operations
  getBlockedTimeSlotById(id: number): Promise<BlockedTimeSlot | undefined>;
  getBlockedTimeSlotsByProviderId(providerId: number): Promise<BlockedTimeSlot[]>;
  getBlockedTimeSlotsByAvailabilityId(availabilityId: number): Promise<BlockedTimeSlot[]>;
  getBlockedTimeSlotsByDate(providerId: number, date: string): Promise<BlockedTimeSlot[]>;
  createBlockedTimeSlot(blockedSlot: InsertBlockedTimeSlot): Promise<BlockedTimeSlot>;
  deleteBlockedTimeSlot(id: number): Promise<boolean>;
  
  // Time Slot History operations (registro detalhado de bloqueios)
  getBlockedTimeSlotsHistory(providerId: number, date?: string): Promise<BlockedTimeSlotHistory[]>;
  getBlockedTimeSlotHistoryById(id: number): Promise<BlockedTimeSlotHistory | undefined>;
  getBlockedTimeSlotsHistoryByType(providerId: number, type: 'lunch' | 'manual' | 'appointment' | 'system'): Promise<BlockedTimeSlotHistory[]>;
  
  // Provider Breaks operations (intervalos personalizados)
  getProviderBreak(id: number): Promise<ProviderBreak | undefined>;
  getProviderBreaksByProviderId(providerId: number): Promise<ProviderBreak[]>;
  getProviderBreaksByDay(providerId: number, dayOfWeek: number): Promise<ProviderBreak[]>;
  getProviderBreaksByDate(providerId: number, date: string): Promise<ProviderBreak[]>;
  createProviderBreak(breakData: InsertProviderBreak): Promise<ProviderBreak>;
  updateProviderBreak(id: number, breakData: Partial<ProviderBreak>): Promise<ProviderBreak | undefined>;
  deleteProviderBreak(id: number): Promise<boolean>;

  // Appointment operations
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentByPaymentId(paymentId: string): Promise<Appointment | undefined>;
  getClientAppointments(clientId: number): Promise<Appointment[]>;
  getProviderAppointments(providerId: number): Promise<Appointment[]>;
  getProviderAppointmentsByDate(providerId: number, date: string): Promise<Appointment[]>;
  getAppointmentsByProviderAndService(providerId: number, serviceId: number): Promise<Appointment[]>;
  getAllAppointments(): Promise<Appointment[]>; // Admin: obter todos os agendamentos
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;

  // Provider settings operations
  getProviderSettings(providerId: number): Promise<ProviderSettings | undefined>;
  createProviderSettings(settings: InsertProviderSettings): Promise<ProviderSettings>;
  updateProviderSettings(providerId: number, settings: Partial<ProviderSettings>): Promise<ProviderSettings | undefined>;

  // Provider operations
  getProvider(id: number): Promise<User | undefined>;
  
  // Provider search operations
  getProvidersByService(serviceId: number): Promise<User[]>;
  getProvidersWithSettings(): Promise<(User & { settings: ProviderSettings | undefined })[]>;
  getProvidersByLocation(latitude: number, longitude: number, radiusKm: number): Promise<(User & { settings: ProviderSettings | undefined; distance: number })[]>;
  
  // Support operations
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  getSupportMessage(id: number): Promise<SupportMessage | undefined>;
  getUserSupportMessages(userId: number): Promise<SupportMessage[]>;
  getAllSupportMessages(): Promise<SupportMessage[]>;
  updateSupportMessage(id: number, message: Partial<SupportMessage>): Promise<SupportMessage | undefined>;
  resolveSupportMessage(id: number, adminId: number, response: string): Promise<SupportMessage | undefined>;
  getPendingSupportMessages(): Promise<SupportMessage[]>;
  
  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReview(id: number): Promise<Review | undefined>;
  getClientReviews(clientId: number): Promise<Review[]>;
  getProviderReviews(providerId: number): Promise<Review[]>;
  getAppointmentReview(appointmentId: number): Promise<Review | undefined>;
  createAppointmentReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  updateProviderRating(providerId: number): Promise<number>; // Atualiza a média das avaliações do prestador
  
  // Analytics operations
  generateProviderAnalytics(providerId: number, period?: string): Promise<ProviderAnalytics>; // period: 'week', 'month', 'year', 'all'
  
  // Admin: relatórios
  generateAdminSummaryReport(): Promise<AdminSummaryReport>;
  generateProviderReport(): Promise<ProviderReport>;
  generateServiceReport(): Promise<ServiceReport>;
  getUsersPerDay(days?: number): Promise<Array<{date: string; count: number}>>; // Novos usuários por dia
  getServicesCount(): Promise<number>;
  getCategoriesCount(): Promise<number>;
  getAppointmentsCount(status?: string): Promise<number>;
  getRecentAppointments(limit: number): Promise<any[]>;
  
  // Payment Settings operations
  getPaymentSettings(id?: number): Promise<PaymentSettings | undefined>;
  createPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings>;
  updatePaymentSettings(id: number, settings: Partial<PaymentSettings>): Promise<PaymentSettings | undefined>;

  // Service Templates operations (for admin)
  getServiceTemplates(): Promise<ServiceTemplate[]>;
  getServiceTemplatesByCategoryId(categoryId: number): Promise<ServiceTemplate[]>;
  getServiceTemplate(id: number): Promise<ServiceTemplate | undefined>;
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  updateServiceTemplate(id: number, template: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;
  
  // Onboarding operations
  getOnboardingSteps(userType: string): Promise<OnboardingStep[]>;
  getOnboardingStepsByUserType(userType: string): Promise<OnboardingStep[]>;
  getOnboardingStep(id: number): Promise<OnboardingStep | undefined>;
  
  // Promotion operations
  getPromotions(): Promise<Promotion[]>;
  getPromotionById(id: number): Promise<Promotion | undefined>;
  getActivePromotions(currentDate: Date): Promise<Promotion[]>;
  getApplicablePromotions(filters: { 
    serviceId?: number; 
    providerId?: number; 
    categoryId?: number;
    nicheId?: number; 
    currentDate: Date;
  }): Promise<Promotion[]>;
  
  // System Settings operations
  getSystemSettingByKey(key: string): Promise<SystemSetting | null>;
  setSystemSetting(key: string, value: string, label: string, description?: string): Promise<SystemSetting | null>;
  deleteSystemSetting(key: string): Promise<boolean>;
  getPromotionByCouponCode(data: {
    couponCode: string;
    serviceId?: number;
    providerId?: number;
    currentDate: Date;
  }): Promise<Promotion | undefined>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined>;
  deletePromotion(id: number): Promise<boolean>;
  createOnboardingStep(step: InsertOnboardingStep): Promise<OnboardingStep>;
  updateOnboardingStep(id: number, step: Partial<OnboardingStep>): Promise<OnboardingStep | undefined>;
  deleteOnboardingStep(id: number): Promise<boolean>;
  
  // User onboarding progress operations
  getUserOnboardingProgress(userId: number): Promise<UserOnboardingProgress[]>;
  createUserOnboardingProgress(progress: InsertUserOnboardingProgress): Promise<UserOnboardingProgress>;
  updateUserOnboardingProgress(userId: number, stepId: number, status: string): Promise<UserOnboardingProgress | undefined>;
  getOnboardingCompletionPercentage(userId: number): Promise<number>;
  markStepAsComplete(userId: number, stepId: number): Promise<UserOnboardingProgress | undefined>;
  markStepAsSkipped(userId: number, stepId: number): Promise<UserOnboardingProgress | undefined>;
  
  // Notification operations
  getNotifications(userId: number): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, data: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Payment method operations
  getUserPaymentMethod(userId: number): Promise<UserPaymentMethod | undefined>;
  createUserPaymentMethod(data: InsertUserPaymentMethod): Promise<UserPaymentMethod>;
  updateUserPaymentMethod(userId: number, data: Partial<UserPaymentMethod>): Promise<UserPaymentMethod | undefined>;
  
  // User address operations
  getUserAddresses(userId: number): Promise<UserAddress[]>;
  getUserAddress(id: string): Promise<UserAddress | undefined>;
  createUserAddress(data: InsertUserAddress): Promise<UserAddress>;
  updateUserAddress(id: string, data: Partial<UserAddress>): Promise<UserAddress | undefined>;
  deleteUserAddress(id: string): Promise<boolean>;
  setDefaultUserAddress(userId: number, addressId: string): Promise<boolean>;
  
  // Integrations Settings operations
  getIntegrationsSettings(): Promise<IntegrationsSettings | undefined>;
  createIntegrationsSettings(settings: InsertIntegrationsSettings): Promise<IntegrationsSettings>;
  updateIntegrationsSettings(id: number, settings: Partial<IntegrationsSettings>): Promise<IntegrationsSettings | undefined>;
  
  // Withdrawal methods
  getAllWithdrawals(options?: { offset?: number, limit?: number, status?: string }): Promise<{ withdrawals: PaymentWithdrawal[], total: number }>;
  getPaymentWithdrawal(id: number): Promise<PaymentWithdrawal | undefined>;
  getProviderWithdrawals(providerId: number, options?: { offset?: number, limit?: number, status?: string }): Promise<{ withdrawals: PaymentWithdrawal[], total: number }>;
  createPaymentWithdrawal(withdrawal: InsertPaymentWithdrawal): Promise<PaymentWithdrawal>;
  updatePaymentWithdrawal(id: number, withdrawal: Partial<InsertPaymentWithdrawal>): Promise<PaymentWithdrawal>;
  
  // Provider transaction methods
  getProviderTransactions(providerId: number, options?: { offset?: number, limit?: number, type?: string }): Promise<{ transactions: ProviderTransaction[], total: number }>;
  getTransactionByWithdrawalId(withdrawalId: number): Promise<ProviderTransaction | undefined>;
  createProviderTransaction(transaction: InsertProviderTransaction): Promise<ProviderTransaction>;
  updateProviderTransaction(id: number, transaction: Partial<InsertProviderTransaction>): Promise<ProviderTransaction>;
  
  // Não há mais sessions aqui - integrado na classe
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private niches: Map<number, Niche>;
  private categories: Map<number, Category>;
  private services: Map<number, Service>;
  private availabilities: Map<number, Availability>;
  private appointments: Map<number, Appointment>;
  private providerSettings: Map<number, ProviderSettings>;
  private reviews: Map<number, Review> = new Map();
  private paymentSettings: Map<number, PaymentSettings> = new Map();
  private serviceTemplates: Map<number, ServiceTemplate> = new Map();
  private onboardingSteps: Map<number, OnboardingStep> = new Map();
  private userOnboardingProgress: Map<number, UserOnboardingProgress> = new Map();
  private blockedTimeSlots: Map<number, BlockedTimeSlot> = new Map();
  private userPaymentMethods: Map<number, UserPaymentMethod> = new Map();
  private userAddresses: Map<string, UserAddress> = new Map();
  private integrationsSettings: Map<number, IntegrationsSettings> = new Map();
  private providerServices: Map<number, ProviderService> = new Map();
  
  // IDs for auto-incrementing
  private userIdCounter: number = 1;
  private nicheIdCounter: number = 1;
  private categoryIdCounter: number = 1;
  private serviceIdCounter: number = 1;
  private availabilityIdCounter: number = 1;
  private appointmentIdCounter: number = 1;
  private providerSettingsIdCounter: number = 1;
  private supportMessageIdCounter: number = 1;
  private reviewIdCounter: number = 1;
  private paymentSettingsIdCounter: number = 1;
  private serviceTemplateIdCounter: number = 1;
  private onboardingStepIdCounter: number = 1;
  private userOnboardingProgressIdCounter: number = 1;
  private blockedTimeSlotIdCounter: number = 1;
  private userPaymentMethodIdCounter: number = 1;
  private integrationsSettingsIdCounter: number = 1;
  private providerServiceIdCounter: number = 1;
  
  constructor() {
    this.users = new Map();
    this.niches = new Map();
    this.categories = new Map();
    this.services = new Map();
    this.availabilities = new Map();
    this.appointments = new Map();
    this.providerSettings = new Map();
    
    // Initialize with sample data
    this.initializeData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  // Provider operations
  async getProvider(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (user && user.userType === 'provider') {
      return user;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`Buscando usuário por email: ${email}`);
    console.log(`Usuários disponíveis: ${Array.from(this.users.values()).map(u => u.email).join(', ')}`);
    
    const user = Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    
    console.log(`Usuário encontrado para ${email}: ${!!user}`);
    if (user) {
      console.log(`Detalhes do usuário: ID=${user.id}, Tipo=${user.userType}, Nome=${user.name}`);
    }
    
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username?.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByType(userType: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.userType === userType
    );
  }
  
  async getUsersCount(userType?: string): Promise<number> {
    if (userType) {
      return Array.from(this.users.values()).filter(
        (user) => user.userType === userType
      ).length;
    }
    return this.users.size;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Também remover configurações de provedor se for um prestador
    const user = this.users.get(id);
    if (user && user.userType === "provider") {
      Array.from(this.providerSettings.entries())
        .filter(([_, settings]) => settings.providerId === id)
        .forEach(([settingId]) => this.providerSettings.delete(settingId));
    }
    return this.users.delete(id);
  }
  
  async getNewUsersByDay(startDate: Date, endDate: Date): Promise<{ date: string, count: number }[]> {
    const users = Array.from(this.users.values()).filter(
      (user) => user.createdAt >= startDate && user.createdAt <= endDate
    );
    
    // Agrupar usuários por data (formato YYYY-MM-DD)
    const usersByDay = new Map<string, number>();
    
    users.forEach(user => {
      const date = user.createdAt.toISOString().split('T')[0];
      usersByDay.set(date, (usersByDay.get(date) || 0) + 1);
    });
    
    // Converter para o formato esperado
    return Array.from(usersByDay.entries()).map(([date, count]) => ({ date, count }));
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, newUser);
    
    // If user is a provider, create default provider settings
    if (user.userType === "provider") {
      await this.createProviderSettings({
        providerId: id,
        isOnline: false,
        businessName: user.name || "",
        rating: 0,
        ratingCount: 0
      });
    }
    
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, password: newPassword };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  private passwordResetTokens: Map<number, PasswordResetToken> = new Map();
  private passwordResetTokenIdCounter: number = 1;

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const id = this.passwordResetTokenIdCounter++;
    const token: PasswordResetToken = { 
      ...data, 
      id,
      createdAt: new Date(),
      usedAt: null
    };
    this.passwordResetTokens.set(id, token);
    return token;
  }

  async getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    return Array.from(this.passwordResetTokens.values()).find(
      (t) => t.token === token
    );
  }
  
  async updatePasswordResetToken(id: number, data: Partial<PasswordResetToken>): Promise<PasswordResetToken | undefined> {
    const token = this.passwordResetTokens.get(id);
    if (!token) return undefined;
    
    const updatedToken = { ...token, ...data };
    this.passwordResetTokens.set(id, updatedToken);
    return updatedToken;
  }

  async deletePasswordResetToken(id: number): Promise<boolean> {
    return this.passwordResetTokens.delete(id);
  }

  // Niche operations
  async getNiches(): Promise<Niche[]> {
    return Array.from(this.niches.values());
  }
  
  async getNichesWithCategoriesAndServices(): Promise<Niche[]> {
    const allNiches = await this.getNiches();
    const result = [];
    
    for (const niche of allNiches) {
      const categories = await this.getCategoriesByNicheId(niche.id);
      const nicheWithCategories = {
        ...niche,
        categories: []
      };
      
      for (const category of categories) {
        const services = await this.getServicesByCategory(category.id);
        nicheWithCategories.categories.push({
          ...category,
          services: services || []
        });
      }
      
      result.push(nicheWithCategories);
    }
    
    return result;
  }

  async getNiche(id: number): Promise<Niche | undefined> {
    return this.niches.get(id);
  }

  async createNiche(niche: InsertNiche): Promise<Niche> {
    const id = this.nicheIdCounter++;
    const newNiche: Niche = { 
      ...niche, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.niches.set(id, newNiche);
    return newNiche;
  }

  async updateNiche(id: number, nicheData: Partial<Niche>): Promise<Niche | undefined> {
    const niche = this.niches.get(id);
    if (!niche) return undefined;
    
    const updatedNiche = { 
      ...niche, 
      ...nicheData,
      updatedAt: new Date()
    };
    this.niches.set(id, updatedNiche);
    return updatedNiche;
  }

  async deleteNiche(id: number): Promise<boolean> {
    // Verificar se existem categorias associadas a este nicho
    const categories = await this.getCategoriesByNicheId(id);
    
    // Se houver categorias associadas, não podemos excluir o nicho
    if (categories.length > 0) {
      return false;
    }
    
    return this.niches.delete(id);
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoriesWithNicheInfo(): Promise<any[]> {
    const categories = Array.from(this.categories.values());
    const result = [];
    
    for (const category of categories) {
      const niche = await this.getNiche(category.nicheId);
      
      if (niche) {
        result.push({
          ...category,
          nicheName: niche.name,
          nicheIcon: niche.icon,
          nicheDescription: niche.description
        });
      } else {
        result.push(category);
      }
    }
    
    return result;
  }
  
  /**
   * Busca todas as categorias com seus respectivos serviços
   * para a versão em memória do armazenamento
   */
  async getCategoriesWithServices(): Promise<any[]> {
    const categories = Array.from(this.categories.values());
    const result = [];
    
    for (const category of categories) {
      // Buscar serviços desta categoria
      const categoryServices = Array.from(this.services.values())
        .filter(service => service.categoryId === category.id);
      
      // Adicionar categoria com seus serviços ao resultado
      result.push({
        ...category,
        services: categoryServices || []
      });
    }
    
    return result;
  }

  async getCategoriesByNicheId(nicheId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.nicheId === nicheId
    );
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  /**
   * Busca uma categoria por ID e inclui seus serviços associados
   */
  async getCategoryWithServices(id: number): Promise<any | undefined> {
    const category = this.categories.get(id);
    
    if (!category) {
      return undefined;
    }
    
    // Buscar todos os serviços desta categoria
    const categoryServices = Array.from(this.services.values())
      .filter(service => service.categoryId === id);
    
    // Retornar categoria com seus serviços
    return {
      ...category,
      services: categoryServices || []
    };
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = { 
      ...category, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.categoryId === categoryId
    );
  }

  async getServicesByProvider(providerId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.providerId === providerId
    );
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.serviceIdCounter++;
    const newService: Service = { ...service, id };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService = { ...service, ...serviceData };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }
  
  // Provider Service operations (customized execution time)
  async getProviderService(id: number): Promise<ProviderService | undefined> {
    return this.providerServices.get(id);
  }
  
  async getProviderServiceByProviderAndService(providerId: number, serviceId: number): Promise<ProviderService | undefined> {
    return Array.from(this.providerServices.values()).find(
      ps => ps.providerId === providerId && ps.serviceId === serviceId
    );
  }
  
  async getProviderServicesByProvider(providerId: number): Promise<ProviderService[]> {
    return Array.from(this.providerServices.values()).filter(
      ps => ps.providerId === providerId
    );
  }
  
  async createProviderService(providerService: InsertProviderService): Promise<ProviderService> {
    const id = this.providerServiceIdCounter++;
    const newProviderService: ProviderService = { 
      ...providerService, 
      id,
      createdAt: new Date() 
    };
    this.providerServices.set(id, newProviderService);
    return newProviderService;
  }
  
  async updateProviderService(id: number, providerServiceData: Partial<ProviderService>): Promise<ProviderService | undefined> {
    const providerService = this.providerServices.get(id);
    if (!providerService) return undefined;
    
    const updatedProviderService = { ...providerService, ...providerServiceData };
    this.providerServices.set(id, updatedProviderService);
    return updatedProviderService;
  }
  
  async deleteProviderService(id: number): Promise<boolean> {
    return this.providerServices.delete(id);
  }

  // Availability operations
  async getAvailability(id: number): Promise<Availability | undefined> {
    return this.availabilities.get(id);
  }
  
  async getAvailabilitiesByProviderId(providerId: number): Promise<Availability[]> {
    return Array.from(this.availabilities.values()).filter(
      (availability) => availability.providerId === providerId
    );
  }
  
  async getAvailabilityByDay(providerId: number, dayOfWeek: number): Promise<Availability[]> {
    const filtered = Array.from(this.availabilities.values()).filter(
      (availability) => availability.providerId === providerId && 
                        availability.dayOfWeek === dayOfWeek && 
                        availability.date === null // Apenas configurações recorrentes
    );
    return filtered;
  }
  
  async getAvailabilityByDate(providerId: number, date: string): Promise<Availability[]> {
    console.log(`[DEBUG] getAvailabilityByDate - providerId: ${providerId}, date: ${date}`);
    
    // Primeiro tenta encontrar uma configuração específica para a data
    const specificAvailability = Array.from(this.availabilities.values()).filter(
      (availability) => availability.providerId === providerId && availability.date === date
    );
    
    console.log(`[DEBUG] specificAvailability:`, specificAvailability);
    
    if (specificAvailability.length > 0) return specificAvailability;
    
    // Se não encontrar, usa a configuração do dia da semana
    const dayOfWeek = new Date(date).getDay();
    console.log(`[DEBUG] dayOfWeek: ${dayOfWeek}`);
    
    const dayAvailability = await this.getAvailabilityByDay(providerId, dayOfWeek);
    console.log(`[DEBUG] dayAvailability:`, dayAvailability);
    
    return dayAvailability;
  }

  async createAvailability(availability: InsertAvailability): Promise<Availability> {
    const id = this.availabilityIdCounter++;
    const newAvailability: Availability = { 
      ...availability, 
      id,
      isAvailable: availability.isAvailable ?? true,
      intervalMinutes: availability.intervalMinutes ?? null
    };
    this.availabilities.set(id, newAvailability);
    return newAvailability;
  }
  
  async createAvailabilityBatch(availabilityList: InsertAvailability[]): Promise<Availability[]> {
    const result: Availability[] = [];
    
    for (const availability of availabilityList) {
      const created = await this.createAvailability(availability);
      result.push(created);
    }
    
    return result;
  }

  async updateAvailability(id: number, availabilityData: Partial<Availability>): Promise<Availability | undefined> {
    const availability = this.availabilities.get(id);
    if (!availability) return undefined;
    
    const updatedAvailability = { ...availability, ...availabilityData };
    this.availabilities.set(id, updatedAvailability);
    return updatedAvailability;
  }

  async deleteAvailability(id: number): Promise<boolean> {
    return this.availabilities.delete(id);
  }
  
  // Time Slots operations
  async getAvailableTimeSlots(providerId: number, date: string, serviceId?: number): Promise<{ startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number }[]> {
    // 1. Obter a disponibilidade do prestador para a data específica ou para o dia da semana
    const availabilities = await this.getAvailabilityByDate(providerId, date);
    
    if (!availabilities || availabilities.length === 0) {
      return []; // Prestador não tem disponibilidade configurada para este dia
    }
    
    // Filtrar apenas disponibilidades ativas
    const activeAvailabilities = availabilities.filter(avail => avail.isAvailable);
    
    if (activeAvailabilities.length === 0) {
      return []; // Nenhuma disponibilidade ativa para este dia
    }
    
    // 2. Obter agendamentos existentes para o dia
    const appointments = await this.getProviderAppointmentsByDate(providerId, date);
    
    // 3. Obter bloqueios de horários para a data
    const blockedSlots = await this.getBlockedTimeSlotsByDate(providerId, date);
    
    // 4. Determinar duração do serviço, se fornecido
    let serviceDuration = 30; // Duração padrão
    if (serviceId) {
      const service = await this.getService(serviceId);
      if (service) {
        serviceDuration = service.duration;
        
        // Verificar se o prestador tem uma configuração personalizada para este serviço
        const providerService = await this.getProviderServiceByProviderAndService(providerId, serviceId);
        if (providerService) {
          serviceDuration = providerService.executionTime;
        }
      }
    }
    
    // 5. Gerar todos os slots possíveis com base no horário de trabalho
    const slots: { startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number }[] = [];
    
    // Converter para minutos para facilitar o cálculo
    const convertToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };
    
    // Determinar o intervalo entre slots (padrão: 15min)
    const slotInterval = 15;
    
    // Iterar sobre todas as disponibilidades ativas
    for (const availability of activeAvailabilities) {
      const { startTime, endTime } = availability;
      
      const startMinutes = convertToMinutes(startTime);
      const endMinutes = convertToMinutes(endTime);
      
      // Gerar slots a cada 15 minutos para esta disponibilidade
      for (let current = startMinutes; current < endMinutes; current += slotInterval) {
        // Verificar se o slot tem duração suficiente
        if (current + serviceDuration > endMinutes) {
          continue;
        }
        
        const slotStart = formatTime(current);
        const slotEnd = formatTime(current + serviceDuration);
        
        // Verificar se o slot está bloqueado
        const isBlocked = blockedSlots.some(block => {
          const blockStart = convertToMinutes(block.startTime);
          const blockEnd = convertToMinutes(block.endTime);
          return (current >= blockStart && current < blockEnd) || 
                 (current + serviceDuration > blockStart && current < blockEnd);
        });
        
        // Verificar se o slot conflita com algum agendamento existente
         const hasAppointmentConflict = appointments.some(app => {
           const appStart = convertToMinutes(app.startTime);
           const appEnd = convertToMinutes(app.endTime);
           return (current >= appStart && current < appEnd) ||
                  (current + serviceDuration > appStart && current < appEnd);
         });
         
         // Adicionar o slot na lista, marcando sua disponibilidade
         slots.push({
           startTime: slotStart,
           endTime: slotEnd,
           isAvailable: !isBlocked && !hasAppointmentConflict,
           availabilityId: availability.id
         });
       }
    }
    
    return slots;
  }
  
  async blockTimeSlot(slotData: { providerId: number, date: string, startTime: string, endTime: string, reason?: string }): Promise<BlockedTimeSlot> {
    // Verificar se já existe uma disponibilidade para esta data e horário
    const availability = await this.getAvailabilityByDate(slotData.providerId, slotData.date);
    
    if (!availability) {
      throw new Error("Não há disponibilidade configurada para este dia");
    }
    
    // Criar o bloqueio de horário
    const id = this.blockedTimeSlotIdCounter++;
    const blockedSlot: BlockedTimeSlot = {
      id,
      providerId: slotData.providerId,
      date: slotData.date,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
      reason: slotData.reason || null,
      availabilityId: availability.id,
      createdAt: new Date()
    };
    
    this.blockedTimeSlots.set(id, blockedSlot);
    return blockedSlot;
  }
  
  async unblockTimeSlot(slotData: { providerId: number, date: string, startTime: string, endTime: string, availabilityId?: number }): Promise<boolean> {
    // Encontrar o bloqueio correspondente
    const blockedSlot = Array.from(this.blockedTimeSlots.values()).find(slot => 
      slot.providerId === slotData.providerId && 
      slot.date === slotData.date && 
      slot.startTime === slotData.startTime && 
      slot.endTime === slotData.endTime &&
      (slotData.availabilityId ? slot.availabilityId === slotData.availabilityId : true)
    );
    
    if (!blockedSlot) {
      return false;
    }
    
    // Remover o bloqueio
    return this.blockedTimeSlots.delete(blockedSlot.id);
  }
  
  // Blocked Time Slots operations
  async getBlockedTimeSlotById(id: number): Promise<BlockedTimeSlot | undefined> {
    return this.blockedTimeSlots.get(id);
  }

  async getBlockedTimeSlotsByProviderId(providerId: number): Promise<BlockedTimeSlot[]> {
    // Filtre os horários bloqueados diretamente pelo providerId
    return Array.from(this.blockedTimeSlots.values()).filter(
      slot => slot.providerId === providerId
    );
  }

  async getBlockedTimeSlotsByAvailabilityId(availabilityId: number): Promise<BlockedTimeSlot[]> {
    return Array.from(this.blockedTimeSlots.values()).filter(
      slot => slot.availabilityId === availabilityId
    );
  }

  async getBlockedTimeSlotsByDate(providerId: number, date: string): Promise<BlockedTimeSlot[]> {
    const allBlockedSlots = await this.getBlockedTimeSlotsByProviderId(providerId);
    return allBlockedSlots.filter(slot => slot.date === date);
  }

  async createBlockedTimeSlot(blockedSlot: InsertBlockedTimeSlot): Promise<BlockedTimeSlot> {
    const id = this.blockedTimeSlotIdCounter++;
    const newBlockedSlot: BlockedTimeSlot = { ...blockedSlot, id };
    this.blockedTimeSlots.set(id, newBlockedSlot);
    return newBlockedSlot;
  }

  async deleteBlockedTimeSlot(id: number): Promise<boolean> {
    return this.blockedTimeSlots.delete(id);
  }

  // Appointment operations
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }
  
  async getAppointmentByPaymentId(paymentId: string): Promise<Appointment | undefined> {
    // Procurar no campo notes dos agendamentos por alguma menção ao paymentId
    return Array.from(this.appointments.values()).find(
      appointment => appointment.notes && appointment.notes.includes(paymentId)
    );
  }

  async getClientAppointments(clientId: number): Promise<Appointment[]> {
    // Obter a data atual no formato ISO (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    return Array.from(this.appointments.values())
      .filter(appointment => 
        appointment.clientId === clientId && 
        appointment.date >= today
      )
      .sort((a, b) => {
        // Sort by date and time
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        return a.startTime.localeCompare(b.startTime);
    });
  }

  async getProviderAppointments(providerId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.providerId === providerId
    ).sort((a, b) => {
      // Sort by date and time
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      return a.startTime.localeCompare(b.startTime);
    });
  }
  
  async getProviderAppointmentsByDate(providerId: number, date: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => 
        appointment.providerId === providerId && 
        appointment.date === date &&
        (appointment.status === "confirmed" || appointment.status === "pending")
    ).sort((a, b) => {
      // Sort by time
      return a.startTime.localeCompare(b.startTime);
    });
  }
  
  async getAppointmentsByProviderAndService(providerId: number, serviceId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.providerId === providerId && appointment.serviceId === serviceId
    ).sort((a, b) => {
      // Sort by date and time, mais recentes primeiro
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return b.startTime.localeCompare(a.startTime);
    });
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentIdCounter++;
    const newAppointment: Appointment = { 
      ...appointment, 
      id, 
      createdAt: new Date() 
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    
    const updatedAppointment = { ...appointment, ...appointmentData };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Provider settings operations
  async getProviderSettings(providerId: number): Promise<ProviderSettings | undefined> {
    return Array.from(this.providerSettings.values()).find(
      (settings) => settings.providerId === providerId
    );
  }

  async createProviderSettings(settings: InsertProviderSettings): Promise<ProviderSettings> {
    const id = this.providerSettingsIdCounter++;
    const newSettings: ProviderSettings = { ...settings, id };
    this.providerSettings.set(id, newSettings);
    return newSettings;
  }

  async updateProviderSettings(providerId: number, settingsData: Partial<ProviderSettings>): Promise<ProviderSettings | undefined> {
    const settings = Array.from(this.providerSettings.values()).find(
      (s) => s.providerId === providerId
    );
    
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...settingsData };
    this.providerSettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
  
  // Admin: métodos adicionais
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getAllProviders(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.userType === 'provider');
  }
  
  async getClientUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.userType === 'client');
  }
  
  // Implementação para obter clientes de um prestador (para calendário)
  async getProviderClients(providerId: number): Promise<{ id: number, name: string, email: string }[]> {
    // Buscar todos os agendamentos do prestador
    const providerAppointments = Array.from(this.appointments.values())
      .filter(appointment => appointment.providerId === providerId);
    
    // Extrair IDs únicos de clientes
    const clientIds = [...new Set(providerAppointments.map(appointment => appointment.clientId))];
    
    // Se não houver clientes, retornar array vazio
    if (clientIds.length === 0) {
      return [];
    }
    
    // Buscar informações dos clientes
    const clientsData = Array.from(this.users.values())
      .filter(user => clientIds.includes(user.id) && user.userType === 'client')
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email
      }));
    
    return clientsData;
  }
  
  // Implementação para obter agendamentos de um prestador (para calendário)
  async getAppointmentsByProviderId(providerId: number): Promise<Appointment[]> {
    const providerAppointments = Array.from(this.appointments.values())
      .filter(appointment => appointment.providerId === providerId)
      .map(appointment => {
        const client = this.users.get(appointment.clientId);
        const service = this.services.get(appointment.serviceId);
        
        return {
          ...appointment,
          client_name: client ? client.name : 'Cliente não encontrado',
          service_name: service ? service.name : 'Serviço não encontrado'
        };
      });
    
    return providerAppointments;
  }
  
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    // Verificar se existem serviços associados a esta categoria
    const categoryServices = await this.getServicesByCategory(id);
    
    // Se houver serviços associados, remover primeiro
    for (const service of categoryServices) {
      await this.deleteService(service.id);
    }
    
    // Remover a categoria
    return this.categories.delete(id);
  }
  
  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).sort((a, b) => {
      // Ordenar por data, mais recentes primeiro
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }
  
  async generateAdminSummaryReport(): Promise<AdminSummaryReport> {
    const users = await this.getAllUsers();
    const providers = users.filter(user => user.userType === 'provider');
    const clients = users.filter(user => user.userType === 'client');
    const services = await this.getServices();
    const categories = await this.getCategories();
    const appointments = await this.getAllAppointments();
    
    // Contagem de agendamentos por status
    const appointmentsByStatus: {[key: string]: number} = {};
    appointments.forEach(appointment => {
      const status = appointment.status || 'unknown';
      appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
    });
    
    // Obter os 5 agendamentos mais recentes
    const recentAppointments = appointments.slice(0, 5);
    
    return {
      totalUsers: users.length,
      totalProviders: providers.length,
      totalClients: clients.length,
      totalServices: services.length,
      totalCategories: categories.length,
      totalAppointments: appointments.length,
      appointmentsByStatus,
      recentAppointments
    };
  }
  
  async generateProviderReport(): Promise<ProviderReport> {
    const providers = await this.getAllUsers().then(users => 
      users.filter(user => user.userType === 'provider')
    );
    
    const providersData = await Promise.all(providers.map(async provider => {
      const appointments = await this.getProviderAppointments(provider.id);
      const settings = await this.getProviderSettings(provider.id);
      
      return {
        id: provider.id,
        name: provider.name || '',
        email: provider.email,
        totalAppointments: appointments.length,
        rating: settings?.rating || null,
        isOnline: settings?.isOnline || false
      };
    }));
    
    return {
      providers: providersData
    };
  }
  
  async generateServiceReport(): Promise<ServiceReport> {
    const categories = await this.getCategories();
    const services = await this.getServices();
    const appointments = await this.getAllAppointments();
    
    const categoriesData = await Promise.all(categories.map(async category => {
      const categoryServices = services.filter(service => service.categoryId === category.id);
      
      const serviceData = await Promise.all(categoryServices.map(service => {
        const serviceAppointments = appointments.filter(appointment => appointment.serviceId === service.id);
        const providerIds = new Set(serviceAppointments.map(appointment => appointment.providerId));
        
        return {
          id: service.id,
          name: service.name,
          appointmentCount: serviceAppointments.length,
          providerCount: providerIds.size
        };
      }));
      
      return {
        id: category.id,
        name: category.name,
        serviceCount: categoryServices.length,
        services: serviceData
      };
    }));
    
    return {
      categories: categoriesData
    };
  }
  
  // Implementação do método para obter novos usuários por dia
  async getServicesCount(): Promise<number> {
    return this.services.size;
  }
  
  async getCategoriesCount(): Promise<number> {
    return this.categories.size;
  }
  
  async getAppointmentsCount(status?: string): Promise<number> {
    if (status) {
      return Array.from(this.appointments.values()).filter(
        appointment => appointment.status === status
      ).length;
    }
    return this.appointments.size;
  }
  
  async getRecentAppointments(limit: number): Promise<any[]> {
    // Obter os agendamentos mais recentes, incluindo detalhes do cliente e prestador
    const recentAppointments = Array.from(this.appointments.values())
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.startTime);
        const dateB = new Date(b.date + 'T' + b.startTime);
        return dateB.getTime() - dateA.getTime(); // Ordenar do mais recente para o mais antigo
      })
      .slice(0, limit);
    
    // Enriquecer os dados com informações de cliente e prestador
    const enrichedAppointments = await Promise.all(
      recentAppointments.map(async (appointment) => {
        const client = await this.getUser(appointment.clientId);
        const provider = await this.getUser(appointment.providerId);
        const service = await this.getService(appointment.serviceId);
        
        return {
          ...appointment,
          clientName: client?.name || 'Cliente não encontrado',
          providerName: provider?.name || 'Prestador não encontrado',
          serviceName: service?.name || 'Serviço não encontrado',
          dateTime: `${appointment.date} ${appointment.startTime}`,
          formattedPrice: appointment.totalPrice ? 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(appointment.totalPrice / 100) : 
            'Preço não definido'
        };
      })
    );
    
    return enrichedAppointments;
  }
  
  async getUsersPerDay(days: number = 30): Promise<Array<{date: string; count: number}>> {
    const users = await this.getAllUsers();
    
    // Obter a data atual e a data de X dias atrás
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    // Inicializar o mapa de contagem com todas as datas no intervalo
    const dateCountMap: Map<string, number> = new Map();
    
    // Preencher o mapa com todas as datas no intervalo, inicialmente com contagem zero
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      dateCountMap.set(dateStr, 0);
    }
    
    // Contar usuários por data de criação
    users.forEach(user => {
      if (user.createdAt && user.createdAt >= startDate && user.createdAt <= today) {
        const dateStr = user.createdAt.toISOString().split('T')[0];
        const currentCount = dateCountMap.get(dateStr) || 0;
        dateCountMap.set(dateStr, currentCount + 1);
      }
    });
    
    // Converter o mapa para o formato de array esperado
    const result: Array<{date: string; count: number}> = Array.from(dateCountMap).map(
      ([date, count]) => ({ date, count })
    );
    
    // Ordenar por data (mais antiga primeiro)
    result.sort((a, b) => a.date.localeCompare(b.date));
    
    return result;
  }

  // Provider search operations
  async getProvidersByService(serviceId: number): Promise<User[]> {
    const service = this.services.get(serviceId);
    if (!service) return [];
    
    const providers = Array.from(this.users.values()).filter(
      (user) => user.userType === "provider"
    );
    
    return providers.filter(provider => 
      Array.from(this.services.values()).some(
        s => s.providerId === provider.id && s.categoryId === service.categoryId
      )
    );
  }

  async getProvidersWithSettings(): Promise<(User & { settings: ProviderSettings | undefined })[]> {
    const providers = Array.from(this.users.values()).filter(
      (user) => user.userType === "provider"
    );
    
    return Promise.all(
      providers.map(async (provider) => {
        const settings = await this.getProviderSettings(provider.id);
        return { ...provider, settings };
      })
    );
  }
  
  async getProvidersByLocation(latitude: number, longitude: number, radiusKm: number): Promise<(User & { settings: ProviderSettings | undefined; distance: number })[]> {
    const providers = await this.getProvidersWithSettings();
    const result: (User & { settings: ProviderSettings | undefined; distance: number })[] = [];
    
    for (const provider of providers) {
      if (provider.settings && provider.settings.latitude && provider.settings.longitude) {
        const providerLat = parseFloat(provider.settings.latitude);
        const providerLng = parseFloat(provider.settings.longitude);
        
        if (!isNaN(providerLat) && !isNaN(providerLng)) {
          // Calculate distance using Haversine formula
          const distance = this.calculateDistance(
            latitude, 
            longitude, 
            providerLat, 
            providerLng
          );
          
          // Only include providers within the radius
          if (distance <= radiusKm) {
            result.push({ ...provider, distance });
          }
        }
      }
    }
    
    // Sort by distance (closest first)
    return result.sort((a, b) => a.distance - b.distance);
  }
  
  // Helper method to calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  // Support message operations
  private supportMessages: Map<number, SupportMessage> = new Map();
  
  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const id = this.supportMessageIdCounter++;
    const newMessage: SupportMessage = {
      ...message,
      id,
      createdAt: new Date(),
      status: "pending",
      response: null,
      adminId: null,
      resolvedAt: null,
      readByUser: false,
      readByAdmin: false,
      updatedAt: new Date()
    };
    this.supportMessages.set(id, newMessage);
    return newMessage;
  }
  
  async getSupportMessage(id: number): Promise<SupportMessage | undefined> {
    return this.supportMessages.get(id);
  }
  
  async getUserSupportMessages(userId: number): Promise<SupportMessage[]> {
    return Array.from(this.supportMessages.values())
      .filter(msg => msg.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async getAllSupportMessages(): Promise<SupportMessage[]> {
    return Array.from(this.supportMessages.values())
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async updateSupportMessage(id: number, messageData: Partial<SupportMessage>): Promise<SupportMessage | undefined> {
    const message = this.supportMessages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...messageData };
    this.supportMessages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async resolveSupportMessage(id: number, adminId: number, response: string): Promise<SupportMessage | undefined> {
    const message = this.supportMessages.get(id);
    if (!message) return undefined;
    
    const updatedMessage: SupportMessage = {
      ...message,
      status: "resolved",
      adminId,
      response,
      resolvedAt: new Date()
    };
    
    this.supportMessages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async getPendingSupportMessages(): Promise<SupportMessage[]> {
    return Array.from(this.supportMessages.values())
      .filter(msg => msg.status === "pending")
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const id = this.reviewIdCounter++;
    const newReview: Review = {
      ...review,
      id,
      publishedAt: new Date(),
      updatedAt: new Date(),
      providerResponse: null,
      status: "published"
    };
    
    this.reviews.set(id, newReview);
    
    // Atualizar a média de avaliações do prestador
    await this.updateProviderRating(review.providerId);
    
    return newReview;
  }
  
  async createAppointmentReview(review: InsertReview): Promise<Review> {
    // Este método é apenas um alias para createReview,
    // mas é mais semântico em contextos específicos
    return this.createReview(review);
  }
  
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }
  
  async getClientReviews(clientId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.clientId === clientId)
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt) : new Date(0);
        const dateB = b.publishedAt ? new Date(b.publishedAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async getProviderReviews(providerId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.providerId === providerId && review.isPublic)
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt) : new Date(0);
        const dateB = b.publishedAt ? new Date(b.publishedAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async getAppointmentReview(appointmentId: number): Promise<Review | undefined> {
    return Array.from(this.reviews.values())
      .find(review => review.appointmentId === appointmentId);
  }
  
  async updateReview(id: number, reviewData: Partial<Review>): Promise<Review | undefined> {
    const review = this.reviews.get(id);
    if (!review) return undefined;
    
    const updatedReview = { 
      ...review, 
      ...reviewData,
      updatedAt: new Date()
    };
    
    this.reviews.set(id, updatedReview);
    
    // Se a avaliação foi alterada, atualizar a média do prestador
    if (reviewData.rating) {
      await this.updateProviderRating(review.providerId);
    }
    
    return updatedReview;
  }
  
  async deleteReview(id: number): Promise<boolean> {
    const review = this.reviews.get(id);
    if (!review) return false;
    
    const result = this.reviews.delete(id);
    
    // Atualizar a média de avaliações do prestador
    if (result) {
      await this.updateProviderRating(review.providerId);
    }
    
    return result;
  }
  
  async updateProviderRating(providerId: number): Promise<number> {
    const reviews = await this.getProviderReviews(providerId);
    const settings = await this.getProviderSettings(providerId);
    
    if (!settings || reviews.length === 0) {
      return 0;
    }
    
    // Calcular a nova média
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10); // Formato 45 para 4.5 estrelas
    
    // Atualizar as configurações do prestador
    await this.updateProviderSettings(providerId, {
      rating: averageRating,
      ratingCount: reviews.length
    });
    
    return averageRating;
  }
  
  async generateProviderAnalytics(providerId: number, period: string = 'month'): Promise<ProviderAnalytics> {
    // Obter dados do prestador
    const appointments = await this.getProviderAppointments(providerId);
    const services = await this.getServicesByProvider(providerId);
    const reviews = await this.getProviderReviews(providerId);
    
    // Calcular datas para filtrar por período
    const today = new Date();
    const periodStart = new Date();
    
    switch(period) {
      case 'week':
        periodStart.setDate(today.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        periodStart.setFullYear(today.getFullYear() - 1);
        break;
      case 'all':
      default:
        periodStart.setFullYear(1970);
    }
    
    // Filtrar agendamentos pelo período
    const filteredAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate >= periodStart && appointmentDate <= today;
    });
    
    // Estatísticas gerais
    const completedAppointments = filteredAppointments.filter(a => a.status === 'completed');
    const canceledAppointments = filteredAppointments.filter(a => a.status === 'canceled');
    const pendingAppointments = filteredAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
    
    const totalRevenue = completedAppointments.reduce((sum, appointment) => {
      return sum + (appointment.totalPrice || 0);
    }, 0);
    
    // Estatísticas por dia
    const appointmentsByDayMap = new Map<string, number>();
    filteredAppointments.forEach(appointment => {
      const date = appointment.date;
      appointmentsByDayMap.set(date, (appointmentsByDayMap.get(date) || 0) + 1);
    });
    
    const appointmentsByDay = Array.from(appointmentsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Estatísticas por mês
    const appointmentsByMonthMap = new Map<string, number>();
    const revenueByMonthMap = new Map<string, number>();
    
    filteredAppointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      appointmentsByMonthMap.set(month, (appointmentsByMonthMap.get(month) || 0) + 1);
      
      if (appointment.status === 'completed') {
        revenueByMonthMap.set(month, (revenueByMonthMap.get(month) || 0) + (appointment.totalPrice || 0));
      }
    });
    
    const appointmentsByMonth = Array.from(appointmentsByMonthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Estatísticas por serviço
    const serviceStats = new Map<number, { name: string; count: number; revenue: number }>();
    
    filteredAppointments.forEach(appointment => {
      const serviceId = appointment.serviceId;
      const service = services.find(s => s.id === serviceId);
      if (!service) return;
      
      const currentStats = serviceStats.get(serviceId) || { name: service.name, count: 0, revenue: 0 };
      currentStats.count++;
      
      if (appointment.status === 'completed') {
        currentStats.revenue += (appointment.totalPrice || 0);
      }
      
      serviceStats.set(serviceId, currentStats);
    });
    
    const topServices = Array.from(serviceStats.values())
      .map(stats => ({ 
        serviceId: 0, // Preencher com ID real quando necessário
        ...stats
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Estatísticas de horas mais movimentadas
    const busyHoursMap = new Map<number, number>();
    
    filteredAppointments.forEach(appointment => {
      const hourMatch = appointment.startTime.match(/^(\d{1,2}):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        busyHoursMap.set(hour, (busyHoursMap.get(hour) || 0) + 1);
      }
    });
    
    const busyHours = Array.from(busyHoursMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
    
    // Estatísticas de dias mais movimentados
    const busyDaysMap = new Map<number, number>();
    
    filteredAppointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const day = date.getDay(); // 0 = Domingo, 6 = Sábado
      busyDaysMap.set(day, (busyDaysMap.get(day) || 0) + 1);
    });
    
    const busyDays = Array.from(busyDaysMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day - b.day);
    
    // Tendências (mês atual vs. mês anterior)
    const appointmentTrends: { month: string; count: number; previousCount: number; percentChange: number }[] = [];
    const revenueTrends: { month: string; total: number; previousTotal: number; percentChange: number }[] = [];
    
    // Adicionar análises de tendências se houver dados suficientes
    if (appointmentsByMonth.length > 1) {
      for (let i = 1; i < appointmentsByMonth.length; i++) {
        const current = appointmentsByMonth[i];
        const previous = appointmentsByMonth[i - 1];
        
        const percentChange = previous.count === 0 
          ? 100 
          : Math.round(((current.count - previous.count) / previous.count) * 100);
        
        appointmentTrends.push({
          month: current.month,
          count: current.count,
          previousCount: previous.count,
          percentChange
        });
      }
    }
    
    if (revenueByMonth.length > 1) {
      for (let i = 1; i < revenueByMonth.length; i++) {
        const current = revenueByMonth[i];
        const previous = revenueByMonth[i - 1];
        
        const percentChange = previous.total === 0 
          ? 100 
          : Math.round(((current.total - previous.total) / previous.total) * 100);
        
        revenueTrends.push({
          month: current.month,
          total: current.total,
          previousTotal: previous.total,
          percentChange
        });
      }
    }
    
    // Compilar e retornar o relatório de estatísticas
    return {
      totalAppointments: filteredAppointments.length,
      completedAppointments: completedAppointments.length,
      canceledAppointments: canceledAppointments.length,
      pendingAppointments: pendingAppointments.length,
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) 
        : 0,
      totalRevenue,
      appointmentsByDay,
      appointmentsByMonth,
      revenueByMonth,
      topServices,
      busyHours,
      busyDays,
      appointmentTrends,
      revenueTrends
    };
  }

  // Initialize sample data for the application
  private async initializeData() {
    console.log("Inicializando dados...");
    
    // Create sample niches
    const nicheData: InsertNiche[] = [
      { name: "Beleza", description: "Serviços de beleza e estética", icon: "scissors", color: "#C8A2C8" },
      { name: "Saúde", description: "Serviços de saúde e bem-estar", icon: "heart", color: "#A2C8A2" },
      { name: "Casa", description: "Serviços para casa e jardim", icon: "home", color: "#A2A2C8" },
    ];
    
    // Adicionar nichos
    const niches: Niche[] = [];
    for (const niche of nicheData) {
      const newNiche = await this.createNiche(niche);
      niches.push(newNiche);
    }
    
    console.log("Nichos criados com sucesso");
    
    // Create sample categories by niche
    const categoryData: InsertCategory[] = [
      // Nicho de Beleza
      { name: "Barbearia", icon: "scissors", color: "#C8A2C8", nicheId: niches[0].id },
      { name: "Salão de beleza", icon: "scissors", color: "#FFD580", nicheId: niches[0].id },
      { name: "Manicure", icon: "hand", color: "#87CEEB", nicheId: niches[0].id },
      
      // Nicho de Saúde
      { name: "Clínica médica", icon: "stethoscope", color: "#FFB6C1", nicheId: niches[1].id },
      { name: "Veterinário", icon: "paw", color: "#FF9E9E", nicheId: niches[1].id },
      
      // Nicho de Casa
      { name: "Estética Automotiva", icon: "car", color: "#B5D99C", nicheId: niches[2].id },
      { name: "Mais", icon: "plus", color: "#F0E68C", nicheId: niches[2].id },
      { name: "Outros", icon: "more-horizontal", color: "#B0C4DE", nicheId: niches[2].id }
    ];
    
    for (const category of categoryData) {
      await this.createCategory(category);
    }

    console.log("Categorias criadas com sucesso");

    // Criando usuários manualmente para garantir que estejam no formato correto
    const clienteId = this.userIdCounter++;
    const cliente: User = {
      id: clienteId,
      email: "cliente@agendoai.com",
      password: "f1069c4299acbb9e48e4487a7eef4e04a724ed737f92f3d5c87804f10ad18909d19637f821de701dddea9daf74bf1f26e8bf48d3dea4e18fb32e84c74f6c01ce.7ca4af3e96b86a0f", // senha: cliente123
      name: "Cliente Teste",
      userType: "client",
      phone: "11999998888",
      address: "Rua das Flores, 123",
      profileImage: "",
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    };
    
    const prestadorId = this.userIdCounter++;
    const prestador: User = {
      id: prestadorId,
      email: "prestador@agendoai.com",
      password: "18bd0617cd9f81b1d5ef83f377402c14dbed9f5f743675648ef2c939cfbe6a7b85c8f4f7fe679dd239e177b48cc8f3e3ac2db35a4fa8c09cba78ea1c88e7f23a.8e2efcd6bf1be8f6", // senha: prestador123
      name: "Prestador Teste",
      userType: "provider",
      phone: "11999997777",
      address: "Avenida Principal, 456",
      profileImage: "",
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    };
    
    // Criando usuário administrador
    const adminId = this.userIdCounter++;
    const admin: User = {
      id: adminId,
      email: "admin@agendoai.com",
      password: "34cc93ece0ba9e3c7cd3d4aeb20466bcdb7c906db9611a3f23c9df30dbebc92c85c5a17741d6a2e1ec202fab8c4417d6c18f0c22846529d396f826d34be7e3ff.b9c52a2fec3f1adb", // senha: admin123
      name: "Administrador",
      userType: "admin",
      phone: "",
      address: "",
      profileImage: "",
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    };
    
    // Criando usuário de suporte
    const suporteId = this.userIdCounter++;
    const suporte: User = {
      id: suporteId,
      email: "suporte@agendoai.com",
      password: "9f15b00a35a4e04ce971605f0ddb3b4284ee6ad84a8d8ccb0c9be0e5d056c7cb8f64d1f7c6d9e358e2a6b0fc42e11e136d2b5c2c8d9c03246a695a9e507d3c13.ce8d96dfd8963c49", // senha: suporte123
      name: "Equipe de Suporte",
      userType: "support",
      phone: "0800123456",
      address: "Central de Suporte, 789",
      profileImage: "",
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    };
    
    // Adicionando usuários ao Map
    this.users.set(clienteId, cliente);
    this.users.set(prestadorId, prestador);
    this.users.set(adminId, admin);
    this.users.set(suporteId, suporte);
    
    console.log("Usuários criados com sucesso:", Array.from(this.users.values()).map(u => `${u.email} (${u.id})`));
    
    // Criando configurações para o prestador
    await this.createProviderSettings({
      providerId: prestadorId,
      isOnline: true,
      businessName: "Prestador Teste Serviços",
      description: "Oferecemos serviços de alta qualidade com profissionais experientes. Nossa missão é proporcionar uma experiência excepcional e resultados que superem expectativas.",
      address: "Av. Brasil, 1500, Sala 302",
      city: "São Paulo",
      state: "SP",
      postalCode: "01430-001",
      phone: prestador.phone,
      whatsapp: prestador.phone,
      email: prestador.email,
      website: "www.prestadorteste.com.br",
      instagram: "prestador_teste",
      facebook: "prestadorteste",
      businessHours: "Segunda a Sexta: 9h às 19h\nSábado: 9h às 15h\nDomingo: Fechado",
      specialties: "Corte masculino, Barba, Tratamento capilar, Penteados",
      acceptsCards: true,
      acceptsPix: true,
      acceptsCash: true,
      rating: 45, // 4.5 estrelas
      ratingCount: 10
    });
    
    // Criando disponibilidade inicial para o prestador
    // Segunda-feira, 09:00-12:00
    await this.createAvailability({
      providerId: prestadorId,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "12:00",
      isAvailable: true
    });
    
    // Segunda-feira, 14:00-18:00
    await this.createAvailability({
      providerId: prestadorId,
      dayOfWeek: 1,
      startTime: "14:00",
      endTime: "18:00",
      isAvailable: true
    });
    
    // Quarta-feira, 09:00-18:00
    await this.createAvailability({
      providerId: prestadorId,
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "18:00",
      isAvailable: true
    });
    
    // Sexta-feira, 10:00-16:00
    await this.createAvailability({
      providerId: prestadorId,
      dayOfWeek: 5,
      startTime: "10:00",
      endTime: "16:00",
      isAvailable: true
    });
    
    console.log("Configurações do prestador criadas com sucesso");
  }
  
  // Onboarding Steps operations
  async getOnboardingSteps(userType: string): Promise<OnboardingStep[]> {
    return Array.from(this.onboardingSteps.values())
      .filter(step => step.userType === userType)
      .sort((a, b) => a.order - b.order);
  }
  
  async getOnboardingStepsByUserType(userType: string): Promise<OnboardingStep[]> {
    return Array.from(this.onboardingSteps.values())
      .filter(step => step.userType === userType)
      .sort((a, b) => a.order - b.order);
  }

  async getOnboardingStep(id: number): Promise<OnboardingStep | undefined> {
    return this.onboardingSteps.get(id);
  }

  async createOnboardingStep(step: InsertOnboardingStep): Promise<OnboardingStep> {
    const id = this.onboardingStepIdCounter++;
    const newStep: OnboardingStep = {
      ...step,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onboardingSteps.set(id, newStep);
    return newStep;
  }

  async updateOnboardingStep(id: number, stepData: Partial<OnboardingStep>): Promise<OnboardingStep | undefined> {
    const step = this.onboardingSteps.get(id);
    if (!step) return undefined;

    const updatedStep = { 
      ...step, 
      ...stepData,
      updatedAt: new Date()
    };
    this.onboardingSteps.set(id, updatedStep);
    return updatedStep;
  }

  async deleteOnboardingStep(id: number): Promise<boolean> {
    return this.onboardingSteps.delete(id);
  }

  // User onboarding progress operations
  async getUserOnboardingProgress(userId: number): Promise<UserOnboardingProgress[]> {
    return Array.from(this.userOnboardingProgress.values())
      .filter(progress => progress.userId === userId);
  }

  async createUserOnboardingProgress(progress: InsertUserOnboardingProgress): Promise<UserOnboardingProgress> {
    const id = this.userOnboardingProgressIdCounter++;
    const newProgress: UserOnboardingProgress = {
      ...progress,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    };
    this.userOnboardingProgress.set(id, newProgress);
    return newProgress;
  }

  async updateUserOnboardingProgress(userId: number, stepId: number, status: string): Promise<UserOnboardingProgress | undefined> {
    const progress = Array.from(this.userOnboardingProgress.values()).find(
      p => p.userId === userId && p.stepId === stepId
    );

    if (!progress) return undefined;

    const completedAt = status === 'completed' ? new Date() : progress.completedAt;

    const updatedProgress = {
      ...progress,
      status,
      completedAt,
      updatedAt: new Date()
    };

    this.userOnboardingProgress.set(progress.id, updatedProgress);
    return updatedProgress;
  }

  async getOnboardingCompletionPercentage(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;

    const totalSteps = Array.from(this.onboardingSteps.values())
      .filter(step => step.userType === user.userType)
      .length;

    if (totalSteps === 0) return 0;

    const completedSteps = Array.from(this.userOnboardingProgress.values())
      .filter(progress => 
        progress.userId === userId && 
        (progress.status === 'completed' || progress.status === 'skipped')
      )
      .length;

    return Math.round((completedSteps / totalSteps) * 100);
  }

  async markStepAsComplete(userId: number, stepId: number): Promise<UserOnboardingProgress | undefined> {
    return this.updateUserOnboardingProgress(userId, stepId, 'completed');
  }

  async markStepAsSkipped(userId: number, stepId: number): Promise<UserOnboardingProgress | undefined> {
    return this.updateUserOnboardingProgress(userId, stepId, 'skipped');
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Inicializar o armazenamento de sessão PostgreSQL
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session', // Nome da tabela para armazenar sessões
      schemaName: 'public', // Schema da tabela
      ttl: 24 * 60 * 60 // Tempo de vida da sessão em segundos (24 horas)
    });
    console.log('PostgreSQL Session Store inicializado');
  }
  
  // Financial settings methods
  async getFinancialSettings(): Promise<any> {
    // Implementação temporária - substituir com tabela real quando disponível
    return {
      id: 1,
      serviceFee: 500, // 5%
      fixedServiceFee: 200, // R$ 2,00
      minServiceFee: 100, // R$ 1,00
      maxServiceFee: 5000, // R$ 50,00
      payoutSchedule: "weekly",
      
      stripeEnabled: false,
      stripeLiveMode: false,
      stripePublicKey: "",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      stripeConnectEnabled: false,
      
      asaasEnabled: false,
      asaasLiveMode: false,
      asaasApiKey: "",
      asaasWebhookToken: "",
      asaasWalletId: "",
      asaasSplitEnabled: false,
      
      enableCoupons: true,
      maxDiscountPercentage: 30,
      defaultExpirationDays: 30
    };
  }
  
  async saveFinancialSettings(settings: any): Promise<any> {
    // Implementação temporária - substituir com tabela real quando disponível
    return settings;
  }

  async getAllProviderFees(): Promise<ProviderServiceFee[]> {
    return await db.select().from(providerServiceFees).orderBy(desc(providerServiceFees.createdAt));
  }

  async getProviderFee(id: number): Promise<ProviderServiceFee | undefined> {
    const results = await db.select().from(providerServiceFees).where(eq(providerServiceFees.id, id));
    return results[0];
  }

  async getProviderFeeByProviderId(providerId: number): Promise<ProviderServiceFee | undefined> {
    const results = await db.select().from(providerServiceFees)
      .where(and(
        eq(providerServiceFees.providerId, providerId),
        eq(providerServiceFees.isActive, true)
      ));
    return results[0];
  }

  async createProviderFee(fee: InsertProviderServiceFee): Promise<ProviderServiceFee> {
    const results = await db.insert(providerServiceFees).values(fee).returning();
    return results[0];
  }

  async updateProviderFee(id: number, fee: Partial<InsertProviderServiceFee>): Promise<ProviderServiceFee> {
    const results = await db.update(providerServiceFees)
      .set({
        ...fee,
        updatedAt: new Date()
      })
      .where(eq(providerServiceFees.id, id))
      .returning();
    return results[0];
  }

  async deleteProviderFee(id: number): Promise<void> {
    await db.delete(providerServiceFees).where(eq(providerServiceFees.id, id));
  }

  async getAllProviders(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.userType, 'provider'));
  }
  
  // Promotions operations
  async getPromotions(): Promise<Promotion[]> {
    return await db.select().from(promotions).orderBy(promotions.createdAt);
  }

  async getPromotionById(id: number): Promise<Promotion | undefined> {
    const results = await db.select().from(promotions).where(eq(promotions.id, id));
    return results[0];
  }

  async getActivePromotions(currentDate: Date): Promise<Promotion[]> {
    return await db.select().from(promotions).where(
      and(
        eq(promotions.isActive, true),
        lte(promotions.startDate, currentDate),
        gte(promotions.endDate, currentDate)
      )
    ).orderBy(promotions.createdAt);
  }

  async getApplicablePromotions(filters: { 
    serviceId?: number; 
    providerId?: number; 
    categoryId?: number; 
    nicheId?: number; 
    currentDate: Date;
  }): Promise<Promotion[]> {
    const { serviceId, providerId, categoryId, nicheId, currentDate } = filters;
    
    // Condições para promoções ativas dentro do período
    const baseConditions = [
      eq(promotions.isActive, true),
      lte(promotions.startDate, currentDate),
      gte(promotions.endDate, currentDate)
    ];

    // Condições específicas para filtros fornecidos
    const conditions = [
      ...baseConditions,
      // Se serviceId for fornecido, incluir promoções que se aplicam a esse serviço 
      // ou que não são específicas para nenhum serviço
      serviceId !== undefined ? 
        or(
          eq(promotions.serviceId, serviceId),
          isNull(promotions.serviceId)
        ) : undefined,
      
      // Se providerId for fornecido, incluir promoções que se aplicam a esse prestador 
      // ou que não são específicas para nenhum prestador
      providerId !== undefined ? 
        or(
          eq(promotions.providerId, providerId),
          isNull(promotions.providerId)
        ) : undefined,
      
      // Se categoryId for fornecido, incluir promoções que se aplicam a essa categoria 
      // ou que não são específicas para nenhuma categoria
      categoryId !== undefined ? 
        or(
          eq(promotions.categoryId, categoryId),
          isNull(promotions.categoryId)
        ) : undefined,
      
      // Se nicheId for fornecido, incluir promoções que se aplicam a esse nicho 
      // ou que não são específicas para nenhum nicho
      nicheId !== undefined ? 
        or(
          eq(promotions.nicheId, nicheId),
          isNull(promotions.nicheId)
        ) : undefined
    ].filter(Boolean); // Remove condições undefined

    return await db.select().from(promotions)
      .where(and(...conditions))
      .orderBy(promotions.createdAt);
  }

  async getPromotionByCouponCode(data: {
    couponCode: string;
    serviceId?: number;
    providerId?: number;
    currentDate: Date;
  }): Promise<Promotion | undefined> {
    const { couponCode, serviceId, providerId, currentDate } = data;
    
    // Condições base para o cupom
    const conditions = [
      eq(promotions.couponCode, couponCode),
      eq(promotions.isActive, true),
      lte(promotions.startDate, currentDate),
      gte(promotions.endDate, currentDate)
    ];
    
    // Se serviceId for fornecido, verificar se o cupom é válido para esse serviço
    if (serviceId !== undefined) {
      conditions.push(
        or(
          eq(promotions.serviceId, serviceId),
          isNull(promotions.serviceId)
        )
      );
    }
    
    // Se providerId for fornecido, verificar se o cupom é válido para esse prestador
    if (providerId !== undefined) {
      conditions.push(
        or(
          eq(promotions.providerId, providerId),
          isNull(promotions.providerId)
        )
      );
    }
    
    const results = await db.select().from(promotions)
      .where(and(...conditions))
      .limit(1);
    
    return results[0];
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const results = await db.insert(promotions).values({
      ...promotion,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return results[0];
  }

  async updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined> {
    const existing = await this.getPromotionById(id);
    if (!existing) return undefined;
    
    const results = await db.update(promotions)
      .set({ 
        ...promotion,
        updatedAt: new Date()
      })
      .where(eq(promotions.id, id))
      .returning();
    
    return results[0];
  }

  async deletePromotion(id: number): Promise<boolean> {
    const results = await db.delete(promotions)
      .where(eq(promotions.id, id))
      .returning();
    
    return results.length > 0;
  }
  // Time Slots operations
  async blockTimeSlot(slotData: { 
    providerId: number, 
    date: string, 
    startTime: string, 
    endTime: string, 
    reason?: string,
    blockedByUserId?: number,
    metadata?: {
      type: 'lunch' | 'manual' | 'appointment' | 'system';
      recurrentId?: string;
      appointmentId?: number;
    }
  }): Promise<BlockedTimeSlot> {
    try {
      console.log("BlockTimeSlot called with data:", slotData);
      
      // Verificar se já existe uma disponibilidade para esta data e horário
      const providerAvailabilities = await db
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.providerId, slotData.providerId),
            or(
              eq(availability.date, slotData.date), // Disponibilidade específica para a data
              and(
                sql`${availability.date} IS NULL`, // Disponibilidade recorrente por dia da semana
                eq(availability.dayOfWeek, new Date(slotData.date).getDay())
              )
            )
          )
        );
      
      console.log("Found availabilities:", providerAvailabilities);
      
      if (!providerAvailabilities.length) {
        throw new Error("Não há disponibilidade configurada para este dia");
      }
      
      // Usar a primeira disponibilidade disponível
      const availabilityId = providerAvailabilities[0].id;
      
      // Verificar se já existe um bloqueio para este horário
      const existingBlocks = await db
        .select()
        .from(blockedTimeSlots)
        .where(
          and(
            eq(blockedTimeSlots.providerId, slotData.providerId),
            eq(blockedTimeSlots.date, slotData.date),
            eq(blockedTimeSlots.startTime, slotData.startTime),
            eq(blockedTimeSlots.endTime, slotData.endTime)
          )
        );
      
      console.log("Existing blocks:", existingBlocks);
      
      // Se já existe um bloqueio, retorná-lo
      if (existingBlocks.length > 0) {
        console.log("Block already exists, returning:", existingBlocks[0]);
        return existingBlocks[0];
      }
      
      // Processar metadados se fornecidos (converter para JSON)
      let metadataValue = null;
      if (slotData.metadata) {
        metadataValue = {
          type: slotData.metadata.type || 'manual',
          recurrentId: slotData.metadata.recurrentId,
          appointmentId: slotData.metadata.appointmentId
        };
      }
      
      // Criar o bloqueio de horário com os dados mínimos necessários
      // Nota: Removemos blockedByUserId que estava causando o erro
      const blockedSlotData = {
        providerId: slotData.providerId,
        date: slotData.date,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        reason: slotData.reason || null,
        availabilityId,
        createdAt: new Date()
      };
      
      console.log("Creating new block with data:", blockedSlotData);
      
      const [newBlockedSlot] = await db
        .insert(blockedTimeSlots)
        .values(blockedSlotData)
        .returning();
      
      console.log("Successfully created block:", newBlockedSlot);
      
      // Registrar no histórico de bloqueios para análises futuras
      try {
        // Em uma implementação real, aqui adicionaríamos à tabela de histórico
        console.log("Registrando histórico de bloqueio:", {
          blockedTimeSlotId: newBlockedSlot.id,
          providerId: newBlockedSlot.providerId,
          date: newBlockedSlot.date,
          startTime: newBlockedSlot.startTime,
          endTime: newBlockedSlot.endTime,
          reason: newBlockedSlot.reason,
          blockedByUserId: slotData.blockedByUserId || null,
          actionType: 'create',
          actionTimestamp: new Date(),
          metadata: slotData.metadata || null
        });
        
        // Quando houver tabela de histórico, este código seria usado:
        /*
        await db
          .insert(blockedTimeSlotsHistory)
          .values({
            blockedTimeSlotId: newBlockedSlot.id,
            providerId: newBlockedSlot.providerId,
            date: newBlockedSlot.date,
            startTime: newBlockedSlot.startTime,
            endTime: newBlockedSlot.endTime,
            reason: newBlockedSlot.reason,
            blockedByUserId: slotData.blockedByUserId || null,
            actionType: 'create',
            actionTimestamp: new Date(),
            metadata: slotData.metadata || null
          });
        */
      } catch (historyError) {
        // Não falhar a operação principal caso o registro de histórico falhe
        console.error("Erro ao registrar histórico de bloqueio:", historyError);
      }
      
      return newBlockedSlot;
    } catch (error) {
      console.error("Error blocking time slot:", error);
      throw new Error(`Erro ao bloquear horário: ${error.message}`);
    }
  }
  
  async unblockTimeSlot(slotData: { providerId: number, date: string, startTime: string, endTime: string, availabilityId?: number }): Promise<boolean> {
    try {
      console.log("UnblockTimeSlot called with data:", slotData);
      
      // Se não tiver availabilityId, precisamos buscar todas as disponibilidades do provedor
      let whereConditions = [];
      
      if (slotData.availabilityId) {
        // Se temos o availabilityId, usamos ele diretamente
        whereConditions = [
          eq(blockedTimeSlots.providerId, slotData.providerId),
          eq(blockedTimeSlots.date, slotData.date),
          eq(blockedTimeSlots.startTime, slotData.startTime),
          eq(blockedTimeSlots.endTime, slotData.endTime),
          eq(blockedTimeSlots.availabilityId, slotData.availabilityId)
        ];
      } else {
        // Se não temos o availabilityId, precisamos buscar pelo horário em todas as disponibilidades
        // do provedor para este dia
        
        // Buscar disponibilidades para este provedor nesta data
        const dateObj = new Date(slotData.date);
        const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, ...
        
        // Buscar disponibilidades para o dia da semana
        const providerId = slotData.providerId;
        const availability = await this.getAvailabilityByDay(providerId, dayOfWeek);
        const availabilities = availability ? [availability] : [];
        
        console.log("Found availabilities:", availabilities);
        
        if (!availabilities.length) {
          console.log("No availabilities found for provider", providerId, "on day", dayOfWeek);
          return false; // Não há disponibilidades para desbloquear
        }
        
        // Criar uma condição OR para todas as availabilityId possíveis
        const availabilityIds = availabilities.map(a => a.id);
        
        whereConditions = [
          eq(blockedTimeSlots.providerId, slotData.providerId),
          eq(blockedTimeSlots.date, slotData.date),
          eq(blockedTimeSlots.startTime, slotData.startTime),
          eq(blockedTimeSlots.endTime, slotData.endTime),
          // Usando a função in para encontrar em qualquer uma das disponibilidades
          inArray(blockedTimeSlots.availabilityId, availabilityIds)
        ];
      }
      
      // Verificar se existem bloqueios que correspondem a essas condições
      const existingBlocks = await db
        .select()
        .from(blockedTimeSlots)
        .where(and(...whereConditions));
        
      console.log("Found existing blocks to remove:", existingBlocks);
      
      if (existingBlocks.length === 0) {
        console.log("No matching blocks found to unblock");
        return false;
      }
      
      // Deletar todos os bloqueios encontrados
      let deletionSuccess = false;
      
      // Se encontramos vários bloqueios, excluímos um por um para garantir
      for (const block of existingBlocks) {
        try {
          const deleteResult = await db
            .delete(blockedTimeSlots)
            .where(eq(blockedTimeSlots.id, block.id));
          
          console.log(`Deleted block ID ${block.id}, result:`, deleteResult);
          
          if (deleteResult.rowCount > 0) {
            deletionSuccess = true;
            
            // Registrar o histórico de desbloqueio
            console.log("Registrando histórico de desbloqueio:", {
              blockedTimeSlotId: block.id,
              providerId: block.providerId,
              date: block.date,
              startTime: block.startTime,
              endTime: block.endTime,
              reason: block.reason,
              blockedByUserId: block.blockedByUserId,
              actionType: 'delete',
              actionTimestamp: new Date()
            });
          }
        } catch (deleteError) {
          console.error(`Error deleting block ID ${block.id}:`, deleteError);
        }
      }
      
      return deletionSuccess;
    } catch (error) {
      console.error("Error unblocking time slot:", error);
      return false;
    }
  }
  
  // Blocked Time Slots operations
  async getBlockedTimeSlotById(id: number): Promise<BlockedTimeSlot | undefined> {
    try {
      const [blockedSlot] = await db.select().from(blockedTimeSlots).where(eq(blockedTimeSlots.id, id));
      return blockedSlot;
    } catch (error) {
      console.error("Error getting blocked time slot:", error);
      return undefined;
    }
  }

  async getBlockedTimeSlotsByProviderId(providerId: number): Promise<BlockedTimeSlot[]> {
    try {
      // Primeiro, obtenha todas as disponibilidades do provedor
      const providerAvailabilities = await db
        .select()
        .from(availability)
        .where(eq(availability.providerId, providerId));
      
      if (!providerAvailabilities.length) return [];
      
      const availabilityIds = providerAvailabilities.map(avail => avail.id);
      
      // Agora, recupere todos os horários bloqueados para essas disponibilidades
      const result = await db
        .select()
        .from(blockedTimeSlots)
        .where(inArray(blockedTimeSlots.availabilityId, availabilityIds));
        
      return result;
    } catch (error) {
      console.error("Error getting blocked time slots by provider:", error);
      return [];
    }
  }

  async getBlockedTimeSlotsByAvailabilityId(availabilityId: number): Promise<BlockedTimeSlot[]> {
    try {
      const result = await db
        .select()
        .from(blockedTimeSlots)
        .where(eq(blockedTimeSlots.availabilityId, availabilityId));
        
      return result;
    } catch (error) {
      console.error("Error getting blocked time slots by availability:", error);
      return [];
    }
  }

  async getBlockedTimeSlotsByDate(providerId: number, date: string): Promise<BlockedTimeSlot[]> {
    try {
      if (!providerId || isNaN(providerId) || !date) {
        console.error(`ID de prestador ou data inválida: provider=${providerId}, date=${date}`);
        return [];
      }
      
      console.log(`Buscando bloqueios de horário para o prestador ${providerId} na data ${date}`);
      
      // Verificar se a tabela blocked_time_slots existe
      try {
        const tableExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'blocked_time_slots'
          );
        `);
        
        if (!tableExists?.rows?.[0]?.exists) {
          console.log("A tabela blocked_time_slots não existe, retornando lista vazia");
          return [];
        }
      } catch (checkError) {
        console.log("Erro ao verificar se tabela blocked_time_slots existe:", checkError.message);
        return [];
      }
      
      // Usar abordagem de SQL nativo para evitar problemas com o Drizzle ORM
      const results = await db.execute(sql`
        SELECT 
          id, 
          provider_id as "providerId", 
          availability_id as "availabilityId", 
          date, 
          start_time as "startTime", 
          end_time as "endTime", 
          reason
        FROM blocked_time_slots 
        WHERE 
          provider_id = ${providerId} 
          AND date = ${date}
      `);
      
      // Verificar se temos resultados válidos
      if (!results || !results.rows || !Array.isArray(results.rows)) {
        console.log(`Nenhum bloqueio encontrado para o prestador ${providerId} na data ${date}`);
        return [];
      }
      
      console.log(`Encontrados ${results.rows.length} bloqueios para o prestador ${providerId} na data ${date}`);
      
      try {
        // Converter resultados para o formato esperado e garantir que todos os campos existam
        return results.rows.map(row => {
          if (!row) return null;
          
          const blockedSlot: BlockedTimeSlot = {
            id: row.id || 0,
            providerId: row.providerId || providerId,
            date: row.date || date,
            startTime: row.startTime || "00:00",
            endTime: row.endTime || "23:59",
            reason: row.reason || null,
            blockedByUserId: null, // Campo opcional
            metadata: null, // Campo opcional
            availabilityId: row.availabilityId || null,
            createdAt: null // Campo opcional
          };
          return blockedSlot;
        }).filter(slot => slot !== null);
      } catch (mapError) {
        console.error("Erro ao mapear resultados de bloqueios:", mapError);
        return [];
      }
    } catch (error) {
      console.error(`Erro ao buscar bloqueios para o prestador ${providerId} na data ${date}:`, error);
      // Se a tabela não existir, simplesmente retornar array vazio
      if (error.code === '42P01') { // código para "relation does not exist"
        console.log("A tabela blocked_time_slots não existe, retornando lista vazia");
        return [];
      }
      return [];
    }
  }
  
  // Time Slot History operations
  async getBlockedTimeSlotsHistory(providerId: number, date?: string): Promise<BlockedTimeSlotHistory[]> {
    try {
      // Implementação que será substituída quando a tabela de histórico for criada
      console.log(`Buscando histórico de bloqueios para o prestador ${providerId}${date ? ` na data ${date}` : ''}`);
      
      // Por enquanto, estamos apenas recuperando os bloqueios atuais e simulando o histórico
      const blockedSlots = date 
        ? await this.getBlockedTimeSlotsByDate(providerId, date)
        : await this.getBlockedTimeSlotsByProviderId(providerId);
      
      // Converter os bloqueios atuais em registros de histórico (simulação)
      return blockedSlots.map(slot => ({
        id: slot.id + 1000, // Simulando um ID diferente para o registro de histórico
        blockedTimeSlotId: slot.id,
        providerId: slot.providerId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: slot.reason,
        blockedByUserId: null, // slot.blockedByUserId não existe ainda
        actionType: 'create', // Assumindo que todos são criações para esta simulação
        actionTimestamp: slot.createdAt || new Date(),
        metadata: { // slot.metadata não existe ainda
          type: 'manual',
          recurrentId: null,
          appointmentId: null
        }
      }));
    } catch (error) {
      console.error("Error getting blocked time slots history:", error);
      return [];
    }
  }
  
  async getBlockedTimeSlotHistoryById(id: number): Promise<BlockedTimeSlotHistory | undefined> {
    try {
      console.log(`Buscando registro de histórico de bloqueio com ID ${id}`);
      
      // Implementação simulada
      const blockedSlot = await this.getBlockedTimeSlotById(id);
      if (!blockedSlot) return undefined;
      
      return {
        id: blockedSlot.id + 1000,
        blockedTimeSlotId: blockedSlot.id,
        providerId: blockedSlot.providerId,
        date: blockedSlot.date,
        startTime: blockedSlot.startTime,
        endTime: blockedSlot.endTime,
        reason: blockedSlot.reason,
        blockedByUserId: null, // blockedSlot.blockedByUserId não existe ainda
        actionType: 'create',
        actionTimestamp: blockedSlot.createdAt || new Date(),
        metadata: { // blockedSlot.metadata não existe ainda
          type: 'manual',
          recurrentId: null,
          appointmentId: null
        }
      };
    } catch (error) {
      console.error("Error getting blocked time slot history by id:", error);
      return undefined;
    }
  }
  
  async getBlockedTimeSlotsHistoryByType(
    providerId: number, 
    type: 'lunch' | 'manual' | 'appointment' | 'system'
  ): Promise<BlockedTimeSlotHistory[]> {
    try {
      console.log(`Buscando histórico de bloqueios do tipo ${type} para o prestador ${providerId}`);
      
      // Implementação simulada
      const blockedSlots = await this.getBlockedTimeSlotsByProviderId(providerId);
      
      // Como ainda não temos o campo metadata, não podemos filtrar por tipo
      // Em uma implementação real, filtraríamos pelo tipo do bloqueio
      // Por enquanto, vamos simular que todos os bloqueios são do tipo solicitado
      const filteredSlots = blockedSlots;
      
      // Converter os bloqueios atuais em registros de histórico (simulação)
      return filteredSlots.map(slot => ({
        id: slot.id + 1000,
        blockedTimeSlotId: slot.id,
        providerId: slot.providerId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: slot.reason,
        blockedByUserId: null, // slot.blockedByUserId não existe ainda
        actionType: 'create',
        actionTimestamp: slot.createdAt || new Date(),
        metadata: { // slot.metadata não existe ainda
          type,
          recurrentId: null,
          appointmentId: null
        }
      }));
    } catch (error) {
      console.error(`Error getting blocked time slots history by type ${type}:`, error);
      return [];
    }
  }
  
  // Método para converter string de tempo (HH:MM) para minutos
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Método para converter minutos para string de tempo (HH:MM)
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  async getAvailableTimeSlots(providerId: number, date: string, serviceId?: number): Promise<{ startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number }[]> {
    try {
      console.log(`Consultando slots disponíveis para prestador ${providerId} na data ${date}`);
      
      // 1. Determinar o dia da semana para a data solicitada
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, ...
      
      // 2. Buscar disponibilidade para o dia da semana ou data específica
      let availabilities = await db
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.providerId, providerId),
            eq(availability.isAvailable, true),
            or(
              eq(availability.date, date),
              and(
                eq(availability.dayOfWeek, dayOfWeek),
                eq(availability.date, null)
              )
            )
          )
        );
      
      // Priorizar configurações específicas para a data sobre as configurações do dia da semana
      availabilities = availabilities.sort((a, b) => {
        if (a.date === date) return -1; // Dá prioridade a entradas com data específica
        if (b.date === date) return 1;
        return 0;
      });
      
      if (!availabilities.length) {
        console.log(`Nenhuma disponibilidade encontrada para prestador ${providerId} na data ${date}. Criando slots padrão.`);
        
        // Criar slots mais realistas para o dia
        // Horários de funcionamento variam de acordo com o dia da semana e o prestador
        console.log(`Gerando slots realistas para a data ${date} (dia da semana: ${dayOfWeek})`);
        
        // Verificamos se é um dia de semana ou final de semana
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Se for domingo (0), normalmente não há atendimento
        if (dayOfWeek === 0) {
          return [];
        }
        
        // Verificar se o prestador é médico, cabeleireiro ou outro tipo para ajustar horários adequadamente
        const provider = await this.getUser(providerId);
        const providerSettings = await this.getProviderSettings(providerId);
        
        // Criar configurações realistas baseadas no tipo de serviço
        const timeSlots = [];
        
        // Determinar horários padrão com base no tipo de prestador
        let startHour = 8; // 8:00 padrão
        let endHour = isWeekend ? 13 : 18; // Padrão: 13h no sábado, 18h dias úteis
        let lunchStart = 12; // 12:00 padrão
        let lunchEnd = 13;   // 13:00 padrão
        let breakDuration = 15; // Pausa entre clientes (em minutos)
        let hasLunchBreak = true;
        
        // Ajustar configurações baseadas no tipo do prestador (se disponível)
        if (providerSettings) {
          // Obter a primeira categoria associada a este prestador
          const providerServices = await this.getProviderServices(providerId);
          const serviceIds = providerServices.map(ps => ps.serviceId);
          
          if (serviceIds.length > 0) {
            const services = await db
              .select()
              .from(services)
              .where(inArray(services.id, serviceIds));
            
            const categoryIds = [...new Set(services.map(s => s.categoryId))];
            
            if (categoryIds.length > 0) {
              const categories = await db
                .select()
                .from(categories)
                .where(inArray(categories.id, categoryIds));
              
              const nicheIds = [...new Set(categories.map(c => c.nicheId))];
              
              if (nicheIds.length > 0) {
                const niches = await db
                  .select()
                  .from(niches)
                  .where(inArray(niches.id, nicheIds));
                
                // Ajustar com base no tipo de serviço/nicho
                const nicheNames = niches.map(n => n.name.toLowerCase());
                
                // Médicos/saúde normalmente têm horários mais estruturados
                if (nicheNames.some(n => n.includes('saúde') || n.includes('medic') || n.includes('clínic'))) {
                  startHour = 8;
                  endHour = isWeekend ? 12 : 17;
                  lunchStart = 12;
                  lunchEnd = 14; // Médicos têm pausa mais longa para almoço
                  breakDuration = 15; // Tempo entre consultas
                }
                // Salões de beleza geralmente começam mais tarde e vão até mais tarde
                else if (nicheNames.some(n => n.includes('beleza') || n.includes('estética') || n.includes('cabeleir'))) {
                  startHour = 9;
                  endHour = isWeekend ? 16 : 20; // Salões abrem no sábado até mais tarde
                  lunchStart = 12;
                  lunchEnd = 13;
                  breakDuration = 10; // Tempo entre clientes
                }
                // Profissionais de casa/manutenção
                else if (nicheNames.some(n => n.includes('casa') || n.includes('manutençã') || n.includes('limpeza'))) {
                  startHour = 8;
                  endHour = isWeekend ? 13 : 17;
                  hasLunchBreak = false; // Muitos prestadores deste tipo não têm intervalo fixo
                  breakDuration = 30; // Tempo de deslocamento entre serviços
                }
              }
            }
          }
          
          // Respeitar configurações específicas do prestador se existirem
          if (providerSettings.workStartTime) startHour = this.timeToMinutes(providerSettings.workStartTime) / 60;
          if (providerSettings.workEndTime) endHour = this.timeToMinutes(providerSettings.workEndTime) / 60;
          if (providerSettings.breakBetweenAppointments) breakDuration = providerSettings.breakBetweenAppointments;
          
          // Ajustar configurações de almoço se disponíveis
          if (providerSettings.lunchStartTime && providerSettings.lunchEndTime) {
            lunchStart = this.timeToMinutes(providerSettings.lunchStartTime) / 60;
            lunchEnd = this.timeToMinutes(providerSettings.lunchEndTime) / 60;
            hasLunchBreak = true;
          }
        }
        
        // Intervalo em minutos entre os slots (intervalos mais flexíveis/realistas)
        // Cada tipo de serviço tem intervalos diferentes
        const slotInterval = serviceId ? 30 : 15; // Intervalo padrão: 30 min para serviço específico, 15 min para visão geral
        
        // Duração padrão do serviço
        let serviceDuration = 30;
        if (serviceId) {
          const service = await this.getService(serviceId);
          if (service) {
            serviceDuration = service.duration;
            // Ajustar o intervalo entre slots com base na duração do serviço
            // Serviços curtos (menor que 30 min) podem ter slots a cada 15 min
            // Serviços médios (30-60 min) podem ter slots a cada 30 min
            // Serviços longos (mais de 60 min) podem ter slots a cada 60 min
          }
        }
        
        // Criar alguns slots ocupados aleatoriamente para simular uma agenda realista
        // Determinamos uma quantidade de slots pré-ocupados com base no dia da semana
        const numPreOccupiedSlots = isWeekend ? 2 : Math.floor(Math.random() * 4) + 2; // 2-5 slots ocupados em dias úteis
        const occupiedSlots = [];
        
        // Criar intervalos ocupados durante o dia
        const slotsPorPeriodo = Math.floor((endHour - startHour) * 60 / serviceDuration);
        for (let i = 0; i < numPreOccupiedSlots; i++) {
          const slotPosition = Math.floor(Math.random() * slotsPorPeriodo);
          const slotStartMinute = startHour * 60 + slotPosition * serviceDuration;
          
          // Evitar criar slots ocupados no horário de almoço
          if (hasLunchBreak && slotStartMinute >= lunchStart * 60 && slotStartMinute < lunchEnd * 60) {
            continue;
          }
          
          occupiedSlots.push({
            start: slotStartMinute,
            end: slotStartMinute + serviceDuration
          });
        }
        
        // Garantir que slots ocupados não se sobreponham (ordenar e ajustar)
        occupiedSlots.sort((a, b) => a.start - b.start);
        for (let i = 1; i < occupiedSlots.length; i++) {
          if (occupiedSlots[i].start < occupiedSlots[i-1].end) {
            occupiedSlots[i].start = occupiedSlots[i-1].end + breakDuration;
            occupiedSlots[i].end = occupiedSlots[i].start + serviceDuration;
          }
        }
        
        // Gerar slots do período da manhã
        const morningEndHour = hasLunchBreak ? lunchStart : endHour;
        for (let hour = startHour; hour < morningEndHour; hour++) {
          for (let minute = 0; minute < 60; minute += slotInterval) {
            const slotStartMinute = hour * 60 + minute;
            const startTime = `${Math.floor(slotStartMinute/60).toString().padStart(2, '0')}:${(slotStartMinute%60).toString().padStart(2, '0')}`;
            
            // Calcular o horário de término com base na duração do serviço
            const endTimeMinutes = slotStartMinute + serviceDuration;
            const endTime = `${Math.floor(endTimeMinutes/60).toString().padStart(2, '0')}:${(endTimeMinutes%60).toString().padStart(2, '0')}`;
            
            // Verificar se o slot ultrapassa o horário de almoço
            if (hasLunchBreak && (endTimeMinutes > lunchStart * 60)) {
              continue;
            }
            
            // Verificar se o slot está ocupado
            const isSlotOccupied = occupiedSlots.some(
              occupied => (slotStartMinute >= occupied.start && slotStartMinute < occupied.end) || 
                         (slotStartMinute + serviceDuration > occupied.start && slotStartMinute < occupied.end)
            );
            
            timeSlots.push({
              startTime,
              endTime,
              isAvailable: !isSlotOccupied
            });
          }
        }
        
        // Se houver período da tarde (após o almoço), adicionar slots da tarde
        if (lunchEnd < endHour) {
          for (let hour = lunchEnd; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += slotInterval) {
              const slotStartMinute = hour * 60 + minute;
              const startTime = `${Math.floor(slotStartMinute/60).toString().padStart(2, '0')}:${(slotStartMinute%60).toString().padStart(2, '0')}`;
              
              // Calcular o horário de término com base na duração do serviço
              const endTimeMinutes = slotStartMinute + serviceDuration;
              const endTime = `${Math.floor(endTimeMinutes/60).toString().padStart(2, '0')}:${(endTimeMinutes%60).toString().padStart(2, '0')}`;
              
              // Verificar se o slot ultrapassa o final do expediente
              if (endTimeMinutes > endHour * 60) {
                continue;
              }
              
              // Verificar se o slot está ocupado
              const isSlotOccupied = occupiedSlots.some(
                occupied => (slotStartMinute >= occupied.start && slotStartMinute < occupied.end) || 
                           (slotStartMinute + serviceDuration > occupied.start && slotStartMinute < occupied.end)
              );
              
              timeSlots.push({
                startTime,
                endTime,
                isAvailable: !isSlotOccupied
              });
            }
          }
        }
        
        console.log(`Gerados ${timeSlots.length} slots padrão para o prestador ${providerId} na data ${date}`);
        return timeSlots;
      }
      
      const scheduleConfig = availabilities[0]; // Usamos a primeira disponibilidade (mais prioritária)
      
      // 3. Buscar agendamentos existentes para a data
      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.providerId, providerId),
            eq(appointments.date, date),
            or(
              eq(appointments.status, "confirmed"), 
              eq(appointments.status, "pending")
            )
          )
        );
      
      // 4. Buscar horários bloqueados para a data
      const blockedTimeSlots = await this.getBlockedTimeSlotsByDate(providerId, date);
      
      // 5. Determinar duração do serviço
      let serviceDuration = 30; // Duração padrão
      
      if (serviceId) {
        const service = await this.getService(serviceId);
        if (service) {
          serviceDuration = service.duration;
          
          // Verificar se o prestador tem uma personalização do tempo de execução
          const providerService = await db
            .select()
            .from(providerServices)
            .where(
              and(
                eq(providerServices.providerId, providerId),
                eq(providerServices.serviceId, serviceId)
              )
            )
            .limit(1);
          
          if (providerService.length > 0 && providerService[0].executionTime) {
            serviceDuration = providerService[0].executionTime;
          }
        }
      }
      
      // 6. Gerar os slots de tempo
      const { startTime, endTime } = scheduleConfig;
      const slots: { startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number }[] = [];
      
      // Converter horários para minutos para facilitar os cálculos
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);
      
      // Determinar o intervalo entre slots (padrão ou da configuração)
      const slotInterval = scheduleConfig.intervalMinutes || 15;
      
      // Gerar slots a cada slotInterval minutos
      for (let current = startMinutes; current < endMinutes; current += slotInterval) {
        // Verificar se o slot tem duração suficiente
        if (current + serviceDuration > endMinutes) {
          continue; // Não há tempo suficiente para este serviço
        }
        
        const slotStart = this.minutesToTime(current);
        const slotEnd = this.minutesToTime(current + serviceDuration);
        
        // Verificar se o slot está bloqueado manualmente
        const isBlocked = blockedTimeSlots.some(block => {
          const blockStart = this.timeToMinutes(block.startTime);
          const blockEnd = this.timeToMinutes(block.endTime);
          return (current >= blockStart && current < blockEnd) || 
                 (current + serviceDuration > blockStart && current < blockEnd);
        });
        
        // Verificar se o slot conflita com algum agendamento existente
        const hasAppointmentConflict = existingAppointments.some(app => {
          const appStart = this.timeToMinutes(app.startTime);
          const appEnd = this.timeToMinutes(app.endTime);
          return (current >= appStart && current < appEnd) ||
                 (current + serviceDuration > appStart && current < appEnd);
        });
        
        // Adicionar o slot na lista, marcando sua disponibilidade
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: !isBlocked && !hasAppointmentConflict,
          availabilityId: scheduleConfig.id
        });
      }
      
      return slots;
    } catch (error) {
      console.error("Erro ao consultar slots disponíveis:", error);
      return [];
    }
  }

  async createBlockedTimeSlot(blockedSlot: InsertBlockedTimeSlot): Promise<BlockedTimeSlot> {
    try {
      const [newBlockedSlot] = await db
        .insert(blockedTimeSlots)
        .values(blockedSlot)
        .returning();
        
      return newBlockedSlot;
    } catch (error) {
      console.error("Error creating blocked time slot:", error);
      throw new Error("Failed to create blocked time slot");
    }
  }

  async deleteBlockedTimeSlot(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(blockedTimeSlots)
        .where(eq(blockedTimeSlots.id, id))
        .returning({ id: blockedTimeSlots.id });
        
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting blocked time slot:", error);
      return false;
    }
  }
  // Métodos de usuário administrativos
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUsersByType(userType: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.userType, userType));
  }
  
  async getClientUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.userType, "client"));
  }
  
  async getUsersCount(userType?: string): Promise<number> {
    if (userType) {
      const result = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.userType, userType));
      return Number(result[0]?.count) || 0;
    }
    
    const result = await db
      .select({ count: count() })
      .from(users);
    return Number(result[0]?.count) || 0;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Se o usuário for um provider, também excluir configurações associadas
      const user = await this.getUser(id);
      
      if (user?.userType === 'provider') {
        // Excluir configurações do provider
        await db
          .delete(providerSettings)
          .where(eq(providerSettings.providerId, id));
      }
      
      // Excluir o usuário
      await db
        .delete(users)
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      return false;
    }
  }
  
  async getNewUsersByDay(startDate: Date, endDate: Date): Promise<{ date: string, count: number }[]> {
    // Usar SQL bruto para agrupar por dia
    const result = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    return result.rows.map((row: any) => ({
      date: typeof row.date === 'string' ? row.date : (row.date?.toISOString?.().split('T')[0] || String(row.date)),
      count: Number(row.count)
    }));
  }
  
  async getServicesCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(services);
    return Number(result[0]?.count) || 0;
  }
  
  async getCategoriesCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(categories);
    return Number(result[0]?.count) || 0;
  }
  
  async getAppointmentsCount(status?: string): Promise<number> {
    if (status) {
      const result = await db
        .select({ count: count() })
        .from(appointments)
        .where(eq(appointments.status, status));
      return Number(result[0]?.count) || 0;
    }
    
    const result = await db
      .select({ count: count() })
      .from(appointments);
    return Number(result[0]?.count) || 0;
  }
  
  async getRecentAppointments(limit: number): Promise<any[]> {
    try {
      // Usar SQL direto para evitar problemas com discrepância de colunas
      // Este SQL busca os agendamentos mais recentes com dados de cliente, prestador e serviço
      const query = sql`
        SELECT 
          a.id, a.date, a.start_time as "startTime", a.end_time as "endTime", 
          a.status, a.total_price as "totalPrice",
          c.id as "clientId", c.name as "clientName", 
          p.id as "providerId", p.name as "providerName",
          s.id as "serviceId", s.name as "serviceName"
        FROM 
          appointments a
          LEFT JOIN users c ON a.client_id = c.id
          LEFT JOIN users p ON a.provider_id = p.id
          LEFT JOIN services s ON a.service_id = s.id
        ORDER BY 
          a.date DESC, a.start_time DESC
        LIMIT ${limit}
      `;
      
      const result = await db.execute(query);
      
      if (!result || !result.rows || result.rows.length === 0) {
        return [];
      }
      
      // Formatar os dados para exibição, incluindo preço formatado
      return result.rows.map((appointment: any) => ({
        ...appointment,
        dateTime: `${appointment.date} ${appointment.startTime}`,
        formattedPrice: appointment.totalPrice 
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(appointment.totalPrice / 100)
          : 'Preço não definido'
      }));
    } catch (error) {
      console.error("Erro ao obter agendamentos recentes:", error);
      return [];
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  // Provider operations
  async getProvider(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.userType, 'provider')
        )
      );
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`Buscando usuário por email: ${email}`);
    const [user] = await db.select().from(users).where(eq(users.email, email));
    console.log(`Usuário encontrado para ${email}: ${!!user}`);
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const userData = { 
      ...user, 
      createdAt: new Date() 
    };
    
    const [newUser] = await db.insert(users).values(userData).returning();
    
    // If user is a provider, create default provider settings
    if (user.userType === "provider") {
      await this.createProviderSettings({
        providerId: newUser.id,
        isOnline: false,
        businessName: user.name || "",
        rating: 0,
        ratingCount: 0
      });
    }
    
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const tokenData = {
      ...data,
      createdAt: new Date(),
      usedAt: null
    };
    
    const [token] = await db
      .insert(passwordResetTokens)
      .values(tokenData)
      .returning();
    
    return token;
  }

  async getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    
    return resetToken || undefined;
  }
  
  async updatePasswordResetToken(id: number, data: Partial<PasswordResetToken>): Promise<PasswordResetToken | undefined> {
    const [updatedToken] = await db
      .update(passwordResetTokens)
      .set(data)
      .where(eq(passwordResetTokens.id, id))
      .returning();
    
    return updatedToken || undefined;
  }

  async deletePasswordResetToken(id: number): Promise<boolean> {
    const result = await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, id));
    
    return result !== null && result.rowCount ? result.rowCount > 0 : false;
  }

  // Niche operations
  async getNiches(): Promise<Niche[]> {
    return db.select().from(niches);
  }
  

async getNichesWithCategoriesAndServices(): Promise<Niche[]> {
  try {
    // Realizando consulta SQL personalizada para evitar problemas de mapeamento de nomes de coluna
    const query = sql`
      SELECT 
        n.id, n.name, n.description, n.icon
      FROM 
        niches n
      ORDER BY 
        n.id
    `;
    
    const allNiches = await db.execute(query);
    const result = [];
    
    for (const niche of allNiches.rows) {
      // Para cada nicho, busca suas categorias com consulta SQL personalizada
      const categoriesQuery = sql`
        SELECT 
          c.id, c.name, c.description, c.icon, c.color, c.niche_id as "nicheId"
        FROM 
          categories c
        WHERE 
          c.niche_id = ${niche.id}
        ORDER BY 
          c.name
      `;
      
      const categoriesForNiche = await db.execute(categoriesQuery);
      
      // Criamos um objeto nicho com um array vazio de categorias
      const nicheWithCategories = {
        ...niche,
        categories: []
      };
      
      // Para cada categoria do nicho, buscamos seus serviços
      for (const category of categoriesForNiche.rows) {
        const servicesQuery = sql`
          SELECT 
            s.id, s.name, s.description, s.price, s.duration, 
            s.is_active as "isActive", s.provider_id as "providerId", 
            s.category_id as "categoryId"
          FROM 
            services s
          WHERE 
            s.category_id = ${category.id}
          ORDER BY 
            s.name
        `;
        
        const servicesForCategory = await db.execute(servicesQuery);
        
        // Adicionamos a categoria com seus serviços ao nicho
        nicheWithCategories.categories.push({
          ...category,
          services: servicesForCategory.rows || []
        });
      }
      
      // Adicionamos o nicho com suas categorias e serviços ao resultado
      result.push(nicheWithCategories);
    }
    
    return result;
  } catch (error) {
    console.error("Erro ao buscar hierarquia de nichos:", error);
    throw error;
  }
}























  async getNiche(id: number): Promise<Niche | undefined> {
    const [niche] = await db
      .select()
      .from(niches)
      .where(eq(niches.id, id));
    return niche || undefined;
  }

  async getNicheByName(name: string): Promise<Niche | undefined> {
    const [niche] = await db
      .select()
      .from(niches)
      .where(eq(niches.name, name));
    return niche || undefined;
  }

  async createNiche(niche: InsertNiche): Promise<Niche> {
    try {
      // Remover qualquer id definido manualmente para evitar conflitos
      const { id, ...nicheData } = niche as any;
      
      // Verificar se já existe um nicho com o mesmo nome
      const existingNiche = await this.getNicheByName(nicheData.name);
      if (existingNiche) {
        throw new Error(`Já existe um nicho com o nome '${nicheData.name}'`);
      }
      
      const [newNiche] = await db
        .insert(niches)
        .values({
          ...nicheData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newNiche;
    } catch (error) {
      console.error("Erro ao criar nicho:", error);
      throw error;
    }
  }

  async updateNiche(id: number, nicheData: Partial<Niche>): Promise<Niche | undefined> {
    try {
      // Verificar se existe um nicho com este ID
      const existingNiche = await this.getNiche(id);
      if (!existingNiche) {
        return undefined;
      }
      
      // Se o nome estiver sendo alterado, verificar se já existe outro nicho com este nome
      if (nicheData.name && nicheData.name !== existingNiche.name) {
        const nicheWithSameName = await this.getNicheByName(nicheData.name);
        if (nicheWithSameName && nicheWithSameName.id !== id) {
          throw new Error(`Já existe um nicho com o nome '${nicheData.name}'`);
        }
      }
      
      const updateData = {
        ...nicheData,
        updatedAt: new Date()
      };
      
      const [updatedNiche] = await db
        .update(niches)
        .set(updateData)
        .where(eq(niches.id, id))
        .returning();
      
      return updatedNiche || undefined;
    } catch (error) {
      console.error("Erro ao atualizar nicho:", error);
      throw error;
    }
  }

  async deleteNiche(id: number): Promise<boolean> {
    try {
      // Primeiro, verificar se o nicho existe
      const niche = await this.getNiche(id);
      if (!niche) {
        console.log(`Nicho com ID ${id} não encontrado ao tentar excluir`);
        return false;
      }

      // Verificar se existem categorias associadas a este nicho
      const categoryCount = await db
        .select({ count: count() })
        .from(categories)
        .where(eq(categories.nicheId, id));
      
      // Se houver categorias associadas, não podemos excluir o nicho
      if (Number(categoryCount[0]?.count) > 0) {
        console.log(`Nicho com ID ${id} possui ${categoryCount[0]?.count} categorias associadas e não pode ser excluído`);
        return false;
      }
      
      const result = await db
        .delete(niches)
        .where(eq(niches.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Erro ao excluir nicho com ID ${id}:`, error);
      return false;
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    try {
      // Usar SQL direto para obter colunas, incluindo as novas que adicionamos
      const result = await db.execute(
        sql`SELECT id, name, description, icon, color, niche_id as "nicheId", 
            created_at as "createdAt", updated_at as "updatedAt"
            FROM categories
            ORDER BY name`
      );
      
      if (!result || !result.rows || result.rows.length === 0) {
        return [];
      }
      
      return result.rows as Category[];
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      return []; // Retornar array vazio em vez de propagar o erro
    }
  }
  
  async getCategoriesWithNicheInfo(): Promise<any[]> {
    try {
      // Usar SQL direto com aliases para mapear corretamente os campos
      // Incluir um JOIN com a tabela de nichos para obter o nome do nicho e ícone
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.description, c.icon, c.color, c.niche_id as "nicheId", 
                  n.name as "nicheName", n.icon as "nicheIcon", n.description as "nicheDescription",
                  c.created_at as "createdAt", c.updated_at as "updatedAt"
            FROM categories c
            LEFT JOIN niches n ON c.niche_id = n.id
            ORDER BY c.name`
      );
      
      if (!result || !result.rows || result.rows.length === 0) {
        return [];
      }
      
      return result.rows as (Category & { nicheName: string, nicheIcon: string | null })[];
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      return [];
    }
  }
  
  /**
   * Obtém uma configuração do sistema pelo seu identificador único (key)
   * 
   * @param key - Chave única da configuração
   * @returns Configuração do sistema ou null se não encontrada
   */
  async getSystemSettingByKey(key: string): Promise<SystemSetting | null> {
    try {
      const result = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, key),
      });
      
      return result || null;
    } catch (error) {
      console.error("Erro ao buscar configuração do sistema:", error);
      return null;
    }
  }
  
  /**
   * Cria ou atualiza uma configuração do sistema
   * 
   * @param key - Chave única da configuração
   * @param value - Valor da configuração
   * @param label - Nome legível da configuração
   * @param description - Descrição da configuração
   * @returns Configuração do sistema atualizada ou null em caso de erro
   */
  async setSystemSetting(key: string, value: string, label: string, description?: string): Promise<SystemSetting | null> {
    try {
      const existingSetting = await this.getSystemSettingByKey(key);
      
      if (existingSetting) {
        // Atualizar configuração existente
        const [updated] = await db
          .update(systemSettings)
          .set({ 
            value, 
            label, 
            description, 
            updatedAt: new Date() 
          })
          .where(eq(systemSettings.key, key))
          .returning();
        
        return updated || null;
      } else {
        // Criar nova configuração
        const [newSetting] = await db
          .insert(systemSettings)
          .values({
            key,
            value,
            label,
            description
          })
          .returning();
        
        return newSetting || null;
      }
    } catch (error) {
      console.error("Erro ao definir configuração do sistema:", error);
      return null;
    }
  }
  
  /**
   * Exclui uma configuração do sistema
   * 
   * @param key - Chave única da configuração
   * @returns true se excluída com sucesso, false caso contrário
   */
  async deleteSystemSetting(key: string): Promise<boolean> {
    try {
      await db
        .delete(systemSettings)
        .where(eq(systemSettings.key, key));
      
      return true;
    } catch (error) {
      console.error("Erro ao excluir configuração do sistema:", error);
      return false;
    }
  }
  
  /**
   * Busca todas as categorias com seus respectivos serviços
   * Implementa um JOIN com a tabela de serviços para incluir todos os serviços
   * de cada categoria na resposta
   * 
   * @param nicheId - ID opcional do nicho para filtrar categorias
   */
  async getCategoriesWithServices(nicheId?: number): Promise<any[]> {
    try {
      // Buscar categorias, opcionalmente filtradas por nicho
      let categories: Category[];
      if (nicheId) {
        categories = await this.getCategoriesByNicheId(nicheId);
      } else {
        categories = await this.getCategories();
      }
      
      // Se não houver categorias, retornar array vazio
      if (!categories || categories.length === 0) {
        return [];
      }
      
      // Para cada categoria, buscar seus serviços
      const result = [];
      
      // Importamos services do schema para usar no where
      const { services } = await import("@shared/schema");
      
      for (const category of categories) {
        // Buscar serviços desta categoria
        const categoryServices = await db.select().from(services).where(eq(services.categoryId, category.id));
        
        // Adicionar categoria com seus serviços ao resultado
        result.push({
          ...category,
          services: categoryServices || []
        });
      }
      
      return result;
    } catch (error) {
      console.error("Erro ao buscar categorias com serviços:", error);
      return [];
    }
  }
  
  async getCategoriesByNicheId(nicheId: number): Promise<Category[]> {
    try {
      // Usar SQL direto com aliases para mapear corretamente os campos do banco de dados
      // Incluir JOIN com a tabela de nichos para obter o nome do nicho
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.description, c.icon, c.color, c.niche_id as "nicheId",
                  n.name as "nicheName", n.icon as "nicheIcon",
                  c.created_at as "createdAt", c.updated_at as "updatedAt"
            FROM categories c
            LEFT JOIN niches n ON c.niche_id = n.id
            WHERE c.niche_id = ${nicheId}
            ORDER BY c.name`
      );
      
      if (!result || !result.rows || result.rows.length === 0) {
        return [];
      }
      
      return result.rows as (Category & { nicheName: string, nicheIcon: string | null })[];
    } catch (error) {
      console.error("Erro ao buscar categorias por nicho:", error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      // Usar SQL direto com aliases para mapear corretamente os campos
      // Incluir JOIN com a tabela de nichos para obter o nome do nicho
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.description, c.icon, c.color, c.niche_id as "nicheId",
                 n.name as "nicheName", n.icon as "nicheIcon"
            FROM categories c
            LEFT JOIN niches n ON c.niche_id = n.id
            WHERE c.id = ${id}`
      );
      
      if (!result || !result.rows || result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0] as (Category & { nicheName: string, nicheIcon: string | null });
    } catch (error) {
      console.error("Erro ao buscar categoria por ID:", error);
      return undefined;
    }
  }
  
  /**
   * Busca uma categoria específica por ID e inclui todos os seus serviços
   */
  async getCategoryWithServices(id: number): Promise<any | undefined> {
    try {
      // Primeiro buscar a categoria
      const category = await this.getCategory(id);
      
      if (!category) {
        return undefined;
      }
      
      // Importar o objeto services do schema
      const { services } = await import("@shared/schema");
      
      // Buscar serviços desta categoria
      const categoryServices = await db.select().from(services).where(eq(services.categoryId, id));
      
      // Retornar categoria com seus serviços
      return {
        ...category,
        services: categoryServices || []
      };
    } catch (error) {
      console.error("Erro ao buscar categoria com serviços:", error);
      return undefined;
    }
  }

  async getCategoryByNameAndNiche(name: string, nicheId: number): Promise<Category | undefined> {
    try {
      // Consulta SQL direta para evitar problema com discrepância de colunas
      // Incluir JOIN com a tabela de nichos para obter o nome do nicho
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.description, c.icon, c.color, c.niche_id as "nicheId",
                 n.name as "nicheName", n.icon as "nicheIcon"
            FROM categories c
            LEFT JOIN niches n ON c.niche_id = n.id
            WHERE c.name = ${name} AND c.niche_id = ${nicheId}`
      );
      
      if (result.rows && result.rows.length > 0) {
        return result.rows[0] as (Category & { nicheName: string, nicheIcon: string | null });
      }
      return undefined;
    } catch (error) {
      console.error("Erro ao buscar categoria por nome e nicho:", error);
      return undefined;
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      // Remover qualquer id definido manualmente para evitar conflitos
      const { id, ...categoryData } = category as any;
      
      // Verificar se o nicheId existe e é um número (incluindo 0, que é válido)
      if (categoryData.nicheId === undefined || categoryData.nicheId === null) {
        throw new Error("nicheId é obrigatório");
      }
      
      // Verificar se o nicho existe
      const niche = await this.getNiche(categoryData.nicheId);
      if (!niche) {
        throw new Error(`Nicho com ID ${categoryData.nicheId} não encontrado`);
      }
      
      // Verificar se já existe uma categoria com o mesmo nome neste nicho
      const existingCategory = await this.getCategoryByNameAndNiche(categoryData.name, categoryData.nicheId);
      if (existingCategory) {
        throw new Error(`Já existe uma categoria com o nome '${categoryData.name}' dentro do nicho selecionado`);
      }
      
      // Usar consulta SQL com todas as colunas, incluindo created_at e updated_at
      const now = new Date();
      const result = await db.execute(
        sql`INSERT INTO categories (name, description, icon, color, niche_id, created_at, updated_at) 
            VALUES (${categoryData.name}, ${categoryData.description}, ${categoryData.icon}, ${categoryData.color}, ${categoryData.nicheId}, ${now}, ${now}) 
            RETURNING id, name, description, icon, color, niche_id as "nicheId", created_at as "createdAt", updated_at as "updatedAt"`
      );
      
      if (!result || !result.rows || result.rows.length === 0) {
        throw new Error("Falha ao criar categoria: nenhum registro retornado");
      }
      
      return result.rows[0] as Category;
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      if (error.message?.includes("já existe")) {
        throw error;
      }
      throw new Error("Não foi possível processar a solicitação");
    }
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    try {
      // Verificar se a categoria existe
      const existingCategory = await this.getCategory(id);
      if (!existingCategory) {
        return undefined;
      }
      
      // Se houver mudança no nicheId, verificar se o novo nicho existe
      if (categoryData.nicheId && categoryData.nicheId !== existingCategory.nicheId) {
        const niche = await this.getNiche(categoryData.nicheId);
        if (!niche) {
          throw new Error(`Nicho com ID ${categoryData.nicheId} não encontrado`);
        }
      }
      
      // Se o nome for alterado, verificar se já existe uma categoria com esse nome no mesmo nicho
      if (categoryData.name && categoryData.name !== existingCategory.name) {
        const nicheId = categoryData.nicheId || existingCategory.nicheId;
        const existingCategoryWithName = await this.getCategoryByNameAndNiche(categoryData.name, nicheId);
        if (existingCategoryWithName) {
          throw new Error(`Já existe uma categoria com o nome '${categoryData.name}' dentro do nicho selecionado`);
        }
      }
      
      // Usar consulta SQL direta para evitar problemas com colunas que não existem na tabela
      const fields = [];
      const values = [];
      
      // Sempre atualizar o campo updated_at quando houver alguma alteração
      const now = new Date();
      fields.push("updated_at");
      values.push(now);
      
      if (categoryData.name) {
        fields.push("name");
        values.push(categoryData.name);
      }
      
      if (categoryData.description !== undefined) {
        fields.push("description");
        values.push(categoryData.description);
      }
      
      if (categoryData.icon !== undefined) {
        fields.push("icon");
        values.push(categoryData.icon);
      }
      
      if (categoryData.color !== undefined) {
        fields.push("color");
        values.push(categoryData.color);
      }
      
      if (categoryData.nicheId !== undefined) {
        fields.push("niche_id");
        values.push(categoryData.nicheId);
      }
      
      if (fields.length === 1 && fields[0] === "updated_at") {
        return existingCategory; // Nenhuma mudança a ser feita além do updated_at
      }
      
      // Construir consulta SQL usando sql tagged template
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const query = `
        UPDATE categories 
        SET ${setClause} 
        WHERE id = $${fields.length + 1} 
        RETURNING id, name, description, icon, color, niche_id as "nicheId", created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      values.push(id);
      
      const result = await db.execute(sql.raw(query), values);
      
      if (!result || result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0] as Category;
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      throw error;
    }
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    try {
      // Primeiro verificar se existem serviços associados a esta categoria
      const categoryServices = await this.getServicesByCategory(id);
      
      // Remover todos os serviços associados primeiro
      for (const service of categoryServices) {
        await this.deleteService(service.id);
      }
      
      // Usar SQL direto para evitar problemas com colunas que não existem na tabela
      await db.execute(sql`DELETE FROM categories WHERE id = ${id}`);
      return true;
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      return false;
    }
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return db.select().from(services);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return db.select().from(services).where(eq(services.categoryId, categoryId));
  }

  /**
   * Função unificada para buscar serviços de um prestador, incluindo tanto 
   * serviços diretos (da tabela services) quanto serviços customizados
   * (da tabela provider_services)
   */
  async getServicesByProvider(providerId: number): Promise<Service[]> {
    try {
      console.log(`Buscando serviços para prestador ID: ${providerId}`);
      
      if (!providerId || isNaN(providerId)) {
        console.error(`ID de prestador inválido: ${providerId}`);
        return [];
      }
      
      // 1. Buscar serviços diretos da tabela services
      const directServicesResults = await db.execute(sql`
        SELECT * FROM services 
        WHERE provider_id = ${providerId}
      `);
      
      let directServices = [];
      if (directServicesResults && directServicesResults.rows && Array.isArray(directServicesResults.rows)) {
        directServices = directServicesResults.rows.map(row => ({
          id: row.id,
          providerId: row.provider_id,
          categoryId: row.category_id,
          nicheId: row.niche_id,
          name: row.name,
          description: row.description,
          price: row.price,
          duration: row.duration,
          isActive: row.is_active
        }));
      }
      
      console.log(`Encontrados ${directServices.length} serviços diretos para o prestador ${providerId}`);
      if (directServices.length > 0) {
        console.log(`IDs dos serviços diretos:`, directServices.map(s => s.id));
      }
      
      // 2. Buscar serviços da tabela provider_services e convertê-los para o formato de Service,
      // buscando informações na tabela service_templates
      const providerServicesResults = await db.execute(sql`
        SELECT ps.*, st.name, st.description, st.price, st.category_id, st.niche_id, st.duration as template_duration
        FROM provider_services ps
        JOIN service_templates st ON ps.service_id = st.id
        WHERE ps.provider_id = ${providerId} AND ps.is_active = true
      `);
      
      let customServices = [];
      if (providerServicesResults && providerServicesResults.rows && Array.isArray(providerServicesResults.rows)) {
        customServices = providerServicesResults.rows.map(row => ({
          id: row.service_id, // Importante: mantemos o ID do serviço template
          providerId: row.provider_id,
          categoryId: row.category_id,
          nicheId: row.niche_id,
          name: row.name,
          description: row.description,
          price: row.price,
          // Usar o tempo de execução personalizado, se disponível, ou a duração do template
          duration: row.execution_time || row.template_duration,
          isActive: row.is_active
        }));
      }
      
      console.log(`Encontrados ${customServices.length} serviços customizados para o prestador ${providerId}`);
      if (customServices.length > 0) {
        console.log(`IDs dos serviços customizados:`, customServices.map(s => s.id));
      }
      
      // 3. Combinar ambos os tipos de serviços, evitando duplicidades
      // Dar prioridade aos serviços customizados para evitar duplicidade
      const serviceMap = new Map();
      
      // Primeiro adicionar os serviços diretos
      directServices.forEach(service => {
        serviceMap.set(service.id, service);
      });
      
      // Depois sobrescrever com os serviços customizados que têm prioridade
      customServices.forEach(service => {
        serviceMap.set(service.id, service);
      });
      
      // Converter o Map para um Array de serviços
      const allServices = Array.from(serviceMap.values());
      
      console.log(`Total de ${allServices.length} serviços (diretos + customizados) para o prestador ${providerId}`);
      console.log(`Todos os IDs de serviços do prestador ${providerId}:`, allServices.map(s => s.id));
      
      return allServices;
    } catch (error) {
      console.error(`Erro ao buscar serviços do prestador ${providerId}:`, error);
      return [];
    }
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    
    return updatedService || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return !!result;
  }
  
  // Provider Service operations (customized execution time)
  async getProviderService(id: number): Promise<ProviderService | undefined> {
    try {
      const [providerService] = await db.select().from(providerServices).where(eq(providerServices.id, id));
      return providerService;
    } catch (error) {
      console.error("Error getting provider service:", error);
      return undefined;
    }
  }
  
  async getProviderServiceByProviderAndService(providerId: number, serviceId: number): Promise<ProviderService | undefined> {
    try {
      const [providerService] = await db.select()
        .from(providerServices)
        .where(and(
          eq(providerServices.providerId, providerId),
          eq(providerServices.serviceId, serviceId)
        ));
      return providerService;
    } catch (error) {
      console.error("Error getting provider service by provider and service:", error);
      return undefined;
    }
  }
  
  async getProviderServicesByProvider(providerId: number): Promise<ProviderService[]> {
    try {
      if (!providerId || isNaN(providerId)) {
        console.error(`ID inválido de prestador: ${providerId}`);
        return [];
      }

      // Abordagem segura com campos explícitos para evitar problemas no Drizzle ORM
      const results = await db.execute(sql`
        SELECT 
          id, 
          provider_id as "providerId", 
          service_id as "serviceId", 
          execution_time as "executionTime", 
          duration,
          price,
          is_active as "isActive", 
          created_at as "createdAt",
          break_time as "breakTime"
        FROM provider_services 
        WHERE provider_id = ${providerId}
      `);
      
      // Verificar se temos resultados válidos
      if (!results || !results.rows || !Array.isArray(results.rows)) {
        console.log(`Nenhum serviço encontrado para o prestador ${providerId}`);
        return [];
      }
      
      // Converter resultados para o formato esperado
      return results.rows.map(row => ({
        id: row.id,
        providerId: row.providerId,
        serviceId: row.serviceId,
        executionTime: row.executionTime,
        duration: row.duration,
        price: row.price,
        isActive: row.isActive,
        createdAt: row.createdAt,
        breakTime: row.breakTime
      }));
    } catch (error) {
      console.error(`Erro ao buscar serviços do prestador ${providerId}:`, error);
      return [];
    }
  }
  
  // Alias para compatibilidade com código existente
  async getProviderServicesByProviderId(providerId: number): Promise<ProviderService[]> {
    return this.getProviderServicesByProvider(providerId);
  }
  
  async createProviderService(providerService: InsertProviderService): Promise<ProviderService> {
    try {
      const [newProviderService] = await db.insert(providerServices)
        .values({
          ...providerService,
          createdAt: new Date()
        })
        .returning();
      return newProviderService;
    } catch (error) {
      console.error("Error creating provider service:", error);
      throw error;
    }
  }
  
  async updateProviderService(id: number, providerServiceData: Partial<ProviderService>): Promise<ProviderService | undefined> {
    try {
      const [updatedProviderService] = await db.update(providerServices)
        .set(providerServiceData)
        .where(eq(providerServices.id, id))
        .returning();
      return updatedProviderService;
    } catch (error) {
      console.error("Error updating provider service:", error);
      return undefined;
    }
  }
  
  async deleteProviderService(id: number): Promise<boolean> {
    try {
      const result = await db.delete(providerServices).where(eq(providerServices.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Error deleting provider service:", error);
      return false;
    }
  }

  // Availability operations
  async getAvailability(id: number): Promise<Availability | undefined> {
    try {
      console.log(`Buscando disponibilidade pelo ID: ${id}`);
      
      const [result] = await db
        .select()
        .from(availability)
        .where(eq(availability.id, id));
      
      if (result) {
        console.log("Disponibilidade encontrada:", result);
      } else {
        console.log("Disponibilidade não encontrada para o ID:", id);
      }
      
      return result || undefined;
    } catch (error) {
      console.error("Erro ao buscar disponibilidade:", error);
      return undefined;
    }
  }
  
  async getAvailabilitiesByProviderId(providerId: number): Promise<Availability[]> {
    try {
      console.log(`Buscando disponibilidades para o prestador ID: ${providerId}`);
      
      const results = await db
        .select()
        .from(availability)
        .where(eq(availability.providerId, providerId));
      
      console.log(`Encontradas ${results.length} disponibilidades para o prestador ID: ${providerId}`);
      return results;
    } catch (error) {
      console.error("Erro ao buscar disponibilidades:", error);
      return [];
    }
  }
  
  async getAvailabilityByDay(providerId: number, dayOfWeek: number): Promise<Availability[]> {
    try {
      if (!providerId || isNaN(providerId)) {
        console.error(`ID inválido de prestador: ${providerId}`);
        return [];
      }

      if (dayOfWeek < 0 || dayOfWeek > 6) {
        console.error(`Dia da semana inválido: ${dayOfWeek} (deve ser entre 0-6)`);
        return [];
      }

      console.log(`Buscando disponibilidade para o prestador ID ${providerId} no dia da semana ${dayOfWeek}`);
      
      // Usar SQL puro para maior controle e evitar problemas com Drizzle ORM
      // Apenas selecionar colunas que sabemos existir na tabela
      const results = await db.execute(sql`
        SELECT 
          id, 
          provider_id as "providerId", 
          day_of_week as "dayOfWeek", 
          date, 
          start_time as "startTime", 
          end_time as "endTime", 
          is_available as "isAvailable", 
          interval_minutes as "intervalMinutes"
        FROM availability 
        WHERE 
          provider_id = ${providerId} 
          AND day_of_week = ${dayOfWeek} 
          AND is_available = true
      `);
      
      // Verificar se temos resultados válidos
      if (!results || !results.rows || !Array.isArray(results.rows)) {
        console.log(`Nenhuma disponibilidade encontrada para o prestador ${providerId} no dia ${dayOfWeek}`);
        return [];
      }
      
      console.log(`Encontradas ${results.rows.length} disponibilidades para o dia ${dayOfWeek}`);
      
      // Converter resultados para o formato esperado
      return results.rows.map(row => ({
        id: row.id,
        providerId: row.providerId,
        dayOfWeek: row.dayOfWeek,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        isAvailable: row.isAvailable,
        intervalMinutes: row.intervalMinutes
      }));
    } catch (error) {
      console.error(`Erro ao buscar disponibilidade para o prestador ${providerId} no dia ${dayOfWeek}:`, error);
      return [];
    }
  }
  
  async getAvailabilityByDate(providerId: number, date: string): Promise<Availability[]> {
    try {
      if (!providerId || !date) {
        console.log(`Parâmetros inválidos ao buscar disponibilidade: providerId=${providerId}, date=${date}`);
        return [];
      }
      
      console.log(`Buscando disponibilidade para o prestador ID ${providerId} na data ${date}`);
      
      try {
        // Primeiro, buscar disponibilidades específicas para esta data
        const specificResults = await db
          .select()
          .from(availability)
          .where(
            and(
              eq(availability.providerId, providerId),
              eq(availability.date, date),
              eq(availability.isAvailable, true)
            )
          );
        
        if (specificResults && specificResults.length > 0) {
          console.log(`Encontradas ${specificResults.length} disponibilidades específicas para a data ${date}`);
          return specificResults;
        }
      } catch (dbError) {
        console.error(`Erro ao buscar disponibilidades específicas: ${dbError.message}`);
        // Continuar para buscar por dia da semana
      }
      
      // Se não houver disponibilidade específica para esta data, buscar pelo dia da semana
      const dayOfWeek = new Date(date).getDay(); // 0 = domingo, 6 = sábado
      console.log(`Buscando disponibilidade para o prestador ID ${providerId} no dia da semana ${dayOfWeek}`);
      
      try {
        const weeklyAvailability = await this.getAvailabilityByDay(providerId, dayOfWeek);
        return Array.isArray(weeklyAvailability) ? weeklyAvailability : (weeklyAvailability ? [weeklyAvailability] : []);
      } catch (weeklyError) {
        console.error(`Erro ao buscar disponibilidade por dia da semana: ${weeklyError.message}`);
        return [];
      }
    } catch (error) {
      console.error(`Erro ao buscar disponibilidade para a data ${date}:`, error);
      return [];
    }
  }
  
  async generateTimeSlots(providerId: number, date: string, serviceId?: number): Promise<{ startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number, serviceDuration?: number }[]> {
    try {
      console.log(`[generateTimeSlots] Início para prestador ${providerId} na data ${date}${serviceId ? ` e serviço ${serviceId}` : ''}`);
      
      // 1. Buscar disponibilidades do prestador para a data específica
      let availabilitySlots = await this.getAvailabilityByDate(providerId, date);
      console.log(`[generateTimeSlots] Disponibilidades encontradas: ${availabilitySlots.length}`);
      
      // Se não há disponibilidade configurada, retornar slots vazios
      if (!availabilitySlots.length) {
        console.log(`[generateTimeSlots] Nenhuma disponibilidade encontrada para prestador ${providerId} na data ${date}. Retornando slots vazios.`);
        return [];
      }
      
      // 2. Buscar agendamentos existentes para esta data (incluindo status pending e confirmed)
      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.providerId, providerId),
            eq(appointments.date, date),
            or(
              eq(appointments.status, "confirmed"), 
              eq(appointments.status, "pending")
            )
          )
        );
      
      // Ordenar os agendamentos pelo horário de início
      existingAppointments.sort((a, b) => 
        this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
      );
      
      console.log(`[generateTimeSlots] Agendamentos existentes: ${existingAppointments.length}`);

      // 3. Buscar blocos de tempo bloqueados para esta data (ex: horário de almoço, pausas)
      const blockedSlots = await this.getBlockedTimeSlotsByDate(providerId, date);
      console.log(`[generateTimeSlots] Blocos de tempo bloqueados: ${blockedSlots.length}`);
      
      // 4. Se um serviço específico foi solicitado, obter sua duração real
      let serviceDuration = 0;
      if (serviceId) {
        // Primeiro verificamos se existe uma personalização de tempo para este serviço/prestador
        const providerService = await this.getProviderServiceByProviderAndService(providerId, serviceId);
        
        if (providerService && providerService.executionTime) {
          serviceDuration = providerService.executionTime;
          console.log(`[generateTimeSlots] Usando tempo de execução personalizado: ${serviceDuration} minutos`);
        } else {
          // Se não houver personalização, usamos a duração padrão do serviço
          const service = await this.getService(serviceId);
          if (service) {
            serviceDuration = service.duration || 60; // Fallback para 60 minutos se não houver duração definida
            console.log(`[generateTimeSlots] Usando tempo de execução padrão: ${serviceDuration} minutos`);
          }
        }
      } else {
        // Se nenhum serviço for especificado, usar a duração padrão do provedor
        const settings = await this.getProviderSettings(providerId);
        serviceDuration = settings?.defaultServiceDuration || 60; // Fallback para 60 minutos
        console.log(`[generateTimeSlots] Usando duração padrão do prestador: ${serviceDuration} minutos`);
      }
      
      // 5. Criar array para armazenar todos os slots de tempo gerados
      const timeSlots: { startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number, serviceDuration?: number, reason?: string }[] = [];
      
      // 6. Criar um mapa com todos os períodos ocupados, incluindo agendamentos e blocos bloqueados
      const occupiedPeriods: { start: number, end: number, reason?: string, isBlock?: boolean, startTime?: string, endTime?: string, availabilityId?: number }[] = [
        // Agendamentos existentes
        ...existingAppointments.map(appointment => ({
          start: this.timeToMinutes(appointment.startTime),
          end: this.timeToMinutes(appointment.endTime),
          isBlock: false,
          startTime: appointment.startTime,
          endTime: appointment.endTime
        })),
        // Blocos de tempo bloqueados (ex: horário de almoço)
        ...blockedSlots.map(block => ({
          start: this.timeToMinutes(block.startTime),
          end: this.timeToMinutes(block.endTime),
          reason: block.reason || "Horário bloqueado",
          isBlock: true,
          startTime: block.startTime,
          endTime: block.endTime,
          availabilityId: block.availabilityId
        }))
      ].sort((a, b) => a.start - b.start);

      // 7. Primeiro, adicionamos os slots bloqueados à lista
      for (const period of occupiedPeriods) {
        if (period.isBlock && period.startTime && period.endTime && period.availabilityId) {
          timeSlots.push({
            startTime: period.startTime,
            endTime: period.endTime,
            isAvailable: false, // Este slot está bloqueado
            availabilityId: period.availabilityId,
            serviceDuration: serviceDuration,
            reason: period.reason
          });
        }
      }
      
      // 8. Para cada slot de disponibilidade, gerar os horários livres
      for (const slot of availabilitySlots) {
        console.log(`[generateTimeSlots] Processando slot de disponibilidade: ${slot.dayOfWeek} - ${slot.startTime} a ${slot.endTime}`);
        
        // Converter horários para minutos para facilitar cálculos
        const slotStartMinutes = this.timeToMinutes(slot.startTime);
        const slotEndMinutes = this.timeToMinutes(slot.endTime);
        
        // 9. Identificar blocos de tempo livres
        const freeBlocks = this.generateFreeBlocks(slotStartMinutes, slotEndMinutes, occupiedPeriods);
        console.log(`[generateTimeSlots] Identificados ${freeBlocks.length} blocos livres`);
        
        // 10. Para cada bloco livre, gerar slots de tempo que comportem a duração do serviço
        for (const block of freeBlocks) {
          // Verificar se o bloco tem tamanho suficiente para o serviço
          if (block.end - block.start < serviceDuration) {
            continue; // Bloco muito pequeno para este serviço
          }
          
          // 11. Gerar horários preferenciais dentro de cada bloco livre
          const availableStartTimes = this.generatePreferredStartTimes(block, serviceDuration);
          
          // 12. Adicionar cada horário disponível à lista de slots
          for (const startTime of availableStartTimes) {
            const endTime = startTime + serviceDuration;
            
            timeSlots.push({
              startTime: this.minutesToTime(startTime),
              endTime: this.minutesToTime(endTime),
              isAvailable: true,
              availabilityId: slot.id,
              serviceDuration: serviceDuration
            });
          }
        }
      }
      
      // 12. Remover possíveis duplicatas e ordenar os slots
      const uniqueTimeSlots = timeSlots.filter((slot, index, self) =>
        index === self.findIndex((s) => s.startTime === slot.startTime)
      ).sort((a, b) => 
        this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
      );
      
      console.log(`[generateTimeSlots] Gerados ${uniqueTimeSlots.length} slots de tempo para a data ${date}`);
      return uniqueTimeSlots;
    } catch (error) {
      console.error(`[generateTimeSlots] Erro ao gerar slots de tempo para a data ${date}:`, error);
      return [];
    }
  }
  
  /**
   * Gera blocos de tempo livre entre períodos ocupados
   * @param slotStartMinutes Hora de início do período de disponibilidade (em minutos)
   * @param slotEndMinutes Hora de fim do período de disponibilidade (em minutos)
   * @param occupiedPeriods Lista de períodos ocupados
   * @returns Lista de blocos de tempo livre
   */
  private generateFreeBlocks(
    slotStartMinutes: number, 
    slotEndMinutes: number, 
    occupiedPeriods: { start: number, end: number }[]
  ): { start: number, end: number }[] {
    // Inicializar lista de blocos livres
    const freeBlocks: { start: number, end: number }[] = [];
    
    // Iniciar com o horário de início do slot
    let currentStart = slotStartMinutes;
    
    // Ordenar períodos ocupados por hora de início para processamento linear
    const sortedPeriods = [...occupiedPeriods].sort((a, b) => a.start - b.start);
    
    // Adicionar um log para diagnosticar períodos ocupados
    // Filtrar períodos dentro do slot atual antes de calcular
    const relevantPeriods = sortedPeriods.filter(period => 
      period.end > slotStartMinutes && period.start < slotEndMinutes
    );
    
    // Calcular o tempo total ocupado apenas com períodos relevantes
    const totalOccupiedMinutes = relevantPeriods.reduce((total, period) => {
      const overlapStart = Math.max(period.start, slotStartMinutes);
      const overlapEnd = Math.min(period.end, slotEndMinutes);
      return total + (overlapEnd - overlapStart);
    }, 0);
    
    // Verificar se o cálculo de tempo ocupado faz sentido
    const slotDuration = slotEndMinutes - slotStartMinutes;
    const adjustedOccupiedMinutes = Math.min(totalOccupiedMinutes, slotDuration);
    const totalAvailableMinutes = slotDuration - adjustedOccupiedMinutes;
    
    console.log(`[generateFreeBlocks] Slot: ${this.minutesToTime(slotStartMinutes)}-${this.minutesToTime(slotEndMinutes)} (${slotDuration} min)`);
    console.log(`[generateFreeBlocks] Períodos ocupados relevantes: ${relevantPeriods.length}, Minutos ocupados: ${adjustedOccupiedMinutes}, Disponível: ${totalAvailableMinutes} min`);
    
    // Para cada período ocupado, adicionar um bloco livre antes dele (se existir)
    for (const period of sortedPeriods) {
      // Ignorar períodos completamente fora deste slot de disponibilidade
      if (period.end <= slotStartMinutes || period.start >= slotEndMinutes) {
        continue;
      }
      
      // Ajustar limites do período para estar dentro do slot de disponibilidade
      const effectiveStart = Math.max(period.start, slotStartMinutes);
      const effectiveEnd = Math.min(period.end, slotEndMinutes);
      
      // Se o período começa depois do ponto atual, temos um bloco livre
      if (effectiveStart > currentStart) {
        const freeBlock = {
          start: currentStart,
          end: effectiveStart
        };
        console.log(`[generateFreeBlocks] Identificado bloco livre: ${this.minutesToTime(freeBlock.start)}-${this.minutesToTime(freeBlock.end)} (${freeBlock.end - freeBlock.start} min)`);
        freeBlocks.push(freeBlock);
      }
      
      // Atualizar o ponto atual para depois deste período ocupado
      currentStart = Math.max(currentStart, effectiveEnd);
    }
    
    // Adicionar o último bloco livre (se existir) desde o último período até o fim do slot
    if (currentStart < slotEndMinutes) {
      const finalBlock = {
        start: currentStart,
        end: slotEndMinutes
      };
      console.log(`[generateFreeBlocks] Identificado bloco livre final: ${this.minutesToTime(finalBlock.start)}-${this.minutesToTime(finalBlock.end)} (${finalBlock.end - finalBlock.start} min)`);
      freeBlocks.push(finalBlock);
    }
    
    // Diagnosticar blocos de tempo livre gerados
    freeBlocks.forEach((block, index) => {
      console.log(`[generateFreeBlocks] Bloco #${index+1}: ${this.minutesToTime(block.start)}-${this.minutesToTime(block.end)} (duração: ${block.end - block.start} min)`);
    });
    
    return freeBlocks;
  }
  
  /**
   * Gera horários preferenciais de início dentro de um bloco livre
   * @param block Bloco de tempo livre
   * @param serviceDuration Duração do serviço em minutos
   * @returns Lista de horários de início possíveis (em minutos)
   */
  private generatePreferredStartTimes(
    block: { start: number, end: number }, 
    serviceDuration: number
  ): number[] {
    const preferredStartTimes: number[] = [];
    
    // Definir prioridades: primeiro horários "redondos", depois outros horários
    
    // 1. Horários em ponto (XX:00) têm maior prioridade
    for (let hour = Math.floor(block.start / 60); hour <= Math.floor(block.end / 60); hour++) {
      const onTheHour = hour * 60;
      if (onTheHour >= block.start && onTheHour + serviceDuration <= block.end) {
        preferredStartTimes.push(onTheHour);
      }
    }
    
    // 2. Horários na meia hora (XX:30) têm segunda prioridade
    for (let hour = Math.floor(block.start / 60); hour <= Math.floor(block.end / 60); hour++) {
      const halfHour = hour * 60 + 30;
      if (halfHour >= block.start && halfHour + serviceDuration <= block.end) {
        preferredStartTimes.push(halfHour);
      }
    }
    
    // 3. Horários nos quartos de hora (XX:15, XX:45) têm terceira prioridade
    for (let hour = Math.floor(block.start / 60); hour <= Math.floor(block.end / 60); hour++) {
      const quarterHour = hour * 60 + 15;
      if (quarterHour >= block.start && quarterHour + serviceDuration <= block.end && !preferredStartTimes.includes(quarterHour)) {
        preferredStartTimes.push(quarterHour);
      }
      
      const threeQuarterHour = hour * 60 + 45;
      if (threeQuarterHour >= block.start && threeQuarterHour + serviceDuration <= block.end && !preferredStartTimes.includes(threeQuarterHour)) {
        preferredStartTimes.push(threeQuarterHour);
      }
    }
    
    // 4. Sempre incluir o início do bloco (importante após outro agendamento)
    if (!preferredStartTimes.includes(block.start) && block.start + serviceDuration <= block.end) {
      preferredStartTimes.push(block.start);
    }
    
    // 5. Adicionar slots em intervalos de 5 minutos para maior flexibilidade
    const stepSize = 5; // 5 minutos de incremento
    for (let time = block.start; time + serviceDuration <= block.end; time += stepSize) {
      if (!preferredStartTimes.includes(time)) {
        preferredStartTimes.push(time);
      }
    }
    
    // Ordenar os horários e retornar
    return preferredStartTimes.sort((a, b) => a - b);
  }
  
  // Funções auxiliares para converter horários
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  async getProviderAvailability(providerId: number): Promise<Availability[]> {
    try {
      console.log(`Buscando disponibilidade para o prestador ID: ${providerId}`);
      
      const result = await db
        .select()
        .from(availability)
        .where(eq(availability.providerId, providerId));
      
      console.log(`Encontradas ${result.length} entradas de disponibilidade`);
      return result;
    } catch (error) {
      console.error("Erro ao buscar disponibilidade do prestador:", error);
      return [];
    }
  }

  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    try {
      console.log("Criando disponibilidade:", availabilityData);
      
      const [newAvailability] = await db
        .insert(availability)
        .values(availabilityData)
        .returning();
      
      console.log("Disponibilidade criada com sucesso:", newAvailability);
      return newAvailability;
    } catch (error) {
      console.error("Erro ao criar disponibilidade:", error);
      throw new Error(`Falha ao criar disponibilidade: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateAvailability(id: number, availabilityData: Partial<Availability>): Promise<Availability | undefined> {
    try {
      console.log("Atualizando disponibilidade:", id, availabilityData);
      
      const [updatedAvailability] = await db
        .update(availability)
        .set(availabilityData)
        .where(eq(availability.id, id))
        .returning();
      
      console.log("Disponibilidade atualizada com sucesso:", updatedAvailability);
      return updatedAvailability || undefined;
    } catch (error) {
      console.error("Erro ao atualizar disponibilidade:", error);
      throw new Error(`Falha ao atualizar disponibilidade: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteAvailability(id: number): Promise<boolean> {
    try {
      console.log("Excluindo disponibilidade:", id);
      
      const result = await db.delete(availability).where(eq(availability.id, id));
      
      console.log("Disponibilidade excluída com sucesso");
      return !!result;
    } catch (error) {
      console.error("Erro ao excluir disponibilidade:", error);
      throw new Error(`Falha ao excluir disponibilidade: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async createAvailabilityBatch(availabilityList: InsertAvailability[]): Promise<Availability[]> {
    try {
      console.log(`Criando ${availabilityList.length} disponibilidades em lote`);
      
      const results: Availability[] = [];
      
      // Inserir cada disponibilidade individualmente
      for (const availabilityData of availabilityList) {
        const created = await this.createAvailability(availabilityData);
        results.push(created);
      }
      
      console.log(`Criadas ${results.length} disponibilidades com sucesso`);
      return results;
    } catch (error) {
      console.error("Erro ao criar disponibilidades em lote:", error);
      throw new Error(`Falha ao criar disponibilidades em lote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Appointment operations
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    
    return appointment || undefined;
  }
  
  async getAppointmentByPaymentId(paymentId: string): Promise<Appointment | undefined> {
    try {
      // Agora usamos o campo paymentId que foi adicionado ao schema
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.paymentId, paymentId));
      
      return appointment || undefined;
    } catch (error) {
      console.error("Erro ao obter agendamento por paymentId:", error);
      return undefined;
    }
  }

  async getClientAppointments(clientId: number): Promise<Appointment[]> {
    // Obter a data atual no formato ISO (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    return db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          // Filtrar apenas datas iguais ou maiores que hoje
          gte(appointments.date, today)
        )
      )
      .orderBy(appointments.date, appointments.startTime);
  }

  async getProviderAppointments(providerId: number): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(eq(appointments.providerId, providerId))
      .orderBy(appointments.date, appointments.startTime);
  }

  async getProviderAppointmentsByDate(providerId: number, date: string): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, providerId),
          eq(appointments.date, date),
          or(
            eq(appointments.status, "confirmed"),
            eq(appointments.status, "pending")
          )
        )
      )
      .orderBy(appointments.startTime);
  }
  
  async getAppointmentsByProviderAndService(providerId: number, serviceId: number): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, providerId),
          eq(appointments.serviceId, serviceId)
        )
      )
      .orderBy(sql`${appointments.date} DESC, ${appointments.startTime} DESC`);
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .orderBy(sql`${appointments.createdAt} DESC`);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const appointmentData = {
      ...appointment,
      createdAt: new Date()
    };
    
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointmentData)
      .returning();
    
    return newAppointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointmentData)
      .where(eq(appointments.id, id))
      .returning();
    
    return updatedAppointment || undefined;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    
    return updatedAppointment || undefined;
  }

  async updateAppointmentValidationAttempts(id: number, attempts: number): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ validationAttempts: attempts })
      .where(eq(appointments.id, id))
      .returning();
    
    return updatedAppointment || undefined;
  }

  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    
    return appointment || undefined;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return !!result;
  }

  // Provider settings operations
  async getProviderSettings(providerId: number): Promise<ProviderSettings | undefined> {
    const [settings] = await db
      .select()
      .from(providerSettings)
      .where(eq(providerSettings.providerId, providerId));
    
    return settings || undefined;
  }

  async createProviderSettings(settings: InsertProviderSettings): Promise<ProviderSettings> {
    try {
      // Criar objeto de configurações apenas com campos que existem na tabela
      const filteredSettings = {
        providerId: settings.providerId,
        isOnline: settings.isOnline || false,
        businessName: settings.businessName || ""
      };
      
      console.log('Criando configurações de provedor (campos filtrados):', filteredSettings);
      
      const [newSettings] = await db
        .insert(providerSettings)
        .values(filteredSettings)
        .returning();
      
      return newSettings;
    } catch (error) {
      console.error('Erro ao criar configurações do provedor:', error);
      throw error;
    }
  }

  async updateProviderSettings(providerId: number, settingsData: Partial<ProviderSettings>): Promise<ProviderSettings | undefined> {
    const [updatedSettings] = await db
      .update(providerSettings)
      .set(settingsData)
      .where(eq(providerSettings.providerId, providerId))
      .returning();
    
    return updatedSettings || undefined;
  }

  // Provider search operations
  async getProvidersByService(serviceId: number): Promise<User[]> {
    const serviceRecord = await this.getService(serviceId);
    if (!serviceRecord) return [];
    
    const [provider] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, serviceRecord.providerId),
        eq(users.userType, 'provider')
      ));
    
    return provider ? [provider] : [];
  }

  async getProvidersWithSettings(): Promise<(User & { settings: ProviderSettings | undefined })[]> {
    const providers = await db
      .select()
      .from(users)
      .where(eq(users.userType, 'provider'));
      
    const result = [];
    for (const provider of providers) {
      const settings = await this.getProviderSettings(provider.id);
      result.push({ ...provider, settings });
    }
    
    return result;
  }
  
  async getProvidersByLocation(latitude: number, longitude: number, radiusKm: number): Promise<(User & { settings: ProviderSettings | undefined; distance: number })[]> {
    const providers = await this.getProvidersWithSettings();
    const result: (User & { settings: ProviderSettings | undefined; distance: number })[] = [];
    
    for (const provider of providers) {
      if (provider.settings && provider.settings.latitude && provider.settings.longitude) {
        const providerLat = parseFloat(provider.settings.latitude);
        const providerLng = parseFloat(provider.settings.longitude);
        
        if (!isNaN(providerLat) && !isNaN(providerLng)) {
          // Calculate distance using Haversine formula
          const distance = this.calculateDistance(
            latitude, 
            longitude, 
            providerLat, 
            providerLng
          );
          
          // Only include providers within the radius
          if (distance <= radiusKm) {
            result.push({ ...provider, distance });
          }
        }
      }
    }
    
    // Sort by distance (closest first)
    return result.sort((a, b) => a.distance - b.distance);
  }
  
  // Helper method to calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  // Support message operations
  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const messageData = {
      ...message,
      createdAt: new Date(),
      status: "pending",
      response: null,
      adminId: null,
      resolvedAt: null
    };
    
    const [newMessage] = await db
      .insert(supportMessages)
      .values(messageData)
      .returning();
    
    return newMessage;
  }
  
  async getSupportMessage(id: number): Promise<SupportMessage | undefined> {
    const [message] = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.id, id));
    
    return message || undefined;
  }
  
  async getUserSupportMessages(userId: number): Promise<SupportMessage[]> {
    return db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.userId, userId))
      .orderBy(sql`${supportMessages.createdAt} DESC`);
  }
  
  async getAllSupportMessages(): Promise<SupportMessage[]> {
    return db
      .select()
      .from(supportMessages)
      .orderBy(sql`${supportMessages.createdAt} DESC`);
  }
  
  async updateSupportMessage(id: number, messageData: Partial<SupportMessage>): Promise<SupportMessage | undefined> {
    const [updatedMessage] = await db
      .update(supportMessages)
      .set(messageData)
      .where(eq(supportMessages.id, id))
      .returning();
    
    return updatedMessage || undefined;
  }
  
  async resolveSupportMessage(id: number, adminId: number, response: string): Promise<SupportMessage | undefined> {
    const [resolvedMessage] = await db
      .update(supportMessages)
      .set({
        status: "resolved",
        adminId,
        response,
        resolvedAt: new Date()
      })
      .where(eq(supportMessages.id, id))
      .returning();
    
    return resolvedMessage || undefined;
  }
  
  async getPendingSupportMessages(): Promise<SupportMessage[]> {
    return db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.status, "pending"))
      .orderBy(sql`${supportMessages.createdAt} ASC`);
  }
  
  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const reviewData = {
      ...review,
      publishedAt: new Date(),
      updatedAt: new Date(),
      status: "published"
    };
    
    const [newReview] = await db
      .insert(reviews)
      .values(reviewData)
      .returning();
    
    // Atualizar a média de avaliações do prestador
    await this.updateProviderRating(review.providerId);
    
    return newReview;
  }
  
  async createAppointmentReview(review: InsertReview): Promise<Review> {
    // Este método é apenas um alias para createReview,
    // mas mantido por consistência na interface
    return this.createReview(review);
  }
  
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id));
    
    return review || undefined;
  }
  
  async getClientReviews(clientId: number): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.clientId, clientId))
      .orderBy(sql`${reviews.publishedAt} DESC`);
  }
  
  async getProviderReviews(providerId: number): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(and(
        eq(reviews.providerId, providerId),
        eq(reviews.isPublic, true)
      ))
      .orderBy(sql`${reviews.publishedAt} DESC`);
  }
  
  async getAppointmentReview(appointmentId: number): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.appointmentId, appointmentId));
    
    return review || undefined;
  }
  
  async updateReview(id: number, reviewData: Partial<Review>): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id));
    
    if (!review) return undefined;
    
    const [updatedReview] = await db
      .update(reviews)
      .set({
        ...reviewData,
        updatedAt: new Date()
      })
      .where(eq(reviews.id, id))
      .returning();
    
    // Se a avaliação foi alterada, atualizar a média do prestador
    if (reviewData.rating) {
      await this.updateProviderRating(review.providerId);
    }
    
    return updatedReview || undefined;
  }
  
  async deleteReview(id: number): Promise<boolean> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id));
    
    if (!review) return false;
    
    await db.delete(reviews).where(eq(reviews.id, id));
    
    // Atualizar a média de avaliações do prestador
    await this.updateProviderRating(review.providerId);
    
    return true;
  }
  
  async updateProviderRating(providerId: number): Promise<number> {
    const providerReviews = await this.getProviderReviews(providerId);
    const settings = await this.getProviderSettings(providerId);
    
    if (!settings || providerReviews.length === 0) {
      return 0;
    }
    
    // Calcular a nova média
    const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / providerReviews.length) * 10); // Formato 45 para 4.5 estrelas
    
    // Atualizar as configurações do prestador
    await this.updateProviderSettings(providerId, {
      rating: averageRating,
      ratingCount: providerReviews.length
    });
    
    return averageRating;
  }
  
  // Payment Settings operations
  async getPaymentSettings(id?: number): Promise<PaymentSettings | undefined> {
    if (id) {
      return this.paymentSettings.get(id);
    }
    const settings = Array.from(this.paymentSettings.values());
    if (settings.length === 0) return undefined;
    return settings[0];
  }

  async createPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings> {
    const id = this.paymentSettingsIdCounter++;
    const newSettings: PaymentSettings = { ...settings, id };
    this.paymentSettings.set(id, newSettings);
    return newSettings;
  }

  async updatePaymentSettings(id: number, settings: Partial<PaymentSettings>): Promise<PaymentSettings | undefined> {
    const existingSettings = this.paymentSettings.get(id);
    if (!existingSettings) return undefined;
    
    const updatedSettings = { ...existingSettings, ...settings };
    this.paymentSettings.set(id, updatedSettings);
    return updatedSettings;
  }
  
  // Service Templates operations
  async getServiceTemplates(): Promise<ServiceTemplate[]> {
    return Array.from(this.serviceTemplates.values()).filter(template => template.isActive !== false);
  }
  
  async getServiceTemplatesByCategoryId(categoryId: number): Promise<ServiceTemplate[]> {
    return Array.from(this.serviceTemplates.values()).filter(
      (template) => template.categoryId === categoryId && template.isActive !== false
    );
  }
  
  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    return this.serviceTemplates.get(id);
  }
  
  async createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate> {
    const id = this.serviceTemplateIdCounter++;
    const newTemplate: ServiceTemplate = { 
      ...template, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    this.serviceTemplates.set(id, newTemplate);
    return newTemplate;
  }
  
  async updateServiceTemplate(id: number, templateData: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    const template = this.serviceTemplates.get(id);
    if (!template) return undefined;
    
    const updatedTemplate = { 
      ...template, 
      ...templateData,
      updatedAt: new Date()
    };
    this.serviceTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteServiceTemplate(id: number): Promise<boolean> {
    const template = this.serviceTemplates.get(id);
    if (!template) return false;
    
    // Soft delete
    const updatedTemplate = {
      ...template,
      isActive: false,
      updatedAt: new Date()
    };
    this.serviceTemplates.set(id, updatedTemplate);
    return true;
  }

  // Admin: relatórios
  async generateAdminSummaryReport(): Promise<AdminSummaryReport> {
    const users = await this.getAllUsers();
    const providers = users.filter(user => user.userType === 'provider');
    const clients = users.filter(user => user.userType === 'client');
    const allServices = await this.getServices();
    const allCategories = await this.getCategories();
    const allAppointments = await this.getAllAppointments();
    
    // Contagem de agendamentos por status
    const appointmentsByStatus: {[key: string]: number} = {};
    allAppointments.forEach(appointment => {
      const status = appointment.status || 'unknown';
      appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
    });
    
    // Obter os 5 agendamentos mais recentes
    const recentAppointments = allAppointments.slice(0, 5);
    
    return {
      totalUsers: users.length,
      totalProviders: providers.length,
      totalClients: clients.length,
      totalServices: allServices.length,
      totalCategories: allCategories.length,
      totalAppointments: allAppointments.length,
      appointmentsByStatus,
      recentAppointments
    };
  }

  async generateProviderReport(): Promise<ProviderReport> {
    const providers = (await this.getAllUsers()).filter(user => user.userType === 'provider');
    
    const providersData = await Promise.all(providers.map(async provider => {
      const appointments = await this.getProviderAppointments(provider.id);
      const settings = await this.getProviderSettings(provider.id);
      
      return {
        id: provider.id,
        name: provider.name || '',
        email: provider.email,
        totalAppointments: appointments.length,
        rating: settings?.rating || null,
        isOnline: settings?.isOnline || false
      };
    }));
    
    return {
      providers: providersData
    };
  }

  async generateServiceReport(): Promise<ServiceReport> {
    const allCategories = await this.getCategories();
    const allServices = await this.getServices();
    const allAppointments = await this.getAllAppointments();
    
    const categoriesData = await Promise.all(allCategories.map(async category => {
      const categoryServices = allServices.filter(service => service.categoryId === category.id);
      
      const serviceData = await Promise.all(categoryServices.map(service => {
        const serviceAppointments = allAppointments.filter(appointment => appointment.serviceId === service.id);
        const providerIds = new Set(serviceAppointments.map(appointment => appointment.providerId));
        
        return {
          id: service.id,
          name: service.name,
          appointmentCount: serviceAppointments.length,
          providerCount: providerIds.size
        };
      }));
      
      return {
        id: category.id,
        name: category.name,
        serviceCount: categoryServices.length,
        services: serviceData
      };
    }));
    
    return {
      categories: categoriesData
    };
  }

  // Métodos adicionais
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  // Método para obter todos os prestadores de serviço
  // Implementation in the database class
  // This is already implemented above
  
  // Método para obter todos os usuários do tipo cliente
  // Implementation in the database class
  // This is already implemented above
  
  // Implementação para obter clientes de um prestador (para calendário)
  async getProviderClients(providerId: number): Promise<{ id: number, name: string, email: string }[]> {
    // Buscar todos os agendamentos do prestador
    const providerAppointments = await db
      .select({
        clientId: appointments.clientId
      })
      .from(appointments)
      .where(eq(appointments.providerId, providerId));
    
    // Extrair IDs únicos de clientes
    const clientIds = [...new Set(providerAppointments.map(appointment => appointment.clientId))];
    
    // Se não houver clientes, retornar array vazio
    if (clientIds.length === 0) {
      return [];
    }
    
    // Buscar informações dos clientes
    const clientsData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(
        and(
          inArray(users.id, clientIds),
          eq(users.userType, 'client')
        )
      );
    
    return clientsData;
  }
  
  // Implementação para obter agendamentos de um prestador (para calendário)
  async getAppointmentsByProviderId(providerId: number): Promise<Appointment[]> {
    try {
      // Verificar se a tabela existe antes de fazer a consulta
      try {
        const tableExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'appointments'
          );
        `);
        
        if (!tableExists?.rows?.[0]?.exists) {
          console.log("A tabela appointments não existe, retornando lista vazia");
          return [];
        }
      } catch (checkError) {
        console.error("Erro ao verificar se tabela appointments existe:", checkError);
        return [];
      }
      
      // Usamos SQL nativo para evitar problemas com o Drizzle ORM
      const result = await db.execute(sql`
        SELECT 
          a.id,
          a.provider_id as "providerId",
          a.client_id as "clientId",
          a.service_id as "serviceId",
          a.date,
          a.start_time as "startTime",
          a.end_time as "endTime",
          a.status,
          a.payment_status,
          a.payment_method,
          a.total_price as "totalPrice",
          a.notes,
          a.created_at as "createdAt",
          a.service_name,
          a.client_name,
          u.profile_image as "clientProfilePicture"
        FROM appointments a
        LEFT JOIN users u ON a.client_id = u.id
        WHERE a.provider_id = ${providerId}
      `);
      
      // Garantir que temos um array válido e processar o resultado
      if (!result || !result.rows || !Array.isArray(result.rows)) {
        console.log(`Nenhum agendamento encontrado para o prestador ${providerId}`);
        return [];
      }
      
      console.log(`Encontrados ${result.rows.length} agendamentos para o prestador ${providerId}`);
      
      return result.rows.map(row => ({
        id: row.id,
        providerId: row.providerId, 
        clientId: row.clientId,
        serviceId: row.serviceId,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        status: row.status,
        paymentStatus: row.payment_status,
        payment_method: row.payment_method,
        totalPrice: row.totalPrice,
        notes: row.notes,
        createdAt: row.createdAt,
        clientName: row.client_name,
        serviceName: row.service_name,
        clientProfilePicture: row.clientProfilePicture
      }));
    } catch (error) {
      console.error(`Erro ao buscar agendamentos do prestador ${providerId}:`, error);
      return [];
    }
  }

  // Método para adicionar dados iniciais ao banco de dados
  async initializeDatabase() {
    // Verificar se já existem usuários
    const existingUsers = await db.select().from(users);
    
    // Verificar se já existem etapas de onboarding
    const existingSteps = await db.select().from(onboardingSteps);
    if (existingSteps.length === 0) {
      console.log("Criando etapas de onboarding padrão...");
      await this.createDefaultOnboardingSteps();
    }
    
    if (existingUsers.length > 0) {
      console.log("Banco de dados já inicializado, pulando criação de dados iniciais");
      return;
    }

    console.log("Inicializando banco de dados com dados iniciais...");

    // Criar usuários padrão
    const cliente = await this.createUser({
      email: "cliente@agendoai.com",
      password: await hashPassword("cliente123"),
      name: "Cliente Demo",
      userType: "client",
      phone: "+5511999999999"
    });

    const prestador = await this.createUser({
      email: "prestador@agendoai.com",
      password: await hashPassword("prestador123"),
      name: "Prestador Demo",
      userType: "provider",
      phone: "+5511888888888"
    });

    const admin = await this.createUser({
      email: "admin@agendoai.com",
      password: await hashPassword("admin123"),
      name: "Administrador",
      userType: "admin",
      phone: "+5511777777777"
    });

    // Criar categorias
    const beleza = await this.createCategory({
      name: "Beleza e Estética",
      description: "Serviços de cuidados pessoais e estética",
      icon: "scissors",
      color: "#FF6B6B"
    });

    const saude = await this.createCategory({
      name: "Saúde",
      description: "Consultas e tratamentos relacionados à saúde",
      icon: "heart",
      color: "#4ECDC4"
    });

    const casa = await this.createCategory({
      name: "Serviços Domésticos",
      description: "Serviços para manutenção e cuidados com a casa",
      icon: "home",
      color: "#FFD166"
    });

    // Criar serviços para o prestador
    await this.createService({
      name: "Corte de Cabelo",
      description: "Corte profissional para todos os tipos de cabelo",
      price: 50,
      duration: 30,
      providerId: prestador.id,
      categoryId: beleza.id,
      isActive: true
    });

    await this.createService({
      name: "Massagem Terapêutica",
      description: "Massagem relaxante para alívio de tensão muscular",
      price: 120,
      duration: 60,
      providerId: prestador.id,
      categoryId: saude.id,
      isActive: true
    });

    await this.createService({
      name: "Serviço de Limpeza",
      description: "Limpeza geral para casas e apartamentos",
      price: 150,
      duration: 120,
      providerId: prestador.id,
      categoryId: casa.id,
      isActive: true
    });

    // Atualizar configurações do prestador
    await db.update(providerSettings)
      .set({
        businessName: "Studio Demo",
        address: "Rua Exemplo, 123",
        city: "São Paulo",
        state: "SP",
        postalCode: "01234-567",
        bio: "Profissional especializado em diversos serviços de qualidade",
        website: "https://exemplo.com",
        businessHours: JSON.stringify({
          monday: { start: "09:00", end: "18:00", closed: false },
          tuesday: { start: "09:00", end: "18:00", closed: false },
          wednesday: { start: "09:00", end: "18:00", closed: false },
          thursday: { start: "09:00", end: "18:00", closed: false },
          friday: { start: "09:00", end: "18:00", closed: false },
          saturday: { start: "10:00", end: "14:00", closed: false },
          sunday: { start: "00:00", end: "00:00", closed: true }
        }),
        isOnline: true
      })
      .where(eq(providerSettings.providerId, prestador.id));

    // Criar disponibilidades
    const currentDate = new Date();
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Disponibilidade para amanhã
    await this.createAvailability({
      providerId: prestador.id,
      date: tomorrowStr,
      startTime: "09:00",
      endTime: "18:00",
      intervalMinutes: 30,
      dayOfWeek: tomorrow.getDay() // 0 (domingo) a 6 (sábado)
    });

    // Criar um agendamento de exemplo
    await db.insert(appointments).values({
      clientId: cliente.id,
      providerId: prestador.id,
      serviceId: 1, // Corte de Cabelo
      date: tomorrowStr,
      startTime: "10:00",
      endTime: "10:30",
      status: "confirmed",
      notes: "Agendamento de teste",
      paymentMethod: "cash",
      totalPrice: 50,
      serviceName: "Corte de Cabelo",
      providerName: "Prestador Demo",
      clientName: "Cliente Demo",
      clientPhone: "+5511999999999",
      isManuallyCreated: false,
      createdAt: new Date()
    });

    console.log("Dados iniciais criados com sucesso!");
    console.log(`Usuários criados: ${cliente.email}, ${prestador.email}, ${admin.email}`);
  }
  
  // Payment Settings operations
  async getPaymentSettings(id?: number): Promise<PaymentSettings | undefined> {
    try {
      if (id) {
        const [settings] = await db
          .select()
          .from(paymentSettings)
          .where(eq(paymentSettings.id, id));
        return settings;
      } else {
        const [settings] = await db.select().from(paymentSettings).limit(1);
        return settings;
      }
    } catch (error) {
      console.error("Erro ao obter configurações de pagamento:", error);
      return undefined;
    }
  }

  async createPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings> {
    try {
      const [newSettings] = await db.insert(paymentSettings).values(settings).returning();
      return newSettings;
    } catch (error) {
      console.error("Erro ao criar configurações de pagamento:", error);
      throw error;
    }
  }

  async updatePaymentSettings(id: number, settings: Partial<PaymentSettings>): Promise<PaymentSettings | undefined> {
    try {
      const [updatedSettings] = await db
        .update(paymentSettings)
        .set(settings)
        .where(eq(paymentSettings.id, id))
        .returning();
      return updatedSettings;
    } catch (error) {
      console.error("Erro ao atualizar configurações de pagamento:", error);
      throw error;
    }
  }
  
  // Service Templates operations
  async getServiceTemplates(): Promise<ServiceTemplate[]> {
    try {
      return await db.select().from(serviceTemplates).where(eq(serviceTemplates.isActive, true));
    } catch (error) {
      console.error("Erro ao obter templates de serviço:", error);
      return [];
    }
  }
  
  async getServiceTemplatesByCategoryId(categoryId: number): Promise<ServiceTemplate[]> {
    try {
      return await db
        .select()
        .from(serviceTemplates)
        .where(
          and(
            eq(serviceTemplates.categoryId, categoryId),
            eq(serviceTemplates.isActive, true)
          )
        );
    } catch (error) {
      console.error(`Erro ao obter templates de serviço para categoria ${categoryId}:`, error);
      return [];
    }
  }

  async getServiceTemplatesByNiche(nicheId: number): Promise<ServiceTemplate[]> {
    try {
      // Primeiro, buscamos todas as categorias que pertencem a este nicho
      const nicheCategories = await db
        .select()
        .from(categories)
        .where(eq(categories.nicheId, nicheId));
      
      if (!nicheCategories.length) {
        return [];
      }
      
      // Extraímos os IDs das categorias
      const categoryIds = nicheCategories.map(cat => cat.id);
      
      // Realizamos uma consulta para cada ID de categoria e combinamos os resultados
      const allTemplates: ServiceTemplate[] = [];
      
      for (const catId of categoryIds) {
        const templates = await db
          .select()
          .from(serviceTemplates)
          .where(
            and(
              eq(serviceTemplates.categoryId, catId),
              eq(serviceTemplates.isActive, true)
            )
          );
        
        allTemplates.push(...templates);
      }
      
      return allTemplates;
    } catch (error) {
      console.error(`Erro ao obter templates de serviço para o nicho ${nicheId}:`, error);
      return [];
    }
  }
  
  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(serviceTemplates)
        .where(eq(serviceTemplates.id, id))
        .limit(1);
      return template;
    } catch (error) {
      console.error(`Erro ao obter template de serviço ${id}:`, error);
      return undefined;
    }
  }
  
  async createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate> {
    try {
      const [newTemplate] = await db
        .insert(serviceTemplates)
        .values({
          ...template,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newTemplate;
    } catch (error) {
      console.error("Erro ao criar template de serviço:", error);
      throw error;
    }
  }
  
  async updateServiceTemplate(id: number, template: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    try {
      const [updatedTemplate] = await db
        .update(serviceTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(eq(serviceTemplates.id, id))
        .returning();
      return updatedTemplate;
    } catch (error) {
      console.error(`Erro ao atualizar template de serviço ${id}:`, error);
      throw error;
    }
  }
  
  async deleteServiceTemplate(id: number): Promise<boolean> {
    try {
      // Exclusão lógica (soft delete)
      await db
        .update(serviceTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(serviceTemplates.id, id));
      return true;
    } catch (error) {
      console.error(`Erro ao excluir template de serviço ${id}:`, error);
      return false;
    }
  }
  
  // Onboarding Steps operations
  async getOnboardingSteps(userType: string): Promise<OnboardingStep[]> {
    return db
      .select()
      .from(onboardingSteps)
      .where(eq(onboardingSteps.userType, userType))
      .orderBy(onboardingSteps.order);
  }
  
  async getOnboardingStepsByUserType(userType: string): Promise<OnboardingStep[]> {
    return db
      .select()
      .from(onboardingSteps)
      .where(eq(onboardingSteps.userType, userType))
      .orderBy(onboardingSteps.order);
  }

  async getOnboardingStep(id: number): Promise<OnboardingStep | undefined> {
    const [step] = await db
      .select()
      .from(onboardingSteps)
      .where(eq(onboardingSteps.id, id));
    
    return step || undefined;
  }

  async createOnboardingStep(step: InsertOnboardingStep): Promise<OnboardingStep> {
    const stepData = {
      ...step,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [newStep] = await db
      .insert(onboardingSteps)
      .values(stepData)
      .returning();
    
    return newStep;
  }

  async updateOnboardingStep(id: number, stepData: Partial<OnboardingStep>): Promise<OnboardingStep | undefined> {
    const data = {
      ...stepData,
      updatedAt: new Date()
    };
    
    const [updatedStep] = await db
      .update(onboardingSteps)
      .set(data)
      .where(eq(onboardingSteps.id, id))
      .returning();
    
    return updatedStep || undefined;
  }

  async deleteOnboardingStep(id: number): Promise<boolean> {
    try {
      const result = await db.delete(onboardingSteps).where(eq(onboardingSteps.id, id));
      return !!result;
    } catch (error) {
      console.error("Erro ao excluir etapa de onboarding:", error);
      return false;
    }
  }

  // User onboarding progress operations
  async getUserOnboardingProgress(userId: number): Promise<UserOnboardingProgress[]> {
    return db
      .select()
      .from(userOnboardingProgress)
      .where(eq(userOnboardingProgress.userId, userId));
  }

  async createUserOnboardingProgress(progress: InsertUserOnboardingProgress): Promise<UserOnboardingProgress> {
    const progressData = {
      ...progress,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [newProgress] = await db
      .insert(userOnboardingProgress)
      .values(progressData)
      .returning();
    
    return newProgress;
  }

  async updateUserOnboardingProgress(userId: number, stepId: number, status: string): Promise<UserOnboardingProgress | undefined> {
    const completedAt = status === 'completed' ? new Date() : null;
    
    const [updatedProgress] = await db
      .update(userOnboardingProgress)
      .set({
        status,
        completedAt,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userOnboardingProgress.userId, userId),
          eq(userOnboardingProgress.stepId, stepId)
        )
      )
      .returning();
    
    return updatedProgress || undefined;
  }

  async getOnboardingCompletionPercentage(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;

    const totalSteps = await db
      .select()
      .from(onboardingSteps)
      .where(eq(onboardingSteps.userType, user.userType));

    if (totalSteps.length === 0) return 0;

    const completedSteps = await db
      .select()
      .from(userOnboardingProgress)
      .where(
        and(
          eq(userOnboardingProgress.userId, userId),
          sql`${userOnboardingProgress.status} IN ('completed', 'skipped')`
        )
      );

    return Math.round((completedSteps.length / totalSteps.length) * 100);
  }

  async markStepAsComplete(userId: number, stepId: number): Promise<UserOnboardingProgress | undefined> {
    return this.updateUserOnboardingProgress(userId, stepId, 'completed');
  }

  async markStepAsSkipped(userId: number, stepId: number): Promise<UserOnboardingProgress | undefined> {
    return this.updateUserOnboardingProgress(userId, stepId, 'skipped');
  }
    
  async generateProviderAnalytics(providerId: number, period: string = 'month'): Promise<ProviderAnalytics> {
    // Obter dados do prestador
    const providerServices = await this.getServicesByProvider(providerId);
    const providerReviews = await this.getProviderReviews(providerId);
    
    // Calcular datas para filtrar por período
    const today = new Date();
    const periodStart = new Date();
    
    switch(period) {
      case 'week':
        periodStart.setDate(today.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        periodStart.setFullYear(today.getFullYear() - 1);
        break;
      case 'all':
      default:
        periodStart.setFullYear(1970);
    }
    
    const periodStartFormatted = periodStart.toISOString().split('T')[0];
    const todayFormatted = today.toISOString().split('T')[0];
    
    // Obter agendamentos dentro do período
    const providerAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, providerId),
          sql`${appointments.date} >= ${periodStartFormatted}`,
          sql`${appointments.date} <= ${todayFormatted}`
        )
      );
    
    // Estatísticas gerais
    const completedAppointments = providerAppointments.filter(a => a.status === 'completed');
    const canceledAppointments = providerAppointments.filter(a => a.status === 'canceled');
    const pendingAppointments = providerAppointments.filter(a => 
      a.status === 'pending' || a.status === 'confirmed'
    );
    
    const totalRevenue = completedAppointments.reduce((sum, appointment) => {
      return sum + (appointment.totalPrice || 0);
    }, 0);
    
    // Estatísticas por dia
    const appointmentsByDayQuery = await db
      .select({
        date: appointments.date,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, providerId),
          sql`${appointments.date} >= ${periodStartFormatted}`,
          sql`${appointments.date} <= ${todayFormatted}`
        )
      )
      .groupBy(appointments.date)
      .orderBy(appointments.date);
    
    const appointmentsByDay = appointmentsByDayQuery.map(row => ({
      date: row.date,
      count: row.count
    }));
    
    // Estatísticas por mês
    const monthlyAppointmentsMap = new Map<string, number>();
    const monthlyRevenueMap = new Map<string, number>();
    
    providerAppointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyAppointmentsMap.set(
        month, 
        (monthlyAppointmentsMap.get(month) || 0) + 1
      );
      
      if (appointment.status === 'completed') {
        monthlyRevenueMap.set(
          month, 
          (monthlyRevenueMap.get(month) || 0) + (appointment.totalPrice || 0)
        );
      }
    });
    
    const appointmentsByMonth = Array.from(monthlyAppointmentsMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    const revenueByMonth = Array.from(monthlyRevenueMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Estatísticas por serviço
    const serviceStatsMap = new Map<number, { name: string; count: number; revenue: number }>();
    
    providerAppointments.forEach(appointment => {
      const serviceId = appointment.serviceId;
      const service = providerServices.find(s => s.id === serviceId);
      
      if (!service) return;
      
      const currentStats = serviceStatsMap.get(serviceId) || { 
        name: appointment.serviceName || service.name, 
        count: 0, 
        revenue: 0 
      };
      
      currentStats.count++;
      
      if (appointment.status === 'completed') {
        currentStats.revenue += (appointment.totalPrice || 0);
      }
      
      serviceStatsMap.set(serviceId, currentStats);
    });
    
    const topServices = Array.from(serviceStatsMap.entries())
      .map(([serviceId, stats]) => ({ 
        serviceId, 
        ...stats 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Estatísticas de horas ocupadas
    const busyHoursMap = new Map<number, number>();
    
    providerAppointments.forEach(appointment => {
      const hourMatch = appointment.startTime.match(/^(\d{1,2}):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        busyHoursMap.set(hour, (busyHoursMap.get(hour) || 0) + 1);
      }
    });
    
    const busyHours = Array.from(busyHoursMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
    
    // Estatísticas de dias da semana
    const busyDaysMap = new Map<number, number>();
    
    providerAppointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const day = date.getDay(); // 0 = Domingo, 6 = Sábado
      busyDaysMap.set(day, (busyDaysMap.get(day) || 0) + 1);
    });
    
    const busyDays = Array.from(busyDaysMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day - b.day);
    
    // Tendências - Mês atual vs. mês anterior
    const appointmentTrends: { month: string; count: number; previousCount: number; percentChange: number }[] = [];
    const revenueTrends: { month: string; total: number; previousTotal: number; percentChange: number }[] = [];
    
    if (appointmentsByMonth.length > 1) {
      for (let i = 1; i < appointmentsByMonth.length; i++) {
        const current = appointmentsByMonth[i];
        const previous = appointmentsByMonth[i - 1];
        
        const percentChange = previous.count === 0 
          ? 100 
          : Math.round(((current.count - previous.count) / previous.count) * 100);
        
        appointmentTrends.push({
          month: current.month,
          count: current.count,
          previousCount: previous.count,
          percentChange
        });
      }
    }
    
    if (revenueByMonth.length > 1) {
      for (let i = 1; i < revenueByMonth.length; i++) {
        const current = revenueByMonth[i];
        const previous = revenueByMonth[i - 1];
        
        const percentChange = previous.total === 0 
          ? 100 
          : Math.round(((current.total - previous.total) / previous.total) * 100);
        
        revenueTrends.push({
          month: current.month,
          total: current.total,
          previousTotal: previous.total,
          percentChange
        });
      }
    }
    
    return {
      totalAppointments: providerAppointments.length,
      completedAppointments: completedAppointments.length,
      canceledAppointments: canceledAppointments.length,
      pendingAppointments: pendingAppointments.length,
      totalReviews: providerReviews.length,
      averageRating: providerReviews.length > 0 
        ? Math.round(providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length) 
        : 0,
      totalRevenue,
      appointmentsByDay,
      appointmentsByMonth,
      revenueByMonth,
      topServices,
      busyHours,
      busyDays,
      appointmentTrends,
      revenueTrends
    };
  }
  
  // Implementação do método para obter novos usuários por dia
  async getUsersPerDay(days: number = 30): Promise<Array<{date: string; count: number}>> {
    try {
      const daysValue = days.toString(); // Converter para string para evitar problemas de binding
      
      const result = await db.execute(sql`
        WITH dates AS (
          SELECT generate_series(
            date_trunc('day', now()) - (${daysValue} || ' days')::interval,
            date_trunc('day', now()),
            interval '1 day'
          )::date AS date
        )
        SELECT 
          dates.date::text as date,
          COALESCE(count(u.id), 0) as count
        FROM 
          dates
        LEFT JOIN 
          ${users} u ON date_trunc('day', u."created_at"::timestamp) = dates.date
        GROUP BY 
          dates.date
        ORDER BY 
          dates.date ASC
      `);
      
      return (result as unknown) as Array<{date: string; count: number}>;
    } catch (error) {
      console.error("Erro ao obter dados de usuários por dia:", error);
      return [];
    }
  }
  
  // Criação de etapas de onboarding padrão
  async createDefaultOnboardingSteps() {
    console.log("Criando etapas de onboarding padrão para prestadores...");
    
    // Etapas para prestadores de serviço
    const providerSteps = [
      {
        name: "Informações Pessoais",
        description: "Complete suas informações pessoais para que seus clientes possam te conhecer melhor",
        userType: "provider",
        order: 1,
        isRequired: true,
        icon: "user",
        helpText: "Preencha seu nome completo, uma breve biografia profissional e adicione uma foto de perfil de boa qualidade."
      },
      {
        name: "Informações de Contato",
        description: "Adicione seus dados de contato para que os clientes possam te encontrar",
        userType: "provider",
        order: 2,
        isRequired: true,
        icon: "phone",
        helpText: "Adicione seu telefone, e-mail profissional e endereço do local de atendimento."
      },
      {
        name: "Dados do Negócio",
        description: "Configure as informações sobre seu negócio",
        userType: "provider",
        order: 3,
        isRequired: true,
        icon: "briefcase",
        helpText: "Informe o nome do seu negócio, horário de funcionamento e outras informações importantes."
      },
      {
        name: "Serviços Oferecidos",
        description: "Cadastre os serviços que você oferece aos seus clientes",
        userType: "provider",
        order: 4,
        isRequired: true,
        icon: "scissors",
        helpText: "Adicione ao menos um serviço com nome, descrição, preço e duração."
      },
      {
        name: "Agenda e Disponibilidade",
        description: "Configure sua disponibilidade para atendimentos",
        userType: "provider",
        order: 5,
        isRequired: true,
        icon: "calendar",
        helpText: "Configure os dias e horários em que você está disponível para atender seus clientes."
      },
      {
        name: "Métodos de Pagamento",
        description: "Configure os métodos de pagamento que você aceita",
        userType: "provider",
        order: 6,
        isRequired: false,
        icon: "credit-card",
        helpText: "Selecione os métodos de pagamento que você aceita e configure suas preferências."
      },
      {
        name: "Políticas e Termos",
        description: "Configure suas políticas de cancelamento e termos de serviço",
        userType: "provider",
        order: 7,
        isRequired: false,
        icon: "file-text",
        helpText: "Defina suas políticas de cancelamento, atraso e outras regras importantes para o atendimento."
      }
    ];
    
    // Etapas para clientes
    const clientSteps = [
      {
        name: "Informações Pessoais",
        description: "Complete suas informações para ter uma melhor experiência",
        userType: "client",
        order: 1,
        isRequired: true,
        icon: "user",
        helpText: "Preencha seu nome e adicione uma foto de perfil para personalizar sua conta."
      },
      {
        name: "Informações de Contato",
        description: "Adicione seus dados de contato",
        userType: "client",
        order: 2,
        isRequired: true,
        icon: "phone",
        helpText: "Adicione seu telefone e endereço para facilitar o atendimento pelos prestadores."
      },
      {
        name: "Preferências",
        description: "Configure suas preferências de notificação e categorias favoritas",
        userType: "client",
        order: 3,
        isRequired: false,
        icon: "heart",
        helpText: "Personalize sua experiência selecionando suas categorias de serviços favoritas."
      },
      {
        name: "Métodos de Pagamento",
        description: "Adicione métodos de pagamento para facilitar suas reservas",
        userType: "client",
        order: 4,
        isRequired: false,
        icon: "credit-card",
        helpText: "Adicione um cartão de crédito ou outra forma de pagamento para agilizar suas futuras reservas."
      }
    ];
    
    // Criar etapas para prestadores
    for (const step of providerSteps) {
      try {
        await this.createOnboardingStep(step);
      } catch (error) {
        console.error(`Erro ao criar etapa de onboarding "${step.name}" para prestadores:`, error);
      }
    }
    
    // Criar etapas para clientes
    for (const step of clientSteps) {
      try {
        await this.createOnboardingStep(step);
      } catch (error) {
        console.error(`Erro ao criar etapa de onboarding "${step.name}" para clientes:`, error);
      }
    }
    
    console.log("Etapas de onboarding padrão criadas com sucesso!");
  }
  
  // Notification operations
  async getNotifications(userId: number): Promise<Notification[]> {
    try {
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(sql`${notifications.createdAt} DESC`);
      return result;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id));
      return notification;
    } catch (error) {
      console.error(`Error fetching notification ${id}:`, error);
      return undefined;
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [result] = await db
        .insert(notifications)
        .values(notification)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async updateNotification(id: number, data: Partial<InsertNotification>): Promise<Notification | undefined> {
    try {
      const [result] = await db
        .update(notifications)
        .set(data)
        .where(eq(notifications.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error updating notification ${id}:`, error);
      return undefined;
    }
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      console.error(`Error marking all notifications as read for user ${userId}:`, error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const [result] = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      return undefined;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      await db
        .delete(notifications)
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error);
      return false;
    }
  }
  
  // Payment method operations
  async getUserPaymentMethod(userId: number): Promise<UserPaymentMethod | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(userPaymentMethods)
        .where(eq(userPaymentMethods.userId, userId));
      return paymentMethod;
    } catch (error) {
      console.error(`Error getting payment method for user ${userId}:`, error);
      return undefined;
    }
  }
  
  async createUserPaymentMethod(data: InsertUserPaymentMethod): Promise<UserPaymentMethod> {
    try {
      const [paymentMethod] = await db
        .insert(userPaymentMethods)
        .values(data)
        .returning();
      return paymentMethod;
    } catch (error) {
      console.error(`Error creating payment method for user ${data.userId}:`, error);
      throw new Error(`Falha ao criar método de pagamento: ${error}`);
    }
  }
  
  async updateUserPaymentMethod(userId: number, data: Partial<UserPaymentMethod>): Promise<UserPaymentMethod | undefined> {
    try {
      const [updatedPaymentMethod] = await db
        .update(userPaymentMethods)
        .set(data)
        .where(eq(userPaymentMethods.userId, userId))
        .returning();
      return updatedPaymentMethod;
    } catch (error) {
      console.error(`Error updating payment method for user ${userId}:`, error);
      return undefined;
    }
  }
  
  // User address operations
  async getUserAddresses(userId: number): Promise<UserAddress[]> {
    try {
      const addresses = await db
        .select()
        .from(userAddresses)
        .where(eq(userAddresses.userId, userId));
      return addresses;
    } catch (error) {
      console.error(`Error getting addresses for user ${userId}:`, error);
      return [];
    }
  }
  
  async getUserAddress(id: string): Promise<UserAddress | undefined> {
    try {
      const [address] = await db
        .select()
        .from(userAddresses)
        .where(eq(userAddresses.id, id));
      return address;
    } catch (error) {
      console.error(`Error getting address ${id}:`, error);
      return undefined;
    }
  }
  
  async createUserAddress(data: InsertUserAddress): Promise<UserAddress> {
    try {
      // Se for endereço padrão, remova a flag padrão de outros endereços
      if (data.isDefault) {
        await db
          .update(userAddresses)
          .set({ isDefault: false })
          .where(and(
            eq(userAddresses.userId, data.userId),
            eq(userAddresses.isDefault, true)
          ));
      }
      
      const [address] = await db
        .insert(userAddresses)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return address;
    } catch (error) {
      console.error(`Error creating address for user ${data.userId}:`, error);
      throw error;
    }
  }
  
  async updateUserAddress(id: string, data: Partial<UserAddress>): Promise<UserAddress | undefined> {
    try {
      const address = await this.getUserAddress(id);
      if (!address) return undefined;
      
      // Se estiver definindo como padrão, desmarque outros endereços
      if (data.isDefault && !address.isDefault) {
        await db
          .update(userAddresses)
          .set({ isDefault: false })
          .where(and(
            eq(userAddresses.userId, address.userId),
            eq(userAddresses.isDefault, true)
          ));
      }
      
      const [updatedAddress] = await db
        .update(userAddresses)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(userAddresses.id, id))
        .returning();
      return updatedAddress;
    } catch (error) {
      console.error(`Error updating address ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteUserAddress(id: string): Promise<boolean> {
    try {
      const address = await this.getUserAddress(id);
      if (!address) return false;
      
      // Se for endereço padrão, configure outro como padrão
      if (address.isDefault) {
        const userAddresses = await this.getUserAddresses(address.userId);
        const otherAddresses = userAddresses.filter(a => a.id !== id);
        
        if (otherAddresses.length > 0) {
          await this.updateUserAddress(otherAddresses[0].id, { isDefault: true });
        }
      }
      
      const result = await db
        .delete(userAddresses)
        .where(eq(userAddresses.id, id));
      
      return true;
    } catch (error) {
      console.error(`Error deleting address ${id}:`, error);
      return false;
    }
  }
  
  async setDefaultUserAddress(userId: number, addressId: string): Promise<boolean> {
    try {
      // Primeiro, desmarque todos os endereços como não-padrão
      await db
        .update(userAddresses)
        .set({ isDefault: false })
        .where(and(
          eq(userAddresses.userId, userId),
          eq(userAddresses.isDefault, true)
        ));
      
      // Em seguida, marque o endereço especificado como padrão
      const [updatedAddress] = await db
        .update(userAddresses)
        .set({ isDefault: true })
        .where(eq(userAddresses.id, addressId))
        .returning();
      
      return !!updatedAddress;
    } catch (error) {
      console.error(`Error setting default address ${addressId} for user ${userId}:`, error);
      return false;
    }
  }

  // Integrations Settings operations
  async getIntegrationsSettings(): Promise<IntegrationsSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(integrationsSettings)
        .limit(1);
      return settings;
    } catch (error) {
      console.error("Error fetching integration settings:", error);
      return undefined;
    }
  }

  async createIntegrationsSettings(settings: InsertIntegrationsSettings): Promise<IntegrationsSettings> {
    try {
      const [newSettings] = await db
        .insert(integrationsSettings)
        .values({
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Inicializar serviços com as novas configurações se estiverem habilitados
      if (newSettings.sendGridEnabled && newSettings.sendGridApiKey) {
        const emailService = await import('./email-service');
        emailService.default.initialize(newSettings.sendGridApiKey);
      }
      
      if (newSettings.pushNotificationsEnabled && newSettings.vapidPublicKey && newSettings.vapidPrivateKey) {
        const pushService = await import('./push-notification-service');
        pushService.default.initialize(newSettings.vapidPublicKey, newSettings.vapidPrivateKey);
      }
      
      return newSettings;
    } catch (error) {
      console.error("Error creating integration settings:", error);
      throw new Error(`Failed to create integration settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateIntegrationsSettings(id: number, settings: Partial<IntegrationsSettings>): Promise<IntegrationsSettings | undefined> {
    try {
      const [updatedSettings] = await db
        .update(integrationsSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(integrationsSettings.id, id))
        .returning();
      
      // Reinicializar serviços com as novas configurações se estiverem habilitados
      if (updatedSettings.sendGridEnabled && updatedSettings.sendGridApiKey) {
        const emailService = await import('./email-service');
        emailService.default.initialize(updatedSettings.sendGridApiKey);
      }
      
      if (updatedSettings.pushNotificationsEnabled && updatedSettings.vapidPublicKey && updatedSettings.vapidPrivateKey) {
        const pushService = await import('./push-notification-service');
        pushService.default.initialize(updatedSettings.vapidPublicKey, updatedSettings.vapidPrivateKey);
      }
      
      return updatedSettings;
    } catch (error) {
      console.error(`Error updating integration settings ${id}:`, error);
      return undefined;
    }
  }
  
  // Marketplace - Provider Balance operations
  async getProviderBalance(providerId: number): Promise<ProviderBalance | null> {
    try {
      const balance = await db
        .select()
        .from(providerBalances)
        .where(eq(providerBalances.providerId, providerId))
        .limit(1);
      
      return balance.length > 0 ? balance[0] : null;
    } catch (error) {
      console.error(`Error getting provider balance for provider ${providerId}:`, error);
      return null;
    }
  }
  
  async createProviderBalance(data: InsertProviderBalance): Promise<ProviderBalance> {
    try {
      const [balance] = await db
        .insert(providerBalances)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return balance;
    } catch (error) {
      console.error('Error creating provider balance:', error);
      throw new Error(`Failed to create provider balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async updateProviderBalance(providerId: number, data: Partial<InsertProviderBalance>): Promise<ProviderBalance | null> {
    try {
      const [updatedBalance] = await db
        .update(providerBalances)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(providerBalances.providerId, providerId))
        .returning();
      
      return updatedBalance || null;
    } catch (error) {
      console.error(`Error updating balance for provider ${providerId}:`, error);
      return null;
    }
  }
  
  // Marketplace - Provider Transaction operations
  async createProviderTransaction(data: InsertProviderTransaction): Promise<ProviderTransaction> {
    try {
      const [transaction] = await db
        .insert(providerTransactions)
        .values({
          ...data,
          createdAt: new Date()
        })
        .returning();
      
      return transaction;
    } catch (error) {
      console.error('Error creating provider transaction:', error);
      throw new Error(`Failed to create provider transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async updateProviderTransaction(id: number, data: Partial<InsertProviderTransaction>): Promise<ProviderTransaction | null> {
    try {
      const [updatedTransaction] = await db
        .update(providerTransactions)
        .set(data)
        .where(eq(providerTransactions.id, id))
        .returning();
      
      return updatedTransaction || null;
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      return null;
    }
  }
  
  async getProviderTransaction(id: number): Promise<ProviderTransaction | null> {
    try {
      const [transaction] = await db
        .select()
        .from(providerTransactions)
        .where(eq(providerTransactions.id, id));
      
      return transaction || null;
    } catch (error) {
      console.error(`Error getting transaction ${id}:`, error);
      return null;
    }
  }
  
  async getProviderTransactions(
    providerId: number, 
    options?: { offset?: number, limit?: number, type?: string }
  ): Promise<{ transactions: ProviderTransaction[], total: number }> {
    try {
      const { offset = 0, limit = 20, type } = options || {};
      
      let query = db
        .select()
        .from(providerTransactions)
        .where(eq(providerTransactions.providerId, providerId))
        .orderBy(desc(providerTransactions.createdAt));
      
      if (type) {
        query = query.where(eq(providerTransactions.type, type));
      }
      
      const transactions = await query
        .limit(limit)
        .offset(offset);
      
      // Contar total
      const countQuery = db
        .select({ count: count() })
        .from(providerTransactions)
        .where(eq(providerTransactions.providerId, providerId));
      
      if (type) {
        countQuery.where(eq(providerTransactions.type, type));
      }
      
      const [{ count: total }] = await countQuery;
      
      return {
        transactions,
        total: Number(total)
      };
    } catch (error) {
      console.error(`Error getting transactions for provider ${providerId}:`, error);
      return { transactions: [], total: 0 };
    }
  }
  
  async getTransactionByCheckoutId(checkoutId: string): Promise<ProviderTransaction | null> {
    try {
      const transactions = await db
        .select()
        .from(providerTransactions)
        .where(
          and(
            eq(providerTransactions.type, 'payment'),
            sql`${providerTransactions.metadata}->>'checkoutId' = ${checkoutId}`
          )
        )
        .limit(1);
      
      return transactions.length > 0 ? transactions[0] : null;
    } catch (error) {
      console.error(`Error getting transaction by checkout ID ${checkoutId}:`, error);
      return null;
    }
  }
  
  async getTransactionByWithdrawalId(withdrawalId: number): Promise<ProviderTransaction | null> {
    try {
      const transactions = await db
        .select()
        .from(providerTransactions)
        .where(
          and(
            eq(providerTransactions.type, 'withdrawal'),
            sql`${providerTransactions.metadata}->>'withdrawalId' = ${withdrawalId.toString()}`
          )
        )
        .limit(1);
      
      return transactions.length > 0 ? transactions[0] : null;
    } catch (error) {
      console.error(`Error getting transaction by withdrawal ID ${withdrawalId}:`, error);
      return null;
    }
  }
  
  // Marketplace - Payment Withdrawal operations
  async createPaymentWithdrawal(data: InsertPaymentWithdrawal): Promise<PaymentWithdrawal> {
    try {
      const [withdrawal] = await db
        .insert(paymentWithdrawals)
        .values({
          ...data,
          requestedAt: new Date()
        })
        .returning();
      
      return withdrawal;
    } catch (error) {
      console.error('Error creating payment withdrawal:', error);
      throw new Error(`Failed to create payment withdrawal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async updatePaymentWithdrawal(id: number, data: Partial<InsertPaymentWithdrawal>): Promise<PaymentWithdrawal | null> {
    try {
      const updateData: any = { ...data };
      
      // Se houver mudança de status para completed ou failed, adicionar data de processamento
      if (data.status === 'completed' || data.status === 'failed') {
        updateData.processedAt = new Date();
      }
      
      const [updatedWithdrawal] = await db
        .update(paymentWithdrawals)
        .set(updateData)
        .where(eq(paymentWithdrawals.id, id))
        .returning();
      
      return updatedWithdrawal || null;
    } catch (error) {
      console.error(`Error updating withdrawal ${id}:`, error);
      return null;
    }
  }
  
  async getPaymentWithdrawal(id: number): Promise<PaymentWithdrawal | null> {
    try {
      const withdrawals = await db
        .select()
        .from(paymentWithdrawals)
        .where(eq(paymentWithdrawals.id, id))
        .limit(1);
      
      return withdrawals.length > 0 ? withdrawals[0] : null;
    } catch (error) {
      console.error(`Error getting payment withdrawal ${id}:`, error);
      return null;
    }
  }
  
  async getProviderWithdrawals(
    providerId: number, 
    options?: { offset?: number, limit?: number, status?: string }
  ): Promise<{ withdrawals: PaymentWithdrawal[], total: number }> {
    try {
      const { offset = 0, limit = 20, status } = options || {};
      
      let query = db
        .select()
        .from(paymentWithdrawals)
        .where(eq(paymentWithdrawals.providerId, providerId))
        .orderBy(desc(paymentWithdrawals.requestedAt));
      
      if (status) {
        query = query.where(eq(paymentWithdrawals.status, status));
      }
      
      const withdrawals = await query
        .limit(limit)
        .offset(offset);
      
      // Contar total
      const countQuery = db
        .select({ count: count() })
        .from(paymentWithdrawals)
        .where(eq(paymentWithdrawals.providerId, providerId));
      
      if (status) {
        countQuery.where(eq(paymentWithdrawals.status, status));
      }
      
      const [{ count: total }] = await countQuery;
      
      return {
        withdrawals,
        total: Number(total)
      };
    } catch (error) {
      console.error(`Error getting withdrawals for provider ${providerId}:`, error);
      return { withdrawals: [], total: 0 };
    }
  }

  async getAllWithdrawals(options?: { offset?: number, limit?: number, status?: string }): Promise<{ withdrawals: any[], total: number }> {
    try {
      const { offset = 0, limit = 20, status } = options || {};
      
      // First, get the withdrawals
      let query = db
        .select()
        .from(paymentWithdrawals)
        .orderBy(desc(paymentWithdrawals.requestedAt));
      
      if (status) {
        query = query.where(eq(paymentWithdrawals.status, status));
      }
      
      const withdrawals = await query
        .limit(limit)
        .offset(offset);
      
      // Get provider information for each withdrawal
      const withdrawalsWithProviderInfo = [];
      for (const withdrawal of withdrawals) {
        const [provider] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone
          })
          .from(users)
          .where(eq(users.id, withdrawal.providerId));
        
        withdrawalsWithProviderInfo.push({
          ...withdrawal,
          providerInfo: provider ? {
            id: provider.id,
            name: provider.name,
            email: provider.email,
            phone: provider.phone
          } : null,
          pixInfo: {
            pixKey: withdrawal.paymentDetails?.pixKey || '',
            pixKeyType: withdrawal.paymentDetails?.pixKeyType || ''
          }
        });
      }
      
      // Contar total
      const countQuery = db
        .select({ count: count() })
        .from(paymentWithdrawals);
      
      if (status) {
        countQuery.where(eq(paymentWithdrawals.status, status));
      }
      
      const [{ count: total }] = await countQuery;
      
      return {
        withdrawals: withdrawalsWithProviderInfo,
        total: Number(total)
      };
    } catch (error) {
      console.error('Error getting all withdrawals:', error);
      return { withdrawals: [], total: 0 };
    }
  }

  // ========== IMPLEMENTAÇÃO DAS OPERAÇÕES DE PAGAMENTO COM STRIPE ==========

  /**
   * Atualiza o ID do cliente Stripe para um usuário
   */
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined> {
    try {
      // Verificar se usuário existe
      const user = await this.getUser(userId);
      if (!user) {
        return undefined;
      }

      // Verificar se já existe um método de pagamento para este usuário
      let paymentMethod = await this.db.query.userPaymentMethods.findFirst({
        where: eq(userPaymentMethods.userId, userId)
      });

      if (paymentMethod) {
        // Atualizar o registro existente
        await this.db.update(userPaymentMethods)
          .set({ stripeCustomerId: customerId })
          .where(eq(userPaymentMethods.id, paymentMethod.id));
      } else {
        // Criar um novo registro
        await this.db.insert(userPaymentMethods).values({
          userId,
          stripeCustomerId: customerId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      return user;
    } catch (error) {
      console.error("Erro ao atualizar Stripe Customer ID:", error);
      throw error;
    }
  }

  /**
   * Atualiza as informações de Stripe para um usuário
   */
  async updateUserStripeInfo(
    userId: number, 
    stripeInfo: { customerId: string, subscriptionId: string }
  ): Promise<boolean> {
    try {
      // Verificar se usuário existe
      const user = await this.getUser(userId);
      if (!user) {
        return false;
      }

      // Verificar se já existe um método de pagamento para este usuário
      let paymentMethod = await this.db.query.userPaymentMethods.findFirst({
        where: eq(userPaymentMethods.userId, userId)
      });

      if (paymentMethod) {
        // Atualizar o registro existente
        await this.db.update(userPaymentMethods)
          .set({ 
            stripeCustomerId: stripeInfo.customerId,
            stripeSubscriptionId: stripeInfo.subscriptionId,
            updatedAt: new Date()
          })
          .where(eq(userPaymentMethods.id, paymentMethod.id));
      } else {
        // Criar um novo registro
        await this.db.insert(userPaymentMethods).values({
          userId,
          stripeCustomerId: stripeInfo.customerId,
          stripeSubscriptionId: stripeInfo.subscriptionId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      return true;
    } catch (error) {
      console.error("Erro ao atualizar informações do Stripe:", error);
      throw error;
    }
  }

  /**
   * Obtém os métodos de pagamento de um usuário
   */
  async getUserPaymentMethods(userId: number): Promise<UserPaymentMethod[]> {
    try {
      return await this.db.query.userPaymentMethods.findMany({
        where: eq(userPaymentMethods.userId, userId)
      });
    } catch (error) {
      console.error("Erro ao obter métodos de pagamento do usuário:", error);
      throw error;
    }
  }

  /**
   * Obtém um método de pagamento específico pelo ID
   */
  async getUserPaymentMethodById(id: number): Promise<UserPaymentMethod | undefined> {
    try {
      return await this.db.query.userPaymentMethods.findFirst({
        where: eq(userPaymentMethods.id, id)
      });
    } catch (error) {
      console.error("Erro ao obter método de pagamento:", error);
      throw error;
    }
  }

  /**
   * Cria um novo método de pagamento para um usuário
   */
  async createUserPaymentMethod(data: InsertUserPaymentMethod): Promise<UserPaymentMethod> {
    try {
      const [result] = await this.db.insert(userPaymentMethods).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return result;
    } catch (error) {
      console.error("Erro ao criar método de pagamento:", error);
      throw error;
    }
  }

  // Payment Settings operations
  async getPaymentSettings(id?: number): Promise<PaymentSettings | undefined> {
    if (id) {
      const results = await db.select().from(paymentSettings).where(eq(paymentSettings.id, id));
      return results[0];
    } else {
      const results = await db.select().from(paymentSettings);
      return results[0];
    }
  }

  async createPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings> {
    const results = await db.insert(paymentSettings).values(settings).returning();
    return results[0];
  }

  async updatePaymentSettings(id: number, settings: Partial<PaymentSettings>): Promise<PaymentSettings | undefined> {
    const results = await db.update(paymentSettings)
      .set(settings)
      .where(eq(paymentSettings.id, id))
      .returning();
    return results[0];
  }
}

export const storage = new DatabaseStorage();