import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import DiagnosisPage from './pages/DiagnosisPage';
import ResultPage from './pages/ResultPage';
import ChatbotPage from './pages/ChatbotPage';
import MyPage from './pages/MyPage';
import ComparePage from './pages/ComparePage';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFound from './pages/NotFound';
import ServiceDetailPage from './pages/ServiceDetailPage';
import AboutPage from './pages/AboutPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserActivityPage from './pages/admin/AdminUserActivityPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import LoginPage from './pages/LoginPage';
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MODULE_PROVIDERS_START */}
    {/* MODULE_PROVIDERS_END */}
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/my" element={<MyPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-history" element={<PaymentHistoryPage />} />
          <Route path="/service-detail" element={<ServiceDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:userId/activity" element={<AdminUserActivityPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          {/* MODULE_ROUTES_START */}
          {/* MODULE_ROUTES_END */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    {/* MODULE_PROVIDERS_CLOSE */}
  </QueryClientProvider>
);

export default App;