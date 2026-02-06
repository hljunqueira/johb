import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, ShoppingCart, Plus, Minus, Clock, Leaf, MessageCircle, X } from "lucide-react";

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
    recomendado: { label: "Recomendado", color: "bg-amber-100 text-amber-700" }
};
const getTagStyle = (tag) => tagLabels[tag] || { label: tag, color: "bg-purple-100 text-purple-700" };

/* ============ PRODUCT DETAIL MODAL ============ */
function ProductDetailModal({ product, open, onClose, onAdd }) {
    const [selectedAdditionals, setSelectedAdditionals] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState("");

    useEffect(() => {
        if (open) { setSelectedAdditionals([]); setQuantity(1); setObservation(""); }
    }, [open]);

    if (!product) return null;

    const toggleAdditional = (add) => {
        setSelectedAdditionals(prev =>
            prev.find(a => a.name === add.name) ? prev.filter(a => a.name !== add.name) : [...prev, add]
        );
    };

    const addPrice = selectedAdditionals.reduce((s, a) => s + a.price, 0);
    const unitTotal = product.price + addPrice;
    const totalPrice = unitTotal * quantity;

    const handleAdd = () => {
        onAdd(product, quantity, selectedAdditionals, observation);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="p-0 rounded-2xl overflow-hidden max-w-lg max-h-[90vh] overflow-y-auto" data-testid="product-detail-modal">
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                        {product.tags?.map(tag => {
                            const style = getTagStyle(tag);
                            return <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.color}`}>{style.label}</span>;
                        })}
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Name & Price */}
                    <div>
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold font-heading text-foreground">{product.name}</h2>
                            <span className="text-xl font-bold text-primary whitespace-nowrap ml-3">R$ {product.price.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                    </div>

                    {/* Additionals */}
                    {product.additionals?.length > 0 && (
                        <div>
                            <Separator className="mb-3" />
                            <h3 className="font-semibold text-sm font-heading mb-3">Monte do seu jeito</h3>
                            <div className="space-y-2">
                                {product.additionals.map(add => {
                                    const isSelected = selectedAdditionals.find(a => a.name === add.name);
                                    return (
                                        <button key={add.name} type="button" onClick={() => toggleAdditional(add)}
                                            data-testid={`additional-${add.name}`}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                                    {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className="text-sm font-medium">{add.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-primary">+ R$ {add.price.toFixed(2)}</span>
                                        </button>
                                    );
                                })}
                            </div>
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
}

/* ============ PRODUCT CARD ============ */
function ProductCard({ product, onClick }) {
    const hasAdditionals = product.additionals?.length > 0;
    return (
        <div className="product-card bg-white rounded-2xl border border-border/50 overflow-hidden group cursor-pointer" onClick={() => onClick(product)} data-testid={`product-${product.id}`}>
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    {product.tags?.map(tag => {
                        const style = getTagStyle(tag);
                        return <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.color}`}>{style.label}</span>;
                    })}
                </div>
                {hasAdditionals && (
                    <div className="absolute bottom-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-foreground shadow-sm">Personalizavel</span>
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground font-heading">{product.name}</h3>
                    <span className="font-bold text-foreground whitespace-nowrap ml-2">R$ {product.price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{product.description}</p>
                <Button className="w-full bg-accent hover:bg-accent/90 text-white rounded-full font-medium" data-testid={`add-${product.id}`}
                    onClick={(e) => { e.stopPropagation(); onClick(product); }}>
                    <Plus className="h-4 w-4 mr-1" /> {hasAdditionals ? "Escolher opcionais" : "Adicionar"}
                </Button>
            </div>
        </div>
    );
}

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

/* ============ MENU PAGE ============ */
export default function MenuPage() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [search, setSearch] = useState("");
    const [cartOpen, setCartOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { items, addItem, removeItem, updateQuantity, total, itemCount } = useCart();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`${API}/categories`).then(res => {
            setCategories(res.data);
            if (res.data.length > 0 && !selectedCategory) setSelectedCategory(res.data[0].id);
        });
    }, []); // eslint-disable-line

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedCategory) params.append("category_id", selectedCategory);
        if (search) params.append("search", search);
        axios.get(`${API}/products?${params}`).then(res => setProducts(res.data));
    }, [selectedCategory, search]);

    const handleAddItem = (product, quantity, additionals, observation) => {
        addItem(product, quantity, additionals, observation);
        toast.success("Item adicionado ao carrinho!");
    };

    const selectedCat = categories.find(c => c.id === selectedCategory);

    return (
        <div className="min-h-screen bg-background" data-testid="menu-page">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="https://customer-assets.emergentagent.com/job_soul-delivery/artifacts/3puvg49l_IMG_1929.jpeg" alt="Salada Soul" className="h-10 w-10 rounded-full object-cover" />
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-lg text-foreground font-heading leading-tight">Salada Soul</h1>
                            <p className="text-xs text-muted-foreground">Nutre o corpo, alimenta a alma</p>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-1 max-w-md mx-4">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input data-testid="search-input" placeholder="Buscar saladas, bowls..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-full border-border bg-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate("/historico")} data-testid="history-btn" className="text-foreground hidden sm:flex">
                            <Clock className="h-4 w-4 mr-1" /> Historico
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate("/admin/login")} data-testid="admin-login-btn" className="rounded-full">Entrar</Button>
                        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                            <SheetTrigger asChild>
                                <Button className="lg:hidden relative bg-primary text-primary-foreground rounded-full" size="icon" data-testid="mobile-cart-btn">
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
                        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-full" data-testid="mobile-search" />
                    </div>
                </div>
            </header>

            {/* Mobile categories */}
            <div className="md:hidden overflow-x-auto scrollbar-hide px-4 py-3 flex gap-2 bg-white border-b border-border">
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} data-testid={`mobile-cat-${cat.id}`}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.id ? "bg-primary text-white" : "bg-muted text-foreground hover:bg-muted/80"}`}>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Main */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-8">
                    {/* Desktop Sidebar */}
                    <aside className="hidden md:block w-60 flex-shrink-0">
                        <div className="sticky top-24 bg-white rounded-2xl border border-border p-5 shadow-sm">
                            <h2 className="font-semibold text-base font-heading mb-1">Cardapio</h2>
                            <p className="text-xs text-muted-foreground mb-4">Navegar Categorias</p>
                            <nav className="space-y-1">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} data-testid={`cat-${cat.id}`}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${selectedCategory === cat.id ? "bg-primary text-white shadow-md" : "text-foreground hover:bg-muted"}`}>
                                        <Leaf className="h-4 w-4" />{cat.name}
                                    </button>
                                ))}
                            </nav>
                            <Separator className="my-5" />
                            <div className="bg-muted rounded-xl p-4 text-center">
                                <MessageCircle className="h-6 w-6 text-primary mx-auto mb-2" />
                                <p className="text-sm font-medium">Precisa de Ajuda?</p>
                                <p className="text-xs text-muted-foreground">Fale conosco</p>
                            </div>
                        </div>
                    </aside>

                    {/* Products */}
                    <main className="flex-1 min-w-0">
                        {selectedCat && (
                            <div className="mb-6">
                                <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground">{selectedCat.name}</h2>
                                <p className="text-muted-foreground mt-1 text-sm md:text-base">{selectedCat.description}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {products.map(product => <ProductCard key={product.id} product={product} onClick={setSelectedProduct} />)}
                        </div>
                        {products.length === 0 && (
                            <div className="text-center py-16">
                                <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                                <p className="text-muted-foreground text-sm">Tente buscar por outro termo</p>
                            </div>
                        )}
                    </main>

                    {/* Desktop Cart */}
                    <aside className="hidden lg:block w-80 flex-shrink-0">
                        <div className="sticky top-24 bg-white rounded-2xl border border-border p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-base font-heading">Seu Pedido</h2>
                                {itemCount > 0 && <Badge className="bg-accent text-white rounded-full text-xs">{itemCount} {itemCount === 1 ? "item" : "itens"}</Badge>}
                            </div>
                            <CartContent items={items} removeItem={removeItem} updateQuantity={updateQuantity} total={total} itemCount={itemCount} onCheckout={() => navigate("/checkout")} />
                        </div>
                    </aside>
                </div>
            </div>

            {/* Mobile floating cart */}
            {itemCount > 0 && (
                <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
                    <Button onClick={() => navigate("/checkout")} className="w-full bg-accent hover:bg-accent/90 text-white rounded-full py-5 text-base font-semibold shadow-lg shadow-accent/30" data-testid="mobile-checkout-btn">
                        Finalizar Pedido - R$ {total.toFixed(2)}
                    </Button>
                </div>
            )}

            {/* Product Detail Modal */}
            <ProductDetailModal product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={handleAddItem} />
        </div>
    );
}
