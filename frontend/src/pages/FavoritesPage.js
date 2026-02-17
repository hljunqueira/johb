import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { ArrowLeft, Heart, ShoppingCart, Trash2, Plus } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const getImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=400";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
};

const tagLabels = {
    vegano: { label: "Vegano", color: "bg-emerald-100 text-emerald-700" },
    leve: { label: "Leve", color: "bg-sky-100 text-sky-700" },
    mais_pedido: { label: "Popular", color: "bg-orange-100 text-orange-700" },
    recomendado: { label: "Recomendado", color: "bg-amber-100 text-amber-700" },
    personalizavel: { label: "Personalizavel", color: "bg-purple-100 text-purple-700" }
};

export default function FavoritesPage() {
    const navigate = useNavigate();
    const { favorites, removeFavorite, clearFavorites } = useFavorites();
    const { addItem } = useCart();

    const handleAddToCart = (product) => {
        addItem(product, 1, [], "");
        toast.success(`${product.name} adicionado ao carrinho!`);
    };

    const handleRemove = (productId, productName) => {
        removeFavorite(productId);
        toast.success(`${productName} removido dos favoritos`);
    };

    return (
        <div className="min-h-screen bg-background" data-testid="favorites-page">
            {/* Header */}
            <header className="bg-white border-b border-border sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold font-heading">Meus Favoritos</h1>
                    </div>
                    {favorites.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFavorites} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar
                        </Button>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {favorites.length === 0 ? (
                    <div className="text-center py-16">
                        <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Nenhum favorito ainda</h2>
                        <p className="text-muted-foreground mb-6">
                            Adicione produtos aos favoritos para encontrá-los facilmente
                        </p>
                        <Button onClick={() => navigate("/")} className="bg-primary text-white rounded-full">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Ver Cardápio
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {favorites.map(product => (
                            <div 
                                key={product.id} 
                                className="bg-white rounded-2xl border border-border overflow-hidden flex"
                            >
                                {/* Image */}
                                <div 
                                    className="w-32 h-32 bg-muted flex-shrink-0 cursor-pointer"
                                    onClick={() => navigate(`/?product=${product.id}`)}
                                >
                                    <img 
                                        src={getImageUrl(product.image_url)} 
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 
                                            className="font-semibold font-heading line-clamp-1 cursor-pointer"
                                            onClick={() => navigate(`/?product=${product.id}`)}
                                        >
                                            {product.name}
                                        </h3>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleRemove(product.id, product.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2 flex-1">
                                        {product.description}
                                    </p>

                                    {/* Tags */}
                                    {product.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {product.tags.slice(0, 2).map(tag => {
                                                const style = tagLabels[tag] || { label: tag, color: "bg-gray-100 text-gray-700" };
                                                return (
                                                    <span key={tag} className={`px-2 py-0.5 rounded-full text-xs ${style.color}`}>
                                                        {style.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Price & Add to Cart */}
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="font-bold text-primary">
                                            R$ {product.price?.toFixed(2)}
                                        </span>
                                        <Button 
                                            size="sm" 
                                            className="bg-accent text-white rounded-full"
                                            onClick={() => handleAddToCart(product)}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Adicionar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
