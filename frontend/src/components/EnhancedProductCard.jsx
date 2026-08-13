import React from "react";
import { Plus, Heart } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const getImageUrl = (url, backendUrl) => {
    if (!url) return "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80";
    if (url.startsWith("http")) return url;
    return `${backendUrl || ''}${url}`;
};

export function EnhancedProductCard({ product, onClick, backendUrl }) {
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart } = useCart();
    const favorited = isFavorite(product.id);
    const hasAdditionals = (product.additionals && product.additionals.length > 0) || (product.complements && product.complements.length > 0);

    const handleQuickAdd = (e) => {
        e.stopPropagation();
        if (hasAdditionals) {
            onClick(product);
        } else {
            addToCart({
                ...product,
                quantity: 1,
                additionals: [],
                observation: ""
            });
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
            className="group relative bg-[#10100F] rounded-xl overflow-hidden border border-[#F4B544]/15 hover:border-[#F4B544]/50 transition-all duration-300 flex flex-col justify-between cursor-pointer gold-glow-sm hover:-translate-y-1"
            data-testid={`product-${product.id}`}
        >
            {/* Foto com overlay sutil */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#171612]">
                <img
                    src={getImageUrl(product.image_url, backendUrl)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10100F] via-transparent to-transparent opacity-60" />

                {/* Favorito */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                    }}
                    className="absolute top-2.5 right-2.5 p-2 rounded-full bg-[#050505]/75 backdrop-blur-md border border-[#F4B544]/20 hover:border-[#F4B544] text-[#B8B1A3] hover:text-[#F4B544] transition-colors"
                    aria-label="Favoritar produto"
                >
                    <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-[#F4B544] text-[#F4B544]" : ""}`} />
                </button>

                {/* Badge de Destaque / Personalizável */}
                {hasAdditionals && (
                    <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#050505]/85 backdrop-blur-md text-[#F4B544] border border-[#F4B544]/30">
                            Opções
                        </span>
                    </div>
                )}
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
                        onClick={handleQuickAdd}
                        className="p-2.5 rounded-full bg-[#F4B544] text-[#050505] hover:bg-[#FFC85C] font-bold transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-1"
                        title={hasAdditionals ? "Personalizar" : "Adicionar rápido"}
                        data-testid={`add-${product.id}`}
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
