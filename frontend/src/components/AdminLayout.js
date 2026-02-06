import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ClipboardList, Package, Users, BarChart3, Truck, LogOut, Menu, Moon, Sun } from "lucide-react";

const navItems = [
    { to: "/admin/pedidos", icon: ClipboardList, label: "Pedidos" },
    { to: "/admin/produtos", icon: Package, label: "Cardapio" },
    { to: "/admin/clientes", icon: Users, label: "Clientes" },
    { to: "/admin/relatorios", icon: BarChart3, label: "Relatorios" },
    { to: "/admin/entrega", icon: Truck, label: "Entrega" },
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
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-card/90 backdrop-blur-md border-b border-border">
                <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger>
                            <SheetContent side="left" className="w-64 p-4">
                                <div className="mb-6 mt-2">
                                    <h2 className="font-bold font-heading text-lg">Admin</h2>
                                    <p className="text-xs text-muted-foreground">{user?.name}</p>
                                </div>
                                <NavContent onNav={() => setMobileNav(false)} />
                            </SheetContent>
                        </Sheet>
                        <img src="https://customer-assets.emergentagent.com/job_soul-delivery/artifacts/3puvg49l_IMG_1929.jpeg" alt="" className="h-8 w-8 rounded-full" />
                        <span className="font-bold font-heading text-foreground hidden sm:block">Salada Soul</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hidden sm:block">Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleDark} data-testid="toggle-dark">
                            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
                        <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn" className="text-destructive">
                            <LogOut className="h-4 w-4 mr-1" /> Sair
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
