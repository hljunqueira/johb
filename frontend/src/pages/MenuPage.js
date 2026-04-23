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
import { Search, ShoppingCart, Plus, Minus, Clock, Leaf, Heart, Layers, Grid3X3, ChevronRight, User, History, RotateCcw, X, Flame, Store, Trash2 } from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

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
    personalizavel: { label: "Personalizável", color: "bg-purple-100 text-purple-700" }
};
const getTagStyle = (tag) => tagLabels[tag] || { label: tag, color: "bg-gray-100 text-gray-700" };

// Complement category labels and order
const complementCategories = {
    base_folhas: { label: "Base de Folhas", order: 0, icon: "🥬" },
    proteina: { label: "Proteína", order: 1, icon: "🍗" },
    legumes: { label: "Legumes & Verduras", order: 2, icon: "🥕" },
    frutas: { label: "Frutas", order: 3, icon: "🍓" },
    extras: { label: "Extras & Crocância", order: 4, icon: "🥜" },
    molhos: { label: "Molhos & Cremes", order: 5, icon: "🥣" },
    temperos: { label: "Temperos", order: 6, icon: "🧂" }
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
        // Verificar flags especiais primeiro
        if (settings?.always_open) {
            setStatus({ 
                isOpen: true, 
                message: "Aberto 24 horas", 
                nextOpen: null,
                alwaysOpen: true 
            });
            return;
        }

        if (settings?.temporarily_closed) {
            setStatus({ 
                isOpen: false, 
                message: "Fechado temporariamente", 
                nextOpen: null,
                temporarilyClosed: true 
            });
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
            const hoursUntil = Math.floor(minutesUntilClose / 60);
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

// ============ SKELETON COMPONENTS ============
function ProductCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="aspect-[4/3] bg-muted animate-pulse" />
            <div className="p-4 space-y-3">
                <div className="flex justify-between">
                    <div className="h-5 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                </div>
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="flex gap-1">
                    <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                    <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

function CategorySkeleton() {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-32 bg-muted rounded-full animate-pulse flex-shrink-0" />
            ))}
        </div>
    );
}

/* ============ PRODUCT DETAIL MODAL ============ */
const ProductDetailModal = memo(function ProductDetailModal({ product, open, onClose, onAdd, storeOpen }) {
    const [selectedAdditionals, setSelectedAdditionals] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        if (open) { 
            setSelectedAdditionals([]); 
            setQuantity(1); 
            setObservation(""); 
            setValidationErrors({});
        }
    }, [open]);

    const toggleAdditional = useCallback((add, catKey, catRule) => {
        setValidationErrors(prev => ({ ...prev, [catKey]: null }));
        setSelectedAdditionals(prev => {
            const isSelected = prev.find(a => a.name === add.name);
            if (isSelected) return prev.filter(a => a.name !== add.name);
            const max = catRule?.max_select || 1;
            const countInCat = prev.filter(a => a.category === catKey).length;
            if (countInCat >= max) {
                if (max === 1) {
                    return [...prev.filter(a => a.category !== catKey), add];
                }
                setValidationErrors(p => ({ ...p, [catKey]: `Máximo de ${max} itens para esta categoria` }));
                return prev;
            }
            return [...prev, add];
        });
    }, []);

    const addPrice = selectedAdditionals.reduce((s, a) => s + a.price, 0);
    const unitTotal = product ? product.price + addPrice : 0;
    const totalPrice = unitTotal * quantity;

    const validateAndAdd = useCallback(() => {
        if (!product) return;
        if (!storeOpen) {
            toast.error("Loja fechada no momento");
            return;
        }
        const additionals = Array.isArray(product.additionals) ? product.additionals : [];
        if (additionals.length === 0) {
            onAdd(product, quantity, selectedAdditionals, observation);
            onClose();
            return;
        }
        const catRules = {};
        additionals.forEach(add => {
            const k = add.category || "outros";
            if (!catRules[k]) catRules[k] = { required: add.required, min_select: add.min_select || 0, max_select: add.max_select || 1, label: k };
        });
        const errors = {};
        let hasError = false;
        Object.entries(catRules).forEach(([catKey, rule]) => {
            const countInCat = selectedAdditionals.filter(a => a.category === catKey).length;
            if (rule.required && countInCat === 0) {
                const label = complementCategories[catKey]?.label || catKey;
                errors[catKey] = `É obrigatório selecionar pelo menos 1 item de "${label}"`;
                hasError = true;
            } else if (rule.min_select > 0 && countInCat < rule.min_select) {
                const label = complementCategories[catKey]?.label || catKey;
                errors[catKey] = `Selecione no mínimo ${rule.min_select} item${rule.min_select > 1 ? "s" : ""} de "${label}"`;
                hasError = true;
            }
        });
        if (hasError) {
            setValidationErrors(errors);
            const firstErrKey = Object.keys(errors)[0];
            document.getElementById(`cat-section-${firstErrKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        onAdd(product, quantity, selectedAdditionals, observation);
        onClose();
    }, [product, quantity, selectedAdditionals, observation, onAdd, onClose, storeOpen]);

    if (!product) return null;

    const groupedAdditionals = {};
    const additionals = Array.isArray(product.additionals) ? product.additionals : [];
    if (additionals.length > 0) {
        additionals.forEach(add => {
            const cat = add.category || "outros";
            if (!groupedAdditionals[cat]) groupedAdditionals[cat] = { items: [], rule: { required: add.required, min_select: add.min_select || 0, max_select: add.max_select || 1 } };
            groupedAdditionals[cat].items.push(add);
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
                <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted max-h-[180px] flex-shrink-0">
                    <img 
                        src={getImageUrl(product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=600"; }}
                    />
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <div className="flex justify-between items-start gap-2">
                            <h2 className="text-lg font-bold font-heading text-foreground flex-1">{product.name}</h2>
                            <span className="text-lg font-bold text-primary whitespace-nowrap">
                                {product.price > 0 ? `R$ ${product.price.toFixed(2)}` : "A partir de R$ 0,00"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                    </div>

                    {isCustomizable && sortedCategories.length > 0 && (
                        <div className="space-y-4">
                            <Separator />
                            <h3 className="font-semibold text-base font-heading">Monte do seu jeito</h3>
                            
                            {sortedCategories.map(catKey => {
                                const catInfo = complementCategories[catKey] || { label: catKey, icon: "+" };
                                const { items, rule } = groupedAdditionals[catKey];
                                const selectedInCat = selectedAdditionals.filter(a => a.category === catKey).length;
                                const catError = validationErrors[catKey];
                                
                                return (
                                    <div key={catKey} id={`cat-section-${catKey}`} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <span>{catInfo.icon}</span>
                                                <span className="text-foreground">{catInfo.label}</span>
                                                {rule.required && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catError ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>Obrigatório</span>
                                                )}
                                                {!rule.required && rule.max_select > 1 && (
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Até {rule.max_select}</span>
                                                )}
                                            </div>
                                            <span className={`text-xs font-medium ${rule.required && selectedInCat === 0 ? "text-amber-600" : selectedInCat > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                                {selectedInCat}/{rule.max_select || 1}
                                            </span>
                                        </div>
                                        {catError && (
                                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                                {catError}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 gap-2">
                                            {items.map(add => {
                                                const isSelected = !!selectedAdditionals.find(a => a.name === add.name);
                                                const countInCat = selectedAdditionals.filter(a => a.category === catKey).length;
                                                const isAtMax = !isSelected && countInCat >= (rule.max_select || 1);
                                                return (
                                                    <button key={add.name} type="button"
                                                        onClick={() => toggleAdditional(add, catKey, rule)}
                                                        disabled={isAtMax}
                                                        data-testid={`additional-${add.name.replace(/\s+/g, '-').toLowerCase()}`}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                                                            isSelected ? "border-primary bg-primary/5" : isAtMax ? "border-border bg-muted/30 opacity-50 cursor-not-allowed" : catError ? "border-red-300 bg-red-50/30 hover:border-primary/30" : rule.required ? "border-amber-200 bg-amber-50/20 hover:border-primary/50" : "border-border hover:border-primary/30"
                                                        }`}>
                                                        <div className="flex items-center gap-3">
                                                            {add.image_url ? (
                                                                <img src={getImageUrl(add.image_url)} alt={add.name} className="h-10 w-10 rounded-lg object-cover border border-border" />
                                                            ) : (
                                                                <div className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-muted"}`}>
                                                                    {isSelected && <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{add.name}</span>
                                                                {rule.max_select > 1 && (
                                                                    <span className="text-xs text-muted-foreground">{isSelected ? "Selecionado" : isAtMax ? `Limite de ${rule.max_select} atingido` : "Toque para selecionar"}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-primary">{add.price > 0 ? `+ R$ ${add.price.toFixed(2)}` : "Grátis"}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div>
                        <Separator className="mb-3" />
                        <h3 className="font-semibold text-sm font-heading mb-2">Alguma observação?</h3>
                        <textarea value={observation} onChange={e => setObservation(e.target.value)}
                            placeholder="Ex: Sem cebola, molho a parte..."
                            className="w-full rounded-xl border border-input bg-white p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            data-testid="product-observation" />
                    </div>

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
                        <Button onClick={validateAndAdd} disabled={!storeOpen}
                            className={`flex-1 rounded-full py-5 font-semibold text-base ${storeOpen ? "bg-accent hover:bg-accent/90 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                            data-testid="modal-add-btn">
                            {storeOpen ? `Adicionar - R$ ${totalPrice.toFixed(2)}` : "Loja fechada"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});

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
    
    const minPrice = hasOpcionais && product.price === 0
        ? (Array.isArray(product.additionals) ? Math.min(...product.additionals.map(a => a.price || 0)) : 0)
        : product.price;

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        toggleFavorite(product);
    };

    return (
        <div 
            onClick={() => onClick(product)}
            className="bg-white rounded-xl border border-border/60 p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 flex flex-row gap-3 sm:gap-4 group items-center"
            data-testid={`product-${product.id}`}
        >
            <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                <div>
                    <h3 className="font-semibold font-heading text-foreground text-[15px] sm:text-base leading-snug mb-1 line-clamp-2 pr-2">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{product.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">
                        {product.price > 0 ? `R$ ${product.price.toFixed(2)}` : minPrice > 0 ? `A partir de R$ ${minPrice.toFixed(2)}` : "Monte seu preço"}
                    </span>
                    {hasOpcionais && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Personalizável</span>
                    )}
                </div>
            </div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-muted rounded-lg overflow-hidden shadow-sm">
                <img 
                    src={getImageUrl(product.image_url)} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                {product.tags?.includes("mais_pedido") && (
                    <div className="absolute top-1 right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg flex items-center gap-1">
                        <Flame className="h-2 w-2" /> Pop
                    </div>
                )}
                {product.tags?.includes("novo") && (
                    <div className="absolute top-1 right-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                        Novo
                    </div>
                )}
                <button
                    onClick={handleFavoriteClick}
                    className={`absolute bottom-1 right-1 p-1.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                        favorite ? "bg-red-500 text-white" : "bg-white/80 text-muted-foreground hover:bg-white hover:text-red-500"
                    }`}
                >
                    <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-current" : ""}`} />
                </button>
            </div>
        </div>
    );
}

/* ============ CART CONTENT ============ */
function CartContent({ items, removeItem, updateQuantity, total, itemCount, onCheckout }) {
    if (itemCount === 0) return (
        <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Seu carrinho está vazio</p>
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
                            <button onClick={() => updateQuantity(item.cart_id, Math.max(1, item.quantity - 1))} className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.cart_id, item.quantity + 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                            <button onClick={() => removeItem(item.cart_id)} className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"><Trash2 className="h-3 w-3" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
                </div>
                <Button onClick={onCheckout} className="w-full bg-accent hover:bg-accent/90 text-white rounded-full py-5 font-semibold">
                    Finalizar Pedido ({itemCount} {itemCount === 1 ? "item" : "itens"})
                </Button>
            </div>
        </div>
    );
}

/* ============ LOGIN MODAL ============ */
function LoginModal({ open, onClose, onLogin }) {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [step, setStep] = useState("phone");
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
                <DialogTitle className="sr-only">{step === "phone" ? "Identifique-se" : "Como podemos te chamar?"}</DialogTitle>
                <div className="text-center py-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold font-heading mb-2">{step === "phone" ? "Identifique-se" : "Como podemos te chamar?"}</h2>
                    <p className="text-sm text-muted-foreground">{step === "phone" ? "Digite seu telefone para acessar seus favoritos e histórico" : "Digite seu nome para personalizar sua experiência"}</p>
                </div>
                {step === "phone" ? (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <Input type="tel" placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} maxLength={15} className="text-center text-lg" autoFocus />
                        <Button type="submit" className="w-full bg-primary text-white rounded-full">Continuar</Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={handleClose}>Pular por enquanto</Button>
                    </form>
                ) : (
                    <form onSubmit={handleNameSubmit} className="space-y-4">
                        <Input type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} className="text-center" autoFocus />
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("phone")}>Voltar</Button>
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
                    <button key={product.product_id} onClick={() => onReorder(product)}
                        className="flex-shrink-0 w-36 bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left">
                        <div className="h-24 bg-muted">
                            <img src={getImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3">
                            <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">Pedido {product.times_ordered}x</p>
                            <p className="font-bold text-primary text-sm mt-1">R$ {product.price?.toFixed(2)}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ============ STORE STATUS BANNER ============ */
function StoreStatusBanner({ status }) {
    // Loja sempre aberta (24 horas)
    if (status.alwaysOpen) {
        return (
            <div className="px-4 py-2 flex items-center justify-center gap-2 text-sm bg-blue-50 text-blue-700 border-b border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{status.message}</span>
            </div>
        );
    }

    // Loja fechada temporariamente
    if (status.temporarilyClosed) {
        return (
            <div className="px-4 py-3 bg-red-50 text-red-700 border-b border-red-200 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium">{status.message}</span>
                <span className="text-sm">· Voltamos em breve</span>
            </div>
        );
    }

    if (status.isOpen) {
        return (
            <div className={`px-4 py-2 flex items-center justify-center gap-2 text-sm ${status.closingSoon ? "bg-amber-50 text-amber-700 border-b border-amber-200" : "bg-green-50 text-green-700 border-b border-green-200"}`}>
                <span className={`w-2 h-2 rounded-full ${status.closingSoon ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                <Store className="h-4 w-4" />
                <span className="font-medium">{status.message}</span>
            </div>
        );
    }
    return (
        <div className="px-4 py-3 bg-red-50 text-red-700 border-b border-red-200 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <Store className="h-4 w-4" />
            <span className="font-medium">{status.message}</span>
            {status.nextOpen && <span className="text-sm">· Abre {status.nextOpen}</span>}
        </div>
    );
}

/* ============ MAIN MENU PAGE ============ */
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
    const [cartAnimating, setCartAnimating] = useState(false);
    const [pendingAddItem, setPendingAddItem] = useState(null);
    const [isProductLoading, setProductLoading] = useState(false);

    const categoriesCache = useRef({});
    const productsCache = useRef({});
    
    const { items, addItem, removeItem, updateQuantity, total, itemCount, clearCart } = useCart();
    const { favorites, clearFavorites } = useFavorites();
    const { customer, isLoggedIn, login, logout, reorderSuggestions } = useCustomer();
    const { isOpen: storeOpen, ...storeStatus } = useStoreStatus();
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
                if (activeMenu) setSelectedMenu(activeMenu.id);
            } catch (err) {
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
        if (categoriesCache.current[selectedMenu]) {
            setCategories(categoriesCache.current[selectedMenu]);
            if (categoriesCache.current[selectedMenu].length > 0) {
                setSelectedCategory(categoriesCache.current[selectedMenu][0].id);
            }
            return;
        }

        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API}/menus/${selectedMenu}/categories`);
                const cats = Array.isArray(res.data) ? res.data : [];
                categoriesCache.current[selectedMenu] = cats;
                setCategories(cats);
                if (cats.length > 0) setSelectedCategory(cats[0].id);
            } catch {
                toast.error("Erro ao carregar categorias");
            }
        };
        fetchCategories();
    }, [selectedMenu]);

    // Load products when category is selected
    useEffect(() => {
        if (!selectedCategory) { setProducts([]); return; }
        if (productsCache.current[selectedCategory]) {
            setProducts(productsCache.current[selectedCategory]);
            return;
        }

        const fetchProducts = async () => {
            try {
                setProductLoading(true);
                const res = await axios.get(`${API}/categories/${selectedCategory}/products`);
                const prods = Array.isArray(res.data) ? res.data : [];
                productsCache.current[selectedCategory] = prods;
                setProducts(prods);
            } catch {
                toast.error("Erro ao carregar produtos");
            } finally {
                setProductLoading(false);
            }
        };
        fetchProducts();
    }, [selectedCategory]);

    // Animate cart when item added
    useEffect(() => {
        if (itemCount > 0) {
            setCartAnimating(true);
            setTimeout(() => setCartAnimating(false), 300);
        }
    }, [itemCount]);

    const filteredProducts = useMemo(() => {
        if (!search) return products;
        return products.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase())
        );
    }, [products, search]);

    const handleAddItem = (product, quantity, additionals, observation) => {
        // Verifica se está logado antes de adicionar ao carrinho
        if (!isLoggedIn) {
            setPendingAddItem({ product, quantity, additionals, observation });
            setLoginModalOpen(true);
            return;
        }
        addItem(product, quantity, additionals, observation);
        toast.success("Item adicionado ao carrinho!");
    };

    // Callback após login bem-sucedido para adicionar item pendente
    const handleLoginSuccess = () => {
        if (pendingAddItem) {
            const { product, quantity, additionals, observation } = pendingAddItem;
            addItem(product, quantity, additionals, observation);
            toast.success("Item adicionado ao carrinho!");
            setPendingAddItem(null);
        }
    };

    // Logout do usuário
    const handleLogout = () => {
        logout();
        clearCart();
        clearFavorites();
        toast.success("Você saiu da conta");
    };

    const currentMenu = menus.find(m => m.id === selectedMenu);
    const currentCategory = categories.find(c => c.id === selectedCategory);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="h-16 bg-white border-b" />
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <CategorySkeleton />
                    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </div>
            </div>
        );
    }

    if (menus.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-bold font-heading mb-2">Cardápio em preparação</h2>
                    <p className="text-muted-foreground mb-4">Nosso cardápio está sendo montado. Volte em breve!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background" data-testid="menu-page">
            {/* Store Status Banner */}
            <StoreStatusBanner status={{ isOpen: storeOpen, ...storeStatus }} />

            {/* Header */}
            <header className="relative z-40 bg-primary shadow-md border-b-0 pb-2">
                <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                    <img src="/banner-saladasoul.jpeg" className="w-full h-full object-cover" alt="" />
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-background bg-white shadow-xl overflow-hidden translate-y-6 shrink-0 z-20">
                            <img src="/Logo-saladasoul.jpeg" alt="Logo Salada Soul" className="w-full h-full object-cover" />
                        </div>
                        <div className="pt-2 text-white">
                            <h1 className="font-bold text-2xl font-heading leading-tight text-secondary drop-shadow-sm">Salada Soul</h1>
                            <p className="text-xs sm:text-sm text-primary-foreground/90 font-medium tracking-wide">Nutre o corpo, alimenta a alma</p>
                        </div>
                    </div>
                    
                    {/* Search Desktop */}
                    <div className="hidden md:flex flex-1 max-w-md mx-4">
                        <div className="relative w-full shadow-md rounded-full bg-white border border-border overflow-hidden">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input 
                                placeholder="Busque por produtos..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                className="pl-10 pr-10 rounded-full border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary h-10 w-full"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop/Tablet User Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 text-primary-foreground">
                        {isLoggedIn ? (
                            <div className="hidden sm:flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="hover:bg-primary/30 hover:text-secondary text-primary-foreground font-medium" onClick={() => navigate("/historico")}>
                                    <User className="h-4 w-4 mr-1" /> {customer?.name?.split(" ")[0]}
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:bg-primary/30 hover:text-secondary text-primary-foreground" onClick={handleLogout} title="Sair">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </Button>
                            </div>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => setLoginModalOpen(true)} className="hidden sm:flex hover:bg-primary/30 hover:text-secondary text-primary-foreground font-medium">
                                <User className="h-4 w-4 mr-1" /> Entrar
                            </Button>
                        )}
                        
                        {/* Mobile Cart Sheet Trigger - Hidden on lg screens because of sidebar */}
                        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                            <SheetTrigger asChild>
                                <Button className={`lg:hidden relative bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md transition-transform ${cartAnimating ? "scale-110" : ""}`} size="icon">
                                    <ShoppingCart className="h-5 w-5" />
                                    {itemCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                                            {itemCount}
                                        </span>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col">
                                <div className="p-4 border-b"><SheetTitle className="font-heading text-xl">Seu Pedido</SheetTitle></div>
                                <div className="p-4 flex-1 overflow-auto">
                                    <CartContent items={items} removeItem={removeItem} updateQuantity={updateQuantity} total={total} itemCount={itemCount} onCheckout={() => { setCartOpen(false); navigate("/checkout"); }} />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            {/* Mobile Search Input Below Header */}
            <div className="md:hidden px-4 pt-10 pb-2">
                <div className="relative shadow-sm rounded-full overflow-hidden border border-border bg-white">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="O que vai pedir hoje?" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="pl-10 pr-10 border-0 h-10"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 flex flex-col lg:flex-row gap-8">
                <main className="flex-1 min-w-0">
                
                {/* Menu Selector */}
                {menus.length > 1 && (
                    <div className="mb-3">
                        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                            {menus.map(menu => (
                                <button key={menu.id} onClick={() => setSelectedMenu(menu.id)}
                                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        selectedMenu === menu.id ? "bg-primary text-white shadow-md ring-2 ring-primary/20 ring-offset-2" : "bg-white border border-border text-foreground hover:border-primary/50"
                                    }`}>
                                    {menu.icon && <span>{menu.icon}</span>} {menu.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Tabs */}
                {categories.length > 0 ? (
                    <div className="mb-6">
                        <div className="sticky top-24 z-30 bg-white/95 backdrop-blur-md border-b border-border pt-3 pb-0 mb-6 shadow-sm -mx-4 px-4 sm:mx-0 sm:px-0">
                            <div className="flex gap-2 overflow-x-auto pb-0 scrollbar-hide">
                                {categories.map(category => (
                                    <button key={category.id} onClick={() => setSelectedCategory(category.id)}
                                        className={`flex-shrink-0 px-4 py-3 text-[15px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                                            selectedCategory === category.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                        }`}>
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reorder Suggestions */}
                        {isLoggedIn && reorderSuggestions.length > 0 && (
                            <ReorderSection suggestions={reorderSuggestions} onReorder={(product) => {
                                addItem(product, 1, [], "");
                                toast.success(`${product.name} adicionado!`);
                            }} />
                        )}

                        {/* Category Header */}
                        {currentCategory && (
                            <div className="mb-5 mt-2">
                                <h2 className="text-2xl font-bold font-heading text-foreground tracking-tight">{currentCategory.name}</h2>
                                {currentCategory.description && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{currentCategory.description}</p>}
                            </div>
                        )}

                        {/* Products Grid */}
                        {isProductLoading ? (
                            <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                                {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                                {filteredProducts.map(product => (
                                    <ProductCard key={product.id} product={product} onClick={setSelectedProduct} backendUrl={BACKEND_URL} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-muted/30 rounded-2xl">
                                <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                                <p className="text-muted-foreground text-sm">{search ? "Tente buscar por outro termo" : "Nenhum produto nesta categoria"}</p>
                                {search && <Button variant="outline" className="mt-4 rounded-full" onClick={() => setSearch("")}>Limpar busca</Button>}
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
                </main>

                {/* Desktop Cart Sidebar */}
                <aside className="hidden lg:block w-80 flex-shrink-0">
                    <div className="sticky top-28 bg-white rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col">
                        <div className="bg-white border-b border-border/60 p-5 text-center">
                            <h2 className="font-heading font-extrabold text-xl text-primary flex items-center justify-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-primary" /> Seu Pedido
                            </h2>
                        </div>
                        <div className="p-5 max-h-[calc(100vh-250px)] overflow-auto bg-zinc-50/50">
                            <CartContent items={items} removeItem={removeItem} updateQuantity={updateQuantity} total={total} itemCount={itemCount} onCheckout={() => navigate("/checkout")} />
                        </div>
                    </div>
                </aside>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border flex items-center justify-around pb-2 pt-2 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center p-2 text-primary">
                    <Store className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium">Cardápio</span>
                </button>
                <button onClick={() => { document.querySelector('[data-testid="mobile-search"]')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex flex-col items-center p-2 text-muted-foreground hover:text-primary transition-colors">
                    <Search className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium">Busca</span>
                </button>
                <button onClick={() => navigate("/checkout")} className="flex flex-col items-center p-2 text-muted-foreground hover:text-primary transition-colors relative">
                    <ShoppingCart className="h-5 w-5 mb-1" />
                    {itemCount > 0 && (
                        <span className="absolute top-1 right-2 bg-accent text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-sm">
                            {itemCount}
                        </span>
                    )}
                    <span className="text-[10px] font-medium">Pedido</span>
                </button>
                {isLoggedIn ? (
                    <button onClick={() => navigate("/historico")} className="flex flex-col items-center p-2 text-muted-foreground hover:text-primary transition-colors">
                        <User className="h-5 w-5 mb-1" />
                        <span className="text-[10px] font-medium">Perfil</span>
                    </button>
                ) : (
                    <button onClick={() => setLoginModalOpen(true)} className="flex flex-col items-center p-2 text-muted-foreground hover:text-primary transition-colors">
                        <User className="h-5 w-5 mb-1" />
                        <span className="text-[10px] font-medium">Entrar</span>
                    </button>
                )}
            </div>

            {/* Product Detail Modal */}
            <ProductDetailModal product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={handleAddItem} storeOpen={storeOpen} />

            {/* Login Modal */}
            <LoginModal open={loginModalOpen} onClose={() => { setLoginModalOpen(false); setPendingAddItem(null); }} onLogin={async (phone, name) => {
                const result = await login(phone, name);
                if (result.success) {
                    handleLoginSuccess();
                }
                return result;
            }} />
        </div>
    );
}
