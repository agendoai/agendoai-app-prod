// Frontend-specific types

export type ColorScheme = {
  [key: string]: string;
};

export interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface ServiceProvider {
  id: number;
  name: string;
  profileImage?: string;
  businessName?: string;
  address?: string;
  coverImage?: string;
  rating?: number;
  distance?: number;
  isAvailableToday?: boolean;
}

export interface ServiceItem {
  id: number;
  providerId: number;
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DateOption {
  date: string;
  day: string;
  dayOfMonth: number;
  month: string;
  isSelected?: boolean;
}

export interface BookingDetails {
  serviceId: number;
  providerId: number;
  date: string;
  time: string;
  duration: number;
  price: number;
  serviceName: string;
  providerName: string;
  paymentMethod: "local" | "credit_card" | "pix";
  notes?: string;
  // Propriedades para pagamento PIX
  pixCode?: string;
  pixQrCodeUrl?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  paymentId?: string;
  totalPrice?: number;
}

export interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  providerName: string;
  providerAddress?: string;
  status: string;
  clientName?: string;
  clientPhone?: string;
  providerId: number;
  serviceId: number;
  totalPrice?: number | null;
}

export interface ProviderStats {
  todayAppointments: number;
  monthlyRevenue: number;
  manualAppointments: number;
  manualRevenue: number;
}

export interface ProviderAnalytics {
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
