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
	availability,

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
	getSchedules(): Promise<Schedule[]>
	getScheduleById(id: number): Promise<Schedule | undefined>
	getSchedulesByProviderId(providerId: number): Promise<Schedule[]>
	createSchedule(schedule: InsertSchedule): Promise<Schedule>
	updateSchedule(
		id: number,
		schedule: Partial<InsertSchedule>
	): Promise<Schedule>
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
	getFavorites(): Promise<Favorite[]>
	getFavoriteById(id: number): Promise<Favorite | undefined>
	getFavoritesByClientId(clientId: number): Promise<Favorite[]>
	createFavorite(favorite: InsertFavorite): Promise<Favorite>
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

	// TimeSlot methods
	getTimeSlots(): Promise<TimeSlot[]>
	getTimeSlotById(id: number): Promise<TimeSlot | undefined>
	getTimeSlotsByProviderId(providerId: number): Promise<TimeSlot[]>
	createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot>
	updateTimeSlot(
		id: number,
		timeSlot: Partial<InsertTimeSlot>
	): Promise<TimeSlot>
	deleteTimeSlot(id: number): Promise<void>

	// UnavailableDay methods
	getUnavailableDays(): Promise<UnavailableDay[]>
	getUnavailableDayById(id: number): Promise<UnavailableDay | undefined>
	getUnavailableDaysByProviderId(
		providerId: number
	): Promise<UnavailableDay[]>
	createUnavailableDay(
		unavailableDay: InsertUnavailableDay
	): Promise<UnavailableDay>
	updateUnavailableDay(
		id: number,
		unavailableDay: Partial<InsertUnavailableDay>
	): Promise<UnavailableDay>
	deleteUnavailableDay(id: number): Promise<void>

	// RecurrentBlockedTime methods
	getRecurrentBlockedTimes(): Promise<RecurrentBlockedTime[]>
	getRecurrentBlockedTimeById(
		id: number
	): Promise<RecurrentBlockedTime | undefined>
	getRecurrentBlockedTimesByProviderId(
		providerId: number
	): Promise<RecurrentBlockedTime[]>
	createRecurrentBlockedTime(
		recurrentBlockedTime: InsertRecurrentBlockedTime
	): Promise<RecurrentBlockedTime>
	updateRecurrentBlockedTime(
		id: number,
		recurrentBlockedTime: Partial<InsertRecurrentBlockedTime>
	): Promise<RecurrentBlockedTime>
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

	// Article methods
	getArticles(): Promise<Article[]>
	getArticleById(id: number): Promise<Article | undefined>
	getArticlesByCategoryId(categoryId: number): Promise<Article[]>
	createArticle(article: InsertArticle): Promise<Article>
	updateArticle(id: number, article: Partial<InsertArticle>): Promise<Article>
	deleteArticle(id: number): Promise<void>

	// ArticleCategory methods
	getArticleCategories(): Promise<ArticleCategory[]>
	getArticleCategoryById(id: number): Promise<ArticleCategory | undefined>
	createArticleCategory(
		articleCategory: InsertArticleCategory
	): Promise<ArticleCategory>
	updateArticleCategory(
		id: number,
		articleCategory: Partial<InsertArticleCategory>
	): Promise<ArticleCategory>
	deleteArticleCategory(id: number): Promise<void>

	// Coupon methods
	getCoupons(): Promise<Coupon[]>
	getCouponById(id: number): Promise<Coupon | undefined>
	getCouponByCode(code: string): Promise<Coupon | undefined>
	createCoupon(coupon: InsertCoupon): Promise<Coupon>
	updateCoupon(id: number, coupon: Partial<InsertCoupon>): Promise<Coupon>
	deleteCoupon(id: number): Promise<void>

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

	// Help methods
	getHelpArticles(): Promise<Help[]>
	getHelpArticleById(id: number): Promise<Help | undefined>
	getHelpArticlesByCategoryId(categoryId: number): Promise<Help[]>
	createHelpArticle(help: InsertHelp): Promise<Help>
	updateHelpArticle(id: number, help: Partial<InsertHelp>): Promise<Help>
	deleteHelpArticle(id: number): Promise<void>

	// HelpCategory methods
	getHelpCategories(): Promise<HelpCategory[]>
	getHelpCategoryById(id: number): Promise<HelpCategory | undefined>
	createHelpCategory(helpCategory: InsertHelpCategory): Promise<HelpCategory>
	updateHelpCategory(
		id: number,
		helpCategory: Partial<InsertHelpCategory>
	): Promise<HelpCategory>
	deleteHelpCategory(id: number): Promise<void>

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
}

// Memory storage implementation for testing
export class MemStorage implements IStorage {
	private users: User[] = []
	private schedules: Schedule[] = []
	private niches: Niche[] = []
	private categories: Category[] = []
	private services: Service[] = []
	private providerServices: ProviderService[] = []
	private appointments: Appointment[] = []
	private reviews: Review[] = []
	private favorites: Favorite[] = []
	private blockedTimeSlots: BlockedTimeSlot[] = []
	private timeSlots: TimeSlot[] = []
	private unavailableDays: UnavailableDay[] = []
	private recurrentBlockedTimes: RecurrentBlockedTime[] = []
	private availability: Availability[] = []
	private serviceTemplates: ServiceTemplate[] = []
	private notifications: Notification[] = []
	private articles: Article[] = []
	private articleCategories: ArticleCategory[] = []
	private coupons: Coupon[] = []
	private providerServiceFees: ProviderServiceFee[] = []
	private promotions: Promotion[] = []
	private helpArticles: Help[] = []
	private helpCategories: HelpCategory[] = []
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
			userType: user.userType,
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
	async getSchedules(): Promise<Schedule[]> {
		return this.schedules
	}

	async getScheduleById(id: number): Promise<Schedule | undefined> {
		return this.schedules.find((schedule) => schedule.id === id)
	}

	async getSchedulesByProviderId(providerId: number): Promise<Schedule[]> {
		return this.schedules.filter(
			(schedule) => schedule.providerId === providerId
		)
	}

	async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
		const newSchedule: Schedule = {
			id: this.schedules.length + 1,
			providerId: schedule.providerId,
			startTime: schedule.startTime,
			endTime: schedule.endTime,
			isAvailable: schedule.isAvailable || null,
			dayOfWeek: schedule.dayOfWeek,
			intervalMinutes: schedule.intervalMinutes || null,
		}

		this.schedules.push(newSchedule)
		return newSchedule
	}

	async updateSchedule(
		id: number,
		schedule: Partial<InsertSchedule>
	): Promise<Schedule> {
		const index = this.schedules.findIndex((s) => s.id === id)
		if (index === -1) {
			throw new Error(`Schedule with id ${id} not found`)
		}

		const updatedSchedule: Schedule = {
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
			feeAmount: fee.feeAmount,
			isActive: fee.isActive || true,
			minFeeAmount: fee.minFeeAmount || null,
			maxFeeAmount: fee.maxFeeAmount || null,
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

	async getFavorites(): Promise<Favorite[]> {
		return []
	}
	async getFavoriteById(id: number): Promise<Favorite | undefined> {
		return undefined
	}
	async getFavoritesByClientId(clientId: number): Promise<Favorite[]> {
		return []
	}
	async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
		return {} as Favorite
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

	async getTimeSlots(): Promise<TimeSlot[]> {
		return []
	}
	async getTimeSlotById(id: number): Promise<TimeSlot | undefined> {
		return undefined
	}
	async getTimeSlotsByProviderId(providerId: number): Promise<TimeSlot[]> {
		return []
	}
	async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
		return {} as TimeSlot
	}
	async updateTimeSlot(
		id: number,
		timeSlot: Partial<InsertTimeSlot>
	): Promise<TimeSlot> {
		return {} as TimeSlot
	}
	async deleteTimeSlot(id: number): Promise<void> {}

	async getUnavailableDays(): Promise<UnavailableDay[]> {
		return []
	}
	async getUnavailableDayById(
		id: number
	): Promise<UnavailableDay | undefined> {
		return undefined
	}
	async getUnavailableDaysByProviderId(
		providerId: number
	): Promise<UnavailableDay[]> {
		return []
	}
	async createUnavailableDay(
		unavailableDay: InsertUnavailableDay
	): Promise<UnavailableDay> {
		return {} as UnavailableDay
	}
	async updateUnavailableDay(
		id: number,
		unavailableDay: Partial<InsertUnavailableDay>
	): Promise<UnavailableDay> {
		return {} as UnavailableDay
	}
	async deleteUnavailableDay(id: number): Promise<void> {}

	async getRecurrentBlockedTimes(): Promise<RecurrentBlockedTime[]> {
		return []
	}
	async getRecurrentBlockedTimeById(
		id: number
	): Promise<RecurrentBlockedTime | undefined> {
		return undefined
	}
	async getRecurrentBlockedTimesByProviderId(
		providerId: number
	): Promise<RecurrentBlockedTime[]> {
		return []
	}
	async createRecurrentBlockedTime(
		recurrentBlockedTime: InsertRecurrentBlockedTime
	): Promise<RecurrentBlockedTime> {
		return {} as RecurrentBlockedTime
	}
	async updateRecurrentBlockedTime(
		id: number,
		recurrentBlockedTime: Partial<InsertRecurrentBlockedTime>
	): Promise<RecurrentBlockedTime> {
		return {} as RecurrentBlockedTime
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

	async getArticles(): Promise<Article[]> {
		return []
	}
	async getArticleById(id: number): Promise<Article | undefined> {
		return undefined
	}
	async getArticlesByCategoryId(categoryId: number): Promise<Article[]> {
		return []
	}
	async createArticle(article: InsertArticle): Promise<Article> {
		return {} as Article
	}
	async updateArticle(
		id: number,
		article: Partial<InsertArticle>
	): Promise<Article> {
		return {} as Article
	}
	async deleteArticle(id: number): Promise<void> {}

	async getArticleCategories(): Promise<ArticleCategory[]> {
		return []
	}
	async getArticleCategoryById(
		id: number
	): Promise<ArticleCategory | undefined> {
		return undefined
	}
	async createArticleCategory(
		articleCategory: InsertArticleCategory
	): Promise<ArticleCategory> {
		return {} as ArticleCategory
	}
	async updateArticleCategory(
		id: number,
		articleCategory: Partial<InsertArticleCategory>
	): Promise<ArticleCategory> {
		return {} as ArticleCategory
	}
	async deleteArticleCategory(id: number): Promise<void> {}

	async getCoupons(): Promise<Coupon[]> {
		return []
	}
	async getCouponById(id: number): Promise<Coupon | undefined> {
		return undefined
	}
	async getCouponByCode(code: string): Promise<Coupon | undefined> {
		return undefined
	}
	async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
		return {} as Coupon
	}
	async updateCoupon(
		id: number,
		coupon: Partial<InsertCoupon>
	): Promise<Coupon> {
		return {} as Coupon
	}
	async deleteCoupon(id: number): Promise<void> {}

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

	async getHelpArticles(): Promise<Help[]> {
		return []
	}
	async getHelpArticleById(id: number): Promise<Help | undefined> {
		return undefined
	}
	async getHelpArticlesByCategoryId(categoryId: number): Promise<Help[]> {
		return []
	}
	async createHelpArticle(help: InsertHelp): Promise<Help> {
		return {} as Help
	}
	async updateHelpArticle(
		id: number,
		help: Partial<InsertHelp>
	): Promise<Help> {
		return {} as Help
	}
	async deleteHelpArticle(id: number): Promise<void> {}

	async getHelpCategories(): Promise<HelpCategory[]> {
		return []
	}
	async getHelpCategoryById(id: number): Promise<HelpCategory | undefined> {
		return undefined
	}
	async createHelpCategory(
		helpCategory: InsertHelpCategory
	): Promise<HelpCategory> {
		return {} as HelpCategory
	}
	async updateHelpCategory(
		id: number,
		helpCategory: Partial<InsertHelpCategory>
	): Promise<HelpCategory> {
		return {} as HelpCategory
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

	// Method alias for compatibility with existing code
	async getService(id: number): Promise<Service | undefined> {
		return this.getServiceById(id)
	}

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

	// Method alias for compatibility with existing code
	async getProviderService(id: number): Promise<ProviderService | undefined> {
		return this.getProviderServiceById(id)
	}

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

	// Provider Settings methods
	async getProviderSettings(providerId: number): Promise<any> {
		try {
			const results = await db
				.select()
				.from(providerSettings)
				.where(eq(providerSettings.providerId, providerId))
			return results[0]
		} catch (error) {
			console.error(
				`Erro ao buscar configurações do prestador ${providerId}:`,
				error
			)
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
			console.error(
				`Erro ao criar configurações para o prestador:`,
				error
			)
			throw error
		}
	}

	async updateProviderSettings(
		providerId: number,
		settings: any
	): Promise<any> {
		try {
			// Primeiro obtemos as configurações existentes
			const existing = await this.getProviderSettings(providerId)

			if (!existing) {
				// Se não existirem, criar novas configurações
				return await this.createProviderSettings({
					providerId,
					...settings,
				})
			}

			// Se existirem, atualizar
			const results = await db
				.update(providerSettings)
				.set(settings)
				.where(eq(providerSettings.providerId, providerId))
				.returning()

			return results[0]
		} catch (error) {
			console.error(
				`Erro ao atualizar configurações do prestador ${providerId}:`,
				error
			)
			throw error
		}
	}

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

	// Method alias for compatibility with existing code
	async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
		return this.getServiceTemplateById(id)
	}

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

	// Method alias for compatibility with existing code
	async getNiche(id: number): Promise<Niche | undefined> {
		return this.getNicheById(id)
	}

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

	// Method alias for compatibility with existing code
	async getCategory(id: number): Promise<Category | undefined> {
		return this.getCategoryById(id)
	}

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

	// Time slot methods
	async getTimeSlots(): Promise<TimeSlot[]> {
		return await db.select().from(timeSlots)
	}

	async getTimeSlotById(id: number): Promise<TimeSlot | undefined> {
		const results = await db
			.select()
			.from(timeSlots)
			.where(eq(timeSlots.id, id))
		return results[0]
	}

	async getTimeSlotsByProviderId(providerId: number): Promise<TimeSlot[]> {
		return await db
			.select()
			.from(timeSlots)
			.where(eq(timeSlots.providerId, providerId))
	}

	async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
		const results = await db.insert(timeSlots).values(timeSlot).returning()
		return results[0]
	}

	async updateTimeSlot(
		id: number,
		timeSlot: Partial<InsertTimeSlot>
	): Promise<TimeSlot> {
		const results = await db
			.update(timeSlots)
			.set(timeSlot)
			.where(eq(timeSlots.id, id))
			.returning()
		return results[0]
	}

	async deleteTimeSlot(id: number): Promise<void> {
		await db.delete(timeSlots).where(eq(timeSlots.id, id))
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
			.select()
			.from(appointments)
			.where(eq(appointments.clientId, clientId))
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
		return await db.select().from(availability)
	}

	async getAvailabilityById(id: number): Promise<Availability | undefined> {
		const results = await db
			.select()
			.from(availability)
			.where(eq(availability.id, id))
		return results[0]
	}

	async getAvailabilityByProviderId(
		providerId: number
	): Promise<Availability[]> {
		return await db
			.select()
			.from(availability)
			.where(eq(availability.providerId, providerId))
	}

	async getAvailabilityByDay(
		providerId: number,
		dayOfWeek: number
	): Promise<Availability | undefined> {
		const results = await db
			.select()
			.from(availability)
			.where(
				and(
					eq(availability.providerId, providerId),
					eq(availability.dayOfWeek, dayOfWeek)
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
			.from(availability)
			.where(
				and(
					eq(availability.providerId, providerId),
					eq(availability.date, date)
				)
			)
		return results[0]
	}

	async createAvailability(
		availability: InsertAvailability
	): Promise<Availability> {
		const results = await db
			.insert(availability)
			.values(availability)
			.returning()
		return results[0]
	}

	async updateAvailability(
		id: number,
		availability: Partial<InsertAvailability>
	): Promise<Availability> {
		const results = await db
			.update(availability)
			.set(availability)
			.where(eq(availability.id, id))
			.returning()
		return results[0]
	}

	async deleteAvailability(id: number): Promise<void> {
		await db.delete(availability).where(eq(availability.id, id))
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
	async getSchedules(): Promise<Schedule[]> {
		return await db.select().from(schedules)
	}

	async getScheduleById(id: number): Promise<Schedule | undefined> {
		const results = await db
			.select()
			.from(schedules)
			.where(eq(schedules.id, id))
		return results[0]
	}

	async getSchedulesByProviderId(providerId: number): Promise<Schedule[]> {
		return await db
			.select()
			.from(schedules)
			.where(eq(schedules.providerId, providerId))
	}

	async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
		const results = await db.insert(schedules).values(schedule).returning()
		return results[0]
	}

	async updateSchedule(
		id: number,
		schedule: Partial<InsertSchedule>
	): Promise<Schedule> {
		const results = await db
			.update(schedules)
			.set(schedule)
			.where(eq(schedules.id, id))
			.returning()
		return results[0]
	}

	async deleteSchedule(id: number): Promise<void> {
		await db.delete(schedules).where(eq(schedules.id, id))
	}

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
	async getFavorites(): Promise<Favorite[]> {
		return await db.select().from(favorites)
	}

	async getFavoriteById(id: number): Promise<Favorite | undefined> {
		const results = await db
			.select()
			.from(favorites)
			.where(eq(favorites.id, id))
		return results[0]
	}

	async getFavoritesByClientId(clientId: number): Promise<Favorite[]> {
		return await db
			.select()
			.from(favorites)
			.where(eq(favorites.clientId, clientId))
	}

	async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
		const results = await db.insert(favorites).values(favorite).returning()
		return results[0]
	}

	async deleteFavorite(id: number): Promise<void> {
		await db.delete(favorites).where(eq(favorites.id, id))
	}

	// Unavailable day methods
	async getUnavailableDays(): Promise<UnavailableDay[]> {
		return await db.select().from(unavailableDays)
	}

	async getUnavailableDayById(
		id: number
	): Promise<UnavailableDay | undefined> {
		const results = await db
			.select()
			.from(unavailableDays)
			.where(eq(unavailableDays.id, id))
		return results[0]
	}

	async getUnavailableDaysByProviderId(
		providerId: number
	): Promise<UnavailableDay[]> {
		return await db
			.select()
			.from(unavailableDays)
			.where(eq(unavailableDays.providerId, providerId))
	}

	async createUnavailableDay(
		unavailableDay: InsertUnavailableDay
	): Promise<UnavailableDay> {
		const results = await db
			.insert(unavailableDays)
			.values(unavailableDay)
			.returning()
		return results[0]
	}

	async updateUnavailableDay(
		id: number,
		unavailableDay: Partial<InsertUnavailableDay>
	): Promise<UnavailableDay> {
		const results = await db
			.update(unavailableDays)
			.set(unavailableDay)
			.where(eq(unavailableDays.id, id))
			.returning()
		return results[0]
	}

	async deleteUnavailableDay(id: number): Promise<void> {
		await db.delete(unavailableDays).where(eq(unavailableDays.id, id))
	}

	// Recurrent blocked time methods
	async getRecurrentBlockedTimes(): Promise<RecurrentBlockedTime[]> {
		return await db.select().from(recurrentBlockedTimes)
	}

	async getRecurrentBlockedTimeById(
		id: number
	): Promise<RecurrentBlockedTime | undefined> {
		const results = await db
			.select()
			.from(recurrentBlockedTimes)
			.where(eq(recurrentBlockedTimes.id, id))
		return results[0]
	}

	async getRecurrentBlockedTimesByProviderId(
		providerId: number
	): Promise<RecurrentBlockedTime[]> {
		return await db
			.select()
			.from(recurrentBlockedTimes)
			.where(eq(recurrentBlockedTimes.providerId, providerId))
	}

	async createRecurrentBlockedTime(
		recurrentBlockedTime: InsertRecurrentBlockedTime
	): Promise<RecurrentBlockedTime> {
		const results = await db
			.insert(recurrentBlockedTimes)
			.values(recurrentBlockedTime)
			.returning()
		return results[0]
	}

	async updateRecurrentBlockedTime(
		id: number,
		recurrentBlockedTime: Partial<InsertRecurrentBlockedTime>
	): Promise<RecurrentBlockedTime> {
		const results = await db
			.update(recurrentBlockedTimes)
			.set(recurrentBlockedTime)
			.where(eq(recurrentBlockedTimes.id, id))
			.returning()
		return results[0]
	}

	async deleteRecurrentBlockedTime(id: number): Promise<void> {
		await db
			.delete(recurrentBlockedTimes)
			.where(eq(recurrentBlockedTimes.id, id))
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
	async getArticles(): Promise<Article[]> {
		return await db.select().from(articles)
	}

	async getArticleById(id: number): Promise<Article | undefined> {
		const results = await db
			.select()
			.from(articles)
			.where(eq(articles.id, id))
		return results[0]
	}

	async getArticlesByCategoryId(categoryId: number): Promise<Article[]> {
		return await db
			.select()
			.from(articles)
			.where(eq(articles.categoryId, categoryId))
	}

	async createArticle(article: InsertArticle): Promise<Article> {
		const results = await db.insert(articles).values(article).returning()
		return results[0]
	}

	async updateArticle(
		id: number,
		article: Partial<InsertArticle>
	): Promise<Article> {
		const results = await db
			.update(articles)
			.set(article)
			.where(eq(articles.id, id))
			.returning()
		return results[0]
	}

	async deleteArticle(id: number): Promise<void> {
		await db.delete(articles).where(eq(articles.id, id))
	}

	// Article category methods
	async getArticleCategories(): Promise<ArticleCategory[]> {
		return await db.select().from(articleCategories)
	}

	async getArticleCategoryById(
		id: number
	): Promise<ArticleCategory | undefined> {
		const results = await db
			.select()
			.from(articleCategories)
			.where(eq(articleCategories.id, id))
		return results[0]
	}

	async createArticleCategory(
		articleCategory: InsertArticleCategory
	): Promise<ArticleCategory> {
		const results = await db
			.insert(articleCategories)
			.values(articleCategory)
			.returning()
		return results[0]
	}

	async updateArticleCategory(
		id: number,
		articleCategory: Partial<InsertArticleCategory>
	): Promise<ArticleCategory> {
		const results = await db
			.update(articleCategories)
			.set(articleCategory)
			.where(eq(articleCategories.id, id))
			.returning()
		return results[0]
	}

	async deleteArticleCategory(id: number): Promise<void> {
		await db.delete(articleCategories).where(eq(articleCategories.id, id))
	}

	// Coupon methods
	async getCoupons(): Promise<Coupon[]> {
		return await db.select().from(coupons)
	}

	async getCouponById(id: number): Promise<Coupon | undefined> {
		const results = await db
			.select()
			.from(coupons)
			.where(eq(coupons.id, id))
		return results[0]
	}

	async getCouponByCode(code: string): Promise<Coupon | undefined> {
		const results = await db
			.select()
			.from(coupons)
			.where(eq(coupons.code, code))
		return results[0]
	}

	async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
		const results = await db.insert(coupons).values(coupon).returning()
		return results[0]
	}

	async updateCoupon(
		id: number,
		coupon: Partial<InsertCoupon>
	): Promise<Coupon> {
		const results = await db
			.update(coupons)
			.set(coupon)
			.where(eq(coupons.id, id))
			.returning()
		return results[0]
	}

	async deleteCoupon(id: number): Promise<void> {
		await db.delete(coupons).where(eq(coupons.id, id))
	}

	// Promotion methods
	async getPromotions(): Promise<Promotion[]> {
		return await db.select().from(promotions).orderBy(promotions.createdAt)
	}

	async getPromotionById(id: number): Promise<Promotion | undefined> {
		const results = await db
			.select()
			.from(promotions)
			.where(eq(promotions.id, id))
		return results[0]
	}

	async getActivePromotions(currentDate: Date): Promise<Promotion[]> {
		return await db
			.select()
			.from(promotions)
			.where(
				and(
					eq(promotions.isActive, true),
					lte(promotions.startDate, currentDate),
					gte(promotions.endDate, currentDate)
				)
			)
			.orderBy(promotions.createdAt)
	}

	async getApplicablePromotions(filters: {
		serviceId?: number
		providerId?: number
		categoryId?: number
		nicheId?: number
		currentDate: Date
	}): Promise<Promotion[]> {
		const { serviceId, providerId, categoryId, nicheId, currentDate } =
			filters

		// Condições para promoções ativas dentro do período
		const baseConditions = [
			eq(promotions.isActive, true),
			lte(promotions.startDate, currentDate),
			gte(promotions.endDate, currentDate),
		]

		// Filtrar condições undefined
		const conditions = baseConditions.filter(Boolean)

		// Adicionar condições específicas se fornecidas
		if (serviceId !== undefined) {
			conditions.push(
				or(
					eq(promotions.serviceId, serviceId),
					isNull(promotions.serviceId)
				)
			)
		}

		if (providerId !== undefined) {
			conditions.push(
				or(
					eq(promotions.providerId, providerId),
					isNull(promotions.providerId)
				)
			)
		}

		if (categoryId !== undefined) {
			conditions.push(
				or(
					eq(promotions.categoryId, categoryId),
					isNull(promotions.categoryId)
				)
			)
		}

		if (nicheId !== undefined) {
			conditions.push(
				or(eq(promotions.nicheId, nicheId), isNull(promotions.nicheId))
			)
		}

		// Consulta com todas as condições aplicáveis
		return await db
			.select()
			.from(promotions)
			.where(and(...conditions))
			.orderBy(promotions.createdAt)
	}

	async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
		const results = await db
			.insert(promotions)
			.values(promotion)
			.returning()
		return results[0]
	}

	async updatePromotion(
		id: number,
		promotion: Partial<InsertPromotion>
	): Promise<Promotion> {
		const results = await db
			.update(promotions)
			.set(promotion)
			.where(eq(promotions.id, id))
			.returning()
		return results[0]
	}

	async deletePromotion(id: number): Promise<void> {
		await db.delete(promotions).where(eq(promotions.id, id))
	}

	// Provider Settings methods
	async getProviderSettings(providerId: number): Promise<any> {
		try {
			const results = await db
				.select()
				.from(providerSettings)
				.where(eq(providerSettings.providerId, providerId))
			return results[0]
		} catch (error) {
			console.error(
				`Erro ao buscar configurações do prestador ${providerId}:`,
				error
			)
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
			console.error(
				`Erro ao criar configurações para o prestador:`,
				error
			)
			throw error
		}
	}

	async updateProviderSettings(
		providerId: number,
		settings: any
	): Promise<any> {
		try {
			// Primeiro obtemos as configurações existentes
			const existing = await this.getProviderSettings(providerId)

			if (!existing) {
				// Se não existirem, criar novas configurações
				return await this.createProviderSettings({
					providerId,
					...settings,
				})
			}

			// Se existirem, atualizar
			const results = await db
				.update(providerSettings)
				.set(settings)
				.where(eq(providerSettings.providerId, providerId))
				.returning()

			return results[0]
		} catch (error) {
			console.error(
				`Erro ao atualizar configurações do prestador ${providerId}:`,
				error
			)
			throw error
		}
	}

	// Help methods
	async getHelpArticles(): Promise<Help[]> {
		return await db.select().from(help)
	}

	async getHelpArticleById(id: number): Promise<Help | undefined> {
		const results = await db.select().from(help).where(eq(help.id, id))
		return results[0]
	}

	async getHelpArticlesByCategoryId(categoryId: number): Promise<Help[]> {
		return await db
			.select()
			.from(help)
			.where(eq(help.categoryId, categoryId))
	}

	async createHelpArticle(helpArticle: InsertHelp): Promise<Help> {
		const results = await db.insert(help).values(helpArticle).returning()
		return results[0]
	}

	async updateHelpArticle(
		id: number,
		helpArticle: Partial<InsertHelp>
	): Promise<Help> {
		const results = await db
			.update(help)
			.set(helpArticle)
			.where(eq(help.id, id))
			.returning()
		return results[0]
	}

	async deleteHelpArticle(id: number): Promise<void> {
		await db.delete(help).where(eq(help.id, id))
	}

	// Help category methods
	async getHelpCategories(): Promise<HelpCategory[]> {
		return await db.select().from(helpCategories)
	}

	async getHelpCategoryById(id: number): Promise<HelpCategory | undefined> {
		const results = await db
			.select()
			.from(helpCategories)
			.where(eq(helpCategories.id, id))
		return results[0]
	}

	async createHelpCategory(
		helpCategory: InsertHelpCategory
	): Promise<HelpCategory> {
		const results = await db
			.insert(helpCategories)
			.values(helpCategory)
			.returning()
		return results[0]
	}

	async updateHelpCategory(
		id: number,
		helpCategory: Partial<InsertHelpCategory>
	): Promise<HelpCategory> {
		const results = await db
			.update(helpCategories)
			.set(helpCategory)
			.where(eq(helpCategories.id, id))
			.returning()
		return results[0]
	}

	async deleteHelpCategory(id: number): Promise<void> {
		await db.delete(helpCategories).where(eq(helpCategories.id, id))
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

	// Alias para getAllProviderFees para manter compatibilidade
	async getAllProviderFees(): Promise<ProviderServiceFee[]> {
		return this.getAllProviderFees();
	}

	// Alias para getUsersByType("provider") para manter compatibilidade
	async getAllProviders(): Promise<User[]> {
		return this.getUsersByType("provider");
	}

	// Alias para getReviews para manter compatibilidade
	async getAllReviews(): Promise<Review[]> {
		return this.getReviews();
	}

	// Alias para getProviderServices para manter compatibilidade
	async getAllProviderServices(): Promise<ProviderService[]> {
		return this.getProviderServices();
	}
}

// Export singleton storage
export const storage = new DatabaseStorage()
