import { lazy, Suspense, Component } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { ConnectivityBanner } from "@/components/ui/connectivity-banner";
import { useModuleErrorHandler } from "@/hooks/use-module-error-handler";

// Componentes essenciais carregados imediatamente
import SplashPage from "@/pages/splash-page";
import NotFound from "@/pages/not-found";
import DashboardRedirectPage from "@/pages/dashboard-redirect-page";
import { ProtectedRoute } from "@/lib/protected-route";

// Componentes carregados sob demanda usando lazy loading
// Páginas públicas
const LandingPage = lazy(() => import("@/pages/landing-page"));
const OnboardingPage = lazy(() => import("@/pages/onboarding-page"));
const OnboardingWizardPage = lazy(() => import("@/pages/onboarding-wizard-page"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const PasswordRecoveryPage = lazy(() => import("@/pages/password-recovery-page"));
const EmailVerificationPage = lazy(() => import("@/pages/email-verification-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const FAQPage = lazy(() => import("@/pages/faq-page"));
const TermsPage = lazy(() => import("@/pages/terms-page"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success-page"));
const StripeCheckoutPage = lazy(() => import("@/pages/checkout-page"));
const PaymentPage = lazy(() => import("@/pages/client/payment-page"));
const OnboardingStripeReturnPage = lazy(() => import("@/pages/onboarding-stripe-return"));
const OnboardingStripeRefreshPage = lazy(() => import("@/pages/onboarding-stripe-refresh"));

// Páginas de cliente
const ClientDashboard = lazy(() => import("@/pages/client/client-dashboard"));

const NichesPage = lazy(() => import("@/pages/client/niches-page"));
const CategoriesPage = lazy(() => import("@/pages/client/categories-page"));
const ClientServicesPage = lazy(() => import("@/pages/client/services-page"));
const ServiceProvidersPage = lazy(() => import("@/pages/client/service-providers-page"));
const ClientProviderSchedulePage = lazy(() => import("@/pages/client/provider-schedule-page"));
const BookTimeSlotPage = lazy(() => import("@/pages/client/book-time-slot-page"));
const BookConfirmationPage = lazy(() => import("@/pages/client/book-confirmation-page"));
const BookingConfirmationPage = lazy(() => import("@/pages/client/booking-confirmation-page"));
const BookingConfirmation = lazy(() => import("@/pages/client/booking-confirmation"));
const BookingSuccessPage = lazy(() => import("@/pages/client/booking-success-page"));
const BookingWizardPage = lazy(() => import("@/pages/client/booking-wizard-page"));
const NewBookingWizardPage = lazy(() => import("@/pages/client/new-booking-wizard-page"));
const ClientAppointmentsPage = lazy(() => import("@/pages/client/client-appointments-page"));
const AppointmentDetailsPage = lazy(() => import("@/pages/client/appointment-details-page"));
const ProviderDetailsPage = lazy(() => import("@/pages/client/provider-details-page"));
const ClientReviewsPage = lazy(() => import("@/pages/client/reviews-page"));
const UserProfilePage = lazy(() => import("@/pages/client/user-profile-page"));
const PersonalInfoPage = lazy(() => import("@/pages/client/personal-info-page"));
const ChangePasswordPage = lazy(() => import("@/pages/client/change-password-page"));
const PaymentMethodsPage = lazy(() => import("@/pages/client/payment-methods-page"));
const CheckoutPage = lazy(() => import("@/pages/client/checkout"));
const ClientHelpPage = lazy(() => import("@/pages/client/help-page"));
const SubscribePage = lazy(() => import("@/pages/client/subscribe"));
const PaymentConfirmationPage = lazy(() => import("@/pages/client/payment-confirmation"));
const SubscriptionConfirmationPage = lazy(() => import("@/pages/client/subscription-confirmation"));
const AddressesPage = lazy(() => import("@/pages/client/addresses-page"));
const SupportPage = lazy(() => import("@/pages/client/support-page"));
const ProviderMapPage = lazy(() => import("@/pages/client/provider-map-page"));
const ServiceSearchPage = lazy(() => import("@/pages/client/service-search-page"));
const SmartBookingTestPage = lazy(() => import("@/pages/client/smart-booking-test-page"));
const ClientSettingsPage = lazy(() => import("@/pages/client/settings-page"));
const ServiceAvailabilityMapPage = lazy(() => import("@/pages/service-availability-map-page"));

// Páginas de prestador
const ProviderDashboard = lazy(() => import("@/pages/provider/provider-dashboard"));
const ManualBookingPage = lazy(() => import("@/pages/provider/manual-booking-page"));
const ProviderProfilePage = lazy(() => import("@/pages/provider/provider-profile-page"));
const ProviderSettingsPage = lazy(() => import("@/pages/provider/settings-page"));
const ProviderSchedulePage = lazy(() => import("@/pages/provider/provider-schedule-page"));
const ProviderCalendarPage = lazy(() => import("@/pages/provider/provider-calendar-page"));
const ProviderServicesPage = lazy(() => import("@/pages/provider/services-page"));
const EditServicePage = lazy(() => import("@/pages/provider/edit-service-page"));
const ViewServicePage = lazy(() => import("@/pages/provider/view-service-page"));
const AddServicePage = lazy(() => import("@/pages/provider/add-service-page"));
const ProviderServiceTemplatesPage = lazy(() => import("@/pages/provider/service-templates-page"));
const ProviderAnalyticsPage = lazy(() => import("@/pages/provider/analytics-page"));
const ProviderChatPage = lazy(() => import("@/pages/provider/chat-page"));
const ProviderHelpPage = lazy(() => import("@/pages/provider/help-page"));
const ProviderSupportPage = lazy(() => import("@/pages/provider/support-page"));
const ProviderAppointmentDetailsPage = lazy(() => import("@/pages/provider/appointment-details-page"));
const ProviderAppointmentsPage = lazy(() => import("@/pages/provider/appointments-page"));
const ProviderAppointmentsManagementPage = lazy(() => import("@/pages/provider/provider-appointments-management-page"));
const ProviderClientsPage = lazy(() => import("@/pages/provider/clients-page"));
const ProviderFinancesPage = lazy(() => import("@/pages/provider/provider-finances-page"));
const AsaasOnboardingPage = lazy(() => import("@/pages/provider/asaas-onboarding-page"));
const PaymentBalancePage = lazy(() => import("@/pages/provider/payment-balance-page"));
const AsaasPaymentsPage = lazy(() => import("@/pages/provider/asaas-payments-page"));

// Páginas de admin
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard-new"));
const PaymentSettingsPage = lazy(() => import("./pages/admin/payment-settings-page"));
const FinancialSettingsPage = lazy(() => import("@/pages/admin/financial-settings-page"));
const ProviderFeesPage = lazy(() => import("@/pages/admin/provider-fees-page"));
const CategoryFeesPage = lazy(() => import("@/pages/admin/category-fees-page"));
const NotificationSettingsPage = lazy(() => import("@/pages/admin/notification-settings-page"));
const IntegrationsSettingsPage = lazy(() => import("@/pages/admin/integrations-settings-page"));
const CategoriesHierarchyPage = lazy(() => import("@/pages/admin/categories-hierarchy-page"));
const AdminServiceTemplatesPage = lazy(() => import("@/pages/admin/service-templates-page"));
const SupportManagementPage = lazy(() => import("@/pages/admin/support-management"));
const SupportManagementEnhancedPage = lazy(() => import("@/pages/admin/support-management-enhanced"));
const DocumentationPage = lazy(() => import("@/pages/admin/documentation-page"));
const ProjectDocumentationPage = lazy(() => import("@/pages/admin/project-documentation"));
const TestingDocumentationPage = lazy(() => import("@/pages/admin/testing-documentation-page"));
const UsersPage = lazy(() => import("@/pages/admin/users-page"));
const UserManagementPage = lazy(() => import("@/pages/admin/user-management-page"));
const ProvidersPage = lazy(() => import("@/pages/admin/providers-page"));
const AppointmentsPage = lazy(() => import("@/pages/admin/appointments-page"));
const ReportsPage = lazy(() => import("@/pages/admin/reports-page"));
const PromotionsManagementPage = lazy(() => import("@/pages/admin/promotions-management-page"));
const ServicesPage = lazy(() => import("@/pages/admin/services-page"));
const StripeSettingsPage = lazy(() => import("@/pages/admin/stripe-settings-page"));
const AsaasSubAccountsPage = lazy(() => import("@/pages/admin/asaas-subaccounts-page"));


// Páginas de suporte
const SupportDashboardPage = lazy(() => import("@/pages/support/support-dashboard-page"));

// Componente de carregamento para suspense
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GlobalErrorFallback } from "@/components/ui/global-error-fallback";

// Error Boundary para componentes lazy
class LazyErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro ao carregar componente lazy:', error);
    this.setState({ error });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <GlobalErrorFallback
          error={this.state.error}
          resetError={this.handleRetry}
          title="Erro ao carregar página"
          message="Não foi possível carregar esta página. Tente novamente."
        />
      );
    }

    return this.props.children;
  }
}

// Envolve o componente lazy em Suspense para exibir indicador de carregamento
const LazyWrapper = ({ component: Component, ...props }: { component: React.ComponentType<any>; [key: string]: any }) => {
  return (
    <LazyErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Carregando página...</p>
          </div>
        </div>
      }>
        <Component {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );
};

// Componente de Router com suporte a animações de transição
function RouterWithTransitions() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch key={location}>
        {/* Public Routes */}
        <Route path="/splash" component={SplashPage} />
        <Route path="/" component={() => <LazyWrapper component={LandingPage} />} />
        <Route path="/welcome" component={() => <LazyWrapper component={OnboardingPage} />} />
        <Route path="/new-dashboard" component={DashboardRedirectPage} />
        <Route path="/onboarding-wizard" component={() => <LazyWrapper component={OnboardingWizardPage} />} />
        <Route path="/auth" component={() => <LazyWrapper component={AuthPage} />} />
        <Route path="/password-recovery" component={() => <LazyWrapper component={PasswordRecoveryPage} />} />
        <Route path="/email-verification" component={() => <LazyWrapper component={EmailVerificationPage} />} />
        <Route path="/terms" component={() => <LazyWrapper component={TermsPage} />} />
        <Route path="/faq" component={() => <LazyWrapper component={FAQPage} />} />
        <Route path="/client/payment-success" component={() => <LazyWrapper component={PaymentSuccessPage} />} />
        <Route path="/checkout" component={() => <LazyWrapper component={StripeCheckoutPage} />} />
        <Route path="/client/payment" component={() => <LazyWrapper component={PaymentPage} />} />
        <Route path="/onboarding/stripe/return" component={() => <LazyWrapper component={OnboardingStripeReturnPage} />} />
        <Route path="/onboarding/stripe/refresh" component={() => <LazyWrapper component={OnboardingStripeRefreshPage} />} />

        {/* Client Protected Routes */}
        <ProtectedRoute
          path="/client/dashboard"
          component={() => <LazyWrapper component={ClientDashboard} />}
          userType="client"
        />

        <ProtectedRoute
          path="/client/niches"
          component={() => <LazyWrapper component={NichesPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/search"
          component={() => <LazyWrapper component={ServiceSearchPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/categories"
          component={() => <LazyWrapper component={CategoriesPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/services/:categoryId"
          component={() => <LazyWrapper component={ClientServicesPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/categories/:categoryId/services/:serviceId"
          component={() => <LazyWrapper component={ClientServicesPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/providers/:serviceId"
          component={() => <LazyWrapper component={ServiceProvidersPage} />}
          userType="client"
        />
        {/* Rota protegida para agendamento - apenas para clientes autenticados */}
        <ProtectedRoute
          path="/client/provider-schedule/:providerId/:serviceId"
          component={() => <LazyWrapper component={ProviderSchedulePage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/book/:providerId/:serviceId"
          component={() => <LazyWrapper component={BookTimeSlotPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/book/confirm"
          component={() => <LazyWrapper component={BookConfirmationPage} />}
          userType="client"
        />
        {/* Rota unificada para confirmação de agendamento */}
        <ProtectedRoute
          path="/client/booking-confirmation/:providerId/:serviceId/:date/:startTime/:endTime/:availabilityId?"
          component={() => <LazyWrapper component={BookingConfirmation} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/booking-success"
          component={() => <LazyWrapper component={BookingSuccessPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/appointments"
          component={() => <LazyWrapper component={ClientAppointmentsPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/appointments/:appointmentId"
          component={() => <LazyWrapper component={AppointmentDetailsPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/appointment/:id"
          component={() => <LazyWrapper component={AppointmentDetailsPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/appointments/:appointmentId/pay"
          component={() => <LazyWrapper component={PaymentPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/reviews"
          component={() => <LazyWrapper component={ClientReviewsPage} />}
          userType="client"
        />
        {/* Rota pública para ver detalhes de prestadores */}
        <Route
          path="/providers/:providerId"
          component={() => <LazyWrapper component={ProviderDetailsPage} />}
        />

        {/* A rota /client/providers/:serviceId já está definida acima para seguir o fluxo correto, 
        removemos a rota redundante aqui */}
        <ProtectedRoute
          path="/client/profile"
          component={() => <LazyWrapper component={UserProfilePage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/personal-info"
          component={() => <LazyWrapper component={PersonalInfoPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/change-password"
          component={() => <LazyWrapper component={ChangePasswordPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/payment-methods"
          component={() => <LazyWrapper component={PaymentMethodsPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/addresses"
          component={() => <LazyWrapper component={AddressesPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/support"
          component={() => <LazyWrapper component={SupportPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/provider-map"
          component={() => <LazyWrapper component={ProviderMapPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/booking-wizard"
          component={() => <LazyWrapper component={BookingWizardPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/new-booking-wizard"
          component={() => <LazyWrapper component={NewBookingWizardPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/smart-booking-test"
          component={() => <LazyWrapper component={SmartBookingTestPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/checkout"
          component={() => <LazyWrapper component={CheckoutPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/subscribe"
          component={() => <LazyWrapper component={SubscribePage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/payment-confirmation"
          component={() => <LazyWrapper component={PaymentConfirmationPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/subscription-confirmation"
          component={() => <LazyWrapper component={SubscriptionConfirmationPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/settings"
          component={() => <LazyWrapper component={ClientSettingsPage} />}
          userType="client"
        />
        
        <ProtectedRoute
          path="/services/availability-map"
          component={() => <LazyWrapper component={ServiceAvailabilityMapPage} />}
          userType="client"
        />
        <ProtectedRoute
          path="/client/help"
          component={() => <LazyWrapper component={ClientHelpPage} />}
          userType="client"
        />

        {/* Provider Protected Routes */}
        <ProtectedRoute
          path="/provider/dashboard"
          component={() => <LazyWrapper component={ProviderDashboard} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/manual-booking"
          component={() => <LazyWrapper component={ManualBookingPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/profile"
          component={() => <LazyWrapper component={ProviderProfilePage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/schedule"
          component={() => <LazyWrapper component={ProviderSchedulePage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/settings"
          component={() => <LazyWrapper component={ProviderSettingsPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/calendar"
          component={() => <LazyWrapper component={ProviderCalendarPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/services"
          component={() => <LazyWrapper component={ProviderServicesPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/edit-service/:id"
          component={() => <LazyWrapper component={EditServicePage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/view-service/:id"
          component={() => <LazyWrapper component={ViewServicePage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/add-service"
          component={() => <LazyWrapper component={AddServicePage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/service-templates"
          component={() => <LazyWrapper component={ProviderServiceTemplatesPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/help"
          component={() => <LazyWrapper component={ProviderHelpPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/support"
          component={() => <LazyWrapper component={ProviderSupportPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/analytics"
          component={() => <LazyWrapper component={ProviderAnalyticsPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/support"
          component={() => <LazyWrapper component={ProviderSupportPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/appointments"
          component={() => <LazyWrapper component={ProviderAppointmentsPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/appointments-management"
          component={() => <LazyWrapper component={ProviderAppointmentsManagementPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/appointments/:id"
          component={() => <LazyWrapper component={ProviderAppointmentDetailsPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/appointment/:id"
          component={() => <LazyWrapper component={ProviderAppointmentDetailsPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/clients"
          component={() => <LazyWrapper component={ProviderClientsPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/finances"
          component={() => <LazyWrapper component={ProviderFinancesPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/asaas-onboarding"
          component={() => <LazyWrapper component={AsaasOnboardingPage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/payment-balance"
          component={() => <LazyWrapper component={PaymentBalancePage} />}
          userType="provider"
        />
        <ProtectedRoute
          path="/provider/asaas-payments"
          component={() => <LazyWrapper component={AsaasPaymentsPage} />}
          userType="provider"
        />

        {/* Shared Routes that require authentication */}
        <ProtectedRoute
          path="/chat/:providerId"
          component={() => <LazyWrapper component={ProviderChatPage} />}
        />

        {/* Shared Protected Routes */}
        <ProtectedRoute
          path="/profile"
          component={() => <LazyWrapper component={ProfilePage} />}
        />

        {/* Admin Protected Routes */}
        <ProtectedRoute
          path="/admin/dashboard"
          component={() => <LazyWrapper component={AdminDashboard} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/users"
          component={() => <LazyWrapper component={UsersPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/user-management"
          component={() => <LazyWrapper component={UserManagementPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/providers"
          component={() => <LazyWrapper component={ProvidersPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/appointments"
          component={() => <LazyWrapper component={AppointmentsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/reports"
          component={() => <LazyWrapper component={ReportsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/promotions"
          component={() => <LazyWrapper component={PromotionsManagementPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/payment-settings"
          component={() => <LazyWrapper component={PaymentSettingsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/financial-settings"
          component={() => <LazyWrapper component={FinancialSettingsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/provider-fees"
          component={() => <LazyWrapper component={ProviderFeesPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/category-fees"
          component={() => <LazyWrapper component={CategoryFeesPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/notifications"
          component={() => <LazyWrapper component={NotificationSettingsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/integrations-settings"
          component={() => <LazyWrapper component={IntegrationsSettingsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/categories"
          component={() => <LazyWrapper component={CategoriesHierarchyPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/service-templates"
          component={() => <LazyWrapper component={AdminServiceTemplatesPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/support"
          component={() => <LazyWrapper component={SupportManagementPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/support-enhanced"
          component={() => <LazyWrapper component={SupportManagementEnhancedPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/documentation"
          component={() => <LazyWrapper component={DocumentationPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/project-documentation"
          component={() => <LazyWrapper component={ProjectDocumentationPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/testing-documentation"
          component={() => <LazyWrapper component={TestingDocumentationPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/services"
          component={() => <LazyWrapper component={ServicesPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/stripe-settings"
          component={() => <LazyWrapper component={StripeSettingsPage} />}
          userType="admin"
        />
        <ProtectedRoute
          path="/admin/asaas-subaccounts"
          component={() => <LazyWrapper component={AsaasSubAccountsPage} />}
          userType="admin"
        />

        <ProtectedRoute
          path="/admin/profile"
          component={() => <LazyWrapper component={ProfilePage} />}
          userType="admin"
        />

        {/* Support Protected Routes */}
        <ProtectedRoute
          path="/support"
          component={() => <LazyWrapper component={SupportDashboardPage} />}
          userType="support"
        />
        <ProtectedRoute
          path="/support/dashboard"
          component={() => <LazyWrapper component={SupportDashboardPage} />}
          userType="support"
        />
        <ProtectedRoute
          path="/support/pending"
          component={() => <LazyWrapper component={SupportDashboardPage} />}
          userType="support"
        />
        <ProtectedRoute
          path="/support/solved"
          component={() => <LazyWrapper component={SupportDashboardPage} />}
          userType="support"
        />

        {/* 404 Page (deve ser a última rota) */}
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  const [location] = useLocation();
  const moduleErrorHandler = useModuleErrorHandler();
  
  // Verifica se estamos na rota de admin ou suporte para aplicar um layout mais amplo
  const isAdmin = location.startsWith('/admin');
  const isSupport = location.startsWith('/support');
  // A landing page, onboarding wizard, mapa de prestadores, páginas de provider e página de teste de agendamento inteligente precisam ter largura total
  const needsFullWidth = isAdmin || isSupport || location === '/' || 
                        location.includes('/provider-map') || 
                        location.includes('/onboarding-wizard') ||
                        location.includes('/smart-booking-test') ||
                        location.includes('/provider/');

  // Se houver erro crítico de módulo, mostrar tela de erro
  if (moduleErrorHandler.hasCriticalError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Erro crítico detectado
          </h1>
          
          <p className="text-gray-600 mb-4">
            Ocorreu um erro ao carregar módulos essenciais da aplicação. 
            Isso pode ser causado por problemas de rede ou cache corrompido.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={moduleErrorHandler.retryFailedModules}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <NotificationProvider>
          <AuthProvider>
            <div className={`${needsFullWidth ? 'w-full' : 'max-w-md mx-auto'} min-h-screen bg-white`}>
              <ConnectivityBanner />
              <RouterWithTransitions />
              <Toaster />
            </div>
          </AuthProvider>
        </NotificationProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;