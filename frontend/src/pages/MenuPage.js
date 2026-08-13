import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
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
import { Search, ShoppingCart, Plus, Minus, Clock, Heart, Layers, Grid3X3, ChevronRight, User, History, RotateCcw, X, Flame, Store, Trash2, Coffee, MapPin, PhoneCall } from "lucide-react";
import Header from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryPills } from "@/components/CategoryPills";
import { EnhancedProductCard } from "@/components/EnhancedProductCard";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Categorias padrão JOHB para exibição contínua
const DEFAULT_JOHB_CATEGORIES = [
    { id: "cat-salgados", name: "Salgados", description: "Salgados fritos e assados artesanais quentinhos", order: 0 },
    { id: "cat-assados", name: "Assados", description: "Folhados e assados dourados saindo do forno", order: 1 },
    { id: "cat-doces", name: "Doces / Cucas", description: "Cucas tradicionais e bolos fofinhos artesanais", order: 2 },
    { id: "cat-combos", name: "Combos", description: "Combinações perfeitas de salgados + bebida", order: 3 },
    { id: "cat-bebidas", name: "Bebidas", description: "Refrigerantes e sucos naturais bem gelados", order: 4 }
];

const getImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
};

const tagLabels = {
    vegano: { label: "Vegano", color: "bg-emerald-100 text-emerald-700" },
    leve: { label: "Leve", color: "bg-sky-100 text-sky-700" },
    mais_pedido: { label: "Popular", color: "bg-orange-100 text-orange-700" },
    recomendado: { label: "Recomendado", color: "bg-amber-100 text-amber-700" },
    personalizavel: { label: "Personalizável", color: "bg-purple-100 text-purple-700" }
};
const getTagStyle = (tag) => tagLabels[tag] || { label: tag, color: "bg-gray-100 text-gray-700" };

// Complement category labels e order para Salgados e Assados JOHB
const complementCategories = {
    sabor_salgado: { label: "Escolha o Salgado / Assado", order: 0, icon: "🥟" },
    molhos: { label: "Molhos & Acompanhamentos", order: 1, icon: "🥫" },
    adicionais: { label: "Adicionais & Recheios Extras", order: 2, icon: "🧀" },
    bebida_combo: { label: "Escolha a Bebida", order: 3, icon: "🥤" },
    doce_combo: { label: "Escolha a Cuca / Doce", order: 4, icon: "🍰" },
    outros: { label: "Opcionais Especiais", order: 5, icon: "✨" }
};

// ============ STORE STATUS HELPER ============
function useStoreStatus() {
    const [status, setStatus] = useState({ isOpen: true, message: "", nextOpen: null });
    const [deliverySettings, setDeliverySettings] = useState(null);

    useEffect(() => {
        axios.get(`${API}/delivery-settings`).then(r => {
            setDeliverySettings(r.data);
            checkStatus(r.data);
        }).catch(() => {});
    }, []);

    const checkStatus = (settings) => {
        if (settings?.always_open) {
            setStatus({ isOpen: true, message: "Aberto 24 horas", nextOpen: null, alwaysOpen: true });
            return;
        }

        if (settings?.temporarily_closed) {
            setStatus({ isOpen: false, message: "Fechado temporariamente", nextOpen: null, temporarilyClosed: true });
            return;
        }

        const businessHours = settings?.business_hours;
        if (!businessHours) {
            setStatus({ isOpen: true, message: "Aberto agora", nextOpen: null });
            return;
        }

        const now = new Date();
        const dayMap = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
        const todayKey = dayMap[now.getDay()];
        const todayConfig = businessHours[todayKey];

        if (!todayConfig || !todayConfig.open) {
            setStatus({ isOpen: false, message: "Fechado hoje", nextOpen: findNextOpen(businessHours, now) });
            return;
        }

        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = (todayConfig.start || "00:00").split(":").map(Number);
        const [closeH, closeM] = (todayConfig.end || "23:59").split(":").map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (currentTime < openMinutes) {
            setStatus({ isOpen: false, message: `Abre às ${todayConfig.start}`, nextOpen: todayConfig.start });
        } else if (currentTime >= closeMinutes) {
            setStatus({ isOpen: false, message: "Fechado agora", nextOpen: findNextOpen(businessHours, now) });
        } else {
            const minutesUntilClose = closeMinutes - currentTime;
            const minsUntil = minutesUntilClose % 60;
            const closingSoon = minutesUntilClose <= 60;
            setStatus({
                isOpen: true,
                message: closingSoon ? `Fecha em ${minsUntil}min` : `Aberto até ${todayConfig.end}`,
                nextOpen: null,
                closingSoon
            });
        }
    };

    const findNextOpen = (hours, now) => {
        const dayMap = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        for (let i = 1; i <= 7; i++) {
            const nextDay = new Date(now);
            nextDay.setDate(now.getDate() + i);
            const key = dayMap[nextDay.getDay()];
            if (hours[key]?.open) {
                return `${dayNames[nextDay.getDay()]} às ${hours[key].start}`;
            }
        }
        return null;
    };

    return { ...status, deliverySettings };
}

function ProductCardSkeleton() {
    return (
        <div className="bg-[#10100F] rounded-2xl border border-[#F4B544]/15 overflow-hidden">
            <div className="aspect-[4/3] bg-[#171612] animate-pulse" />
            <div className="p-4 space-y-3">
                <div className="flex justify-between">
                    <div className="h-5 bg-[#171612] rounded w-2/3 animate-pulse" />
                    <div className="h-5 bg-[#171612] rounded w-16 animate-pulse" />
                </div>
                <div className="h-4 bg-[#171612] rounded w-full animate-pulse" />
            </div>
        </div>
    );
}

function CategorySkeleton() {
    return (
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-28 bg-[#10100F] rounded-full animate-pulse border border-[#F4B544]/10 shrink-0" />
            ))}
        </div>
    );
}

function StoreStatusBanner({ status }) {
    if (status.alwaysOpen) return null;
    if (status.isOpen && !status.closingSoon) return null;

    return (
        <div className={`py-2 px-4 text-center text-xs font-semibold tracking-wider ${
            status.isOpen 
                ? "bg-[#F4B544]/20 text-[#F4B544] border-b border-[#F4B544]/30" 
                : "bg-red-500/20 text-red-300 border-b border-red-500/30"
        }`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{status.message}</span>
                {status.nextOpen && <span className="opacity-80">({status.nextOpen})</span>}
            </div>
        </div>
    );
}

const ProductDetailModal = memo(function ProductDetailModal({ product, open, onClose, onAdd, storeOpen }) {
    const [quantity, setQuantity] = useState(1);
    const [selectedAdditionals, setSelectedAdditionals] = useState([]);
    const [observation, setObservation] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        if (product) {
            setQuantity(1);
            setSelectedAdditionals([]);
            setObservation("");
            setValidationErrors({});
        }
    }, [product]);

    if (!product) return null;

    const additionalsList = Array.isArray(product.additionals) ? product.additionals : [];
    const groupedAdditionals = additionalsList.reduce((acc, add) => {
        const catKey = add.category || "outros";
        if (!acc[catKey]) {
            acc[catKey] = {
                items: [],
                rule: {
                    required: add.required || false,
                    min_select: add.min_select || 0,
                    max_select: add.max_select || 1
                }
            };
        }
        acc[catKey].items.push(add);
        return acc;
    }, {});

    const sortedCatKeys = Object.keys(groupedAdditionals).sort((a, b) => {
        const orderA = complementCategories[a]?.order ?? 99;
        const orderB = complementCategories[b]?.order ?? 99;
        return orderA - orderB;
    });

    const additionalsTotal = selectedAdditionals.reduce((sum, add) => sum + (add.price || 0), 0);
    const unitPrice = (product.price || 0) + additionalsTotal;
    const totalPrice = unitPrice * quantity;

    const toggleAdditional = (add, catKey, rule) => {
        const exists = selectedAdditionals.find(a => a.name === add.name);
        if (exists) {
            setSelectedAdditionals(selectedAdditionals.filter(a => a.name !== add.name));
            if (validationErrors[catKey]) {
                setValidationErrors(prev => { const n = { ...prev }; delete n[catKey]; return n; });
            }
        } else {
            const countInCat = selectedAdditionals.filter(a => a.category === catKey).length;
            if (countInCat >= (rule.max_select || 1)) {
                if (rule.max_select === 1) {
                    const filtered = selectedAdditionals.filter(a => a.category !== catKey);
                    setSelectedAdditionals([...filtered, { ...add, category: catKey }]);
                }
                return;
            }
            setSelectedAdditionals([...selectedAdditionals, { ...add, category: catKey }]);
            if (validationErrors[catKey]) {
                setValidationErrors(prev => { const n = { ...prev }; delete n[catKey]; return n; });
            }
        }
    };

    const validateAndAdd = () => {
        const errors = {};
        let isValid = true;

        Object.keys(groupedAdditionals).forEach(catKey => {
            const { rule } = groupedAdditionals[catKey];
            if (rule.required) {
                const count = selectedAdditionals.filter(a => a.category === catKey).length;
                const minReq = rule.min_select || 1;
                if (count < minReq) {
                    const catLabel = complementCategories[catKey]?.label || catKey;
                    errors[catKey] = `Selecione pelo menos ${minReq} opção em "${catLabel}"`;
                    isValid = false;
                }
            }
        });

        if (!isValid) {
            setValidationErrors(errors);
            toast.error("Por favor, selecione as opções obrigatórias.");
            return;
        }

        onAdd(product, quantity, selectedAdditionals, observation);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg bg-[#10100F] border border-[#F4B544]/20 p-0 text-[#FFFAF0] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="relative aspect-[16/9] bg-[#050505]">
                    <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-[#050505]/80 text-[#FFFAF0] hover:text-[#F4B544] flex items-center justify-center border border-[#F4B544]/20"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    <div>
                        <DialogTitle className="font-serif text-2xl font-bold text-[#FFFAF0] mb-1">
                            {product.name}
                        </DialogTitle>
                        <p className="text-xs text-[#B8B1A3] leading-relaxed">{product.description}</p>
                    </div>

                    {sortedCatKeys.length > 0 && (
                        <div className="space-y-4 pt-2">
                            {sortedCatKeys.map(catKey => {
                                const catInfo = complementCategories[catKey] || { label: catKey, icon: "🔹" };
                                const { items, rule } = groupedAdditionals[catKey];
                                const selectedInCat = selectedAdditionals.filter(a => a.category === catKey).length;
                                const catError = validationErrors[catKey];

                                return (
                                    <div key={catKey} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wider text-[#F4B544] flex items-center gap-1.5">
                                                <span>{catInfo.icon}</span> {catInfo.label}
                                            </span>
                                            <span className="text-[11px] text-[#B8B1A3]">
                                                {selectedInCat}/{rule.max_select || 1}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {items.map(add => {
                                                const isSelected = !!selectedAdditionals.find(a => a.name === add.name);
                                                return (
                                                    <button
                                                        key={add.name}
                                                        type="button"
                                                        onClick={() => toggleAdditional(add, catKey, rule)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                                            isSelected
                                                                ? "border-[#F4B544] bg-[#171612] text-[#F4B544]"
                                                                : "border-[#F4B544]/15 bg-[#050505] text-[#FFFAF0] hover:border-[#F4B544]/40"
                                                        }`}
                                                    >
                                                        <span className="text-xs font-medium">{add.name}</span>
                                                        <span className="text-xs font-bold text-[#F4B544]">
                                                            {add.price > 0 ? `+ R$ ${add.price.toFixed(2)}` : "Grátis"}
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

                    <div className="pt-2 border-t border-[#F4B544]/15">
                        <textarea
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                            placeholder="Alguma observação para o preparo? Ex: Mandar bem quentinho..."
                            className="w-full rounded-xl border border-[#F4B544]/20 bg-[#050505] p-3 text-xs text-[#FFFAF0] placeholder:text-[#B8B1A3]/50 h-16 focus:outline-none focus:border-[#F4B544]"
                        />
                    </div>

                    <div className="flex items-center gap-4 pt-3">
                        <div className="flex items-center gap-2 bg-[#050505] border border-[#F4B544]/20 rounded-full px-2 py-1">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-1 text-[#FFFAF0] hover:text-[#F4B544]">
                                <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-[#F4B544]">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-1 text-[#FFFAF0] hover:text-[#F4B544]">
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={validateAndAdd}
                            className="flex-1 py-3 px-6 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all flex items-center justify-between gold-glow"
                        >
                            <span>Adicionar ao Pedido</span>
                            <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});

function CartContent({ items, removeItem, updateQuantity, total, itemCount, onCheckout }) {
    if (items.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <ShoppingCart className="h-12 w-12 text-[#F4B544]/40 mx-auto" />
                <p className="text-sm text-[#B8B1A3]">Seu carrinho está vazio</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-[#F4B544]/15">
                        <div className="flex-1 min-w-0 pr-3">
                            <h4 className="text-xs font-bold text-[#FFFAF0] truncate">{item.name}</h4>
                            <p className="text-[11px] text-[#F4B544] font-semibold mt-0.5">
                                R$ {(item.price * item.quantity).toFixed(2)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(idx, item.quantity - 1)} className="p-1 text-[#B8B1A3] hover:text-[#FFFAF0]">
                                <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold text-[#F4B544]">{item.quantity}</span>
                            <button onClick={() => updateQuantity(idx, item.quantity + 1)} className="p-1 text-[#B8B1A3] hover:text-[#FFFAF0]">
                                <Plus className="h-3 w-3" />
                            </button>
                            <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-300 ml-1">
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 border-t border-[#F4B544]/15 space-y-3">
                <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-[#FFFAF0]">Subtotal:</span>
                    <span className="text-[#F4B544] font-serif text-lg">R$ {total.toFixed(2)}</span>
                </div>
                <button
                    onClick={onCheckout}
                    className="w-full py-3.5 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all gold-glow"
                >
                    Finalizar Pedido
                </button>
            </div>
        </div>
    );
}

function LoginModal({ open, onClose, onLogin }) {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phone.trim() || !name.trim()) {
            toast.error("Preencha nome e WhatsApp.");
            return;
        }
        setSubmitting(true);
        await onLogin(phone, name);
        setSubmitting(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm bg-[#10100F] border border-[#F4B544]/20 p-6 text-[#FFFAF0] rounded-2xl">
                <DialogTitle className="font-serif text-xl font-bold text-[#FFFAF0] text-center mb-4">
                    Identifique-se para pedir
                </DialogTitle>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-[#B8B1A3] block mb-1">Seu Nome</label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Maria Silva" className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0]" />
                    </div>
                    <div>
                        <label className="text-xs text-[#B8B1A3] block mb-1">Seu WhatsApp</label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(48) 99999-9999" className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0]" />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full bg-[#F4B544] text-[#050505] font-bold uppercase tracking-wider">
                        Entrar e Continuar
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function MenuPage() {
    const [menus, setMenus] = useState([]);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [categories, setCategories] = useState(DEFAULT_JOHB_CATEGORIES);
    const [selectedCategory, setSelectedCategory] = useState("cat-salgados");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isProductLoading, setProductLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [search, setSearch] = useState("");
    const [cartOpen, setCartOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [pendingAddItem, setPendingAddItem] = useState(null);
    const [cartAnimating, setCartAnimating] = useState(false);

    const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
    const { favorites, clearFavorites } = useFavorites();
    const { customer, isLoggedIn, login, logout } = useCustomer();
    const { isOpen: storeOpen, ...storeStatus } = useStoreStatus();
    const navigate = useNavigate();

    // Carregar categorias no mount ou usar padrão JOHB se estiver sem itens
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catRes = await axios.get(`${API}/categories`);
                const cats = Array.isArray(catRes.data) && catRes.data.length > 0 ? catRes.data : DEFAULT_JOHB_CATEGORIES;
                setCategories(cats);
                if (cats.length > 0) setSelectedCategory(cats[0].id);
            } catch {
                setCategories(DEFAULT_JOHB_CATEGORIES);
                setSelectedCategory("cat-salgados");
            }
        };
        fetchCategories();
    }, []);

    // Carregar produtos da categoria selecionada
    useEffect(() => {
        if (!selectedCategory) return;
        const fetchProducts = async () => {
            try {
                setProductLoading(true);
                const res = await axios.get(`${API}/products?category_id=${selectedCategory}`);
                setProducts(Array.isArray(res.data) ? res.data : []);
            } catch {
                setProducts([]);
            } finally {
                setProductLoading(false);
            }
        };
        fetchProducts();
    }, [selectedCategory]);

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

    return (
        <div className="min-h-screen bg-[#050505] text-[#FFFAF0] font-sans antialiased selection:bg-[#F4B544]/30" data-testid="menu-page">
            {/* Header Artesanal JOHB */}
            <Header onOpenCart={() => setCartOpen(true)} />

            {/* Banner de Status da Loja */}
            <StoreStatusBanner status={{ isOpen: storeOpen, ...storeStatus }} />

            {/* Hero Section Editorial */}
            <HeroSection
                onVerCardapio={() => {
                    const el = document.getElementById("cardapio");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                onVerCombos={() => {
                    const el = document.getElementById("combos");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
            />

            {/* Conteúdo Principal — Cardápio */}
            <section id="cardapio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* Barra de Pesquisa e Título da Seção sem estrelas AI */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#F4B544]/15 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#F4B544] font-semibold mb-1">
                            Nosso Cardápio
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFFAF0]">
                            Sabores Feitos no Capricho
                        </h2>
                    </div>

                    {/* Busca Estilizada */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F4B544]" />
                        <Input
                            placeholder="Buscar coxinha, assado, bolo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-10 rounded-full bg-[#10100F] border-[#F4B544]/30 text-[#FFFAF0] placeholder:text-[#B8B1A3]/60 focus-visible:ring-[#F4B544] h-11 text-sm"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B8B1A3] hover:text-[#FFFAF0]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categorias Pílula — Exibição constante */}
                <div className="mb-8">
                    <CategoryPills
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />
                </div>

                {/* Grid de Produtos */}
                {isProductLoading ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <ProductCardSkeleton key={i} />
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredProducts.map((product) => (
                            <EnhancedProductCard
                                key={product.id}
                                product={product}
                                onClick={setSelectedProduct}
                                backendUrl={BACKEND_URL}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-[#10100F] rounded-2xl border border-[#F4B544]/15">
                        <Coffee className="h-12 w-12 text-[#F4B544] mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-serif font-bold text-[#FFFAF0]">Nenhum item cadastrado nesta categoria</p>
                        <p className="text-[#B8B1A3] text-sm mt-1">
                            {search ? "Tente buscar por outro termo" : "Cadastre produtos através do painel admin /admin/login"}
                        </p>
                        {search && (
                            <Button
                                variant="outline"
                                className="mt-4 rounded-full border-[#F4B544]/40 text-[#F4B544] hover:bg-[#F4B544]/10"
                                onClick={() => setSearch("")}
                            >
                                Limpar busca
                            </Button>
                        )}
                    </div>
                )}
            </section>

            {/* Seção de Combos Promocionais com Fotos Reais de Salgados */}
            <section id="combos" className="bg-[#10100F] border-y border-[#F4B544]/15 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
                        <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold">
                            Combinações Especiais
                        </span>
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFFAF0]">
                            Combos para Acompanhar Seu Momento
                        </h2>
                        <p className="text-[#B8B1A3] text-sm sm:text-base font-light">
                            Combine seus salgados artesanais favoritos com uma bebida bem geladinha.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Combo 1 — Coxinhas e Salgados */}
                        <div className="bg-[#171612] rounded-2xl p-6 sm:p-8 border border-[#F4B544]/20 flex flex-col sm:flex-row items-center gap-6 gold-glow-sm hover:border-[#F4B544]/50 transition-all">
                            <img
                                src="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80"
                                alt="Combo Individual JOHB"
                                className="w-32 h-32 rounded-xl object-cover border border-[#F4B544]/30"
                            />
                            <div className="space-y-2 text-center sm:text-left flex-1">
                                <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4B544]/10 text-[#F4B544] border border-[#F4B544]/30">
                                    Combo Individual
                                </span>
                                <h3 className="font-serif text-xl font-bold text-[#FFFAF0]">Combo JOHB Individual</h3>
                                <p className="text-xs text-[#B8B1A3]">
                                    2 Salgados artesanais à sua escolha + 1 Bebida 350ml trincando de gelada.
                                </p>
                                <div className="pt-2 flex items-center justify-between">
                                    <span className="text-xl font-bold text-[#F4B544]">R$ 17,90</span>
                                    <button
                                        onClick={() => {
                                            addItem(
                                                {
                                                    id: "p-cmb-1",
                                                    name: "Combo JOHB Individual",
                                                    price: 17.90,
                                                    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500"
                                                },
                                                1,
                                                [],
                                                ""
                                            );
                                            toast.success("Combo JOHB Individual adicionado ao carrinho!");
                                        }}
                                        className="px-4 py-2 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-wider hover:bg-[#FFC85C] transition-all"
                                    >
                                        Pedir Combo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Combo 2 — Assados Folhados */}
                        <div className="bg-[#171612] rounded-2xl p-6 sm:p-8 border border-[#F4B544]/20 flex flex-col sm:flex-row items-center gap-6 gold-glow-sm hover:border-[#F4B544]/50 transition-all">
                            <img
                                src="https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop&q=80"
                                alt="Combo Pra Dois JOHB"
                                className="w-32 h-32 rounded-xl object-cover border border-[#F4B544]/30"
                            />
                            <div className="space-y-2 text-center sm:text-left flex-1">
                                <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4B544]/10 text-[#F4B544] border border-[#F4B544]/30">
                                    Para Compartilhar
                                </span>
                                <h3 className="font-serif text-xl font-bold text-[#FFFAF0]">Combo Pra Dois</h3>
                                <p className="text-xs text-[#B8B1A3]">
                                    4 Salgados artesanais à sua escolha + 2 Bebidas 350ml à sua escolha.
                                </p>
                                <div className="pt-2 flex items-center justify-between">
                                    <span className="text-xl font-bold text-[#F4B544]">R$ 34,90</span>
                                    <button
                                        onClick={() => {
                                            addItem(
                                                {
                                                    id: "p-cmb-2",
                                                    name: "Combo Pra Dois",
                                                    price: 34.90,
                                                    image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?w=500"
                                                },
                                                1,
                                                [],
                                                ""
                                            );
                                            toast.success("Combo Pra Dois adicionado ao carrinho!");
                                        }}
                                        className="px-4 py-2 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-wider hover:bg-[#FFC85C] transition-all"
                                    >
                                        Pedir Combo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção Sobre / Experiência JOHB */}
            <section id="sobre" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold">
                            A Experiência JOHB
                        </span>
                        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#FFFAF0] leading-tight">
                            Feito com Carinho, Servido com Sabor.
                        </h2>
                        <p className="text-[#B8B1A3] leading-relaxed font-light text-base sm:text-lg">
                            Do preparo à entrega, cada pedido JOHB é feito para chegar com muito sabor e bem quentinho até você. Nossos salgados e assados são preparados em pequenos lotes ao longo do dia com ingredientes nobres e massa super leve.
                        </p>
                        <div className="pt-4 grid grid-cols-2 gap-6 border-t border-[#F4B544]/15">
                            <div>
                                <span className="block font-serif text-xl font-bold text-[#F4B544]">Balneário Arroio do Silva</span>
                                <span className="text-xs text-[#B8B1A3]">Delivery rápido e direto para sua casa ou trabalho em SC</span>
                            </div>
                            <div>
                                <span className="block font-serif text-xl font-bold text-[#F4B544]">Atendimento</span>
                                <span className="text-xs text-[#B8B1A3]">Segunda a Sábado, das 07h00 às 19h00</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="rounded-2xl overflow-hidden border border-[#F4B544]/30 gold-glow">
                            <img
                                src="https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&auto=format&fit=crop&q=80"
                                alt="Salgados e Café JOHB"
                                className="w-full h-96 object-cover"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Artesanal JOHB */}
            <footer className="bg-[#10100F] border-t border-[#F4B544]/20 py-12 text-center text-xs text-[#B8B1A3]">
                <div className="max-w-7xl mx-auto px-4 space-y-6">
                    <img src="/logo-semfundo.png" alt="JOHB Café & Salgados" className="h-16 w-auto mx-auto object-contain" />
                    <p className="font-serif text-lg text-[#FFFAF0] italic max-w-md mx-auto">
                        "O aroma de um bom café é o primeiro abraço do dia."
                    </p>
                    <div className="flex justify-center gap-6 text-[#F4B544] uppercase tracking-wider font-semibold text-[11px]">
                        <a href="#cardapio" className="hover:underline">Cardápio</a>
                        <a href="#combos" className="hover:underline">Combos</a>
                        <a href="#sobre" className="hover:underline">Sobre Nós</a>
                        <a href="https://wa.me/message/FUNP4LBHYBA3O1" target="_blank" rel="noreferrer" className="hover:underline">WhatsApp</a>
                    </div>
                    <div className="pt-6 border-t border-[#F4B544]/10 text-[11px] text-[#807A6E]">
                        © {new Date().getFullYear()} JOHB Café & Salgados — Todos os direitos reservados.
                    </div>
                </div>
            </footer>

            {/* Sheet de Carrinho */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md bg-[#10100F] border-l border-[#F4B544]/20 p-0 text-[#FFFAF0] flex flex-col">
                    <SheetHeader className="p-5 border-b border-[#F4B544]/15 bg-[#050505]">
                        <SheetTitle className="font-serif text-2xl font-bold text-[#FFFAF0] flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-[#F4B544]" />
                            <span>Seu Pedido JOHB</span>
                        </SheetTitle>
                    </SheetHeader>
                    <div className="p-5 flex-1 overflow-y-auto">
                        <CartContent
                            items={items}
                            removeItem={removeItem}
                            updateQuantity={updateQuantity}
                            total={total}
                            itemCount={itemCount}
                            onCheckout={() => {
                                setCartOpen(false);
                                navigate("/checkout");
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Bar de Navegação Mobile Fixo */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#10100F]/95 backdrop-blur-md border-t border-[#F4B544]/20 flex items-center justify-around py-2 px-3 shadow-2xl">
                <button
                    onClick={() => {
                        const el = document.getElementById("cardapio");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex flex-col items-center p-1.5 text-[#F4B544]"
                >
                    <Coffee className="h-5 w-5 mb-0.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cardápio</span>
                </button>
                <button
                    onClick={() => setCartOpen(true)}
                    className="flex flex-col items-center p-1.5 text-[#FFFAF0] relative"
                >
                    <ShoppingCart className="h-5 w-5 mb-0.5 text-[#F4B544]" />
                    {itemCount > 0 && (
                        <span className="absolute top-0 right-3 bg-[#F4B544] text-[#050505] text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                            {itemCount}
                        </span>
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-wider">Pedido</span>
                </button>
                <a
                    href="https://wa.me/message/FUNP4LBHYBA3O1"
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center p-1.5 text-[#B8B1A3] hover:text-[#F4B544]"
                >
                    <PhoneCall className="h-5 w-5 mb-0.5 text-[#F4B544]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Contato</span>
                </a>
            </div>

            {/* Modal de Detalhes do Produto */}
            <ProductDetailModal
                product={selectedProduct}
                open={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAdd={handleAddItem}
                storeOpen={storeOpen}
            />

            {/* Modal de Login */}
            <LoginModal
                open={loginModalOpen}
                onClose={() => {
                    setLoginModalOpen(false);
                    setPendingAddItem(null);
                }}
                onLogin={async (phone, name) => {
                    const result = await login(phone, name);
                    if (result.success) {
                        handleLoginSuccess();
                    }
                }}
            />
        </div>
    );
}
