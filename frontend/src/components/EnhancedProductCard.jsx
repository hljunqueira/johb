import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, Plus, Star } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";

const getImageUrl = (url, backendUrl) => {
    if (!url) return "https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=400";
    if (url.startsWith("http")) return url;
    return `${backendUrl}${url}`;
};

const tagLabels = {
    vegano: { label: "Vegano", color: "bg-emerald-100 text-emerald-700" },
    leve: { label: "Leve", color: "bg-sky-100 text-sky-700" },
    mais_pedido: { label: "Popular", color: "bg-orange-100 text-orange-700" },
    recomendado: { label: "Recomendado", color: "bg-amber-100 text-amber-700" },
    personalizavel: { label: "Personalizável", color: "bg-purple-100 text-purple-700" }
};

const getTagStyle = (tag) => tagLabels[tag] || { label: tag, color: "bg-gray-100 text-gray-700" };

export function EnhancedProductCard({ product, onClick, onQuickView, backendUrl }) {
    const { toggleFavorite, isFavorite } = useFavorites();
    const hasAdditionals = product.additionals?.length > 0;
    const isCustomizable = product.tags?.includes("personalizavel");
    const favorited = isFavorite(product.id);

    return (
        <div 
            className="bg-white rounded-2xl border border-border/50 overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => onClick(product)}
            data-testid={`product-${product.id}`}
        >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img 
                    src={getImageUrl(product.image_url, backendUrl)} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                
                {/* Tags */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    {product.tags?.slice(0, 2).map(tag => {
                        const style = getTagStyle(tag);
                        return (
                            <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
                                {style.label}
                            </span>
                        );
                    })}
                </div>

                {/* Favorite Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                    }}
                    className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-white transition-colors"
                >
                    <Heart 
                        className={`h-5 w-5 transition-colors ${favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                    />
                </button>

                {/* Customizable Badge */}
                {(hasAdditionals || isCustomizable) && (
                    <div className="absolute bottom-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-foreground shadow-sm">
                            Personalizável
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base font-heading flex-1 line-clamp-1">
                        {product.name}
                    </h3>
                    <span className="font-bold text-lg whitespace-nowrap ml-2">
                        R$ {product.price.toFixed(2)}
                    </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                </p>

                {/* Rating & Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {product.rating && (
                        <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {product.rating}
                            {product.reviews && ` (${product.reviews})`}
                        </Badge>
                    )}
                    {(hasAdditionals || isCustomizable) && (
                        <Badge variant="outline" className="text-xs text-purple-700 border-purple-200">
                            Personalizável
                        </Badge>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {onQuickView && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickView(product);
                            }}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="flex-[2] bg-accent hover:bg-accent/90 text-white rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(product);
                        }}
                        data-testid={`add-${product.id}`}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        {(hasAdditionals || isCustomizable) ? "Escolher" : "Adicionar"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
