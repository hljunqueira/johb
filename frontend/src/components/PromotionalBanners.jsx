import React, { useState, useEffect } from "react";
import axios from "axios";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const getImageUrl = (url) => {
    if (!url) return "/logo-semfundo.png";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
};

export function PromotionalBanners({ onAction }) {
    const [banners, setBanners] = useState([]);
    const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

    useEffect(() => {
        axios.get(`${API}/banners`)
            .then(res => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    const activeBanners = res.data.filter(b => b.active !== false);
                    setBanners(activeBanners);
                }
            })
            .catch(() => {});
    }, []);

    // Rotação automática a cada 6 segundos caso haja múltiplos banners
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIdx(prev => (prev + 1) % banners.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [banners.length]);

    if (!banners || banners.length === 0) return null;

    const banner = banners[currentBannerIdx];

    const handleClick = (link) => {
        if (!link || link === "#") {
            if (onAction) onAction();
            return;
        }
        if (link.startsWith("http://") || link.startsWith("https://")) {
            window.open(link, "_blank", "noopener,noreferrer");
        } else if (link.startsWith("#")) {
            const el = document.querySelector(link);
            if (el) el.scrollIntoView({ behavior: "smooth" });
        } else {
            window.location.href = link;
        }
    };

    return (
        <div className="mb-8 relative group">
            <div className="relative rounded-3xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] shadow-2xl min-h-[220px] sm:min-h-[280px] md:min-h-[340px] flex items-center">
                {/* Imagem de Fundo Panorâmica */}
                {banner.image_url && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={getImageUrl(banner.image_url)}
                            alt={banner.title}
                            className="w-full h-full object-cover opacity-40 transform transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/85 to-transparent" />
                    </div>
                )}

                {/* Conteúdo do Banner */}
                <div className="relative z-10 max-w-xl p-6 sm:p-10 md:p-12 space-y-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F4B544]/15 border border-[#F4B544]/35 text-[11px] font-extrabold text-[#F4B544] uppercase tracking-wider">
                        Destaque Promocional
                    </span>

                    <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#FFFAF0] leading-tight">
                        {banner.title}
                    </h3>

                    {banner.subtitle && (
                        <p className="text-xs sm:text-sm md:text-base text-[#B8B1A3] font-light leading-relaxed line-clamp-2">
                            {banner.subtitle}
                        </p>
                    )}

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => handleClick(banner.cta_link)}
                            className="inline-flex items-center justify-center gap-2.5 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full bg-[#F4B544] text-[#050505] font-extrabold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all shadow-lg hover:shadow-[#F4B544]/20 transform hover:-translate-y-0.5 cursor-pointer"
                        >
                            <span>{banner.cta_text || "Aproveitar"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Controles de Navegação Anterior / Próximo */}
                {banners.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setCurrentBannerIdx(prev => (prev - 1 + banners.length) % banners.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#050505]/75 border border-white/10 text-white hover:text-[#F4B544] hover:bg-black transition-all z-20 opacity-80 hover:opacity-100 cursor-pointer"
                            aria-label="Banner anterior"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentBannerIdx(prev => (prev + 1) % banners.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#050505]/75 border border-white/10 text-white hover:text-[#F4B544] hover:bg-black transition-all z-20 opacity-80 hover:opacity-100 cursor-pointer"
                            aria-label="Próximo banner"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Indicadores / Bullets */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                            {banners.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentBannerIdx(i)}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                        currentBannerIdx === i ? "w-6 bg-[#F4B544]" : "w-1.5 bg-white/40 hover:bg-white/70"
                                    }`}
                                    aria-label={`Ir para o banner ${i + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
