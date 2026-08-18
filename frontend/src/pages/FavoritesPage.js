import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { ArrowLeft, Heart, ShoppingCart, Trash2, Plus } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const getImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
};

export default function FavoritesPage() {
    const navigate = useNavigate();
    const { favorites, removeFavorite, clearFavorites } = useFavorites();
    const { addItem } = useCart();

    const handleAddToCart = (product) => {
        addItem(product, 1, [], "");
        toast.success(`${product.name} adicionado ao carrinho!`, {
            style: {
                background: "#171612",
                color: "#FFFAF0",
                border: "1px solid rgba(244, 181, 68, 0.4)"
            }
        });
    };

    const handleRemove = (productId, productName) => {
        removeFavorite(productId);
        toast.success(`${productName} removido dos favoritos`);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FFFAF0] antialiased pb-16" data-testid="favorites-page">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#10100F]/95 backdrop-blur-md border-b border-[#F4B544]/20 py-4 px-4 sm:px-8">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#B8B1A3] hover:text-[#F4B544] transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Cardápio</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-[#F4B544] fill-[#F4B544]" />
                        <span className="font-serif font-bold text-base text-[#FFFAF0]">Meus Favoritos</span>
                    </div>
                    {favorites.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFavorites}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Limpar
                        </Button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold">
                        Sua Seleção de Preferidos
                    </span>
                    <h1 className="font-serif text-3xl font-bold text-[#FFFAF0]">
                        Salvos para Saborear
                    </h1>
                </div>

                {favorites.length === 0 ? (
                    <div className="text-center py-16 bg-[#10100F] rounded-2xl border border-[#F4B544]/15 p-6">
                        <Heart className="h-14 w-14 text-[#F4B544] mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-serif font-bold text-[#FFFAF0] mb-2">Nenhum favorito salvo ainda</h2>
                        <p className="text-xs text-[#B8B1A3] max-w-sm mx-auto mb-6">
                            Toque no coração dos seus salgados, bolos e cafés preferidos no cardápio para pedir rapidamente depois!
                        </p>
                        <Button
                            onClick={() => navigate("/")}
                            className="rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs px-8 py-3.5 hover:bg-[#FFC85C] gold-glow"
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Explorar Cardápio
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {favorites.map(product => (
                            <div 
                                key={product.id} 
                                className="bg-[#10100F] rounded-2xl border border-[#F4B544]/20 overflow-hidden flex shadow-lg gold-glow-sm"
                            >
                                <div 
                                    className="w-32 h-32 bg-[#171612] flex-shrink-0 cursor-pointer overflow-hidden"
                                    onClick={() => navigate(`/?product=${product.id}`)}
                                >
                                    <img 
                                        src={getImageUrl(product.image_url)} 
                                        alt={product.name}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                <div className="flex-1 p-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <h3 
                                            className="font-serif font-bold text-[#FFFAF0] text-sm line-clamp-1 cursor-pointer hover:text-[#F4B544]"
                                            onClick={() => navigate(`/?product=${product.id}`)}
                                        >
                                            {product.name}
                                        </h3>
                                        <button
                                            onClick={() => handleRemove(product.id, product.name)}
                                            className="text-[#B8B1A3] hover:text-red-400 p-1"
                                            title="Remover dos favoritos"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <p className="text-[11px] text-[#B8B1A3] line-clamp-1 font-light">
                                        {product.description || "Preparo artesanal JOHB."}
                                    </p>

                                    <div className="flex items-center justify-between pt-2 border-t border-[#F4B544]/10">
                                        <span className="font-bold text-[#F4B544] text-sm">
                                            R$ {(product.price || 0).toFixed(2).replace(".", ",")}
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddToCart(product)}
                                            className="rounded-full bg-[#F4B544] text-[#050505] hover:bg-[#FFC85C] text-xs font-bold px-3 py-1 gap-1"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Adicionar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
