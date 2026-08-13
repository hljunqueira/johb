import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ClipboardList, Package, Users, BarChart3, Settings, LogOut, Menu, Moon, Sun } from "lucide-react";

const navItems = [
    { to: "/admin/pedidos", icon: ClipboardList, label: "Pedidos" },
    { to: "/admin/produtos", icon: Package, label: "Cardápio" },
    { to: "/admin/clientes", icon: Users, label: "Clientes" },
    { to: "/admin/relatorios", icon: BarChart3, label: "Relatórios" },
    { to: "/admin/entrega", icon: Settings, label: "Configurações" },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dark, setDark] = useState(false);
    const [mobileNav, setMobileNav] = useState(false);

    const toggleDark = () => {
        setDark(!dark);
        document.documentElement.classList.toggle("dark");
    };

    const handleLogout = async () => { await logout(); navigate("/admin/login"); };

    const NavContent = ({ onNav }) => (
        <nav className="space-y-1">
            {navItems.map(item => (
                <NavLink key={item.to} to={item.to} onClick={onNav}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-[#D4AF37] text-black font-bold shadow-md" : "text-foreground hover:bg-muted"}`}
                    data-testid={`nav-${item.label.toLowerCase()}`}>
                    <item.icon className="h-4 w-4" />{item.label}
                </NavLink>
            ))}
        </nav>
    );

    return (
        <div className="min-h-screen bg-background" data-testid="admin-layout">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-[#1E1E1E] backdrop-blur-md border-b border-[#D4AF37]/20 shadow-lg">
                <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button></SheetTrigger>
                            <SheetContent side="left" className="w-64 p-4">
                                <div className="mb-6 mt-2">
                                    <h2 className="font-bold font-heading text-lg text-[#D4AF37]">JOHB</h2>
                                    <p className="text-xs text-muted-foreground">{user?.name}</p>
                                </div>
                                <NavContent onNav={() => setMobileNav(false)} />
                            </SheetContent>
                        </Sheet>
                        <div className="h-10 w-10 rounded-full border-2 border-[#D4AF37] bg-[#121212] flex items-center justify-center shadow-inner">
                            <span className="font-extrabold text-[#D4AF37] text-sm tracking-wider">JOHB</span>
                        </div>
                        <span className="font-bold font-heading text-white text-lg hidden sm:block tracking-tight">JOHB</span>
                        <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 px-2 py-0.5 rounded-full hidden sm:block font-bold uppercase tracking-wider">Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleDark} data-testid="toggle-dark" className="text-white hover:bg-white/10">
                            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <span className="text-sm text-gray-200 hidden sm:block font-medium mr-2">{user?.name}</span>
                        <Button variant="secondary" size="sm" onClick={handleLogout} data-testid="logout-btn" className="bg-white/10 hover:bg-white/20 text-white border-none rounded-lg px-4">
                            <LogOut className="h-4 w-4 mr-2" /> Sair
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-56 border-r border-border min-h-[calc(100vh-57px)] p-4 bg-white dark:bg-card">
                    <NavContent />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
