import React, { useState, useEffect } from "react";
import axios from "axios";
import { ArrowRight, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { ExperienceCarousel } from "@/components/ExperienceCarousel";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const getImageUrl = (url) => {
    if (!url) return "/logo-semfundo.png";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
};

export function HeroSection({ onVerCardapio, deliverySettings, storeStatus }) {
    const [banners, setBanners] = useState([]);
    const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

    useEffect(() => {
        axios.get(`${API}/banners`)
            .then(res => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setBanners(res.data);
                }
            })
            .catch(() => {});
    }, []);

    // Rotação automática de banners caso haja mais de 1
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIdx(prev => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    const scrollToMenu = () => {
        if (onVerCardapio) {
            onVerCardapio();
        } else {
            const el = document.getElementById("cardapio");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        }
    };

    const getCtaLabel = () => {
        if (deliverySettings?.temporarily_closed || storeStatus?.temporarilyClosed) {
            return "Ver Cardápio (Pausado)";
        }
        if (storeStatus?.isProductionDay || (deliverySettings?.allow_immediate_orders === false && deliverySettings?.allow_scheduled_orders !== false)) {
            return "Ver Cardápio & Encomendar";
        }
        if (deliverySettings?.allow_immediate_orders !== false && deliverySettings?.allow_scheduled_orders === false) {
            return "Ver Cardápio & Pedir Agora";
        }
        return "Ver Cardápio & Fazer Pedido";
    };

    // Se houver banners cadastrados no Admin, exibe o carrossel dinâmico
    if (banners.length > 0) {
        const banner = banners[currentBannerIdx];
        return (
            <section className="relative overflow-hidden bg-[#050505] text-[#FFFAF0] py-8 md:py-16 border-b border-[#F4B544]/15">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="relative rounded-3xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] shadow-2xl min-h-[380px] sm:min-h-[440px] flex items-center">
                        {/* Imagem de Fundo do Banner com Gradiente Escuro */}
                        <div className="absolute inset-0 z-0">
                            <img
                                src={getImageUrl(banner.image_url)}
                                alt={banner.title}
                                className="w-full h-full object-cover opacity-35 transform transition-transform duration-1000 scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent" />
                        </div>

                        {/* Conteúdo do Banner */}
                        <div className="relative z-10 max-w-2xl p-6 sm:p-12 space-y-4">
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#F4B544]/20 border border-[#F4B544]/40 text-xs font-bold text-[#F4B544] uppercase tracking-wider">
                                Destaque Especial JOHB
                            </span>

                            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#FFFAF0] leading-tight">
                                {banner.title}
                            </h1>

                            {banner.subtitle && (
                                <p className="text-sm sm:text-lg text-[#B8B1A3] font-light leading-relaxed">
                                    {banner.subtitle}
                                </p>
                            )}

                            <div className="pt-2 flex items-center gap-4">
                                <button
                                    onClick={scrollToMenu}
                                    className="group inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all shadow-lg hover:shadow-[#F4B544]/20 transform hover:-translate-y-0.5 gold-glow cursor-pointer"
                                >
                                    <span>{banner.cta_text || getCtaLabel()}</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>

                        {/* Controles de Navegação se tiver mais de 1 banner */}
                        {banners.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentBannerIdx(prev => (prev - 1 + banners.length) % banners.length)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#050505]/70 border border-white/10 text-white hover:text-[#F4B544] transition-all z-20 cursor-pointer"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentBannerIdx(prev => (prev + 1) % banners.length)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#050505]/70 border border-white/10 text-white hover:text-[#F4B544] transition-all z-20 cursor-pointer"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                
                                {/* Indicadores de Bolinhas */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                                    {banners.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentBannerIdx(i)}
                                            className={`h-2 rounded-full transition-all cursor-pointer ${
                                                currentBannerIdx === i ? "w-6 bg-[#F4B544]" : "w-2 bg-white/30"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    // Visual Padrão Editorial com Carrossel de Fotos na Coluna Direita (1 tela só)
    return (
        <section className="relative overflow-hidden bg-[#050505] text-[#FFFAF0] py-8 lg:py-0 min-h-[calc(100vh-80px)] flex items-center border-b border-[#F4B544]/15">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F4B544]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#C88A24]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
                    
                    {/* Coluna de Texto */}
                    <div className="lg:col-span-6 space-y-5 text-left">
                        <div className="space-y-1.5">
                            <h1 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-[46px] xl:text-[56px] font-bold tracking-tight text-[#FFFAF0] leading-[1.08]">
                                FEITO COM <span className="gold-gradient-text italic font-normal">CARINHO.</span> <br />
                                SERVIDO COM <span className="gold-gradient-text italic font-normal">SABOR.</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-3 pt-0.5 pb-1">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-[#F4B544] to-transparent" />
                            <Heart className="w-4 h-4 text-[#F4B544] fill-[#F4B544]/20" />
                            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#F4B544]/40 to-transparent" />
                        </div>

                        <p className="text-base sm:text-lg text-[#FFFAF0] font-serif italic max-w-xl leading-relaxed">
                            "Cada um tem o seu favorito... mas escolher só um não é tarefa fácil!"
                        </p>
                        <p className="text-sm sm:text-base text-[#B8B1A3] max-w-xl font-light leading-relaxed">
                            Aqui na <strong className="text-[#F4B544] font-semibold">JOHB</strong>, cada produto é preparado com ingredientes selecionados, muito sabor e aquele carinho especial que faz toda a diferença.
                        </p>

                        <div className="flex flex-wrap gap-2.5 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171612] border border-[#F4B544]/20 text-xs font-semibold text-[#FFFAF0]">
                                🥐 Joelhinhos & Folhados
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171612] border border-[#F4B544]/20 text-xs font-semibold text-[#FFFAF0]">
                                🥟 Esfirras & Coxinhas
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171612] border border-[#F4B544]/20 text-xs font-semibold text-[#FFFAF0]">
                                🥧 Empadinhas
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171612] border border-[#F4B544]/20 text-xs font-semibold text-[#FFFAF0]">
                                🍰 Cucas
                            </span>
                        </div>

                        <div className="pt-3">
                            <button
                                onClick={scrollToMenu}
                                className="group inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs sm:text-sm uppercase tracking-widest hover:bg-[#FFC85C] transition-all shadow-lg hover:shadow-[#F4B544]/20 transform hover:-translate-y-0.5 gold-glow cursor-pointer"
                            >
                                <span>{getCtaLabel()}</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </div>

                    {/* Coluna com Carrossel de Fotos na Hero */}
                    <div className="lg:col-span-6 relative flex justify-center items-center">
                        <ExperienceCarousel />
                    </div>

                </div>
            </div>
        </section>
    );
}
