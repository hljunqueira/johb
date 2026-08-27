import React from "react";
import { Plus, Heart } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const getImageUrl = (url, backendUrl) => {
    if (!url) return "/logo-semfundo.png";
    if (url.startsWith("http")) return url;
    return `${backendUrl || ''}${url}`;
};

export function EnhancedProductCard({ product, onClick, backendUrl, canOrder = true }) {
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addItem } = useCart();
    const favorited = isFavorite(product.id);
    const hasAdditionals = (product.additionals && product.additionals.length > 0) || (product.complements && product.complements.length > 0);

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
        if (!favorited) {
            toast.success(`${product.name} adicionado aos favoritos!`, {
                style: {
                    background: "#171612",
                    color: "#FFFAF0",
                    border: "1px solid rgba(244, 181, 68, 0.4)"
                }
            });
        } else {
            toast.info(`${product.name} removido dos favoritos.`, {
                style: {
                    background: "#171612",
                    color: "#FFFAF0",
                    border: "1px solid rgba(244, 181, 68, 0.2)"
                }
            });
        }
    };

    const handleQuickAdd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canOrder) {
            toast.error("A loja está fechada para novos pedidos no momento.");
            return;
        }
        if (hasAdditionals) {
            onClick(product);
        } else {
            addItem(product, 1, [], "");
            toast.success(`${product.name} adicionado ao carrinho!`, {
                style: {
                    background: "#171612",
                    color: "#FFFAF0",
                    border: "1px solid rgba(244, 181, 68, 0.4)"
                }
            });
        }
    };

    return (
        <div
            onClick={() => onClick(product)}
            className="group relative bg-[#10100F] rounded-2xl overflow-hidden border border-[#F4B544]/15 hover:border-[#F4B544]/50 transition-all duration-300 flex flex-col justify-between cursor-pointer gold-glow-sm hover:-translate-y-1 select-none"
            data-testid={`product-${product.id}`}
        >
            {/* Foto com overlay sutil */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141414] flex items-center justify-center">
                <img
                    src={getImageUrl(product.image_url, backendUrl)}
                    alt={product.name}
                    className={`w-full h-full ${product.image_url ? 'object-cover group-hover:scale-105' : 'object-contain p-8 opacity-40'} transition-transform duration-500`}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10100F] via-transparent to-transparent opacity-60" />

                {/* Botão de Favorito */}
                <button
                    type="button"
                    onClick={handleFavoriteClick}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-[#050505]/80 backdrop-blur-md border border-[#F4B544]/30 hover:border-[#F4B544] text-[#B8B1A3] hover:text-[#F4B544] flex items-center justify-center shadow-lg transition-all active:scale-90"
                    aria-label="Favoritar produto"
                >
                    <Heart className={`w-4 h-4 transition-colors ${favorited ? "fill-[#F4B544] text-[#F4B544]" : ""}`} />
                </button>

                {/* Badge de Tag Cadastrada pelo Admin */}
                {(() => {
                    const tags = Array.isArray(product.tags) ? product.tags : (product.tag ? [product.tag] : []);
                    const tagMap = {
                        mais_pedido: { label: "🔥 Mais Pedido", color: "bg-red-500/20 text-red-300 border-red-500/40" },
                        assado_na_hora: { label: "🥟 Assado na Hora", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                        vegano: { label: "🌱 Vegano", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                        vegetariano: { label: "🌱 Vegetariano", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                        destaque: { label: "⭐ Especial", color: "bg-[#F4B544]/25 text-[#F4B544] border-[#F4B544]/50" },
                        novo: { label: "✨ Novidade", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" }
                    };
                    const firstTag = tags.find(t => tagMap[t.toLowerCase()]);
                    if (firstTag) {
                        const info = tagMap[firstTag.toLowerCase()];
                        return (
                            <div className="absolute top-3 left-3 z-10">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border ${info.color}`}>
                                    {info.label}
                                </span>
                            </div>
                        );
                    }
                    if (hasAdditionals) {
                        return (
                            <div className="absolute top-3 left-3 z-10">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#050505]/85 backdrop-blur-md text-[#F4B544] border border-[#F4B544]/30">
                                    Opções
                                </span>
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>

            {/* Conteúdo do Card */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                    <h3 className="font-serif text-lg font-bold text-[#FFFAF0] group-hover:text-[#F4B544] transition-colors line-clamp-1">
                        {product.name}
                    </h3>
                    <p className="text-xs text-[#B8B1A3] line-clamp-2 mt-1 font-light leading-relaxed">
                        {product.description || "Ingredientes selecionados e preparo artesanal."}
                    </p>
                </div>

                {/* Preço e Botão Rápido de + */}
                <div className="pt-2 flex items-center justify-between border-t border-[#F4B544]/10">
                    <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#B8B1A3] block">Preço</span>
                        <span className="text-base font-bold text-[#F4B544] tracking-tight">
                            R$ {(product.price || 0).toFixed(2).replace(".", ",")}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleQuickAdd}
                        disabled={!canOrder}
                        className={`w-10 h-10 rounded-full font-bold transition-all transform flex items-center justify-center ${
                            canOrder
                                ? "bg-[#F4B544] text-[#050505] hover:bg-[#FFC85C] active:scale-90 shadow-md cursor-pointer"
                                : "bg-[#1A1A1A] text-gray-600 border border-white/10 cursor-not-allowed opacity-60"
                        }`}
                        title={!canOrder ? "Loja fechada no momento" : (hasAdditionals ? "Personalizar item" : "Adicionar ao carrinho")}
                        data-testid={`add-${product.id}`}
                    >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
