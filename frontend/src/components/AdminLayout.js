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
        <nav className="space-y-1.5">
            {navItems.map(item => (
                <NavLink key={item.to} to={item.to} onClick={onNav}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold shadow-lg shadow-[#F4B544]/20 scale-[1.02]" : "text-[#A0A0A0] hover:text-white hover:bg-white/5"}`}
                    data-testid={`nav-${item.label.toLowerCase()}`}>
                    <item.icon className="h-4 w-4" />{item.label}
                </NavLink>
            ))}
        </nav>
    );

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans" data-testid="admin-layout">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-[#141414]/95 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-xl">
                <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button></SheetTrigger>
                            <SheetContent side="left" className="w-64 p-4 bg-[#141414] text-white border-r border-[#D4AF37]/20">
                                <div className="mb-6 mt-2 flex items-center gap-3">
                                    <img src="/logo-semfundo.png" alt="JOHB Logo" className="h-9 w-auto object-contain" />
                                    <div>
                                        <h2 className="font-bold text-sm text-[#F4B544]">Painel JOHB</h2>
                                        <p className="text-xs text-gray-400">{user?.name}</p>
                                    </div>
                                </div>
                                <NavContent onNav={() => setMobileNav(false)} />
                            </SheetContent>
                        </Sheet>
                        <img src="/logo-semfundo.png" alt="JOHB Logo" className="h-10 w-auto object-contain drop-shadow-md" />
                        <span className="text-[10px] bg-[#D4AF37]/20 text-[#F4B544] border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-full hidden sm:block font-bold uppercase tracking-wider">Admin</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-300 hidden sm:block font-semibold mr-1">{user?.name || "Administrador JOHB"}</span>
                        <Button variant="secondary" size="sm" onClick={handleLogout} data-testid="logout-btn" className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white border border-white/10 rounded-xl px-4 transition-all">
                            <LogOut className="h-4 w-4 mr-2" /> Sair
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-60 border-r border-[#D4AF37]/15 min-h-[calc(100vh-61px)] p-4 bg-[#141414] shadow-2xl">
                    <NavContent />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto bg-[#0A0A0A]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
