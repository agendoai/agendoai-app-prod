import { and, desc, eq, gte, isNull, lte, or, count } from "drizzle-orm"
import { db } from "./db"
import { sql } from "drizzle-orm"

import {
	Appointment,
	appointments,
	Availability,
  BlockedTimeSlot,
  blockedTimeSlots,
	categories,
	Category,
	InsertAppointment,
	InsertAvailability,
  InsertBlockedTimeSlot,
	InsertCategory,
	InsertNiche,
	InsertNotification,
	InsertPromotion,
	InsertProviderService,
	InsertProviderServiceFee,
	InsertReview,
	InsertService,
	InsertServiceTemplate,
	InsertUser,
	Niche,
	niches,
	Notification,
	notifications,
	Promotion,
	promotions,
	ProviderService,
	ProviderServiceFee,
	providerServiceFees,
	providerServices,
	providerSettings,
	Review,
	reviews,
	Service,
	services,
	ServiceTemplate,
	serviceTemplates,
	User,
	users,
 
	availability as availabilityTable,


	availability,
	SupportTicket,
	supportTickets,
	SupportMessage,
	supportMessages,
	InsertSupportTicket,
	InsertSupportMessage,
	// Add missing types and tables
	providerBreaks,
	ProviderBreak,
	InsertProviderBreak,
	userAddresses,
	UserAddress,
	InsertUserAddress,
	userPaymentMethods,
	UserPaymentMethod,
	InsertUserPaymentMethod,
	passwordResetTokens,
	PasswordResetToken,
	InsertPasswordResetToken,
	integrationsSettings,
	IntegrationsSettings,
	InsertIntegrationsSettings,
	onboardingSteps,
	OnboardingStep,
	InsertOnboardingStep,
	userOnboardingProgress,
	UserOnboardingProgress,
	InsertUserOnboardingProgress,
	providerPaymentPreferences,
	ProviderPaymentPreference,
	InsertProviderPaymentPreference,
	clientPaymentPreferences,
	ClientPaymentPreference,
	InsertClientPaymentPreference,
	paymentSettings,
	PaymentSettings,
	InsertPaymentSettings,
	providerBalances,
	ProviderBalance,
	InsertProviderBalance,
	providerTransactions,
	ProviderTransaction,
	InsertProviderTransaction,
	paymentWithdrawals,
	PaymentWithdrawal,
	InsertPaymentWithdrawal,
	systemSettings,
	SystemSetting,
	InsertSystemSetting,
} from "../shared/schema"

// Session import
import session from "express-session"
// Import this dynamically to fix ESM issues
let PostgresSessionStore: any
// We'll initialize this in the constructor

// Storage interface definition
export interface IStorage {
	sessionStore: session.Store

	// User methods
	getUsers(): Promise<User[]>
	getUserById(id: number): Promise<User | undefined>
	getUserByEmail(email: string): Promise<User | undefined>
	getUsersByType(type: string): Promise<User[]>
	createUser(user: InsertUser): Promise<User>
	updateUser(id: number, user: Partial<InsertUser>): Promise<User>
	deleteUser(id: number): Promise<void>

	// Provider Settings methods
	getProviderSettings(providerId: number): Promise<any>
	createProviderSettings(settings: any): Promise<any>
	updateProviderSettings(providerId: number, settings: any): Promise<any>

	// Schedule methods
	getSchedules(): Promise<any[]>
	getScheduleById(id: number): Promise<any | undefined>
	getSchedulesByProviderId(providerId: number): Promise<any[]>
	createSchedule(schedule: any): Promise<any>
	updateSchedule(
		id: number,
		schedule: Partial<any>
	): Promise<any>
	deleteSchedule(id: number): Promise<void>

	// Niche methods
	getNiches(): Promise<Niche[]>
	getNicheById(id: number): Promise<Niche | undefined>
	createNiche(niche: InsertNiche): Promise<Niche>
	updateNiche(id: number, niche: Partial<InsertNiche>): Promise<Niche>
	deleteNiche(id: number): Promise<void>

	// Category methods
	getCategories(): Promise<Category[]>
	getCategoryById(id: number): Promise<Category | undefined>
	getCategoriesByNicheId(nicheId: number): Promise<Category[]>
	createCategory(category: InsertCategory): Promise<Category>
	updateCategory(
		id: number,
		category: Partial<InsertCategory>
	): Promise<Category>
	deleteCategory(id: number): Promise<void>

	// Service methods
	getServices(): Promise<Service[]>
	getServiceById(id: number): Promise<Service | undefined>
	getServicesByCategoryId(categoryId: number): Promise<Service[]>
	createService(service: InsertService): Promise<Service>
	updateService(id: number, service: Partial<InsertService>): Promise<Service>
	deleteService(id: number): Promise<void>

	// ProviderService methods
	getProviderServices(): Promise<ProviderService[]>
	getProviderServiceById(id: number): Promise<ProviderService | undefined>
	getProviderServicesByProviderId(
		providerId: number
	): Promise<ProviderService[]>
	getProviderServiceByService(
		providerId: number,
		serviceId: number
	): Promise<ProviderService | undefined>
	createProviderService(
		providerService: InsertProviderService
	): Promise<ProviderService>
	updateProviderService(
		id: number,
		providerService: Partial<InsertProviderService>
	): Promise<ProviderService>
	deleteProviderService(id: number): Promise<void>

	// Appointment methods
	getAppointments(): Promise<Appointment[]>
	getAppointmentById(id: number): Promise<Appointment | undefined>
	getAppointmentsByProviderId(providerId: number): Promise<Appointment[]>
	getAppointmentsByClientId(clientId: number): Promise<Appointment[]>
	getClientAppointments(clientId: number): Promise<Appointment[]>
	getProviderClients(providerId: number): Promise<{ id: number, name: string, email: string }[]>
	createAppointment(appointment: InsertAppointment): Promise<Appointment>
	updateAppointment(
		id: number,
		appointment: Partial<InsertAppointment>
	): Promise<Appointment>
	deleteAppointment(id: number): Promise<void>

	// Review methods
	getReviews(): Promise<Review[]>
	getReviewById(id: number): Promise<Review | undefined>
	getReviewsByProviderId(providerId: number): Promise<Review[]>
	getReviewsByClientId(clientId: number): Promise<Review[]>
	createReview(review: InsertReview): Promise<Review>
	updateReview(id: number, review: Partial<InsertReview>): Promise<Review>
	deleteReview(id: number): Promise<void>

	// Favorite methods
	getFavorites(): Promise<any[]>
	getFavoriteById(id: number): Promise<any | undefined>
	getFavoritesByClientId(clientId: number): Promise<any[]>
	createFavorite(favorite: any): Promise<any>
	deleteFavorite(id: number): Promise<void>

	// BlockedTimeSlot methods
	getBlockedTimes(): Promise<BlockedTimeSlot[]>
	getBlockedTimeById(id: number): Promise<BlockedTimeSlot | undefined>
	getBlockedTimesByProviderId(providerId: number): Promise<BlockedTimeSlot[]>
  getBlockedTimeSlotsByDate(providerId: number, date: string): Promise<BlockedTimeSlot[]>
	createBlockedTime(BlockedTimeSlot: InsertBlockedTimeSlot): Promise<BlockedTimeSlot>
	updateBlockedTime(
		id: number,
		BlockedTimeSlot: Partial<InsertBlockedTimeSlot>
	): Promise<BlockedTimeSlot>
	deleteBlockedTime(id: number): Promise<void>

	// TimeSlot methods (using ProviderBreak instead)
	getTimeSlots(): Promise<ProviderBreak[]>
	getTimeSlotById(id: number): Promise<ProviderBreak | undefined>
	getTimeSlotsByProviderId(providerId: number): Promise<ProviderBreak[]>
	createTimeSlot(timeSlot: InsertProviderBreak): Promise<ProviderBreak>
	updateTimeSlot(
		id: number,
		timeSlot: Partial<InsertProviderBreak>
	): Promise<ProviderBreak>
	deleteTimeSlot(id: number): Promise<void>

	// UnavailableDay methods (using ProviderBreak instead)
	getUnavailableDays(): Promise<ProviderBreak[]>
	getUnavailableDayById(id: number): Promise<ProviderBreak | undefined>
	getUnavailableDaysByProviderId(
		providerId: number
	): Promise<ProviderBreak[]>
	createUnavailableDay(
		unavailableDay: InsertProviderBreak
	): Promise<ProviderBreak>
	updateUnavailableDay(
		id: number,
		unavailableDay: Partial<InsertProviderBreak>
	): Promise<ProviderBreak>
	deleteUnavailableDay(id: number): Promise<void>

	// RecurrentBlockedTime methods (using BlockedTimeSlot instead)
	getRecurrentBlockedTimes(): Promise<BlockedTimeSlot[]>
	getRecurrentBlockedTimeById(
		id: number
	): Promise<BlockedTimeSlot | undefined>
	getRecurrentBlockedTimesByProviderId(
		providerId: number
	): Promise<BlockedTimeSlot[]>
	createRecurrentBlockedTime(
		recurrentBlockedTime: InsertBlockedTimeSlot
	): Promise<BlockedTimeSlot>
	updateRecurrentBlockedTime(
		id: number,
		recurrentBlockedTime: Partial<InsertBlockedTimeSlot>
	): Promise<BlockedTimeSlot>
	deleteRecurrentBlockedTime(id: number): Promise<void>

	// Availability methods
	getAvailabilities(): Promise<Availability[]>
	getAvailabilityById(id: number): Promise<Availability | undefined>
	getAvailabilityByProviderId(providerId: number): Promise<Availability[]>
	getAvailabilityByDay(
		providerId: number,
		dayOfWeek: number
	): Promise<Availability | undefined>
	getAvailabilityByDate(
		providerId: number,
		date: string
	): Promise<Availability | undefined>
	createAvailability(availability: InsertAvailability): Promise<Availability>
	updateAvailability(
		id: number,
		availability: Partial<InsertAvailability>
	): Promise<Availability>
	deleteAvailability(id: number): Promise<void>

	// ServiceTemplate methods
	getServiceTemplates(): Promise<ServiceTemplate[]>
	getServiceTemplateById(id: number): Promise<ServiceTemplate | undefined>
	getServiceTemplatesByCategoryId(
		categoryId: number
	): Promise<ServiceTemplate[]>
	createServiceTemplate(
		serviceTemplate: InsertServiceTemplate
	): Promise<ServiceTemplate>
	updateServiceTemplate(
		id: number,
		serviceTemplate: Partial<InsertServiceTemplate>
	): Promise<ServiceTemplate>
	deleteServiceTemplate(id: number): Promise<void>

	// Notification methods
	getNotifications(): Promise<Notification[]>
	getNotificationById(id: number): Promise<Notification | undefined>
	getNotificationsByUserId(userId: number): Promise<Notification[]>
	createNotification(notification: InsertNotification): Promise<Notification>
	updateNotification(
		id: number,
		notification: Partial<InsertNotification>
	): Promise<Notification>
	deleteNotification(id: number): Promise<void>

	// Article methods (removed - not in schema)
	// getArticles(): Promise<Article[]>
	// getArticleById(id: number): Promise<Article | undefined>
	// getArticlesByCategoryId(categoryId: number): Promise<Article[]>
	// createArticle(article: InsertArticle): Promise<Article>
	// updateArticle(id: number, article: Partial<InsertArticle>): Promise<Article>
	// deleteArticle(id: number): Promise<void>

	// ArticleCategory methods (removed - not in schema)
	// getArticleCategories(): Promise<ArticleCategory[]>
	// getArticleCategoryById(id: number): Promise<ArticleCategory | undefined>
	// createArticleCategory(
	// 	articleCategory: InsertArticleCategory
	// ): Promise<ArticleCategory>
	// updateArticleCategory(
	// 	id: number,
	// 	articleCategory: Partial<InsertArticleCategory>
	// ): Promise<ArticleCategory>
	// deleteArticleCategory(id: number): Promise<void>

	// Coupon methods (removed - not in schema)
	// getCoupons(): Promise<Coupon[]>
	// getCouponById(id: number): Promise<Coupon | undefined>
	// getCouponByCode(code: string): Promise<Coupon | undefined>
	// createCoupon(coupon: InsertCoupon): Promise<Coupon>
	// updateCoupon(id: number, coupon: Partial<InsertCoupon>): Promise<Coupon>
	// deleteCoupon(id: number): Promise<void>

	// ProviderServiceFee methods
	getAllProviderFees(): Promise<ProviderServiceFee[]>
	getProviderFee(id: number): Promise<ProviderServiceFee | undefined>
	getProviderFeeByProviderId(
		providerId: number
	): Promise<ProviderServiceFee | undefined>
	createProviderFee(
		fee: InsertProviderServiceFee
	): Promise<ProviderServiceFee>
	updateProviderFee(
		id: number,
		fee: Partial<InsertProviderServiceFee>
	): Promise<ProviderServiceFee>
	deleteProviderFee(id: number): Promise<void>
	getAllProviders(): Promise<User[]>

	// Financial settings methods
	getFinancialSettings(): Promise<any>
	saveFinancialSettings(settings: any): Promise<any>

	// Promotion methods
	getPromotions(): Promise<Promotion[]>
	getPromotionById(id: number): Promise<Promotion | undefined>
	getActivePromotions(currentDate: Date): Promise<Promotion[]>
	getApplicablePromotions(filters: {
		serviceId?: number
		providerId?: number
		categoryId?: number
		nicheId?: number
		currentDate: Date
	}): Promise<Promotion[]>
	createPromotion(promotion: InsertPromotion): Promise<Promotion>
	updatePromotion(
		id: number,
		promotion: Partial<InsertPromotion>
	): Promise<Promotion>
	deletePromotion(id: number): Promise<void>

	// Help methods (removed - not in schema)
	// getHelpArticles(): Promise<Help[]>
	// getHelpArticleById(id: number): Promise<Help | undefined>
	// getHelpArticlesByCategoryId(categoryId: number): Promise<Help[]>
	// createHelpArticle(help: InsertHelp): Promise<Help>
	// updateHelpArticle(id: number, help: Partial<InsertHelp>): Promise<Help>
	// deleteHelpArticle(id: number): Promise<void>

	// HelpCategory methods (removed - not in schema)
	// getHelpCategories(): Promise<HelpCategory[]>
	// getHelpCategoryById(id: number): Promise<HelpCategory | undefined>
	// createHelpCategory(helpCategory: InsertHelpCategory): Promise<HelpCategory>
	// updateHelpCategory(
	// 	id: number,
	// 	helpCategory: Partial<InsertHelpCategory>
	// ): Promise<HelpCategory>
	// deleteHelpCategory(id: number): Promise<void>

	// Adiciona ou substitui todos os horários disponíveis de um provedor para uma data específica
	setAvailabilityByDate(providerId: number, date: string, slots: { startTime: string, endTime: string }[]): Promise<void>

	// Métodos para relatórios administrativos
	getUsersCount(userType?: string): Promise<number>
	getServicesCount(): Promise<number>
	getCategoriesCount(): Promise<number>
	getAppointmentsCount(status?: string): Promise<number>
	getRecentAppointments(limit: number): Promise<any[]>
	getNewUsersByDay(startDate: Date, endDate: Date): Promise<{ date: string, count: number }[]>
	getAllAppointments(): Promise<Appointment[]>

	// Support methods
	createSupportMessage(data: { userId: number; subject: string; message: string }): Promise<SupportTicket>
	getUserSupportMessages(userId: number): Promise<SupportTicket[]>
	getSupportMessage(messageId: number): Promise<SupportTicket | undefined>
	resolveSupportMessage(messageId: number, adminId: number, response: string): Promise<SupportMessage>
}

// Memory storage implementation for testing
export class MemStorage implements IStorage {
	private users: User[] = []
	private schedules: any[] = []
	private niches: Niche[] = []
	private categories: Category[] = []
	private services: Service[] = []
	private providerServices: ProviderService[] = []
	private appointments: Appointment[] = []
	private reviews: Review[] = []
	private favorites: any[] = []
	private blockedTimeSlots: BlockedTimeSlot[] = []
	private timeSlots: ProviderBreak[] = []
	private unavailableDays: ProviderBreak[] = []
	private recurrentBlockedTimes: BlockedTimeSlot[] = []
	private availability: Availability[] = []
	private serviceTemplates: ServiceTemplate[] = []
	private notifications: Notification[] = []
	private providerServiceFees: ProviderServiceFee[] = []
	private promotions: Promotion[] = []
	private providerSettings: any[] = []

	sessionStore: session.Store

	constructor() {
		this.sessionStore = new session.MemoryStore()
	}

	// User methods
	async getUsers(): Promise<User[]> {
		return this.users
	}

	async getUserById(id: number): Promise<User | undefined> {
		return this.users.find((user) => user.id === id)
	}

	async getUserByEmail(email: string): Promise<User | undefined> {
		return this.users.find((user) => user.email === email)
	}

	async getUsersByType(type: string): Promise<User[]> {
		return this.users.filter((user) => user.userType === type)
	}

	async createUser(user: InsertUser): Promise<User> {
		const newUser: User = {
			id: this.users.length + 1,
			name: user.name || null,
			createdAt: new Date(),
			isActive: user.isActive || null,
			userType: user.userType || "client",
			email: user.email,
			password: user.password,
			profileImage: user.profileImage || null,
			phone: user.phone || null,
			address: user.address || null,
			isVerified: user.isVerified || null,
		}

		this.users.push(newUser)
		return newUser
	}

	async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
		const index = this.users.findIndex((u) => u.id === id)
		if (index === -1) {
			throw new Error(`User with id ${id} not found`)
		}

		const updatedUser: User = {
			...this.users[index],
			...user,
			id: this.users[index].id,
			createdAt: this.users[index].createdAt,
		}

		this.users[index] = updatedUser
		return updatedUser
	}

	async deleteUser(id: number): Promise<void> {
		const index = this.users.findIndex((user) => user.id === id)
		if (index !== -1) {
			this.users.splice(index, 1)
		}
	}

	// Schedule methods
	async getSchedules(): Promise<any[]> {
		return this.schedules
	}

	async getScheduleById(id: number): Promise<any | undefined> {
		return this.schedules.find((schedule) => schedule.id === id)
	}

	async getSchedulesByProviderId(providerId: number): Promise<any[]> {
		return this.schedules.filter(
			(schedule) => schedule.providerId === providerId
		)
	}

	async createSchedule(schedule: any): Promise<any> {
		const newSchedule: any = {
			id: this.schedules.length + 1,
			...schedule,
		}
		this.schedules.push(newSchedule)
		return newSchedule
	}

	async updateSchedule(
		id: number,
		schedule: Partial<any>
	): Promise<any> {
		const index = this.schedules.findIndex((s) => s.id === id)
		if (index === -1) {
			throw new Error(`Schedule with id ${id} not found`)
		}

		const updatedSchedule: any = {
			...this.schedules[index],
			...schedule,
			id: this.schedules[index].id,
		}

		this.schedules[index] = updatedSchedule
		return updatedSchedule
	}

	async deleteSchedule(id: number): Promise<void> {
		const index = this.schedules.findIndex((schedule) => schedule.id === id)
		if (index !== -1) {
			this.schedules.splice(index, 1)
		}
	}

	// Niche methods
	async getNiches(): Promise<Niche[]> {
		return this.niches
	}

	async getNicheById(id: number): Promise<Niche | undefined> {
		return this.niches.find((niche) => niche.id === id)
	}

	async createNiche(niche: InsertNiche): Promise<Niche> {
		const newNiche: Niche = {
			id: this.niches.length + 1,
			name: niche.name,
			createdAt: new Date(),
			description: niche.description || null,
			icon: niche.icon || null,
			updatedAt: new Date(),
		}

		this.niches.push(newNiche)
		return newNiche
	}

	async updateNiche(id: number, niche: Partial<InsertNiche>): Promise<Niche> {
		const index = this.niches.findIndex((n) => n.id === id)
		if (index === -1) {
			throw new Error(`Niche with id ${id} not found`)
		}

		const updatedNiche: Niche = {
			...this.niches[index],
			...niche,
			id: this.niches[index].id,
			createdAt: this.niches[index].createdAt,
			updatedAt: new Date(),
		}

		this.niches[index] = updatedNiche
		return updatedNiche
	}

	async deleteNiche(id: number): Promise<void> {
		const index = this.niches.findIndex((niche) => niche.id === id)
		if (index !== -1) {
			this.niches.splice(index, 1)
		}
	}

	// Category methods
	async getCategories(): Promise<Category[]> {
		return this.categories
	}

	async getCategoryById(id: number): Promise<Category | undefined> {
		return this.categories.find((category) => category.id === id)
	}

	async getCategoriesByNicheId(nicheId: number): Promise<Category[]> {
		return this.categories.filter(
			(category) => category.nicheId === nicheId
		)
	}

	async createCategory(category: InsertCategory): Promise<Category> {
		const newCategory: Category = {
			id: this.categories.length + 1,
			name: category.name,
			createdAt: new Date(),
			description: category.description || null,
			icon: category.icon || null,
			color: category.color || null,
			updatedAt: new Date(),
			nicheId: category.nicheId,
			parentId: category.parentId || null,
		}

		this.categories.push(newCategory)
		return newCategory
	}

	async updateCategory(
		id: number,
		category: Partial<InsertCategory>
	): Promise<Category> {
		const index = this.categories.findIndex((c) => c.id === id)
		if (index === -1) {
			throw new Error(`Category with id ${id} not found`)
		}

		const updatedCategory: Category = {
			...this.categories[index],
			...category,
			id: this.categories[index].id,
			createdAt: this.categories[index].createdAt,
			updatedAt: new Date(),
		}

		this.categories[index] = updatedCategory
		return updatedCategory
	}

	async deleteCategory(id: number): Promise<void> {
		const index = this.categories.findIndex(
			(category) => category.id === id
		)
		if (index !== -1) {
			this.categories.splice(index, 1)
		}
	}

	// Service methods
	async getServices(): Promise<Service[]> {
		return this.services
	}

	async getServiceById(id: number): Promise<Service | undefined> {
		return this.services.find((service) => service.id === id)
	}

	async getServicesByCategoryId(categoryId: number): Promise<Service[]> {
		return this.services.filter(
			(service) => service.categoryId === categoryId
		)
	}

	async createService(service: InsertService): Promise<Service> {
		const newService: Service = {
			id: this.services.length + 1,
			providerId: service.providerId,
			name: service.name,
			description: service.description || null,
			nicheId: service.nicheId || null,
			categoryId: service.categoryId,
			duration: service.duration,
			isActive: service.isActive || null,
			price: service.price || null,
		}

		this.services.push(newService)
		return newService
	}

	async updateService(
		id: number,
		service: Partial<InsertService>
	): Promise<Service> {
		const index = this.services.findIndex((s) => s.id === id)
		if (index === -1) {
			throw new Error(`Service with id ${id} not found`)
		}

		const updatedService: Service = {
			...this.services[index],
			...service,
			id: this.services[index].id,
		}

		this.services[index] = updatedService
		return updatedService
	}

	async deleteService(id: number): Promise<void> {
		const index = this.services.findIndex((service) => service.id === id)
		if (index !== -1) {
			this.services.splice(index, 1)
		}
	}

	// ProviderService methods
	async getProviderServices(): Promise<ProviderService[]> {
		return this.providerServices
	}

	async getProviderServiceById(
		id: number
	): Promise<ProviderService | undefined> {
		return this.providerServices.find(
			(providerService) => providerService.id === id
		)
	}

	async getProviderServicesByProviderId(
		providerId: number
	): Promise<ProviderService[]> {
		return this.providerServices.filter(
			(providerService) => providerService.providerId === providerId
		)
	}

	async getProviderServiceByService(
		providerId: number,
		serviceId: number
	): Promise<ProviderService | undefined> {
		return this.providerServices.find(
			(providerService) =>
				providerService.providerId === providerId &&
				providerService.serviceId === serviceId
		)
	}

	async createProviderService(
		providerService: InsertProviderService
	): Promise<ProviderService> {
		const newProviderService: ProviderService = {
			id: this.providerServices.length + 1,
			providerId: providerService.providerId,
			serviceId: providerService.serviceId,
			createdAt: new Date(),
			duration: providerService.duration,
			isActive: providerService.isActive || null,
			price: providerService.price,
			executionTime: providerService.executionTime,
			breakTime: providerService.breakTime || null,
		}

		this.providerServices.push(newProviderService)
		return newProviderService
	}

	async updateProviderService(
		id: number,
		providerService: Partial<InsertProviderService>
	): Promise<ProviderService> {
		const index = this.providerServices.findIndex((ps) => ps.id === id)
		if (index === -1) {
			throw new Error(`ProviderService with id ${id} not found`)
		}

		const updatedProviderService: ProviderService = {
			...this.providerServices[index],
			...providerService,
			id: this.providerServices[index].id,
			createdAt: this.providerServices[index].createdAt,
		}

		this.providerServices[index] = updatedProviderService
		return updatedProviderService
	}

	async deleteProviderService(id: number): Promise<void> {
		const index = this.providerServices.findIndex(
			(providerService) => providerService.id === id
		)
		if (index !== -1) {
			this.providerServices.splice(index, 1)
		}
	}

	// Availability methods
	async getAvailabilities(): Promise<Availability[]> {
		return this.availability
	}

	async getAvailabilityById(id: number): Promise<Availability | undefined> {
		return this.availability.find((availability) => availability.id === id)
	}

	async getAvailabilityByProviderId(
		providerId: number
	): Promise<Availability[]> {
		return this.availability.filter(
			(availability) => availability.providerId === providerId
		)
	}

	async getAvailabilityByDay(
		providerId: number,
		dayOfWeek: number
	): Promise<Availability | undefined> {
		return this.availability.find(
			(avail) =>
				avail.providerId === providerId && avail.dayOfWeek === dayOfWeek
		)
	}

	async getAvailabilityByDate(
		providerId: number,
		date: string
	): Promise<Availability | undefined> {
		return this.availability.find(
			(avail) => avail.providerId === providerId && avail.date === date
		)
	}

	async createAvailability(
		availability: InsertAvailability
	): Promise<Availability> {
		const newAvailability: Availability = {
			id: this.availability.length + 1,
			date: availability.date || null,
			dayOfWeek: availability.dayOfWeek,
			providerId: availability.providerId,
			startTime: availability.startTime,
			endTime: availability.endTime,
			isAvailable: availability.isAvailable || null,
			intervalMinutes: availability.intervalMinutes || null,
		}

		this.availability.push(newAvailability)
		return newAvailability
	}

	async updateAvailability(
		id: number,
		availability: Partial<InsertAvailability>
	): Promise<Availability> {
		const index = this.availability.findIndex((a) => a.id === id)
		if (index === -1) {
			throw new Error(`Availability with id ${id} not found`)
		}

		const updatedAvailability: Availability = {
			...this.availability[index],
			...availability,
			id: this.availability[index].id,
		}

		this.availability[index] = updatedAvailability
		return updatedAvailability
	}

	async deleteAvailability(id: number): Promise<void> {
		const index = this.availability.findIndex(
			(availability) => availability.id === id
		)
		if (index !== -1) {
			this.availability.splice(index, 1)
		}
	}

	// Implementation for remaining methods...
	// Add implementations as needed

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
			defaultExpirationDays: 30,
		}
	}

	async saveFinancialSettings(settings: any): Promise<any> {
		// Implementação temporária - substituir com tabela real quando disponível
		return settings
	}

	// Provider Fee methods
	async getAllProviderFees(): Promise<ProviderServiceFee[]> {
		return this.providerServiceFees
	}

	async getProviderFee(id: number): Promise<ProviderServiceFee | undefined> {
		return this.providerServiceFees.find((fee) => fee.id === id)
	}

	async getProviderFeeByProviderId(
		providerId: number
	): Promise<ProviderServiceFee | undefined> {
		return this.providerServiceFees.find(
			(fee) => fee.providerId === providerId && fee.isActive === true
		)
	}

	async createProviderFee(
		fee: InsertProviderServiceFee
	): Promise<ProviderServiceFee> {
		const newFee: ProviderServiceFee = {
			id: this.providerServiceFees.length + 1,
			providerId: fee.providerId,
			createdAt: new Date(),
			updatedAt: new Date(),
			fixedFee: fee.fixedFee || 0,
			isActive: fee.isActive || true,
			description: fee.description || null,
		}

		this.providerServiceFees.push(newFee)
		return newFee
	}

	async updateProviderFee(
		id: number,
		fee: Partial<InsertProviderServiceFee>
	): Promise<ProviderServiceFee> {
		const index = this.providerServiceFees.findIndex((f) => f.id === id)
		if (index === -1) {
			throw new Error(`ProviderServiceFee with id ${id} not found`)
		}

		const updatedFee: ProviderServiceFee = {
			...this.providerServiceFees[index],
			...fee,
			id: this.providerServiceFees[index].id,
			createdAt: this.providerServiceFees[index].createdAt,
			updatedAt: new Date(),
		}

		this.providerServiceFees[index] = updatedFee
		return updatedFee
	}

	async deleteProviderFee(id: number): Promise<void> {
		const index = this.providerServiceFees.findIndex((fee) => fee.id === id)
		if (index !== -1) {
			this.providerServiceFees.splice(index, 1)
		}
	}

	async getAllProviders(): Promise<User[]> {
		return this.users.filter((user) => user.userType === "provider")
	}

	// Implement remaining required methods
	async getAppointmentsByProviderId(
		providerId: number
	): Promise<Appointment[]> {
		return []
	}

	async getAppointmentsByClientId(clientId: number): Promise<Appointment[]> {
		return []
	}

	async getClientAppointments(clientId: number): Promise<Appointment[]> {
		return this.appointments.filter(appointment => appointment.clientId === clientId)
	}

	async getProviderClients(providerId: number): Promise<{ id: number, name: string, email: string }[]> {
		const clientIds = [...new Set(this.appointments
			.filter(appointment => appointment.providerId === providerId)
			.map(appointment => appointment.clientId))]
		
		return clientIds.map(clientId => {
			const user = this.users.find(u => u.id === clientId)
			return {
				id: clientId,
				name: user?.name || 'Cliente',
				email: user?.email || ''
			}
		})
	}

	async createAppointment(
		appointment: InsertAppointment
	): Promise<Appointment> {
		return {} as Appointment
	}

	async updateAppointment(
		id: number,
		appointment: Partial<InsertAppointment>
	): Promise<Appointment> {
		return {} as Appointment
	}

	async deleteAppointment(id: number): Promise<void> {}

	async getAppointments(): Promise<Appointment[]> {
		return []
	}

	async getAppointmentById(id: number): Promise<Appointment | undefined> {
		return undefined
	}

	// Other required methods (implement as needed)
	async getReviews(): Promise<Review[]> {
		return []
	}
	async getReviewById(id: number): Promise<Review | undefined> {
		return undefined
	}
	async getReviewsByProviderId(providerId: number): Promise<Review[]> {
		return []
	}
	async getReviewsByClientId(clientId: number): Promise<Review[]> {
		return []
	}
	async createReview(review: InsertReview): Promise<Review> {
		return {} as Review
	}
	async updateReview(
		id: number,
		review: Partial<InsertReview>
	): Promise<Review> {
		return {} as Review
	}
	async deleteReview(id: number): Promise<void> {}

	async getFavorites(): Promise<any[]> {
		return []
	}
	async getFavoriteById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getFavoritesByClientId(clientId: number): Promise<any[]> {
		return []
	}
	async createFavorite(favorite: any): Promise<any> {
		return {} as any
	}
	async deleteFavorite(id: number): Promise<void> {}

	async getBlockedTimes(): Promise<BlockedTimeSlot[]> {
		return []
	}
	async getBlockedTimeById(id: number): Promise<BlockedTimeSlot | undefined> {
		return undefined
	}
	async getBlockedTimesByProviderId(
		providerId: number
	): Promise<BlockedTimeSlot[]> {
		return []
	}
  async getBlockedTimeSlotsByDate(
		providerId: number,
    date: string
	): Promise<BlockedTimeSlot[]> {
		return []
	}
	async createBlockedTime(
		BlockedTimeSlot: InsertBlockedTimeSlot
	): Promise<BlockedTimeSlot> {
		return {} as BlockedTimeSlot
	}
	async updateBlockedTime(
		id: number,
		BlockedTimeSlot: Partial<InsertBlockedTimeSlot>
	): Promise<BlockedTimeSlot> {
		return {} as BlockedTimeSlot
	}
	async deleteBlockedTime(id: number): Promise<void> {}

	async getTimeSlots(): Promise<ProviderBreak[]> {
		return []
	}
	async getTimeSlotById(id: number): Promise<ProviderBreak | undefined> {
		return undefined
	}
	async getTimeSlotsByProviderId(providerId: number): Promise<ProviderBreak[]> {
		return []
	}
	async createTimeSlot(timeSlot: InsertProviderBreak): Promise<ProviderBreak> {
		return {} as ProviderBreak
	}
	async updateTimeSlot(
		id: number,
		timeSlot: Partial<InsertProviderBreak>
	): Promise<ProviderBreak> {
		return {} as ProviderBreak
	}
	async deleteTimeSlot(id: number): Promise<void> {}

	async getUnavailableDays(): Promise<ProviderBreak[]> {
		return []
	}
	async getUnavailableDayById(
		id: number
	): Promise<ProviderBreak | undefined> {
		return undefined
	}
	async getUnavailableDaysByProviderId(
		providerId: number
	): Promise<ProviderBreak[]> {
		return []
	}
	async createUnavailableDay(
		unavailableDay: InsertProviderBreak
	): Promise<ProviderBreak> {
		return {} as ProviderBreak
	}
	async updateUnavailableDay(
		id: number,
		unavailableDay: Partial<InsertProviderBreak>
	): Promise<ProviderBreak> {
		return {} as ProviderBreak
	}
	async deleteUnavailableDay(id: number): Promise<void> {}

	async getRecurrentBlockedTimes(): Promise<BlockedTimeSlot[]> {
		return []
	}
	async getRecurrentBlockedTimeById(
		id: number
	): Promise<BlockedTimeSlot | undefined> {
		return undefined
	}
	async getRecurrentBlockedTimesByProviderId(
		providerId: number
	): Promise<BlockedTimeSlot[]> {
		return []
	}
	async createRecurrentBlockedTime(
		recurrentBlockedTime: InsertBlockedTimeSlot
	): Promise<BlockedTimeSlot> {
		return {} as BlockedTimeSlot
	}
	async updateRecurrentBlockedTime(
		id: number,
		recurrentBlockedTime: Partial<InsertBlockedTimeSlot>
	): Promise<BlockedTimeSlot> {
		return {} as BlockedTimeSlot
	}
	async deleteRecurrentBlockedTime(id: number): Promise<void> {}

	async getServiceTemplates(): Promise<ServiceTemplate[]> {
		return []
	}
	async getServiceTemplateById(
		id: number
	): Promise<ServiceTemplate | undefined> {
		return undefined
	}
	async getServiceTemplatesByCategoryId(
		categoryId: number
	): Promise<ServiceTemplate[]> {
		return []
	}
	async createServiceTemplate(
		serviceTemplate: InsertServiceTemplate
	): Promise<ServiceTemplate> {
		return {} as ServiceTemplate
	}
	async updateServiceTemplate(
		id: number,
		serviceTemplate: Partial<InsertServiceTemplate>
	): Promise<ServiceTemplate> {
		return {} as ServiceTemplate
	}
	async deleteServiceTemplate(id: number): Promise<void> {}

	async getNotifications(): Promise<Notification[]> {
		return []
	}
	async getNotificationById(id: number): Promise<Notification | undefined> {
		return undefined
	}
	async getNotificationsByUserId(userId: number): Promise<Notification[]> {
		return []
	}
	async createNotification(
		notification: InsertNotification
	): Promise<Notification> {
		return {} as Notification
	}
	async updateNotification(
		id: number,
		notification: Partial<InsertNotification>
	): Promise<Notification> {
		return {} as Notification
	}
	async deleteNotification(id: number): Promise<void> {}

	async getArticles(): Promise<any[]> {
		return []
	}
	async getArticleById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getArticlesByCategoryId(categoryId: number): Promise<any[]> {
		return []
	}
	async createArticle(article: any): Promise<any> {
		return {} as any
	}
	async updateArticle(
		id: number,
		article: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteArticle(id: number): Promise<void> {}

	async getArticleCategories(): Promise<any[]> {
		return []
	}
	async getArticleCategoryById(
		id: number
	): Promise<any | undefined> {
		return undefined
	}
	async createArticleCategory(
		articleCategory: any
	): Promise<any> {
		return {} as any
	}
	async updateArticleCategory(
		id: number,
		articleCategory: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteArticleCategory(id: number): Promise<void> {}

	async getCoupons(): Promise<any[]> {
		return []
	}
	async getCouponById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getCouponByCode(code: string): Promise<any | undefined> {
		return undefined
	}
	async createCoupon(coupon: any): Promise<any> {
		return {} as any
	}
	async updateCoupon(
		id: number,
		coupon: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteCoupon(id: number): Promise<void> {}

	async getHelpArticles(): Promise<any[]> {
		return []
	}
	async getHelpArticleById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getHelpArticlesByCategoryId(categoryId: number): Promise<any[]> {
		return []
	}
	async createHelpArticle(help: any): Promise<any> {
		return {} as any
	}
	async updateHelpArticle(id: number, help: Partial<any>): Promise<any> {
		return {} as any
	}
	async deleteHelpArticle(id: number): Promise<void> {}

	async getHelpCategories(): Promise<any[]> {
		return []
	}
	async getHelpCategoryById(id: number): Promise<any | undefined> {
		return undefined
	}
	async createHelpCategory(helpCategory: any): Promise<any> {
		return {} as any
	}
	async updateHelpCategory(
		id: number,
		helpCategory: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteHelpCategory(id: number): Promise<void> {}

	// Provider Settings methods
	async getProviderSettings(providerId: number): Promise<any> {
		return this.providerSettings.find(
			(settings) => settings.providerId === providerId
		)
	}

	async createProviderSettings(settings: any): Promise<any> {
		const newSettings = {
			id:
				this.providerSettings.length > 0
					? Math.max(...this.providerSettings.map((s) => s.id)) + 1
					: 1,
			providerId: settings.providerId,
			isOnline:
				settings.isOnline !== undefined ? settings.isOnline : false,
			businessName: settings.businessName || null,
			description: settings.description || null,
			acceptsCards:
				settings.acceptsCards !== undefined
					? settings.acceptsCards
					: true,
			acceptsPix:
				settings.acceptsPix !== undefined ? settings.acceptsPix : true,
			acceptsCash:
				settings.acceptsCash !== undefined
					? settings.acceptsCash
					: true,
			ratingCount: settings.ratingCount || 0,
			createdAt: new Date(),
		}
		this.providerSettings.push(newSettings)
		return newSettings
	}

	async updateProviderSettings(
		providerId: number,
		settings: any
	): Promise<any> {
		const existingSettings = await this.getProviderSettings(providerId)

		if (!existingSettings) {
			return this.createProviderSettings({
				providerId,
				...settings,
			})
		}

		const index = this.providerSettings.findIndex(
			(s) => s.providerId === providerId
		)
		if (index !== -1) {
			this.providerSettings[index] = {
				...this.providerSettings[index],
				...settings,
				updatedAt: new Date(),
			}
			return this.providerSettings[index]
		}

		return null
	}

	// Adiciona ou substitui todos os horários disponíveis de um provedor para uma data específica
	async setAvailabilityByDate(providerId: number, date: string, slots: { startTime: string, endTime: string }[]): Promise<void> {
		// Remove todas as disponibilidades existentes para a data
		const existing = await this.getAvailabilityByDate(providerId, date);
		if (Array.isArray(existing)) {
			for (const avail of existing) {
				await this.deleteAvailability(avail.id);
			}
		} else if (existing && existing.id) {
			await this.deleteAvailability(existing.id);
		}
		// Cria as novas disponibilidades
		for (const slot of slots) {
			await this.createAvailability({
				providerId,
				date,
				startTime: slot.startTime,
				endTime: slot.endTime,
				isAvailable: true,
				dayOfWeek: new Date(date).getDay(),
			});
		}
	}

	// Métodos para relatórios administrativos
	async getUsersCount(userType?: string): Promise<number> {
		try {
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
		} catch (error) {
			console.error('Erro ao contar usuários:', error);
			return 0;
		}
	}

	async getServicesCount(): Promise<number> {
		try {
			const result = await db
				.select({ count: count() })
				.from(services);
			return Number(result[0]?.count) || 0;
		} catch (error) {
			console.error('Erro ao contar serviços:', error);
			return 0;
		}
	}

	async getCategoriesCount(): Promise<number> {
		try {
			const result = await db
				.select({ count: count() })
				.from(categories);
			return Number(result[0]?.count) || 0;
		} catch (error) {
			console.error('Erro ao contar categorias:', error);
			return 0;
		}
	}

	async getAppointmentsCount(status?: string): Promise<number> {
		try {
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
		} catch (error) {
			console.error('Erro ao contar agendamentos:', error);
			return 0;
		}
	}

	async getRecentAppointments(limit: number): Promise<any[]> {
		try {
			const result = await db
				.select({
					id: appointments.id,
					date: appointments.date,
					startTime: appointments.startTime,
					endTime: appointments.endTime,
					status: appointments.status,
					totalPrice: appointments.totalPrice,
					clientId: appointments.clientId,
					providerId: appointments.providerId,
					serviceId: appointments.serviceId,
					createdAt: appointments.createdAt
				})
				.from(appointments)
				.orderBy(desc(appointments.createdAt))
				.limit(limit);
			
			return result;
		} catch (error) {
			console.error('Erro ao buscar agendamentos recentes:', error);
			return [];
		}
	}

	async getNewUsersByDay(startDate: Date, endDate: Date): Promise<{ date: string, count: number }[]> {
		try {
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
		} catch (error) {
			console.error('Erro ao buscar novos usuários por dia:', error);
			return [];
		}
	}

	async getAllAppointments(): Promise<Appointment[]> {
		return this.appointments;
	}

	// Support methods
	async createSupportMessage(data: { userId: number; subject: string; message: string }): Promise<SupportTicket> {
		try {
			// Criar o ticket de suporte
			const [ticket] = await db
				.insert(supportTickets)
				.values({
					userId: data.userId,
					subject: data.subject,
					status: "pending",
					category: "general",
					priority: "normal",
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			// Criar a primeira mensagem do ticket
			await db
				.insert(supportMessages)
				.values({
					ticketId: ticket.id,
					userId: data.userId,
					message: data.message,
					createdAt: new Date(),
					readByAdmin: false,
					readByUser: true,
				});

			return ticket;
		} catch (error) {
			console.error("Erro ao criar mensagem de suporte:", error);
			throw error;
		}
	}

	async getUserSupportMessages(userId: number): Promise<SupportTicket[]> {
		return await db
			.select()
			.from(supportTickets)
			.where(eq(supportTickets.userId, userId))
			.orderBy(desc(supportTickets.updatedAt));
	}

	async getSupportMessage(messageId: number): Promise<SupportTicket | undefined> {
		const [ticket] = await db
			.select()
			.from(supportTickets)
			.where(eq(supportTickets.id, messageId));
		return ticket;
	}

	async resolveSupportMessage(messageId: number, adminId: number, response: string): Promise<SupportMessage> {
		// Adicionar resposta do admin
		const [message] = await db
			.insert(supportMessages)
			.values({
				ticketId: messageId,
				adminId: adminId,
				message: response,
				createdAt: new Date(),
				readByAdmin: true,
				readByUser: false,
			})
			.returning();

		// Atualizar status do ticket
		await db
			.update(supportTickets)
			.set({
				status: "resolved",
				resolvedAt: new Date(),
				updatedAt: new Date(),
				adminId: adminId,
			})
			.where(eq(supportTickets.id, messageId));

		return message;
	}

	// Promotion methods
	async getPromotions(): Promise<Promotion[]> {
		return []
	}
	async getPromotionById(id: number): Promise<Promotion | undefined> {
		return undefined
	}
	async getActivePromotions(currentDate: Date): Promise<Promotion[]> {
		return []
	}
	async getApplicablePromotions(filters: {
		serviceId?: number
		providerId?: number
		categoryId?: number
		nicheId?: number
		currentDate: Date
	}): Promise<Promotion[]> {
		return []
	}
	async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
		return {} as Promotion
	}
	async updatePromotion(
		id: number,
		promotion: Partial<InsertPromotion>
	): Promise<Promotion> {
		return {} as Promotion
	}
	async deletePromotion(id: number): Promise<void> {}
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
	sessionStore: session.Store

	constructor() {
		// Use a simple memory store for sessions to avoid ESM issues
		this.sessionStore = new session.MemoryStore()
		console.log("PostgreSQL Session Store inicializado")
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
			defaultExpirationDays: 30,
		}
	}

	async saveFinancialSettings(settings: any): Promise<any> {
		// Implementação temporária - substituir com tabela real quando disponível
		return settings
	}

	// Provider Fee methods
	async getAllProviderFees(): Promise<ProviderServiceFee[]> {
		return await db
			.select()
			.from(providerServiceFees)
			.orderBy(desc(providerServiceFees.createdAt))
	}

	async getProviderFee(id: number): Promise<ProviderServiceFee | undefined> {
		const results = await db
			.select()
			.from(providerServiceFees)
			.where(eq(providerServiceFees.id, id))
		return results[0]
	}

	async getProviderFeeByProviderId(
		providerId: number
	): Promise<ProviderServiceFee | undefined> {
		const results = await db
			.select()
			.from(providerServiceFees)
			.where(
				and(
					eq(providerServiceFees.providerId, providerId),
					eq(providerServiceFees.isActive, true)
				)
			)
		return results[0]
	}

	async createProviderFee(
		fee: InsertProviderServiceFee
	): Promise<ProviderServiceFee> {
		const results = await db
			.insert(providerServiceFees)
			.values(fee)
			.returning()
		return results[0]
	}

	async updateProviderFee(
		id: number,
		fee: Partial<InsertProviderServiceFee>
	): Promise<ProviderServiceFee> {
		const results = await db
			.update(providerServiceFees)
			.set({
				...fee,
				updatedAt: new Date(),
			})
			.where(eq(providerServiceFees.id, id))
			.returning()
		return results[0]
	}

	async deleteProviderFee(id: number): Promise<void> {
		await db
			.delete(providerServiceFees)
			.where(eq(providerServiceFees.id, id))
	}

	async getAllProviders(): Promise<User[]> {
		return await db
			.select()
			.from(users)
			.where(eq(users.userType, "provider"))
	}

	// Implement all the remaining methods from IStorage interface
	// Add implementations as needed

	async getUsers(): Promise<User[]> {
		return await db.select().from(users)
	}

	async getUserById(id: number): Promise<User | undefined> {
		const results = await db.select().from(users).where(eq(users.id, id))
		return results[0]
	}

	async getUserByEmail(email: string): Promise<User | undefined> {
		const results = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
		return results[0]
	}

	// Alias para getUserById para manter compatibilidade (removido - duplicado)

	// Alias para getServicesByProvider para manter compatibilidade (removido - duplicado)

	// Alias para getProviderReviews para manter compatibilidade
	async getProviderReviews(providerId: number): Promise<Review[]> {
		return this.getReviewsByProviderId(providerId)
	}

	// Alias para getAvailabilitiesByProviderId para manter compatibilidade
	async getAvailabilitiesByProviderId(providerId: number): Promise<Availability[]> {
		return this.getAvailabilityByProviderId(providerId)
	}

	// Alias para getProviderAppointmentsByDate para manter compatibilidade
	async getProviderAppointmentsByDate(providerId: number, date: string): Promise<Appointment[]> {
		const appointments = await this.getAppointmentsByProviderId(providerId)
		return appointments.filter(app => app.date === date)
	}

	async getUsersByType(type: string): Promise<User[]> {
		return await db.select().from(users).where(eq(users.userType, type))
	}

	async createUser(user: InsertUser): Promise<User> {
		const results = await db.insert(users).values(user).returning()
		return results[0]
	}

	async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
		const results = await db
			.update(users)
			.set(user)
			.where(eq(users.id, id))
			.returning()
		return results[0]
	}

	async deleteUser(id: number): Promise<void> {
		await db.delete(users).where(eq(users.id, id))
	}

	// Add more implementations as needed for all the required methods

	async getServices(): Promise<Service[]> {
		return await db.select().from(services)
	}

	async getServiceById(id: number): Promise<Service | undefined> {
		const results = await db
			.select()
			.from(services)
			.where(eq(services.id, id))
		return results[0]
	}

	// Method alias for compatibility with existing code (removido - duplicado)

	async getServicesByCategoryId(categoryId: number): Promise<Service[]> {
		return await db
			.select()
			.from(services)
			.where(eq(services.categoryId, categoryId))
	}

	async createService(service: InsertService): Promise<Service> {
		const results = await db.insert(services).values(service).returning()
		return results[0]
	}

	async updateService(
		id: number,
		service: Partial<InsertService>
	): Promise<Service> {
		const results = await db
			.update(services)
			.set(service)
			.where(eq(services.id, id))
			.returning()
		return results[0]
	}

	async deleteService(id: number): Promise<void> {
		await db.delete(services).where(eq(services.id, id))
	}

	async getProviderServices(): Promise<ProviderService[]> {
		return await db.select().from(providerServices)
	}

	async getProviderServiceById(
		id: number
	): Promise<ProviderService | undefined> {
		const results = await db
			.select()
			.from(providerServices)
			.where(eq(providerServices.id, id))
		return results[0]
	}

	// Method alias for compatibility with existing code (removido - duplicado)

	// Method to get provider service by both provider and service IDs
	async getProviderServiceByProviderAndService(
		providerId: number,
		serviceId: number
	): Promise<ProviderService | undefined> {
		const results = await db
			.select()
			.from(providerServices)
			.where(
				and(
					eq(providerServices.providerId, providerId),
					eq(providerServices.serviceId, serviceId)
				)
			)
		return results[0]
	}

	// Method alias for compatibility with existing code
	async getProviderServiceByService(
		providerId: number,
		serviceId: number
	): Promise<ProviderService | undefined> {
		return this.getProviderServiceByProviderAndService(
			providerId,
			serviceId
		)
	}

	// Provider Settings methods (removido - duplicado)

	async getProviderServicesByProviderId(
		providerId: number
	): Promise<ProviderService[]> {
		return await db
			.select()
			.from(providerServices)
			.where(eq(providerServices.providerId, providerId))
	}

	async createProviderService(
		providerService: InsertProviderService
	): Promise<ProviderService> {
		const results = await db
			.insert(providerServices)
			.values(providerService)
			.returning()
		return results[0]
	}

	async updateProviderService(
		id: number,
		providerService: Partial<InsertProviderService>
	): Promise<ProviderService> {
		const results = await db
			.update(providerServices)
			.set(providerService)
			.where(eq(providerServices.id, id))
			.returning()
		return results[0]
	}

	async deleteProviderService(id: number): Promise<void> {
		await db.delete(providerServices).where(eq(providerServices.id, id))
	}

	// Additional methods for Service Templates
	async getServiceTemplates(): Promise<ServiceTemplate[]> {
		return await db.select().from(serviceTemplates)
	}

	async getServiceTemplateById(id: number): Promise<ServiceTemplate | undefined> {
		const results = await db
			.select()
			.from(serviceTemplates)
			.where(eq(serviceTemplates.id, id))
		return results[0]
	}

	// Method alias for compatibility with existing code (removido - duplicado)

	async getServiceTemplatesByCategoryId(
		categoryId: number
	): Promise<ServiceTemplate[]> {
		return await db
			.select()
			.from(serviceTemplates)
			.where(eq(serviceTemplates.categoryId, categoryId))
	}

	async createServiceTemplate(
		serviceTemplate: InsertServiceTemplate
	): Promise<ServiceTemplate> {
		const results = await db
			.insert(serviceTemplates)
			.values(serviceTemplate)
			.returning()
		return results[0]
	}

	async updateServiceTemplate(
		id: number,
		serviceTemplate: Partial<InsertServiceTemplate>
	): Promise<ServiceTemplate> {
		const results = await db
			.update(serviceTemplates)
			.set(serviceTemplate)
			.where(eq(serviceTemplates.id, id))
			.returning()
		return results[0]
	}

	async deleteServiceTemplate(id: number): Promise<void> {
		await db.delete(serviceTemplates).where(eq(serviceTemplates.id, id))
	}

	// Category and Niche methods
	async getNiches(): Promise<Niche[]> {
		return await db.select().from(niches)
	}

	async getNicheById(id: number): Promise<Niche | undefined> {
		const results = await db.select().from(niches).where(eq(niches.id, id))
		return results[0]
	}

	// Method alias for compatibility with existing code (removido - duplicado)

	async getNicheByName(name: string): Promise<Niche | undefined> {
		const results = await db
			.select()
			.from(niches)
			.where(eq(niches.name, name))
		return results[0]
	}

	async createNiche(niche: InsertNiche): Promise<Niche> {
		const results = await db.insert(niches).values(niche).returning()
		return results[0]
	}

	async updateNiche(id: number, niche: Partial<InsertNiche>): Promise<Niche> {
		const results = await db
			.update(niches)
			.set(niche)
			.where(eq(niches.id, id))
			.returning()
		return results[0]
	}

	async deleteNiche(id: number): Promise<void> {
		await db.delete(niches).where(eq(niches.id, id))
	}

	async getCategories(): Promise<Category[]> {
		return await db.select().from(categories)
	}

	async getCategoryById(id: number): Promise<Category | undefined> {
		const results = await db
			.select()
			.from(categories)
			.where(eq(categories.id, id))
		return results[0]
	}

	// Method alias for compatibility with existing code (removido - duplicado)

	async getCategoriesByNicheId(nicheId: number): Promise<Category[]> {
		return await db
			.select()
			.from(categories)
			.where(eq(categories.nicheId, nicheId))
	}

	async createCategory(category: InsertCategory): Promise<Category> {
		const results = await db.insert(categories).values(category).returning()
		return results[0]
	}

	async updateCategory(
		id: number,
		category: Partial<InsertCategory>
	): Promise<Category> {
		const results = await db
			.update(categories)
			.set(category)
			.where(eq(categories.id, id))
			.returning()
		return results[0]
	}

	async deleteCategory(id: number): Promise<void> {
		await db.delete(categories).where(eq(categories.id, id))
	}

	// Method to get all niches with their categories and services
	async getNichesWithCategoriesAndServices(): Promise<any[]> {
		try {
			// 1. Get all niches
			const nichesResult = await db.select().from(niches)

			// 2. Get all categories
			const categoriesResult = await db.select().from(categories)

			// 3. Get all services
			const servicesResult = await db.select().from(services)

			// 4. Build the hierarchical structure
			const result = nichesResult.map((niche) => {
				// Find categories for this niche
				const nicheCategories = categoriesResult.filter(
					(category) => category.nicheId === niche.id
				)

				// Build the categories with their services
				const categoriesWithServices = nicheCategories.map(
					(category) => {
						// Find services for this category
						const categoryServices = servicesResult.filter(
							(service) => service.categoryId === category.id
						)

						return {
							...category,
							services: categoryServices,
						}
					}
				)

				// Return the niche with its categories and services
				return {
					...niche,
					categories: categoriesWithServices,
				}
			})

			return result
		} catch (error) {
			console.error("Error in getNichesWithCategoriesAndServices:", error)
			return []
		}
	}

	// Time slot methods - using ProviderBreak instead of TimeSlot
	async getTimeSlots(): Promise<ProviderBreak[]> {
		try {
			const blockedSlots = await db.select().from(blockedTimeSlots)
			return blockedSlots.map(slot => ({
				id: slot.id,
				providerId: slot.providerId,
				name: slot.reason || "Horário bloqueado",
				dayOfWeek: new Date(slot.date || '').getDay(),
				startTime: slot.startTime,
				endTime: slot.endTime,
				isRecurring: false,
				date: slot.date,
				createdAt: slot.createdAt || new Date()
			}))
		} catch (error) {
			console.error('Erro ao buscar time slots:', error)
			return []
		}
	}

	async getTimeSlotById(id: number): Promise<ProviderBreak | undefined> {
		try {
			const results = await db
				.select()
				.from(blockedTimeSlots)
				.where(eq(blockedTimeSlots.id, id))
			
			if (results[0]) {
				const slot = results[0]
				return {
					id: slot.id,
					providerId: slot.providerId,
					name: slot.reason || "Horário bloqueado",
					dayOfWeek: new Date(slot.date || '').getDay(),
					startTime: slot.startTime,
					endTime: slot.endTime,
					isRecurring: false,
					date: slot.date,
					createdAt: slot.createdAt || new Date()
				}
			}
			return undefined
		} catch (error) {
			console.error('Erro ao buscar time slot:', error)
			return undefined
		}
	}

	async getTimeSlotsByProviderId(providerId: number): Promise<ProviderBreak[]> {
		// Como a tabela provider_breaks não existe, retornamos um array vazio
		// ou podemos usar blockedTimeSlots como alternativa
		try {
			const blockedSlots = await db
				.select()
				.from(blockedTimeSlots)
				.where(eq(blockedTimeSlots.providerId, providerId))
			
			// Converter BlockedTimeSlot para ProviderBreak para manter compatibilidade
			return blockedSlots.map(slot => ({
				id: slot.id,
				providerId: slot.providerId,
				name: slot.reason || "Horário bloqueado",
				dayOfWeek: new Date(slot.date || '').getDay(),
				startTime: slot.startTime,
				endTime: slot.endTime,
				isRecurring: false,
				date: slot.date,
				createdAt: slot.createdAt || new Date()
			}))
		} catch (error) {
			console.error('Erro ao buscar time slots:', error)
			return []
		}
	}

	async createTimeSlot(timeSlot: InsertProviderBreak): Promise<ProviderBreak> {
		// Como a tabela provider_breaks não existe, retornamos um mock
		console.warn('createTimeSlot: Tabela provider_breaks não existe, retornando mock')
		return {
			id: 1,
			providerId: timeSlot.providerId,
			name: timeSlot.name,
			dayOfWeek: timeSlot.dayOfWeek,
			startTime: timeSlot.startTime,
			endTime: timeSlot.endTime,
			isRecurring: timeSlot.isRecurring || false,
			date: timeSlot.date || null,
			createdAt: new Date()
		}
	}

	async updateTimeSlot(
		id: number,
		timeSlot: Partial<InsertProviderBreak>
	): Promise<ProviderBreak> {
		// Como a tabela provider_breaks não existe, retornamos um mock
		console.warn('updateTimeSlot: Tabela provider_breaks não existe, retornando mock')
		return {
			id,
			providerId: timeSlot.providerId || 1,
			name: timeSlot.name || "Horário bloqueado",
			dayOfWeek: timeSlot.dayOfWeek || 0,
			startTime: timeSlot.startTime || "00:00",
			endTime: timeSlot.endTime || "00:00",
			isRecurring: timeSlot.isRecurring || false,
			date: timeSlot.date || null,
			createdAt: new Date()
		}
	}

	async deleteTimeSlot(id: number): Promise<void> {
		// Como a tabela provider_breaks não existe, apenas logamos
		console.warn('deleteTimeSlot: Tabela provider_breaks não existe, operação ignorada')
	}

	// Appointment methods
	async getAppointments(): Promise<Appointment[]> {
		return await db.select().from(appointments)
	}

	async getAppointmentById(id: number): Promise<Appointment | undefined> {
		const results = await db
			.select()
			.from(appointments)
			.where(eq(appointments.id, id))
		return results[0]
	}

	async getAppointmentsByProviderId(
		providerId: number
	): Promise<Appointment[]> {
		return await db
			.select()
			.from(appointments)
			.where(eq(appointments.providerId, providerId))
	}

	async getAppointmentsByClientId(clientId: number): Promise<Appointment[]> {
		return await db
			.select()
			.from(appointments)
			.where(eq(appointments.clientId, clientId))
	}

	async getClientAppointments(clientId: number): Promise<Appointment[]> {
		return await db
			.select({
				id: appointments.id,
				clientId: appointments.clientId,
				providerId: appointments.providerId,
				serviceId: appointments.serviceId,
				date: appointments.date,
				startTime: appointments.startTime,
				endTime: appointments.endTime,
				status: appointments.status,
				notes: appointments.notes,
				totalPrice: appointments.totalPrice,
				createdAt: appointments.createdAt,
				// Informações do prestador
				providerName: users.name,
				providerPhone: users.phone,
				// Informações do serviço
				serviceName: services.name,
				serviceDescription: services.description
			})
			.from(appointments)
			.leftJoin(users, eq(appointments.providerId, users.id))
			.leftJoin(services, eq(appointments.serviceId, services.id))
			.where(eq(appointments.clientId, clientId))
			.orderBy(desc(appointments.createdAt))
	}

	async getProviderClients(providerId: number): Promise<{ id: number, name: string, email: string }[]> {
		const clientAppointments = await db
			.select({
				clientId: appointments.clientId,
				clientName: appointments.clientName,
				clientEmail: users.email
			})
			.from(appointments)
			.leftJoin(users, eq(appointments.clientId, users.id))
			.where(eq(appointments.providerId, providerId))
			.groupBy(appointments.clientId, appointments.clientName, users.email)

		return clientAppointments.map(app => ({
			id: app.clientId,
			name: app.clientName || 'Cliente',
			email: app.clientEmail || ''
		}))
	}

	async createAppointment(
		appointment: InsertAppointment
	): Promise<Appointment> {
		const results = await db
			.insert(appointments)
			.values(appointment)
			.returning()
		return results[0]
	}

	async updateAppointment(
		id: number,
		appointment: Partial<InsertAppointment>
	): Promise<Appointment> {
		const results = await db
			.update(appointments)
			.set(appointment)
			.where(eq(appointments.id, id))
			.returning()
		return results[0]
	}

	async deleteAppointment(id: number): Promise<void> {
		await db.delete(appointments).where(eq(appointments.id, id))
	}

	// Availability methods
	async getAvailabilities(): Promise<Availability[]> {
		return await db.select().from(availabilityTable)
	}

	async getAvailabilityById(id: number): Promise<Availability | undefined> {
		const results = await db
			.select()
			.from(availabilityTable)
			.where(eq(availabilityTable.id, id))
		return results[0]
	}

	async getAvailabilityByProviderId(
		providerId: number
	): Promise<Availability[]> {
		return await db
			.select()
			.from(availabilityTable)
			.where(eq(availabilityTable.providerId, providerId))
	}

	async getAvailabilityByDay(
		providerId: number,
		dayOfWeek: number
	): Promise<Availability | undefined> {
		const results = await db
			.select()
			.from(availabilityTable)
			.where(
				and(
					eq(availabilityTable.providerId, providerId),
					eq(availabilityTable.dayOfWeek, dayOfWeek)
				)
			)
		return results[0]
	}

	async getAvailabilityByDate(
		providerId: number,
		date: string
	): Promise<Availability | undefined> {
		const results = await db
			.select()
			.from(availabilityTable)
			.where(
				and(
					eq(availabilityTable.providerId, providerId),
					eq(availabilityTable.date, date)
				)
			)
		return results[0]
	}

	async createAvailability(
		availability: InsertAvailability
	): Promise<Availability> {
		const results = await db
			.insert(availabilityTable)
			.values(availability)
			.returning()
		return results[0]
	}

	async updateAvailability(
		id: number,
		availability: Partial<InsertAvailability>
	): Promise<Availability> {
		const results = await db
			.update(availabilityTable)
			.set(availability)
			.where(eq(availabilityTable.id, id))
			.returning()
		return results[0]
	}

	async deleteAvailability(id: number): Promise<void> {
		await db.delete(availabilityTable).where(eq(availabilityTable.id, id))
	}

	// Blocked time methods
	async getBlockedTimes(): Promise<BlockedTimeSlot[]> {
		return await db.select().from(blockedTimeSlots)
	}

	async getBlockedTimeById(id: number): Promise<BlockedTimeSlot | undefined> {
		const results = await db
			.select()
			.from(blockedTimeSlots)
			.where(eq(blockedTimeSlots.id, id))
		return results[0]
	}

	async getBlockedTimesByProviderId(
		providerId: number
	): Promise<BlockedTimeSlot[]> {
		return await db
			.select()
			.from(blockedTimeSlots)
			.where(eq(blockedTimeSlots.providerId, providerId))
	}
async getBlockedTimeSlotsByDate(
		providerId: number,
    date: string
	): Promise<BlockedTimeSlot[]> {
		return await db
			.select()
			.from(blockedTimeSlots)
			.where(and(eq(blockedTimeSlots.date, date), eq(blockedTimeSlots.providerId, providerId)))
	}
	async createBlockedTime(
		BlockedTimeSlot: InsertBlockedTimeSlot
	): Promise<BlockedTimeSlot> {
		const results = await db
			.insert(blockedTimeSlots)
			.values(BlockedTimeSlot)
			.returning()
		return results[0]
	}

	async updateBlockedTime(
		id: number,
		BlockedTimeSlot: Partial<InsertBlockedTimeSlot>
	): Promise<BlockedTimeSlot> {
		const results = await db
			.update(blockedTimeSlots)
			.set(BlockedTimeSlot)
			.where(eq(blockedTimeSlots.id, id))
			.returning()
		return results[0]
	}

	async deleteBlockedTime(id: number): Promise<void> {
		await db.delete(blockedTimeSlots).where(eq(blockedTimeSlots.id, id))
	}

	// Schedule methods
	async getSchedules(): Promise<any[]> {
		return []
	}

	async getScheduleById(id: number): Promise<any | undefined> {
		return undefined
	}

	async getSchedulesByProviderId(providerId: number): Promise<any[]> {
		return []
	}

	async createSchedule(schedule: any): Promise<any> {
		return schedule
	}

	async updateSchedule(
		id: number,
		schedule: Partial<any>
	): Promise<any> {
		return schedule
	}

	async deleteSchedule(id: number): Promise<void> {}

	// Add remaining methods implementations as needed

	// Helper method stubs for required interface methods
	async getReviews(): Promise<Review[]> {
		return await db.select().from(reviews)
	}

	async getReviewById(id: number): Promise<Review | undefined> {
		const results = await db
			.select()
			.from(reviews)
			.where(eq(reviews.id, id))
		return results[0]
	}

	async getReviewsByProviderId(providerId: number): Promise<Review[]> {
		return await db
			.select()
			.from(reviews)
			.where(eq(reviews.providerId, providerId))
	}

	async getReviewsByClientId(clientId: number): Promise<Review[]> {
		return await db
			.select()
			.from(reviews)
			.where(eq(reviews.clientId, clientId))
	}

	async createReview(review: InsertReview): Promise<Review> {
		const results = await db.insert(reviews).values(review).returning()
		return results[0]
	}

	async updateReview(
		id: number,
		review: Partial<InsertReview>
	): Promise<Review> {
		const results = await db
			.update(reviews)
			.set(review)
			.where(eq(reviews.id, id))
			.returning()
		return results[0]
	}

	async deleteReview(id: number): Promise<void> {
		await db.delete(reviews).where(eq(reviews.id, id))
	}

	// Favorite methods
	async getFavorites(): Promise<any[]> {
		return []
	}

	async getFavoriteById(id: number): Promise<any | undefined> {
		return undefined
	}

	async getFavoritesByClientId(clientId: number): Promise<any[]> {
		return []
	}

	async createFavorite(favorite: any): Promise<any> {
		return favorite
	}

	async deleteFavorite(id: number): Promise<void> {}

	// Unavailable day methods
	async getUnavailableDays(): Promise<ProviderBreak[]> {
		return await db.select().from(providerBreaks)
	}

	async getUnavailableDayById(
		id: number
	): Promise<ProviderBreak | undefined> {
		const results = await db
			.select()
			.from(providerBreaks)
			.where(eq(providerBreaks.id, id))
		return results[0]
	}

	async getUnavailableDaysByProviderId(
		providerId: number
	): Promise<ProviderBreak[]> {
		return await db
			.select()
			.from(providerBreaks)
			.where(eq(providerBreaks.providerId, providerId))
	}

	async createUnavailableDay(
		unavailableDay: InsertProviderBreak
	): Promise<ProviderBreak> {
		const results = await db
			.insert(providerBreaks)
			.values(unavailableDay)
			.returning()
		return results[0]
	}

	async updateUnavailableDay(
		id: number,
		unavailableDay: Partial<InsertProviderBreak>
	): Promise<ProviderBreak> {
		const results = await db
			.update(providerBreaks)
			.set(unavailableDay)
			.where(eq(providerBreaks.id, id))
			.returning()
		return results[0]
	}

	async deleteUnavailableDay(id: number): Promise<void> {
		await db.delete(providerBreaks).where(eq(providerBreaks.id, id))
	}

	// Recurrent blocked time methods
	async getRecurrentBlockedTimes(): Promise<BlockedTimeSlot[]> {
		return await db.select().from(blockedTimeSlots)
	}

	async getRecurrentBlockedTimeById(
		id: number
	): Promise<BlockedTimeSlot | undefined> {
		const results = await db
			.select()
			.from(blockedTimeSlots)
			.where(eq(blockedTimeSlots.id, id))
		return results[0]
	}

	async getRecurrentBlockedTimesByProviderId(
		providerId: number
	): Promise<BlockedTimeSlot[]> {
		return await db
			.select()
			.from(blockedTimeSlots)
			.where(eq(blockedTimeSlots.providerId, providerId))
	}

	async createRecurrentBlockedTime(
		recurrentBlockedTime: InsertBlockedTimeSlot
	): Promise<BlockedTimeSlot> {
		const results = await db
			.insert(blockedTimeSlots)
			.values(recurrentBlockedTime)
			.returning()
		return results[0]
	}

	async updateRecurrentBlockedTime(
		id: number,
		recurrentBlockedTime: Partial<InsertBlockedTimeSlot>
	): Promise<BlockedTimeSlot> {
		const results = await db
			.update(blockedTimeSlots)
			.set(recurrentBlockedTime)
			.where(eq(blockedTimeSlots.id, id))
			.returning()
		return results[0]
	}

	async deleteRecurrentBlockedTime(id: number): Promise<void> {
		await db
			.delete(blockedTimeSlots)
			.where(eq(blockedTimeSlots.id, id))
	}

	// Notification methods
	async getNotifications(): Promise<Notification[]> {
		return await db.select().from(notifications)
	}

	async getNotificationById(id: number): Promise<Notification | undefined> {
		const results = await db
			.select()
			.from(notifications)
			.where(eq(notifications.id, id))
		return results[0]
	}

	async getNotificationsByUserId(userId: number): Promise<Notification[]> {
		return await db
			.select()
			.from(notifications)
			.where(eq(notifications.userId, userId))
	}

	async createNotification(
		notification: InsertNotification
	): Promise<Notification> {
		const results = await db
			.insert(notifications)
			.values(notification)
			.returning()
		return results[0]
	}

	async updateNotification(
		id: number,
		notification: Partial<InsertNotification>
	): Promise<Notification> {
		const results = await db
			.update(notifications)
			.set(notification)
			.where(eq(notifications.id, id))
			.returning()
		return results[0]
	}

	async deleteNotification(id: number): Promise<void> {
		await db.delete(notifications).where(eq(notifications.id, id))
	}

	// Article methods
	async getArticles(): Promise<any[]> {
		return []
	}
	async getArticleById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getArticlesByCategoryId(categoryId: number): Promise<any[]> {
		return []
	}
	async createArticle(article: any): Promise<any> {
		return {} as any
	}
	async updateArticle(
		id: number,
		article: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteArticle(id: number): Promise<void> {}

	async getArticleCategories(): Promise<any[]> {
		return []
	}
	async getArticleCategoryById(
		id: number
	): Promise<any | undefined> {
		return undefined
	}
	async createArticleCategory(
		articleCategory: any
	): Promise<any> {
		return {} as any
	}
	async updateArticleCategory(
		id: number,
		articleCategory: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteArticleCategory(id: number): Promise<void> {}

	async getCoupons(): Promise<any[]> {
		return []
	}
	async getCouponById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getCouponByCode(code: string): Promise<any | undefined> {
		return undefined
	}
	async createCoupon(coupon: any): Promise<any> {
		return {} as any
	}
	async updateCoupon(
		id: number,
		coupon: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteCoupon(id: number): Promise<void> {}

	async getHelpArticles(): Promise<any[]> {
		return []
	}
	async getHelpArticleById(id: number): Promise<any | undefined> {
		return undefined
	}
	async getHelpArticlesByCategoryId(categoryId: number): Promise<any[]> {
		return []
	}
	async createHelpArticle(help: any): Promise<any> {
		return {} as any
	}
	async updateHelpArticle(id: number, help: Partial<any>): Promise<any> {
		return {} as any
	}
	async deleteHelpArticle(id: number): Promise<void> {}

	async getHelpCategories(): Promise<any[]> {
		return []
	}
	async getHelpCategoryById(id: number): Promise<any | undefined> {
		return undefined
	}
	async createHelpCategory(helpCategory: any): Promise<any> {
		return {} as any
	}
	async updateHelpCategory(
		id: number,
		helpCategory: Partial<any>
	): Promise<any> {
		return {} as any
	}
	async deleteHelpCategory(id: number): Promise<void> {}

	// Provider Settings methods (implementação correta para DatabaseStorage)
	async getProviderSettings(providerId: number): Promise<any> {
		try {
			const results = await db
				.select()
				.from(providerSettings)
				.where(eq(providerSettings.providerId, providerId))
			return results[0] || null
		} catch (error) {
			console.error('Erro ao buscar configurações do provider:', error)
			return null
		}
	}

	async createProviderSettings(settings: any): Promise<any> {
		try {
			const results = await db
				.insert(providerSettings)
				.values(settings)
				.returning()
			return results[0]
		} catch (error) {
			console.error('Erro ao criar configurações do provider:', error)
			throw error
		}
	}

	async updateProviderSettings(
		providerId: number,
		settings: any
	): Promise<any> {
		try {
			const existingSettings = await this.getProviderSettings(providerId)

			if (!existingSettings) {
				return this.createProviderSettings({
					providerId,
					...settings,
				})
			}

			const results = await db
				.update(providerSettings)
				.set({
					...settings,
					updatedAt: new Date(),
				})
				.where(eq(providerSettings.providerId, providerId))
				.returning()
			return results[0]
		} catch (error) {
			console.error('Erro ao atualizar configurações do provider:', error)
			throw error
		}
	}

	// Adiciona ou substitui todos os horários disponíveis de um provedor para uma data específica
	async setAvailabilityByDate(providerId: number, date: string, slots: { startTime: string, endTime: string }[]): Promise<void> {
		// Remove todas as disponibilidades existentes para a data
		const existing = await this.getAvailabilityByDate(providerId, date);
		if (Array.isArray(existing)) {
			for (const avail of existing) {
				await this.deleteAvailability(avail.id);
			}
		} else if (existing && existing.id) {
			await this.deleteAvailability(existing.id);
		}
		// Cria as novas disponibilidades
		for (const slot of slots) {
			await this.createAvailability({
				providerId,
				date,
				startTime: slot.startTime,
				endTime: slot.endTime,
				isAvailable: true,
				dayOfWeek: new Date(date).getDay(),
			});
		}
	}

	// Métodos para relatórios administrativos
	async getUsersCount(userType?: string): Promise<number> {
		try {
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
		} catch (error) {
			console.error('Erro ao contar usuários:', error);
			return 0;
		}
	}

	async getServicesCount(): Promise<number> {
		try {
			const result = await db
				.select({ count: count() })
				.from(services);
			return Number(result[0]?.count) || 0;
		} catch (error) {
			console.error('Erro ao contar serviços:', error);
			return 0;
		}
	}

	async getCategoriesCount(): Promise<number> {
		try {
			const result = await db
				.select({ count: count() })
				.from(categories);
			return Number(result[0]?.count) || 0;
		} catch (error) {
			console.error('Erro ao contar categorias:', error);
			return 0;
		}
	}

	async getAppointmentsCount(status?: string): Promise<number> {
		try {
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
		} catch (error) {
			console.error('Erro ao contar agendamentos:', error);
			return 0;
		}
	}

	async getRecentAppointments(limit: number): Promise<any[]> {
		try {
			const result = await db
				.select({
					id: appointments.id,
					date: appointments.date,
					startTime: appointments.startTime,
					endTime: appointments.endTime,
					status: appointments.status,
					totalPrice: appointments.totalPrice,
					clientId: appointments.clientId,
					providerId: appointments.providerId,
					serviceId: appointments.serviceId,
					createdAt: appointments.createdAt
				})
				.from(appointments)
				.orderBy(desc(appointments.createdAt))
				.limit(limit);
			
			return result;
		} catch (error) {
			console.error('Erro ao buscar agendamentos recentes:', error);
			return [];
		}
	}

	async getNewUsersByDay(startDate: Date, endDate: Date): Promise<{ date: string, count: number }[]> {
		try {
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
		} catch (error) {
			console.error('Erro ao buscar novos usuários por dia:', error);
			return [];
		}
	}

	async getAllAppointments(): Promise<Appointment[]> {
		try {
			return await db
				.select()
				.from(appointments)
				.orderBy(desc(appointments.createdAt));
		} catch (error) {
			console.error('Erro ao buscar todos os agendamentos:', error);
			return [];
		}
	}

	// Alias para getAppointmentById para manter compatibilidade
	async getAppointment(id: number): Promise<Appointment | undefined> {
		return this.getAppointmentById(id);
	}

	// Alias para getServiceById para manter compatibilidade
	async getService(id: number): Promise<Service | undefined> {
		return this.getServiceById(id);
	}

	// Alias para getUserById para manter compatibilidade (providers são usuários)
	async getProvider(id: number): Promise<User | undefined> {
		const user = await this.getUserById(id);
		if (user && user.userType === 'provider') {
			return user;
		}
		return undefined;
	}

	// Alias para getNicheById para manter compatibilidade
	async getNiche(id: number): Promise<Niche | undefined> {
		return this.getNicheById(id);
	}

	// Alias para getCategoryById para manter compatibilidade
	async getCategory(id: number): Promise<Category | undefined> {
		return this.getCategoryById(id);
	}

	// Alias para getServiceTemplateById para manter compatibilidade
	async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
		return this.getServiceTemplateById(id);
	}

	// Alias para getProviderServiceById para manter compatibilidade
	async getProviderService(id: number): Promise<ProviderService | undefined> {
		return this.getProviderServiceById(id);
	}

	// Alias para getAppointmentsByProviderId para manter compatibilidade
	async getProviderAppointments(providerId: number): Promise<Appointment[]> {
		return this.getAppointmentsByProviderId(providerId);
	}

	// Alias para getProviderServicesByProviderId para manter compatibilidade
	async getServicesByProvider(providerId: number): Promise<ProviderService[]> {
		return this.getProviderServicesByProviderId(providerId);
	}

	// Alias para getServicesByCategoryId para manter compatibilidade
	async getServicesByCategory(categoryId: number): Promise<Service[]> {
		return this.getServicesByCategoryId(categoryId);
	}

	// Alias para getUsers para manter compatibilidade
	async getAllUsers(): Promise<User[]> {
		return this.getUsers();
	}

	// Alias para getServiceTemplates para manter compatibilidade
	async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
		return this.getServiceTemplates();
	}

	// Alias para getAllProviderFees para manter compatibilidade (removido - recursão infinita)

	// Alias para getUsersByType("provider") para manter compatibilidade (removido - duplicado)

	// Alias para getReviews para manter compatibilidade
	async getAllReviews(): Promise<Review[]> {
		return this.getReviews();
	}

	// Alias para getProviderServices para manter compatibilidade
	async getAllProviderServices(): Promise<ProviderService[]> {
		return this.getProviderServices();
	}

	// Support methods
	async createSupportMessage(data: { userId: number; subject: string; message: string }): Promise<SupportTicket> {
		try {
			// Criar o ticket de suporte
			const [ticket] = await db
				.insert(supportTickets)
				.values({
					userId: data.userId,
					subject: data.subject,
					status: "pending",
					category: "general",
					priority: "normal",
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			// Criar a primeira mensagem do ticket
			await db
				.insert(supportMessages)
				.values({
					ticketId: ticket.id,
					userId: data.userId,
					message: data.message,
					createdAt: new Date(),
					readByAdmin: false,
					readByUser: true,
				});

			return ticket;
		} catch (error) {
			console.error("Erro ao criar mensagem de suporte:", error);
			throw error;
		}
	}

	async getUserSupportMessages(userId: number): Promise<SupportTicket[]> {
		return await db
			.select()
			.from(supportTickets)
			.where(eq(supportTickets.userId, userId))
			.orderBy(desc(supportTickets.updatedAt));
	}

	async getSupportMessage(messageId: number): Promise<SupportTicket | undefined> {
		const [ticket] = await db
			.select()
			.from(supportTickets)
			.where(eq(supportTickets.id, messageId));
		return ticket;
	}

	async resolveSupportMessage(messageId: number, adminId: number, response: string): Promise<SupportMessage> {
		// Adicionar resposta do admin
		const [message] = await db
			.insert(supportMessages)
			.values({
				ticketId: messageId,
				adminId: adminId,
				message: response,
				createdAt: new Date(),
				readByAdmin: true,
				readByUser: false,
			})
			.returning();

		// Atualizar status do ticket
		await db
			.update(supportTickets)
			.set({
				status: "resolved",
				resolvedAt: new Date(),
				updatedAt: new Date(),
				adminId: adminId,
			})
			.where(eq(supportTickets.id, messageId));

		return message;
	}

	// Promotion methods
	async getPromotions(): Promise<Promotion[]> {
		return []
	}
	async getPromotionById(id: number): Promise<Promotion | undefined> {
		return undefined
	}
	async getActivePromotions(currentDate: Date): Promise<Promotion[]> {
		return []
	}
	async getApplicablePromotions(filters: {
		serviceId?: number
		providerId?: number
		categoryId?: number
		nicheId?: number
		currentDate: Date
	}): Promise<Promotion[]> {
		return []
	}
	async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
		return {} as Promotion
	}
	async updatePromotion(
		id: number,
		promotion: Partial<InsertPromotion>
	): Promise<Promotion> {
		return {} as Promotion
	}
	async deletePromotion(id: number): Promise<void> {}

	// Alias para getUserById para manter compatibilidade
	async getUser(id: number): Promise<User | undefined> {
		return this.getUserById(id)
	}

	// Métodos auxiliares para generateTimeSlots
	private timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(':').map(Number)
		return hours * 60 + minutes
	}

	private minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
	}

	private generateFreeBlocks(slotStartMinutes: number, slotEndMinutes: number, occupiedPeriods: any[]): { start: number, end: number }[] {
		const freeBlocks: { start: number, end: number }[] = []
		let currentTime = slotStartMinutes

		for (const period of occupiedPeriods) {
			if (currentTime < period.start) {
				freeBlocks.push({
					start: currentTime,
					end: period.start
				})
			}
			currentTime = Math.max(currentTime, period.end)
		}

		if (currentTime < slotEndMinutes) {
			freeBlocks.push({
				start: currentTime,
				end: slotEndMinutes
			})
		}

		return freeBlocks
	}

	private generatePreferredStartTimes(block: { start: number, end: number }, serviceDuration: number): number[] {
		const startTimes: number[] = []
		const interval = 30 // Intervalo padrão de 30 minutos
		let currentTime = block.start

		while (currentTime + serviceDuration <= block.end) {
			startTimes.push(currentTime)
			currentTime += interval
		}

		return startTimes
	}

	async generateTimeSlots(providerId: number, date: string, serviceId?: number): Promise<{ startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number, serviceDuration?: number }[]> {
		try {
			console.log(`[generateTimeSlots] Início para prestador ${providerId} na data ${date}${serviceId ? ` e serviço ${serviceId}` : ''}`)
			
			// 1. Buscar disponibilidades do prestador para a data específica
			let availabilitySlots = await this.getAvailabilityByDate(providerId, date)
			console.log(`[generateTimeSlots] Disponibilidades encontradas: ${availabilitySlots ? 1 : 0}`)
			
			// Se não há disponibilidade, criar slots padrão
			if (!availabilitySlots) {
				console.log(`[generateTimeSlots] Nenhuma disponibilidade encontrada. Criando disponibilidade padrão.`)
				
				// Determinar o dia da semana para a data solicitada
				const dateObj = new Date(date)
				const dayOfWeek = dateObj.getDay() // 0 = domingo, 1 = segunda, ...
				
				// Não criar disponibilidade para domingo (0)
				if (dayOfWeek === 0) {
					console.log(`[generateTimeSlots] Domingo não tem disponibilidade padrão.`)
					return []
				}
				
				// Verificar se é um dia de semana ou sábado
				const isWeekend = dayOfWeek === 6 // Sábado
				
				// Definir horários padrão
				const startTime = "08:00"
				const endTime = isWeekend ? "12:00" : "18:00"
				
				try {
					// Criar nova disponibilidade padrão no banco de dados
					const newAvailability = await this.createAvailability({
						providerId,
						dayOfWeek,
						date: null, // Disponibilidade recorrente para este dia da semana
						startTime,
						endTime,
						isAvailable: true,
						intervalMinutes: 30 // Intervalo padrão entre agendamentos
					})
					
					console.log(`[generateTimeSlots] Criada disponibilidade padrão para dia ${dayOfWeek}: ${startTime}-${endTime}`)
					
					// Usar a nova disponibilidade
					availabilitySlots = newAvailability
				} catch (error) {
					console.error(`[generateTimeSlots] Erro ao criar disponibilidade padrão:`, error)
					return []
				}
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
				)
			
			// Ordenar os agendamentos pelo horário de início
			existingAppointments.sort((a, b) => 
				this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
			)
			
			console.log(`[generateTimeSlots] Agendamentos existentes: ${existingAppointments.length}`)

			// 3. Buscar blocos de tempo bloqueados para esta data (ex: horário de almoço, pausas)
			const blockedSlots = await this.getBlockedTimeSlotsByDate(providerId, date)
			console.log(`[generateTimeSlots] Blocos de tempo bloqueados: ${blockedSlots.length}`)
			
			// 4. Se um serviço específico foi solicitado, obter sua duração real
			let serviceDuration = 0
			if (serviceId) {
				// Primeiro verificamos se existe uma personalização de tempo para este serviço/prestador
				const providerService = await this.getProviderServiceByProviderAndService(providerId, serviceId)
				
				if (providerService && providerService.executionTime) {
					serviceDuration = providerService.executionTime
					console.log(`[generateTimeSlots] Usando tempo de execução personalizado: ${serviceDuration} minutos`)
				} else {
					// Se não houver personalização, usamos a duração padrão do serviço
					const service = await this.getService(serviceId)
					if (service) {
						serviceDuration = service.duration || 60 // Fallback para 60 minutos se não houver duração definida
						console.log(`[generateTimeSlots] Usando tempo de execução padrão: ${serviceDuration} minutos`)
					}
				}
			} else {
				// Se nenhum serviço for especificado, usar a duração padrão do provedor
				const settings = await this.getProviderSettings(providerId)
				serviceDuration = settings?.defaultServiceDuration || 60 // Fallback para 60 minutos
				console.log(`[generateTimeSlots] Usando duração padrão do prestador: ${serviceDuration} minutos`)
			}
			
			// 5. Criar array para armazenar todos os slots de tempo gerados
			const timeSlots: { startTime: string, endTime: string, isAvailable: boolean, availabilityId?: number, serviceDuration?: number, reason?: string }[] = []
			
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
			].sort((a, b) => a.start - b.start)

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
					})
				}
			}
			
			// 8. Para cada slot de disponibilidade, gerar os horários livres
			const slotsArray = availabilitySlots ? [availabilitySlots] : []
			for (const slot of slotsArray) {
				console.log(`[generateTimeSlots] Processando slot de disponibilidade: ${slot.dayOfWeek} - ${slot.startTime} a ${slot.endTime}`)
				
				// Converter horários para minutos para facilitar cálculos
				const slotStartMinutes = this.timeToMinutes(slot.startTime)
				const slotEndMinutes = this.timeToMinutes(slot.endTime)
				
				// 9. Identificar blocos de tempo livres
				const freeBlocks = this.generateFreeBlocks(slotStartMinutes, slotEndMinutes, occupiedPeriods)
				console.log(`[generateTimeSlots] Identificados ${freeBlocks.length} blocos livres`)
				
				// 10. Para cada bloco livre, gerar slots de tempo que comportem a duração do serviço
				for (const block of freeBlocks) {
					// Verificar se o bloco tem tamanho suficiente para o serviço
					if (block.end - block.start < serviceDuration) {
						continue // Bloco muito pequeno para este serviço
					}
					
					// 11. Gerar horários preferenciais dentro de cada bloco livre
					const availableStartTimes = this.generatePreferredStartTimes(block, serviceDuration)
					
					// 12. Adicionar cada horário disponível à lista de slots
					for (const startTime of availableStartTimes) {
						const endTime = startTime + serviceDuration
						
						timeSlots.push({
							startTime: this.minutesToTime(startTime),
							endTime: this.minutesToTime(endTime),
							isAvailable: true,
							availabilityId: slot.id,
							serviceDuration: serviceDuration
						})
					}
				}
			}
			
			// 12. Remover possíveis duplicatas e ordenar os slots
			const uniqueTimeSlots = timeSlots.filter((slot, index, self) =>
				index === self.findIndex((s) => s.startTime === slot.startTime)
			).sort((a, b) => 
				this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
			)
			
			console.log(`[generateTimeSlots] Gerados ${uniqueTimeSlots.length} slots de tempo para a data ${date}`)
			return uniqueTimeSlots
		} catch (error) {
			console.error(`[generateTimeSlots] Erro ao gerar slots de tempo para a data ${date}:`, error)
			return []
		}
	}
}

// Export singleton storage
export const storage = new DatabaseStorage()
