import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CAROUSEL_SLIDES = [
    {
        src: "/qualfavorito.webp",
        alt: "Qual vai ser o seu favorito? - JOHB Café & Salgados"
    },
    {
        src: "/esfirra.webp",
        alt: "Esfirras Artesanais JOHB"
    },
    {
        src: "/empadinhas.jpg",
        alt: "Empadinhas Artesanais JOHB"
    },
    {
        src: "/joelhinho.jpg",
        alt: "Joelhinhos Artesanais JOHB"
    },
    {
        src: "/minipizza.jpg",
        alt: "Mini Pizzas Artesanais JOHB"
    }
];

export function ExperienceCarousel() {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const touchStartX = useRef(null);

    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setCurrentIdx(prev => (prev + 1) % CAROUSEL_SLIDES.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isHovered]);

    const prevSlide = () => {
        setCurrentIdx(prev => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
    };

    const nextSlide = () => {
        setCurrentIdx(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        if (diff > 50) {
            nextSlide();
        } else if (diff < -50) {
            prevSlide();
        }
        touchStartX.current = null;
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Card Principal Quadrado 1:1 Sem Cortes */}
            <div 
                className="relative rounded-3xl overflow-hidden border border-[#F4B544]/35 bg-[#10100F] shadow-2xl gold-glow w-full max-w-[390px] sm:max-w-[440px] lg:max-w-[470px] xl:max-w-[500px] aspect-square group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Slides 1:1 em Alta Definição */}
                {CAROUSEL_SLIDES.map((slide, idx) => (
                    <div
                        key={slide.src}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                            idx === currentIdx ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-98"
                        }`}
                    >
                        <img
                            src={slide.src}
                            alt={slide.alt}
                            className="w-full h-full object-contain sm:object-cover aspect-square block select-none"
                            loading={idx === 0 ? "eager" : "lazy"}
                        />
                    </div>
                ))}

                {/* Botão Anterior */}
                <button
                    type="button"
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-[#050505]/75 border border-[#F4B544]/40 text-[#FFFAF0] hover:text-[#F4B544] hover:bg-[#10100F] hover:scale-110 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-xl backdrop-blur-sm"
                    aria-label="Slide anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Botão Próximo */}
                <button
                    type="button"
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-[#050505]/75 border border-[#F4B544]/40 text-[#FFFAF0] hover:text-[#F4B544] hover:bg-[#10100F] hover:scale-110 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-xl backdrop-blur-sm"
                    aria-label="Próximo slide"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Barra de Indicadores (Dots) Elegante e Nítida */}
            <div className="flex items-center justify-center gap-2 pt-3">
                {CAROUSEL_SLIDES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIdx(i)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                            i === currentIdx
                                ? "w-6 bg-[#F4B544] shadow-md shadow-[#F4B544]/50"
                                : "w-2 bg-white/20 hover:bg-white/50"
                        }`}
                        aria-label={`Ir para o slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
