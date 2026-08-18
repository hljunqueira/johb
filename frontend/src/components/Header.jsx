import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu as MenuIcon, X, PhoneCall } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function Header({ onOpenCart }) {
    const { getCartCount } = useCart();
    const cartCount = getCartCount ? getCartCount() : 0;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    const navLinks = [
        { name: "Início", path: "/" },
        { name: "Cardápio", path: "#cardapio" },
        { name: "Sobre Nós", path: "#sobre" },
    ];

    const isActive = (path) => {
        if (path === "/") return location.pathname === "/" && !location.hash;
        return location.hash === path;
    };

    return (
        <header className="sticky top-0 z-40 w-full bg-[#050505]/95 backdrop-blur-md border-b border-[#F4B544]/20 transition-all">
            {/* Topbar informativo */}
            <div className="bg-[#10100F] border-b border-[#F4B544]/10 py-1.5 px-4 text-xs text-[#B8B1A3]">
                <div className="max-w-7xl mx-auto flex justify-end items-center">
                    <a
                        href="https://wa.me/message/FUNP4LBHYBA3O1"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#F4B544] transition-colors flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold"
                    >
                        <PhoneCall className="w-3 h-3 text-[#F4B544]" />
                        <span>Fale no WhatsApp</span>
                    </a>
                </div>
            </div>

            {/* Header Principal com a logo oficial */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group">
                    <img
                        src="/logo.png"
                        alt="JOHB Café & Salgados"
                        className="h-16 w-auto object-contain transition-transform group-hover:scale-105"
                    />
                </Link>

                {/* Navegação Desktop */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.path}
                            className={`text-sm uppercase tracking-widest font-medium transition-all py-1 border-b-2 ${
                                isActive(link.path)
                                    ? "text-[#F4B544] border-[#F4B544]"
                                    : "text-[#FFFAF0]/80 border-transparent hover:text-[#F4B544] hover:border-[#F4B544]/40"
                            }`}
                        >
                            {link.name}
                        </a>
                    ))}
                </nav>

                {/* Ações: Carrinho & Menu Mobile */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onOpenCart}
                        aria-label="Abrir Carrinho"
                        className="relative group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#171612] border border-[#F4B544]/30 hover:border-[#F4B544] text-[#FFFAF0] hover:text-[#F4B544] transition-all gold-glow-sm"
                    >
                        <ShoppingBag className="w-4 h-4 text-[#F4B544] transition-transform group-hover:scale-110" />
                        <span className="text-xs uppercase tracking-wider font-semibold hidden sm:inline">
                            Carrinho
                        </span>
                        {cartCount > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-[#F4B544] text-[#050505] text-[11px] font-bold rounded-full">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    {/* Botão Menu Mobile */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-[#FFFAF0] hover:text-[#F4B544] focus:outline-none"
                        aria-label="Abrir menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Menu Mobile Retrátil */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-[#10100F] border-b border-[#F4B544]/20 px-4 pt-3 pb-6 space-y-3 animate-fade-in">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 text-base font-serif tracking-wider text-[#FFFAF0] hover:text-[#F4B544] border-b border-[#F4B544]/10"
                        >
                            {link.name}
                        </a>
                    ))}
                    <div className="pt-2">
                        <a
                            href="https://wa.me/message/FUNP4LBHYBA3O1"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-[#F4B544] text-[#050505] font-semibold text-xs uppercase tracking-wider"
                        >
                            <PhoneCall className="w-4 h-4" />
                            Fazer Pedido por WhatsApp
                        </a>
                    </div>
                </div>
            )}
        </header>
    );
}
