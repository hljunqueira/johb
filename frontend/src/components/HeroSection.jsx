import React from "react";
import { ArrowRight, Heart } from "lucide-react";

export function HeroSection({ onVerCardapio }) {
    return (
        <section className="relative overflow-hidden bg-[#050505] text-[#FFFAF0] pt-8 pb-16 md:py-20 lg:py-24 border-b border-[#F4B544]/15">
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F4B544]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#C88A24]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    
                    {/* Coluna de Texto & Composição Tipográfica */}
                    <div className="lg:col-span-7 space-y-6 text-left">

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

                        {/* Texto Oficial JOHB Solicitado pelo Cliente */}
                        <p className="text-base sm:text-lg text-[#FFFAF0] font-serif italic max-w-xl leading-relaxed">
                            "Cada um tem o seu favorito... mas escolher só um não é tarefa fácil!"
                        </p>
                        <p className="text-sm sm:text-base text-[#B8B1A3] max-w-xl font-light leading-relaxed">
                            Aqui na <strong className="text-[#F4B544] font-semibold">JOHB</strong>, cada produto é preparado com ingredientes selecionados, muito sabor e aquele carinho especial que faz toda a diferença.
                        </p>

                        {/* Destaques com Emojis */}
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171612] border border-[#F4B544]/20 text-xs font-semibold text-[#FFFAF0]">
                                🥐 Joelhos
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171612] border border-[#F4B544]/20 text-xs font-semibold text-[#FFFAF0]">
                                🍕 Mini Pizzas
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

                        {/* CTA de Ação */}
                        <div className="pt-4">
                            <button
                                onClick={onVerCardapio || (() => {
                                    const el = document.getElementById("cardapio");
                                    if (el) el.scrollIntoView({ behavior: "smooth" });
                                })}
                                className="group inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#F4B544] text-[#050505] font-bold text-sm uppercase tracking-widest hover:bg-[#FFC85C] transition-all shadow-lg hover:shadow-[#F4B544]/20 transform hover:-translate-y-0.5 gold-glow"
                            >
                                <span>Ver Cardápio & Agendar</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>

                    </div>

                    {/* Coluna Fotográfica — 4 Fotos 100% Salgados, Assados, Mini Pizzas e Cucas */}
                    <div className="lg:col-span-5 relative">
                        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                            
                            {/* Coxinhas & Salgados Fritos Dourados */}
                            <div className="relative rounded-2xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] group shadow-lg gold-glow-sm aspect-square">
                                <img
                                    src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80"
                                    alt="Coxinhas e Salgados Fritos JOHB"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
                                <span className="absolute bottom-3 left-3 text-xs font-bold text-[#F4B544]">
                                    🥟 Coxinhas & Esfirras
                                </span>
                            </div>

                            {/* Joelhos & Folhados Dourados */}
                            <div className="relative rounded-2xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] group shadow-lg gold-glow-sm aspect-square">
                                <img
                                    src="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80"
                                    alt="Joelhos e Folhados Assados JOHB"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
                                <span className="absolute bottom-3 left-3 text-xs font-bold text-[#F4B544]">
                                    🥐 Joelhos & Folhados
                                </span>
                            </div>

                            {/* Mini Pizzas com Queijo Derretido */}
                            <div className="relative rounded-2xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] group shadow-lg gold-glow-sm aspect-square">
                                <img
                                    src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80"
                                    alt="Mini Pizzas Artesanais JOHB"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
                                <span className="absolute bottom-3 left-3 text-xs font-bold text-[#F4B544]">
                                    🍕 Mini Pizzas
                                </span>
                            </div>

                            {/* Cucas & Empadinhas */}
                            <div className="relative rounded-2xl overflow-hidden border border-[#F4B544]/30 bg-[#10100F] group shadow-lg gold-glow-sm aspect-square">
                                <img
                                    src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80"
                                    alt="Cucas e Bolos Artesanais JOHB"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
                                <span className="absolute bottom-3 left-3 text-xs font-bold text-[#F4B544]">
                                    🍰 Cucas & Empadinhas
                                </span>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
