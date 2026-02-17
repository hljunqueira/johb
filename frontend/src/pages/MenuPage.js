import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCustomer } from "@/context/CustomerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, ShoppingCart, Plus, Minus, Clock, Leaf, Heart, Layers, Grid3X3, ChevronRight, User, History, RotateCcw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
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
const getTagStyle = (tag) => tagLabels[tag] || { label: tag, color: "bg-gray-100 text-gray-700" };

// Complement category labels and order
const complementCategories = {
    base_folhas: { label: "Base de Folhas", order: 0, icon: "🥬" },
    proteina: { label: "Proteina", order: 1, icon: "🍗" },
    legumes: { label: "Legumes & Verduras", order: 2, icon: "🥕" },
    frutas: { label: "Frutas", order: 3, icon: "🍓" },
    extras: { label: "Extras & Crocancia", order: 4, icon: "🥜" },
    molhos: { label: "Molhos & Cremes", order: 5, icon: "🥣" },
    temperos: { label: "Temperos", order: 6, icon: "🧂" }
};

/* ============ PRODUCT DETAIL MODAL ============ */
const ProductDetailModal = memo(function ProductDetailModal({ product, open, onClose, onAdd }) {
    const [selectedAdditionals, setSelectedAdditionals] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState("");

    useEffect(() => {
        if (open) { 
            setSelectedAdditionals([]); 
            setQuantity(1); 
            setObservation(""); 
        }
    }, [open]);

    const toggleAdditional = useCallback((add) => {
        setSelectedAdditionals(prev =>
            prev.find(a => a.name === add.name) ? prev.filter(a => a.name !== add.name) : [...prev, add]
        );
    }, []);

    const addPrice = selectedAdditionals.reduce((s, a) => s + a.price, 0);
    const unitTotal = product.price + addPrice;
    const totalPrice = unitTotal * quantity;

    const handleAdd = useCallback(() => {
        onAdd(product, quantity, selectedAdditionals, observation);
        onClose();
    }, [product, quantity, selectedAdditionals, observation, onAdd, onClose]);

    // Return null if no product (after all hooks)
    if (!product) return null;

    // Group additionals by category
    const groupedAdditionals = {};
    const additionals = Array.isArray(product.additionals) ? product.additionals : [];
    if (additionals.length > 0) {
        additionals.forEach(add => {
            const cat = add.category || "outros";
            if (!groupedAdditionals[cat]) groupedAdditionals[cat] = [];
            groupedAdditionals[cat].push(add);
        });
    }
    const sortedCategories = Object.keys(groupedAdditionals).sort((a, b) => 
        (complementCategories[a]?.order ?? 99) - (complementCategories[b]?.order ?? 99)
    );

    const isCustomizable = product.tags?.includes("personalizavel") || additionals.length > 0;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="p-0 rounded-2xl overflow-hidden max-w-lg max-h-[90vh] overflow-y-auto !block !gap-0" data-testid="product-detail-modal">
                <DialogTitle className="sr-only">{product?.name || "Detalhes do produto"}</DialogTitle>
                {/* Image - Proporção compacta */}
                <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted max-h-[180px] flex-shrink-0">
                    <img 
                        src={getImageUrl(product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=600";
                        }}
                    />
                </div>

                <div className="p-4 space-y-3">
                    {/* Name, Price & Description */}
                    <div>
                        <div className="flex justify-between items-start gap-2">
                            <h2 className="text-lg font-bold font-heading text-foreground flex-1">{product.name}</h2>
                            <span className="text-lg font-bold text-primary whitespace-nowrap">R$ {product.price.toFixed(2)}</span>
                        </div>
                        {/* Descrição abaixo do nome */}
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                    </div>

                    {/* Grouped Additionals */}
                    {isCustomizable && sortedCategories.length > 0 && (
                        <div className="space-y-4">
                            <Separator />
                            <h3 className="font-semibold text-base font-heading">Monte do seu jeito</h3>
                            
                            {sortedCategories.map(catKey => {
                                const catInfo = complementCategories[catKey] || { label: catKey, icon: "+" };
                                const items = groupedAdditionals[catKey];
                                
                                const hasRequired = items.some(add => add.required);
                                const catMinSelect = items[0]?.min_select || 0;
                                const catMaxSelect = items[0]?.max_select || 1;
                                
                                return (
                                    <div key={catKey} className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <span>{catInfo.icon}</span>
                                            <span>{catInfo.label}</span>
                                            {hasRequired && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Obrigatório</span>
                                            )}
                                            {!hasRequired && catMaxSelect > 1 && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Até {catMaxSelect}</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {items.map(add => {
                                                const isSelected = selectedAdditionals.find(a => a.name === add.name);
                                                const isRequired = add.required;
                                                const selectionInfo = add.min_select > 0 
                                                    ? `Mínimo ${add.min_select}` 
                                                    : add.max_select > 1 
                                                        ? `Até ${add.max_select}` 
                                                        : null;
                                                return (
                                                    <button key={add.name} type="button" onClick={() => toggleAdditional(add)}
                                                        data-testid={`additional-${add.name.replace(/\s+/g, '-').toLowerCase()}`}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${isSelected ? "border-primary bg-primary/5" : isRequired ? "border-amber-300 bg-amber-50/30" : "border-border hover:border-primary/30"}`}>
                                                        <div className="flex items-center gap-3">
                                                            {/* Foto do complemento */}
                                                            {add.image_url ? (
                                                                <img 
                                                                    src={getImageUrl(add.image_url)} 
                                                                    alt={add.name}
                                                                    className="h-10 w-10 rounded-lg object-cover border border-border"
                                                                />
                                                            ) : (
                                                                <div className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-muted"}`}>
                                                                    {isSelected && <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{add.name}</span>
                                                                {isRequired && (
                                                                    <span className="text-xs text-amber-600 font-medium">Obrigatório</span>
                                                                )}
                                                                {selectionInfo && !isRequired && (
                                                                    <span className="text-xs text-muted-foreground">{selectionInfo}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-primary">
                                                            {add.price > 0 ? `+ R$ ${add.price.toFixed(2)}` : "Gratis"}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Observation */}
                    <div>
                        <Separator className="mb-3" />
                        <h3 className="font-semibold text-sm font-heading mb-2">Alguma observacao?</h3>
                        <textarea value={observation} onChange={e => setObservation(e.target.value)}
                            placeholder="Ex: Sem cebola, molho a parte..."
                            className="w-full rounded-xl border border-input bg-white p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            data-testid="product-observation" />
                    </div>

                    {/* Quantity + Add */}
                    <div className="flex items-center gap-4 pt-1">
                        <div className="flex items-center gap-2 bg-muted rounded-full px-1 py-1">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="h-9 w-9 rounded-full bg-white border border-border flex items-center justify-center hover:bg-gray-50 transition-colors" data-testid="modal-qty-minus">
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-semibold" data-testid="modal-qty">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="h-9 w-9 rounded-full bg-white border border-border flex items-center justify-center hover:bg-gray-50 transition-colors" data-testid="modal-qty-plus">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <Button onClick={handleAdd} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-full py-5 font-semibold text-base" data-testid="modal-add-btn">
                            Adicionar - R$ {totalPrice.toFixed(2)}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});

/* ============ CART CONTENT ============ */
function CartContent({ items, removeItem, updateQuantity, total, itemCount, onCheckout }) {
    if (itemCount === 0) return (
        <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Seu carrinho esta vazio</p>
        </div>
    );
    return (
        <div className="flex flex-col">
            <div className="space-y-3 max-h-[40vh] overflow-auto pr-1">
                {items.map(item => (
                    <div key={item.cart_id} className="flex items-start gap-3" data-testid={`cart-item-${item.cart_id}`}>
                        <img src={getImageUrl(item.image_url)} alt={item.product_name} className="h-14 w-14 rounded-xl object-cover flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product_name}</p>
                            {item.additionals?.length > 0 && (
                                <p className="text-xs text-accent">+ {item.additionals.map(a => a.name).join(", ")}</p>
                            )}
                            {item.observation && <p className="text-xs text-muted-foreground italic">"{item.observation}"</p>}
                            <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => updateQuantity(item.cart_id, item.quantity - 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted" data-testid={`decrease-${item.cart_id}`}>
                                <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.cart_id, item.quantity + 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted" data-testid={`increase-${item.cart_id}`}>
                                <Plus className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold font-heading"><span>Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
            </div>
            <Button onClick={onCheckout} className="w-full mt-4 bg-accent hover:bg-accent/90 text-white rounded-full py-5 font-semibold text-base" data-testid="checkout-btn">
                Finalizar Pedido
            </Button>
        </div>
    );
}

/* ============ PRODUCT CARD ============ */
function ProductCard({ product, onClick, backendUrl }) {
    const { toggleFavorite, isFavorite } = useFavorites();
    const favorite = isFavorite(product.id);

    const getImageUrl = (url) => {
        if (!url) return "https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=400";
        if (url.startsWith("http")) return url;
        return `${backendUrl}${url}`;
    };

    const hasOpcionais = (Array.isArray(product.additionals) && product.additionals.length > 0) || 
                             (Array.isArray(product.complement_ids) && product.complement_ids.length > 0);

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        toggleFavorite(product);
    };

    return (
        <div 
            onClick={() => onClick(product)}
            className="bg-white rounded-2xl border border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
            data-testid={`product-${product.id}`}
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img 
                    src={getImageUrl(product.image_url)} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                {product.tags?.includes("mais_pedido") && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        Popular
                    </div>
                )}
                {hasOpcionais && (
                    <div className="absolute bottom-2 right-2 bg-primary/90 text-white text-xs px-2 py-1 rounded-full">
                        Personalizável
                    </div>
                )}
                {/* Botão de Favorito */}
                <button
                    onClick={handleFavoriteClick}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                        favorite 
                            ? "bg-red-500 text-white" 
                            : "bg-white/80 text-muted-foreground hover:bg-white hover:text-red-500"
                    }`}
                >
                    <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
                </button>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold font-heading text-foreground line-clamp-1">{product.name}</h3>
                    <span className="font-bold text-primary whitespace-nowrap ml-2">R$ {product.price?.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
                <div className="flex flex-wrap gap-1">
                    {product.tags?.slice(0, 3).map(tag => {
                        const style = getTagStyle(tag);
                        return (
                            <span key={tag} className={`px-2 py-0.5 rounded-full text-xs ${style.color}`}>
                                {style.label}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ============ MENU PAGE ============ */
/* ============ LOGIN MODAL ============ */
function LoginModal({ open, onClose, onLogin }) {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [step, setStep] = useState("phone"); // phone | name
    const [loading, setLoading] = useState(false);

    const formatPhone = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const handlePhoneSubmit = (e) => {
        e.preventDefault();
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length < 10) {
            toast.error("Digite um telefone válido");
            return;
        }
        setStep("name");
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Digite seu nome");
            return;
        }
        setLoading(true);
        const result = await onLogin(phone.replace(/\D/g, ""), name.trim());
        setLoading(false);
        if (result.success) {
            toast.success(result.isNew ? "Bem-vindo!" : "Bem-vindo de volta!");
            onClose();
        } else {
            toast.error("Erro ao fazer login");
        }
    };

    const handleClose = () => {
        setPhone("");
        setName("");
        setStep("phone");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-white">
                <div className="text-center py-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold font-heading mb-2">
                        {step === "phone" ? "Identifique-se" : "Como podemos te chamar?"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {step === "phone" 
                            ? "Digite seu telefone para acessar seus favoritos e histórico" 
                            : "Digite seu nome para personalizar sua experiência"}
                    </p>
                </div>

                {step === "phone" ? (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <div>
                            <Input
                                type="tel"
                                placeholder="(11) 99999-9999"
                                value={phone}
                                onChange={e => setPhone(formatPhone(e.target.value))}
                                maxLength={15}
                                className="text-center text-lg"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full">
                            Continuar
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={handleClose}>
                            Pular por enquanto
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleNameSubmit} className="space-y-4">
                        <div>
                            <Input
                                type="text"
                                placeholder="Seu nome"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="text-center"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" disabled={loading}>
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("phone")}>
                            Voltar
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ============ REORDER SECTION ============ */
function ReorderSection({ suggestions, onReorder }) {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-5 border border-primary/10">
            <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-5 w-5 text-primary" />
                <h2 className="font-bold font-heading text-lg">Pedir Novamente</h2>
                <span className="text-xs text-muted-foreground ml-auto">Baseado nos seus pedidos</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {suggestions.map(product => (
                    <button
                        key={product.product_id}
                        onClick={() => onReorder(product)}
                        className="flex-shrink-0 w-36 bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left"
                    >
                        <div className="h-24 bg-muted">
                            <img 
                                src={getImageUrl(product.image_url)} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="p-3">
                            <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Pedido {product.times_ordered}x
                            </p>
                            <p className="font-bold text-primary text-sm mt-1">
                                R$ {product.price?.toFixed(2)}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function MenuPage() {
    const [menus, setMenus] = useState([]);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [cartOpen, setCartOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    
    const { items, addItem, removeItem, updateQuantity, total, itemCount } = useCart();
    const { favorites } = useFavorites();
    const { customer, isLoggedIn, login, reorderSuggestions } = useCustomer();
    const navigate = useNavigate();

    // Load menus on mount
    useEffect(() => {
        const fetchMenus = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API}/menus`);
                const menusData = Array.isArray(res.data) ? res.data : [];
                setMenus(menusData);
                
                const activeMenu = menusData.find(m => m.active) || menusData[0];
                if (activeMenu) {
                    setSelectedMenu(activeMenu.id);
                }
            } catch (err) {
                console.error("Error fetching menus:", err);
                toast.error("Erro ao carregar menus");
            } finally {
                setLoading(false);
            }
        };
        fetchMenus();
    }, []);

    // Load categories when menu is selected
    useEffect(() => {
        if (!selectedMenu) return;
        
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API}/menus/${selectedMenu}/categories`);
                const cats = Array.isArray(res.data) ? res.data : [];
                setCategories(cats);
                
                if (cats.length > 0) {
                    setSelectedCategory(cats[0].id);
                } else {
                    setSelectedCategory(null);
                    setProducts([]);
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                toast.error("Erro ao carregar categorias");
            }
        };
        fetchCategories();
    }, [selectedMenu]);

    // Load products when category is selected
    useEffect(() => {
        if (!selectedCategory) {
            setProducts([]);
            return;
        }
        
        const fetchProducts = async () => {
            try {
                const res = await axios.get(`${API}/categories/${selectedCategory}/products`);
                let prods = Array.isArray(res.data) ? res.data : [];
                setProducts(prods);
            } catch (err) {
                console.error("Error fetching products:", err);
                toast.error("Erro ao carregar produtos");
            }
        };
        fetchProducts();
    }, [selectedCategory]);

    // Filter products by search
    const filteredProducts = useMemo(() => {
        if (!search) return products;
        return products.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase())
        );
    }, [products, search]);

    const handleAddItem = (product, quantity, additionals, observation) => {
        addItem(product, quantity, additionals, observation);
        toast.success("Item adicionado ao carrinho!");
    };

    // Get current menu and category names
    const currentMenu = menus.find(m => m.id === selectedMenu);
    const currentCategory = categories.find(c => c.id === selectedCategory);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Leaf className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Carregando cardapio...</p>
                </div>
            </div>
        );
    }

    // Mostrar mensagem quando não há menus cadastrados
    if (menus.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-bold font-heading mb-2">Cardapio em preparação</h2>
                    <p className="text-muted-foreground mb-4">Nosso cardapio está sendo montado. Volte em breve!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background" data-testid="menu-page">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">SS</div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-lg text-foreground font-heading leading-tight">Salada Soul</h1>
                            <p className="text-xs text-muted-foreground">Nutre o corpo, alimenta a alma</p>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-1 max-w-md mx-4">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                data-testid="search-input" 
                                placeholder="Buscar produtos..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                className="pl-10 rounded-full border-border bg-white" 
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Botão de Login ou Nome do Cliente */}
                        {isLoggedIn ? (
                            <Button variant="ghost" size="sm" className="text-foreground hidden sm:flex" onClick={() => navigate("/historico")}>
                                <User className="h-4 w-4 mr-1" />
                                {customer?.name?.split(" ")[0]}
                            </Button>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => setLoginModalOpen(true)} className="text-foreground hidden sm:flex">
                                <User className="h-4 w-4 mr-1" />
                                Entrar
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => navigate("/favoritos")} data-testid="favorites-btn" className="text-foreground hidden sm:flex">
                            <Heart className="h-4 w-4 mr-1" /> 
                            Favoritos
                            {favorites.length > 0 && <Badge className="ml-1 bg-red-500 text-white">{favorites.length}</Badge>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate("/historico")} data-testid="history-btn" className="text-foreground hidden sm:flex">
                            <Clock className="h-4 w-4 mr-1" /> Historico
                        </Button>
                        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                            <SheetTrigger asChild>
                                <Button className="relative bg-primary text-primary-foreground rounded-full" size="icon" data-testid="mobile-cart-btn">
                                    <ShoppingCart className="h-5 w-5" />
                                    {itemCount > 0 && <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{itemCount}</span>}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:max-w-md bg-white">
                                <SheetHeader><SheetTitle className="font-heading">Seu Pedido</SheetTitle></SheetHeader>
                                <div className="mt-4">
                                    <CartContent items={items} removeItem={removeItem} updateQuantity={updateQuantity} total={total} itemCount={itemCount} onCheckout={() => { setCartOpen(false); navigate("/checkout"); }} />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
                <div className="md:hidden px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar produtos..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="pl-10 rounded-full" 
                            data-testid="mobile-search" 
                        />
                    </div>
                </div>
            </header>

            {/* Main Content - Hierarquia: Menu → Categoria → Produto */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                {/* ===== MENU SELECTOR (visível apenas se houver mais de 1 menu) ===== */}
                {menus.length > 1 && (
                    <div className="mb-6">
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Selecione o Menu</h2>
                        <div className="flex flex-wrap gap-2">
                            {menus.map(menu => (
                                <button
                                    key={menu.id}
                                    onClick={() => setSelectedMenu(menu.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                        selectedMenu === menu.id
                                            ? "bg-primary text-white shadow-md"
                                            : "bg-white border border-border text-foreground hover:border-primary/50"
                                    }`}
                                >
                                    {menu.icon && <span>{menu.icon}</span>}
                                    {menu.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== BREADCRUMB / HEADER DO MENU ===== */}
                {currentMenu && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>Cardápio</span>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-medium text-foreground">{currentMenu.name}</span>
                        </div>
                        {currentMenu.description && (
                            <p className="text-muted-foreground">{currentMenu.description}</p>
                        )}
                    </div>
                )}

                {/* ===== CATEGORY TABS ===== */}
                {categories.length > 0 ? (
                    <div className="mb-8">
                        <div className="border-b border-border mb-6">
                            <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
                                {categories.map(category => (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                            selectedCategory === category.id
                                                ? "border-primary text-primary"
                                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                                        }`}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ===== REORDER SUGGESTIONS (se logado) ===== */}
                        {isLoggedIn && reorderSuggestions.length > 0 && (
                            <ReorderSection 
                                suggestions={reorderSuggestions} 
                                onReorder={(product) => {
                                    addItem(product, 1, [], "");
                                    toast.success(`${product.name} adicionado ao carrinho!`);
                                }}
                            />
                        )}

                        {/* ===== CATEGORY HEADER ===== */}
                        {currentCategory && (
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold font-heading text-foreground">
                                    {currentCategory.name}
                                </h2>
                                {currentCategory.description && (
                                    <p className="text-muted-foreground mt-1">{currentCategory.description}</p>
                                )}
                            </div>
                        )}

                        {/* ===== PRODUCTS GRID ===== */}
                        {filteredProducts.length > 0 ? (
                            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredProducts.map(product => (
                                    <ProductCard 
                                        key={product.id}
                                        product={product}
                                        onClick={setSelectedProduct}
                                        backendUrl={BACKEND_URL}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-muted/30 rounded-2xl">
                                <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                                <p className="text-muted-foreground text-sm">
                                    {search ? "Tente buscar por outro termo" : "Nenhum produto nesta categoria"}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-2xl">
                        <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">Nenhuma categoria disponível</p>
                        <p className="text-muted-foreground">Este menu ainda não possui categorias cadastradas</p>
                    </div>
                )}
            </div>

            {/* Mobile floating checkout */}
            {itemCount > 0 && (
                <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
                    <Button 
                        onClick={() => navigate("/checkout")} 
                        className="w-full bg-accent hover:bg-accent/90 text-white rounded-full py-5 text-base font-semibold shadow-lg shadow-accent/30" 
                        data-testid="mobile-checkout-btn"
                    >
                        Ver Carrinho ({itemCount}) - R$ {total.toFixed(2)}
                    </Button>
                </div>
            )}

            {/* Product Detail Modal - mostra os OPCIONAIS */}
            <ProductDetailModal 
                product={selectedProduct} 
                open={!!selectedProduct} 
                onClose={() => setSelectedProduct(null)} 
                onAdd={handleAddItem} 
            />

            {/* Login Modal */}
            <LoginModal 
                open={loginModalOpen} 
                onClose={() => setLoginModalOpen(false)} 
                onLogin={login}
            />
        </div>
    );
}
