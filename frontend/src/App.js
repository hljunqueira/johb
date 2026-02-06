import { useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import MenuPage from "@/pages/MenuPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import OrderHistoryPage from "@/pages/OrderHistoryPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminOrdersPage from "@/pages/AdminOrdersPage";
import AdminCardapioPage from "@/pages/AdminCardapioPage";
import AdminCustomersPage from "@/pages/AdminCustomersPage";
import AdminReportsPage from "@/pages/AdminReportsPage";
import AdminDeliveryPage from "@/pages/AdminDeliveryPage";
import AdminLayout from "@/components/AdminLayout";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AuthCallback() {
    const hasProcessed = useRef(false);
    const navigate = useNavigate();
    const { processGoogleSession } = useAuth();

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get("session_id");
        if (sessionId) {
            processGoogleSession(sessionId)
                .then(() => navigate("/admin/pedidos", { replace: true }))
                .catch(() => navigate("/admin/login", { replace: true }));
        } else {
            navigate("/admin/login", { replace: true });
        }
    }, [navigate, processGoogleSession]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <p className="text-lg font-medium text-muted-foreground">Processando login...</p>
        </div>
    );
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );
    if (!user) return <Navigate to="/admin/login" replace />;
    return children;
}

function AppRouter() {
    const location = useLocation();
    if (location.hash?.includes("session_id=")) return <AuthCallback />;
    return (
        <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedido/:id" element={<OrderConfirmationPage />} />
            <Route path="/historico" element={<OrderHistoryPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/pedidos" replace />} />
                <Route path="pedidos" element={<AdminOrdersPage />} />
                <Route path="produtos" element={<AdminProductsPage />} />
                <Route path="clientes" element={<AdminCustomersPage />} />
                <Route path="relatorios" element={<AdminReportsPage />} />
                <Route path="entrega" element={<AdminDeliveryPage />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CartProvider>
                    <AppRouter />
                    <Toaster position="top-center" richColors />
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
