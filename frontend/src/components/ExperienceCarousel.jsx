import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const CAROUSEL_SLIDES = [
    {
        src: "/qualfavorito.webp",
        alt: "Qual o seu favorito? - JOHB Café & Salgados",
        title: "Qual o seu favorito?",
        subtitle: "Sabor incomparável em cada opção"
    },
    {
        src: "/esfirra.webp",
        alt: "Esfirras Artesanais JOHB",
        title: "Esfirras Artesanais",
        subtitle: "Massa leve e recheio generoso"
    },
    {
        src: "/empadinhas.jpg",
        alt: "Empadinhas Finas JOHB",
        title: "Empadinhas Cremosas",
        subtitle: "Massa que derrete na boca"
    },
    {
        src: "/joelhinho.jpg",
        alt: "Joelhinhos Tradicionais JOHB",
        title: "Joelhinhos Quentinhos",
        subtitle: "Queijo derretido e presunto no ponto"
    },
    {
        src: "/minipizza.jpg",
        alt: "Mini Pizzas Artesanais JOHB",
        title: "Mini Pizzas Especiais",
        subtitle: "Molho rústico e borda crocante"
    }
];

export function ExperienceCarousel() {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setCurrentIdx(prev => (prev + 1) % CAROUSEL_SLIDES.length);
        }, 3500);
        return () => clearInterval(timer);
    }, [isHovered]);

    const prevSlide = () => {
        setCurrentIdx(prev => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
    };

    const nextSlide = () => {
        setCurrentIdx(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    };

    const current = CAROUSEL_SLIDES[currentIdx];

    return (
        <div 
            className="relative rounded-3xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] shadow-2xl gold-glow-sm aspect-[4/3] sm:aspect-[16/11] max-w-lg mx-auto w-full group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Imagens com Transição Suave */}
            {CAROUSEL_SLIDES.map((slide, idx) => (
                <div
                    key={slide.src}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                        idx === currentIdx ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-95"
                    }`}
                >
                    <img
                        src={slide.src}
                        alt={slide.alt}
                        className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105"
                    />
                    {/* Gradiente Elegante */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/85 via-transparent to-transparent pointer-events-none" />
                </div>
            ))}

            {/* Legenda Informativa no Rodapé */}
            <div className="absolute bottom-4 left-5 right-5 z-20 flex items-end justify-between pointer-events-none">
                <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10100F]/90 border border-[#F4B544]/30 backdrop-blur-md text-[11px] font-bold text-[#F4B544] shadow-lg">
                        <Sparkles className="w-3 h-3 text-[#F4B544]" />
                        {current.title}
                    </span>
                    <p className="text-xs text-[#B8B1A3] font-light pl-1 pt-1 drop-shadow-md">
                        {current.subtitle}
                    </p>
                </div>

                {/* Indicadores / Dots */}
                <div className="flex gap-1.5 pointer-events-auto pb-1">
                    {CAROUSEL_SLIDES.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIdx(i)}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                                i === currentIdx
                                    ? "w-6 bg-[#F4B544] shadow-md shadow-[#F4B544]/40"
                                    : "w-2 bg-white/30 hover:bg-white/60"
                            }`}
                            aria-label={`Ir para o slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Botões de Navegação Anterior / Próximo */}
            <button
                type="button"
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-[#050505]/70 border border-[#F4B544]/30 text-[#FFFAF0] hover:text-[#F4B544] hover:bg-[#10100F] transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                aria-label="Slide anterior"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-[#050505]/70 border border-[#F4B544]/30 text-[#FFFAF0] hover:text-[#F4B544] hover:bg-[#10100F] transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                aria-label="Próximo slide"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
