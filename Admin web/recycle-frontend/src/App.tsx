import { Toaster } from "./components/ui/toaster"
import { Toaster as Sonner } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { AuthProvider } from "./contexts/AuthContext"
import { ProtectedRoute } from "./components/ProtectedRoute"
import SplashScreen from "./pages/SplashScreen"
import Index from "./pages/index"
import Dashboard from "./pages/Dashboard"
import ItemReviews from "./pages/ItemReviews"
import PickupManagement from "./pages/PickupManagement"
import RoutePlanning from "./pages/RoutePlanning"
import UserManagement from "./pages/UserManagement"
import Analytics from "./pages/Analytics"
import Settings from "./pages/Settings"
import SchedulePickups from "./pages/SchedulePickups"
import SubscriptionManagement from "./pages/SubscriptionManagement"
import DriverRegistration from "./pages/DriverRegistration"
import NotFound from "./pages/NotFound"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminRegister from "./pages/admin/AdminRegister"
import AdminForgotPassword from "./pages/admin/AdminForgotPassword"

const queryClient = new QueryClient()

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<AuthProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<Routes>
						{/* Splash Screen - First page users see */}
						<Route path="/" element={<SplashScreen />} />
						
						{/* Public Routes */}
						<Route path="/admin/login" element={<AdminLogin />} />
						<Route path="/admin/register" element={<AdminRegister />} />
						<Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
						
						{/* Protected Routes - All main app routes require authentication */}
						<Route path="/home" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
						<Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
						<Route path="/reviews" element={<ProtectedRoute><Layout><ItemReviews /></Layout></ProtectedRoute>} />
						<Route path="/pickups" element={<ProtectedRoute><Layout><PickupManagement /></Layout></ProtectedRoute>} />
						<Route path="/schedule-pickups" element={<ProtectedRoute><Layout><SchedulePickups /></Layout></ProtectedRoute>} />
						<Route path="/routes" element={<ProtectedRoute><Layout><RoutePlanning /></Layout></ProtectedRoute>} />
						<Route path="/users" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
						<Route path="/driver-registration" element={<ProtectedRoute><Layout><DriverRegistration /></Layout></ProtectedRoute>} />
						<Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
						<Route path="/subscriptions" element={<ProtectedRoute><Layout><SubscriptionManagement /></Layout></ProtectedRoute>} />
						{/* Accept nested settings paths (e.g. /settings/account) */}
						<Route path="/settings/*" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
						<Route path="*" element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</AuthProvider>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
