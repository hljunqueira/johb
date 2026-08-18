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
import { Search, ShoppingCart, Plus, Minus, Clock, Heart, Layers, Grid3X3, ChevronRight, User, History, RotateCcw, X, Flame, Store, Trash2, Coffee, MapPin, PhoneCall, Truck, Sparkles, Check, Volume2, VolumeX } from "lucide-react";
import Header from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryPills } from "@/components/CategoryPills";
import { EnhancedProductCard } from "@/components/EnhancedProductCard";
import { getAvailableScheduleDates, getAvailableTimeSlots } from "@/lib/scheduleUtils";

const rawBackend = process.env.REACT_APP_BACKEND_URL || '';
const BACKEND_URL = (rawBackend && rawBackend.includes('hljdev.com.br'))
    ? rawBackend
    : 'https://johb-api.hljdev.com.br';
const API = `${BACKEND_URL}/api`;

// Categorias padrão JOHB para exibição contínua
const DEFAULT_JOHB_CATEGORIES = [
    { id: "cat-salgados", name: "Salgados", description: "Salgados fritos e assados artesanais quentinhos", order: 0 },
    { id: "cat-assados", name: "Assados", description: "Folhados e assados dourados saindo do forno", order: 1 },
    { id: "cat-doces", name: "Doces / Cucas", description: "Cucas tradicionais e bolos fofinhos artesanais", order: 2 },
    { id: "cat-combos", name: "Combos", description: "Combinações perfeitas de salgados + bebida", order: 3 },
    { id: "cat-bebidas", name: "Bebidas", description: "Refrigerantes e sucos naturais bem gelados", order: 4 }
];

const getImageUrl = (url) => {
    if (!url) return "/logo-semfundo.png";
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
    const [status, setStatus] = useState({ isOpen: true, message: "", nextOpen: null, temporarilyClosed: false });
    const [deliverySettings, setDeliverySettings] = useState(null);

    const checkStatus = (settings) => {
        if (!settings) return;

        if (settings.temporarily_closed) {
            setStatus({ isOpen: false, message: "Fechado temporariamente", nextOpen: null, temporarilyClosed: true });
            return;
        }

        if (settings.always_open) {
            setStatus({ isOpen: true, message: "Aberto 24 horas", nextOpen: null, alwaysOpen: true, temporarilyClosed: false });
            return;
        }

        const businessHours = parseBusinessHours(settings.business_hours);
        if (!businessHours || Object.keys(businessHours).length === 0) {
            setStatus({ isOpen: true, message: "Aberto agora", nextOpen: null, temporarilyClosed: false });
            return;
        }

        const now = new Date();
        const dayMap = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
        const todayKey = dayMap[now.getDay()];
        const todayConfig = businessHours[todayKey];

        if (!todayConfig || todayConfig.open === false) {
            setStatus({ isOpen: false, message: "Fechado hoje", nextOpen: findNextOpen(businessHours, now), temporarilyClosed: false });
            return;
        }

        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = (todayConfig.start || "00:00").split(":").map(Number);
        const [closeH, closeM] = (todayConfig.end || "23:59").split(":").map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (currentTime < openMinutes) {
            setStatus({ isOpen: false, message: `Abre às ${todayConfig.start}`, nextOpen: todayConfig.start, temporarilyClosed: false });
        } else if (currentTime >= closeMinutes) {
            setStatus({ isOpen: false, message: "Fechado agora", nextOpen: findNextOpen(businessHours, now), temporarilyClosed: false });
        } else {
            const minutesUntilClose = closeMinutes - currentTime;
            const minsUntil = minutesUntilClose % 60;
            const closingSoon = minutesUntilClose <= 60;
            setStatus({
                isOpen: true,
                message: closingSoon ? `Fecha em ${minsUntil}min` : `Aberto até ${todayConfig.end}`,
                nextOpen: null,
                closingSoon,
                temporarilyClosed: false
            });
        }
    };

    useEffect(() => {
        axios.get(`${API}/delivery-settings`).then(r => {
            setDeliverySettings(r.data);
            checkStatus(r.data);
        }).catch(() => { });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (status.temporarilyClosed) {
        return (
            <div className="py-3 px-5 text-center text-xs sm:text-sm font-bold tracking-wide rounded-2xl mb-8 transition-all bg-red-500/15 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/10">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
                    <Clock className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                        🔴 Loja Fechada Temporariamente — Pausamos os pedidos no momento. Retornaremos em breve!
                    </span>
                </div>
            </div>
        );
    }

    if (!status.isOpen) {
        return (
            <div className="py-3 px-5 text-center text-xs sm:text-sm font-bold tracking-wide rounded-2xl mb-8 transition-all bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/5">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#F4B544] shrink-0" />
                    <span>
                        🔴 Atendimento Presencial Fechado — Aceitando Pedidos por Agendamento Prévio!
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="py-3 px-5 text-center text-xs sm:text-sm font-bold tracking-wide rounded-2xl mb-8 transition-all bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                    🟢 Aberto Agora — Aceitando Pedidos Online!
                </span>
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
            <DialogContent className="max-w-lg bg-[#10100F] border border-[#F4B544]/20 p-0 text-[#FFFAF0] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden">
                {product.image_url ? (
                    <div className="relative aspect-[16/9] bg-[#050505] shrink-0">
                        <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-3.5 right-3.5 z-50 w-9 h-9 rounded-full bg-[#050505]/85 hover:bg-[#171612] text-[#FFFAF0] hover:text-[#F4B544] flex items-center justify-center border border-[#F4B544]/30 hover:border-[#F4B544] shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                            aria-label="Fechar modal"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center px-6 pt-6 pb-2 shrink-0">
                        <span className="text-[11px] uppercase font-bold text-[#F4B544] bg-[#F4B544]/10 border border-[#F4B544]/25 px-2.5 py-1 rounded-full">
                            JOHB Café & Salgados
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-[#141414] hover:bg-[#1E1E1E] text-[#FFFAF0] hover:text-[#F4B544] flex items-center justify-center border border-white/10 hover:border-[#F4B544] transition-all cursor-pointer"
                            aria-label="Fechar modal"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    <div>
                        <DialogTitle className="font-serif text-2xl font-bold text-[#FFFAF0] mb-1">
                            {product.name}
                        </DialogTitle>
                        <p className="text-xs text-[#B8B1A3] leading-relaxed">{product.description}</p>
                    </div>

                    {/* Complementos e Opcionais cadastrados no Produto pelo Admin */}
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
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${isSelected
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
                            className="flex-1 py-3 px-6 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all flex items-center justify-between gold-glow cursor-pointer"
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

function CartContent({ items, removeItem, updateQuantity, total, itemCount, onCheckout, deliverySettings }) {
    const { scheduledDate, scheduledTime, setScheduleInfo } = useCart();
    const [scheduleMode, setScheduleMode] = useState(scheduledDate ? "agendado" : "imediato");

    const minFreeDelivery = Number(deliverySettings?.min_free_delivery) || 0;
    const isFreeDelivery = minFreeDelivery > 0 && total >= minFreeDelivery;
    const diffToFree = Math.max(0, minFreeDelivery - total);
    const progressPercent = minFreeDelivery > 0 ? Math.min(100, Math.round((total / minFreeDelivery) * 100)) : 0;

    // Gerar datas disponíveis baseadas nas regras da loja
    const availableDates = useMemo(() => {
        return getAvailableScheduleDates(deliverySettings);
    }, [deliverySettings]);

    // Data selecionada válida
    const selDate = useMemo(() => {
        if (scheduledDate && availableDates.some(d => d.value === scheduledDate)) {
            return scheduledDate;
        }
        return availableDates[0]?.value || "";
    }, [scheduledDate, availableDates]);

    // Slots de horário para a data selecionada
    const timeSlots = useMemo(() => {
        if (!selDate) return [];
        return getAvailableTimeSlots(selDate, deliverySettings);
    }, [selDate, deliverySettings]);

    // Horário selecionado válido
    const selTime = useMemo(() => {
        if (scheduledTime && timeSlots.includes(scheduledTime)) {
            return scheduledTime;
        }
        return timeSlots[0] || "";
    }, [scheduledTime, timeSlots]);

    const handleAdvance = () => {
        if (scheduleMode === "agendado" && selDate && selTime) {
            setScheduleInfo(selDate, selTime);
        } else {
            setScheduleInfo("", "");
        }
        onCheckout();
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <ShoppingCart className="h-12 w-12 text-[#F4B544]/40 mx-auto" />
                <p className="text-sm text-[#B8B1A3]">Seu carrinho está vazio</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Barra de Progresso de Frete Grátis */}
            {minFreeDelivery > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#050505] border border-[#F4B544]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                            <Truck className="w-4 h-4 text-[#F4B544]" />
                            {isFreeDelivery ? (
                                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-[#F4B544]" /> Frete Grátis Garantido!
                                </span>
                            ) : (
                                <span className="text-[#FFFAF0]">
                                    Faltam <strong className="text-[#F4B544]">R$ {diffToFree.toFixed(2).replace(".", ",")}</strong> para Frete Grátis
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-[#B8B1A3] font-bold">Meta: R$ {minFreeDelivery.toFixed(2)}</span>
                    </div>

                    <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-white/5">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${isFreeDelivery
                                    ? "bg-gradient-to-r from-emerald-400 to-[#F4B544]"
                                    : "bg-gradient-to-r from-[#F4B544] to-[#C88A24]"
                                }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Lista de Itens */}
            <div className="space-y-3">
                {items.map((item, idx) => {
                    const itemKey = item.cart_id || item.id || idx;
                    return (
                        <div key={itemKey} className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-[#F4B544]/15">
                            <div className="flex-1 min-w-0 pr-3">
                                <h4 className="text-xs font-bold text-[#FFFAF0] truncate">{item.name || item.product_name}</h4>
                                <p className="text-[11px] text-[#F4B544] font-semibold mt-0.5">
                                    R$ {(item.price * item.quantity).toFixed(2)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(itemKey, item.quantity - 1)} className="p-1 text-[#B8B1A3] hover:text-[#FFFAF0]">
                                    <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold text-[#F4B544]">{item.quantity}</span>
                                <button onClick={() => updateQuantity(itemKey, item.quantity + 1)} className="p-1 text-[#B8B1A3] hover:text-[#FFFAF0]">
                                    <Plus className="h-3 w-3" />
                                </button>
                                <button onClick={() => removeItem(itemKey)} className="p-1 text-red-400 hover:text-red-300 ml-1" title="Remover item">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bloco de Escolha do Horário / Opção de Pular */}
            {deliverySettings?.allow_immediate_orders !== false || deliverySettings?.allow_scheduled_orders !== false ? (
                <div className="p-4 bg-[#050505] border border-[#F4B544]/30 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#F4B544] uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-[#F4B544]" />
                            <span>Quando deseja receber?</span>
                        </div>
                    </div>

                    {/* Abas Imediato vs Agendado (se ambos permitidos) */}
                    {deliverySettings?.allow_immediate_orders !== false && deliverySettings?.allow_scheduled_orders !== false && (
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#10100F] border border-[#F4B544]/15">
                            <button
                                type="button"
                                onClick={() => {
                                    setScheduleMode("imediato");
                                    setScheduleInfo("", "");
                                }}
                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    scheduleMode === "imediato"
                                        ? "bg-[#F4B544] text-[#050505] shadow-md font-extrabold"
                                        : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                }`}
                            >
                                <span>⚡ O quanto antes</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setScheduleMode("agendado");
                                    setScheduleInfo(selDate, selTime);
                                }}
                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    scheduleMode === "agendado"
                                        ? "bg-[#F4B544] text-[#050505] shadow-md font-extrabold"
                                        : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                }`}
                            >
                                <span>📅 Agendar Horário</span>
                            </button>
                        </div>
                    )}

                    {scheduleMode === "imediato" && deliverySettings?.allow_immediate_orders !== false ? (
                        <div className="p-3 rounded-xl bg-[#10100F] border border-[#F4B544]/15 text-xs text-[#B8B1A3] flex items-center justify-between">
                            <span>Preparado e entregue na sequência do pedido.</span>
                            <span className="text-[11px] font-bold text-[#F4B544]">⚡ Envio imediato</span>
                        </div>
                    ) : (
                        <div className="space-y-3 pt-1">
                            {/* Seleção da Data */}
                            <div>
                                <label className="text-[11px] font-semibold text-[#B8B1A3] block mb-1.5">Data Desejada:</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {availableDates.slice(0, 3).map(d => (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => setScheduleInfo(d.value, selTime)}
                                            className={`py-2 px-2 text-[11px] font-extrabold rounded-xl border transition-all cursor-pointer ${
                                                selDate === d.value
                                                    ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black border-[#F4B544]"
                                                    : "bg-[#10100F] text-[#B8B1A3] border-white/10 hover:border-white/30"
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Seleção da Faixa de Horário */}
                            <div>
                                <label className="text-[11px] font-semibold text-[#B8B1A3] block mb-1.5">Horário de Entrega/Retirada:</label>
                                {timeSlots.length > 0 ? (
                                    <select
                                        value={selTime}
                                        onChange={e => setScheduleInfo(selDate, e.target.value)}
                                        className="w-full bg-[#10100F] text-[#FFFAF0] border border-[#F4B544]/30 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#F4B544] cursor-pointer"
                                    >
                                        {timeSlots.map(t => (
                                            <option key={t} value={t}>{t} hs</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-2">
                                        <div>
                                            Horários para hoje encerrados ou dentro da antecedência mínima. Por favor, selecione <strong>Amanhã</strong> ou clique abaixo para pedir agora.
                                        </div>
                                        {deliverySettings?.allow_immediate_orders !== false && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setScheduleMode("imediato");
                                                    setScheduleInfo("", "");
                                                }}
                                                className="text-xs font-bold text-[#F4B544] underline hover:text-[#FFC85C] block cursor-pointer"
                                            >
                                                👉 Pular agendamento e pedir o quanto antes
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Subtotal e Ação de Checkout */}
            <div className="pt-2 border-t border-[#F4B544]/15 space-y-3">
                <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-[#FFFAF0]">Subtotal:</span>
                    <span className="text-[#F4B544] font-serif text-lg">R$ {total.toFixed(2)}</span>
                </div>
                <button
                    type="button"
                    onClick={handleAdvance}
                    className="w-full py-3.5 rounded-full bg-[#F4B544] text-[#050505] font-extrabold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all gold-glow flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                    <span>Avançar para Checkout</span>
                    <ChevronRight className="w-4 h-4" />
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

function AboutVideoCard() {
    const [muted, setMuted] = useState(true);
    const videoRef = useRef(null);

    const toggleSound = () => {
        if (videoRef.current) {
            videoRef.current.muted = !muted;
            setMuted(!muted);
            if (muted) {
                toast.success("Áudio do vídeo ativado!", {
                    style: { background: "#171612", color: "#FFFAF0", border: "1px solid rgba(244, 181, 68, 0.4)" }
                });
            }
        }
    };

    return (
        <div className="relative w-full max-w-sm sm:max-w-md mx-auto rounded-3xl overflow-hidden border border-[#F4B544]/35 bg-[#10100F] shadow-2xl gold-glow group">
            <video
                ref={videoRef}
                src="/johbcafeesalgados.mp4"
                autoPlay
                loop
                muted={muted}
                playsInline
                className="w-full h-full object-cover max-h-[500px] rounded-3xl"
            />
            {/* Overlay com gradiente suave */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/85 via-transparent to-transparent pointer-events-none rounded-3xl" />

            {/* Botão de Controle de Som */}
            <button
                type="button"
                onClick={toggleSound}
                className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#050505]/85 hover:bg-[#171612] border border-[#F4B544]/40 hover:border-[#F4B544] text-[#FFFAF0] text-xs font-bold shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                aria-label={muted ? "Ativar som do vídeo" : "Desativar som do vídeo"}
            >
                {muted ? (
                    <>
                        <VolumeX className="w-4 h-4 text-[#F4B544]" />
                        <span>Ativar Som</span>
                    </>
                ) : (
                    <>
                        <Volume2 className="w-4 h-4 text-[#F4B544] animate-pulse" />
                        <span>Som Ligado</span>
                    </>
                )}
            </button>

            {/* Badge elegante no rodapé do vídeo */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#10100F]/90 border border-[#F4B544]/30 backdrop-blur-md text-xs font-bold text-[#F4B544] shadow-lg">
                    <span>🎬 Produção Artesanal JOHB</span>
                </div>
            </div>
        </div>
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

    const [reviewsData, setReviewsData] = useState({ avg_rating: 4.9, total_reviews: 48, testimonials: [] });
    const [quickTagFilter, setQuickTagFilter] = useState("all");

    const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
    const { favorites, clearFavorites } = useFavorites();
    const { customer, isLoggedIn, login, logout } = useCustomer();
    const { isOpen: storeOpen, ...storeStatus } = useStoreStatus();
    const navigate = useNavigate();

    // Carregar Menus, Categorias, Produtos e Reviews no mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setProductLoading(true);
                const [menuRes, catRes, prodRes, revRes] = await Promise.all([
                    axios.get(`${API}/menus`).catch(() => ({ data: [] })),
                    axios.get(`${API}/categories`).catch(() => ({ data: [] })),
                    axios.get(`${API}/products`).catch(() => ({ data: [] })),
                    axios.get(`${API}/reviews/summary`).catch(() => ({ data: { avg_rating: 4.9, total_reviews: 48, testimonials: [] } }))
                ]);

                const fetchedMenus = Array.isArray(menuRes.data) && menuRes.data.length > 0 ? menuRes.data : [];
                const fetchedCats = Array.isArray(catRes.data) && catRes.data.length > 0 ? catRes.data : DEFAULT_JOHB_CATEGORIES;
                const fetchedProds = Array.isArray(prodRes.data) ? prodRes.data : [];

                setMenus(fetchedMenus);
                setCategories(fetchedCats);
                setProducts(fetchedProds);
                if (revRes?.data) setReviewsData(revRes.data);

                if (fetchedMenus.length > 0) {
                    const firstMenuId = fetchedMenus[0].id;
                    setSelectedMenu(firstMenuId);
                    const firstMenuCats = fetchedCats.filter(c => c.menu_id === firstMenuId);
                    if (firstMenuCats.length > 0) {
                        setSelectedCategory(firstMenuCats[0].id);
                    } else {
                        setSelectedCategory("all");
                    }
                } else if (fetchedCats.length > 0) {
                    setSelectedCategory(fetchedCats[0].id);
                }
            } catch {
                setCategories(DEFAULT_JOHB_CATEGORIES);
            } finally {
                setProductLoading(false);
            }
        };
        fetchData();
    }, []);

    // Categorias ativas com base no Menu selecionado
    const activeCategories = useMemo(() => {
        if (!selectedMenu) return categories;
        const filtered = categories.filter(c => c.menu_id === selectedMenu);
        return filtered.length > 0 ? filtered : categories;
    }, [categories, selectedMenu]);

    // Trocar de Menu e definir 'all' para ver todos os produtos do menu
    const handleSelectMenu = (menuId) => {
        setSelectedMenu(menuId);
        setSelectedCategory("all");
    };

    // Filtrar produtos por busca, menu ativo e categoria selecionada
    const filteredProducts = useMemo(() => {
        let result = products;

        if (search) {
            const query = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        } else if (selectedCategory && selectedCategory !== "all") {
            result = result.filter(p => p.category_id === selectedCategory);
        } else if (activeCategories.length > 0) {
            const activeCatIds = activeCategories.map(c => c.id);
            result = result.filter(p => activeCatIds.includes(p.category_id));
        }

        // Deduplicação estrita por ID
        const uniqueMap = new Map();
        result.forEach(p => {
            if (p && p.id && !uniqueMap.has(p.id)) {
                uniqueMap.set(p.id, p);
            }
        });

        return Array.from(uniqueMap.values());
    }, [products, search, selectedCategory, activeCategories]);

    const handleAddItem = (product, quantity, additionals, observation) => {
        addItem(product, quantity, additionals, observation);
        toast.success("Item adicionado ao carrinho!");
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FFFAF0] font-sans antialiased selection:bg-[#F4B544]/30" data-testid="menu-page">
            {/* Header Artesanal JOHB */}
            <Header onOpenCart={() => setCartOpen(true)} />

            {/* Hero Section Editorial com Banners Dinâmicos */}
            <HeroSection
                onVerCardapio={() => {
                    const el = document.getElementById("cardapio");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                onVerCombos={() => {
                    const el = document.getElementById("combos");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                deliverySettings={storeStatus.deliverySettings}
                storeStatus={{ isOpen: storeOpen, ...storeStatus }}
            />

            {/* Conteúdo Principal — Cardápio em 2 Níveis Elegantes */}
            <section id="cardapio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Banner de Status da Loja / Agendamento */}
                <StoreStatusBanner status={{ isOpen: storeOpen, ...storeStatus }} />

                {/* Selo de Prova Social no Topo */}
                <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl bg-[#10100F] border border-[#F4B544]/20 mb-8 shadow-lg">
                    {reviewsData.total_reviews > 0 ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[#F4B544] font-extrabold text-sm sm:text-base">
                                <span>⭐</span>
                                <span>{reviewsData.avg_rating}</span>
                                <span className="text-[#B8B1A3] font-normal text-xs">/ 5.0</span>
                            </div>
                            <span className="text-white/20">|</span>
                            <span className="text-xs text-[#FFFAF0] font-medium">
                                <strong>{reviewsData.total_reviews}</strong> {reviewsData.total_reviews === 1 ? "avaliação real de cliente" : "avaliações de clientes"} em Balneário Arroio do Silva
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-[#F4B544] font-bold text-xs sm:text-sm">
                                Salgados Frescos & Artesanais
                            </span>
                            <span className="text-white/20">|</span>
                            <span className="text-xs text-[#FFFAF0] font-medium">
                                Feitos sob encomenda com muito carinho em Balneário Arroio do Silva
                            </span>
                        </div>
                    )}
                    <span className="text-[11px] font-bold text-[#F4B544] uppercase tracking-wider bg-[#F4B544]/10 px-3 py-1 rounded-full border border-[#F4B544]/30">
                        🏆 Tradição & Qualidade Artesanal
                    </span>
                </div>

                {/* Barra de Pesquisa e Título da Seção */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#F4B544]/15 mb-6">
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

                {/* Nível 1: Abas de Menus Principais */}
                {menus.length > 0 && (
                    <div className="flex items-center justify-start md:justify-center gap-3 overflow-x-auto pb-4 scrollbar-none mb-6">
                        {menus.map(menu => {
                            const isSelected = selectedMenu === menu.id;
                            const cleanMenuName = (menu.name || "").replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[✨⭐🏆🔥🥐🍰🥤🍽️🍴🍕🌱🥧]/gu, "").trim();
                            return (
                                <button
                                    key={menu.id}
                                    type="button"
                                    onClick={() => handleSelectMenu(menu.id)}
                                    className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-extrabold transition-all cursor-pointer border ${isSelected
                                            ? "bg-[#F4B544] text-[#050505] border-[#F4B544] shadow-lg shadow-[#F4B544]/20 scale-105"
                                            : "bg-[#10100F] text-[#B8B1A3] border-white/10 hover:border-[#F4B544]/50 hover:text-[#FFFAF0]"
                                        }`}
                                >
                                    <span>{cleanMenuName}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Nível 2: Pílulas de Subcategorias do Menu Ativo */}
                <div className="mb-8">
                    <CategoryPills
                        categories={activeCategories}
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
                        {search && (
                            <p className="text-[#B8B1A3] text-sm mt-1">
                                Tente buscar por outro termo
                            </p>
                        )}
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

            {/* Seção de Depoimentos & Prova Social Reais */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#F4B544]/15">
                <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                    <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold">
                        O Que Dizem Nossos Clientes
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFFAF0]">
                        Amor em Cada Mordida
                    </h2>
                </div>

                {reviewsData?.testimonials && reviewsData.testimonials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {reviewsData.testimonials.map((t, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-[#10100F] border border-[#F4B544]/20 space-y-4 shadow-lg gold-glow-sm flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-1 text-[#F4B544] text-sm">
                                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                                            <span key={i}>⭐</span>
                                        ))}
                                    </div>
                                    <p className="text-xs sm:text-sm text-[#FFFAF0] italic font-light leading-relaxed">
                                        "{t.rating_comment}"
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#B8B1A3]">
                                    <span className="font-bold text-[#F4B544]">{t.customer_name}</span>
                                    <span>{t.created_at}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[#10100F] border border-[#F4B544]/30 text-center space-y-4 shadow-xl gold-glow-sm">
                        <div className="space-y-1.5">
                            <h3 className="font-serif text-xl font-bold text-[#FFFAF0]">Ainda não temos avaliações registradas</h3>
                            <p className="text-xs sm:text-sm text-[#B8B1A3] font-light leading-relaxed max-w-md mx-auto">
                                Faça seu pedido no cardápio, experimente nossos salgados artesanais e seja o primeiro a deixar seu feedback aqui!
                            </p>
                        </div>
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const el = document.getElementById("cardapio");
                                    if (el) el.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="px-7 py-3 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all shadow-lg gold-glow cursor-pointer"
                            >
                                Fazer Primeiro Pedido & Avaliar
                            </button>
                        </div>
                    </div>
                )}
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
                                <span className="text-xs text-[#B8B1A3]">Delivery rápido e direto para sua casa.</span>
                            </div>
                            <div>
                                <span className="block font-serif text-xl font-bold text-[#F4B544]">Atendimento</span>
                                <span className="text-xs text-[#B8B1A3]">Somente pedidos agendados</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex justify-center items-center">
                        <AboutVideoCard />
                    </div>
                </div>
            </section>

            {/* Footer Artesanal JOHB */}
            <footer className="bg-[#10100F] border-t border-[#F4B544]/20 py-12 text-center text-xs text-[#B8B1A3]">
                <div className="max-w-7xl mx-auto px-4 space-y-6">
                    <img src="/logo.png" alt="JOHB Café & Salgados" className="h-16 w-auto mx-auto object-contain" />
                    <p className="font-serif text-lg text-[#FFFAF0] italic max-w-md mx-auto">
                        "O aroma de um bom café é o primeiro abraço do dia."
                    </p>
                    <div className="flex justify-center gap-6 text-[#F4B544] uppercase tracking-wider font-semibold text-[11px]">
                        <a href="#cardapio" className="hover:underline">Cardápio</a>
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
                            deliverySettings={storeStatus.deliverySettings}
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
