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
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-primary text-white shadow-md" : "text-foreground hover:bg-muted"}`}
                    data-testid={`nav-${item.label.toLowerCase()}`}>
                    <item.icon className="h-4 w-4" />{item.label}
                </NavLink>
            ))}
        </nav>
    );

    return (
        <div className="min-h-screen bg-background" data-testid="admin-layout">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-[#4A148C] backdrop-blur-md border-b border-white/10 shadow-lg">
                <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button></SheetTrigger>
                            <SheetContent side="left" className="w-64 p-4">
                                <div className="mb-6 mt-2">
                                    <h2 className="font-bold font-heading text-lg text-[#4A148C]">Salada Soul</h2>
                                    <p className="text-xs text-muted-foreground">{user?.name}</p>
                                </div>
                                <NavContent onNav={() => setMobileNav(false)} />
                            </SheetContent>
                        </Sheet>
                        <div className="h-10 w-10 rounded-full border-2 border-white/20 bg-white overflow-hidden flex items-center justify-center shadow-inner">
                            <img src="/Logo-saladasoul.jpeg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold font-heading text-white text-lg hidden sm:block tracking-tight">Salada Soul</span>
                        <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full hidden sm:block font-bold uppercase tracking-wider">Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleDark} data-testid="toggle-dark" className="text-white hover:bg-white/10">
                            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <span className="text-sm text-purple-100 hidden sm:block font-medium mr-2">{user?.name}</span>
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
