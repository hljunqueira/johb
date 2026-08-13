import React from "react";
import { ArrowRight, Sparkles, Heart, Utensils } from "lucide-react";

export function HeroSection({ onVerCardapio, onVerCombos }) {
    return (
        <section className="relative overflow-hidden bg-[#050505] text-[#FFFAF0] pt-8 pb-16 md:py-20 lg:py-24 border-b border-[#F4B544]/15">
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F4B544]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#C88A24]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    
                    {/* Coluna de Texto & Composição Tipográfica */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                        
                        {/* Tagline / Insígnia da Marca */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10100F] border border-[#F4B544]/30 text-xs font-medium tracking-widest text-[#F4B544] uppercase gold-glow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-[#F4B544]" />
                            <span>Balneário Arroio do Silva — SC</span>
                        </div>

                        {/* Título Principal Editorial */}
                        <div className="space-y-1">
                            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#FFFAF0] leading-[1.08]">
                                FEITO COM <span className="gold-gradient-text italic font-normal">CARINHO.</span> <br />
                                SERVIDO COM <span className="gold-gradient-text italic font-normal">SABOR.</span>
                            </h1>
                        </div>

                        {/* Divisor Ornamental */}
                        <div className="flex items-center gap-3 pt-1 pb-2">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-[#F4B544] to-transparent" />
                            <Heart className="w-4 h-4 text-[#F4B544] fill-[#F4B544]/20" />
                            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#F4B544]/40 to-transparent" />
                        </div>

                        {/* Descrição Narrativa */}
                        <p className="text-base sm:text-lg md:text-xl text-[#B8B1A3] max-w-xl font-light leading-relaxed">
                            Salgados artesanais assados e fritos em pequenos lotes ao longo do dia. Massa leve, recheios bem temperados e o sabor que chega quentinho na sua porta.
                        </p>

                        {/* CTAs de Ação */}
                        <div className="pt-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                            <button
                                onClick={onVerCardapio || (() => {
                                    const el = document.getElementById("cardapio");
                                    if (el) el.scrollIntoView({ behavior: "smooth" });
                                })}
                                className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#F4B544] text-[#050505] font-bold text-sm uppercase tracking-widest hover:bg-[#FFC85C] transition-all shadow-lg hover:shadow-[#F4B544]/20 transform hover:-translate-y-0.5"
                            >
                                <span>Ver Cardápio</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>

                            <button
                                onClick={onVerCombos || (() => {
                                    const el = document.getElementById("combos");
                                    if (el) el.scrollIntoView({ behavior: "smooth" });
                                })}
                                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full bg-[#10100F] border border-[#F4B544]/30 text-[#FFFAF0] font-semibold text-sm uppercase tracking-wider hover:border-[#F4B544] hover:text-[#F4B544] transition-all"
                            >
                                <Utensils className="w-4 h-4 text-[#F4B544]" />
                                <span>Ver Combos JOHB</span>
                            </button>
                        </div>

                        {/* Destaques Rápidos */}
                        <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#F4B544]/15 max-w-md">
                            <div>
                                <span className="block font-serif text-2xl font-bold text-[#F4B544]">100%</span>
                                <span className="text-[11px] text-[#B8B1A3] uppercase tracking-wider">Artesanal</span>
                            </div>
                            <div>
                                <span className="block font-serif text-2xl font-bold text-[#F4B544]">Forno</span>
                                <span className="text-[11px] text-[#B8B1A3] uppercase tracking-wider">Sempre Quente</span>
                            </div>
                            <div>
                                <span className="block font-serif text-2xl font-bold text-[#F4B544]">Entrega</span>
                                <span className="text-[11px] text-[#B8B1A3] uppercase tracking-wider">Rápida e Local</span>
                            </div>
                        </div>

                    </div>

                    {/* Coluna Fotográfica — Foco em Salgados */}
                    <div className="lg:col-span-5 relative">
                        <div className="relative mx-auto max-w-md lg:max-w-none">
                            {/* Moldura de Salgado Destaque */}
                            <div className="relative rounded-2xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] shadow-2xl gold-glow">
                                <img
                                    src="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80"
                                    alt="Salgados Artesanais JOHB"
                                    className="w-full h-[380px] sm:h-[450px] object-cover object-center transform hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-75" />
                                
                                {/* Badge Flutuante no Canto */}
                                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-[#050505]/90 backdrop-blur-md border border-[#F4B544]/30 flex items-center justify-between">
                                    <div>
                                        <span className="block text-xs uppercase tracking-wider text-[#F4B544] font-semibold">Mais Pedido</span>
                                        <span className="block text-sm font-serif font-bold text-[#FFFAF0]">Coxinha Cremosa de Frango</span>
                                    </div>
                                    <span className="text-sm font-bold text-[#F4B544] bg-[#171612] px-3 py-1.5 rounded-lg border border-[#F4B544]/20">
                                        R$ 9,90
                                    </span>
                                </div>
                            </div>

                            {/* Elemento Decorativo */}
                            <div className="absolute -bottom-4 -right-4 w-full h-full rounded-2xl border border-[#F4B544]/15 -z-10 hidden sm:block" />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
