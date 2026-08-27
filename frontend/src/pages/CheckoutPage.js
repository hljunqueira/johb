import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    ArrowLeft, Truck, Store, Check, Loader2, MapPin,
    CreditCard, QrCode, ShoppingBag, ShieldCheck, Sparkles,
    Clock, DollarSign, Banknote, AlertCircle, Tag, X
} from "lucide-react";
import { getAvailableScheduleDates, getAvailableTimeSlots } from "@/lib/scheduleUtils";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const getImageUrl = (url) => {
    if (!url) return "/logo-semfundo.png";
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `${BACKEND_URL}${url}`;
};

export default function CheckoutPage() {
    const { items, total, clearCart, scheduledDate, scheduledTime, setScheduleInfo } = useCart();
    const navigate = useNavigate();

    // Dados do cliente salvos no navegador
    const customerData = (() => {
        try {
            const saved = localStorage.getItem("johb-customer");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    })();

    const [name, setName] = useState(customerData?.name || localStorage.getItem("johb-name") || "");
    const [phone, setPhone] = useState(customerData?.phone || localStorage.getItem("johb-phone") || "");

    const [deliveryType, setDeliveryType] = useState("entrega"); // 'entrega' ou 'retirada'
    const [address, setAddress] = useState(() => localStorage.getItem("johb-address") || "");
    const [neighborhood, setNeighborhood] = useState(() => localStorage.getItem("johb-neighborhood") || "");
    const [observation, setObservation] = useState("");

    // Formas de pagamento: 'asaas' (online), 'cartao_maquininha', 'dinheiro'
    const [paymentMethod, setPaymentMethod] = useState("asaas");
    const [needsChange, setNeedsChange] = useState(false);
    const [changeForValue, setChangeForValue] = useState("");

    // Cupons de desconto
    const [couponInput, setCouponInput] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);

    // Configurações do estabelecimento
    const [deliverySettings, setDeliverySettings] = useState(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (items.length === 0) {
            toast.error("Seu carrinho está vazio!");
            navigate("/");
        }
    }, [items, navigate]);

    useEffect(() => {
        axios.get(`${API}/delivery-settings`)
            .then(res => {
                const data = res.data || {};
                setDeliverySettings(data);
                if (data.active === false && data.allow_pickup !== false) {
                    setDeliveryType("retirada");
                } else if (data.active !== false && data.allow_pickup === false) {
                    setDeliveryType("entrega");
                }
                // Definir forma de pagamento padrão baseada nas opções ativas no Admin
                if (data.accept_online_payment !== false) {
                    setPaymentMethod("asaas");
                } else if (data.accept_card_machine !== false) {
                    setPaymentMethod("cartao_maquininha");
                } else if (data.accept_cash !== false) {
                    setPaymentMethod("dinheiro");
                }
                if (data.areas && Array.isArray(data.areas) && data.areas.length > 0) {
                    setNeighborhood(prev => {
                        if (prev && data.areas.some(a => a.name === prev)) return prev;
                        return data.areas[0].name;
                    });
                }
            })
            .catch(err => {
                console.warn("Erro ao carregar configurações de entrega:", err);
            })
            .finally(() => {
                setLoadingSettings(false);
            });
    }, []);

    // Formatar Telefone com Máscara
    const handlePhoneChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 11) val = val.slice(0, 11);
        if (val.length > 6) {
            val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
        } else if (val.length > 2) {
            val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
        }
        setPhone(val);
    };

    // Controle se o pedido é agendado ou imediato
    const [isScheduled, setIsScheduled] = useState(() => Boolean(scheduledDate && scheduledTime));

    // Se pedidos imediatos estiverem desativados, garante modo agendado ativo
    useEffect(() => {
        if (deliverySettings?.allow_immediate_orders === false) {
            setIsScheduled(true);
        }
    }, [deliverySettings]);

    // Auto-reconhecimento de cliente por WhatsApp
    const handlePhoneBlur = async () => {
        const clean = phone.replace(/\D/g, "");
        if (clean.length >= 10 && !name.trim()) {
            try {
                const res = await axios.post(`${API}/customers/login`, { phone: clean });
                if (res.data && res.data.name) {
                    setName(res.data.name);
                    if (res.data.address && !address) {
                        setAddress(res.data.address);
                    }
                    toast.success(`Olá de volta, ${res.data.name}! Preenchemos seus dados habituais.`);
                }
            } catch { }
        }
    };

    // Lista de Bairros
    const neighborhoodsList = useMemo(() => {
        if (deliverySettings?.areas && Array.isArray(deliverySettings.areas)) {
            return deliverySettings.areas;
        }
        return [];
    }, [deliverySettings]);

    // Datas disponíveis
    const availableDates = useMemo(() => {
        return getAvailableScheduleDates(deliverySettings);
    }, [deliverySettings]);

    // Data selecionada (pega primeira data com slots disponíveis)
    const currentSelectedDate = useMemo(() => {
        if (scheduledDate && availableDates.some(d => d.value === scheduledDate)) {
            return scheduledDate;
        }
        const firstWithSlots = availableDates.find(d => d.hasSlots);
        return firstWithSlots?.value || availableDates[0]?.value || "";
    }, [scheduledDate, availableDates]);

    // Horários disponíveis
    const availableTimes = useMemo(() => {
        return getAvailableTimeSlots(currentSelectedDate, deliverySettings);
    }, [currentSelectedDate, deliverySettings]);

    // Horário selecionado
    const currentSelectedTime = useMemo(() => {
        if (scheduledTime && availableTimes.includes(scheduledTime)) {
            return scheduledTime;
        }
        return availableTimes[0] || "";
    }, [scheduledTime, availableTimes]);

    // Cálculo da taxa de entrega
    const selectedNeighborhoodObj = neighborhoodsList.find(
        n => (n.name || "").trim().toLowerCase() === (neighborhood || "").trim().toLowerCase()
    );
    const baseFee = selectedNeighborhoodObj?.fee != null ? Number(selectedNeighborhoodObj.fee) : Number(deliverySettings?.delivery_fee ?? 5);
    const minFree = Number(deliverySettings?.min_free_delivery ?? 0);
    const isFreeDeliveryEligible = minFree > 0 && total >= minFree;

    const finalDeliveryFee = deliveryType === "entrega"
        ? (isFreeDeliveryEligible ? 0 : baseFee)
        : 0;

    // Validação de Pedido Mínimo
    const minOrderValue = Number(deliverySettings?.min_order_value ?? 0);
    const isBelowMinOrder = minOrderValue > 0 && total < minOrderValue;
    const diffToMinOrder = minOrderValue > 0 ? Math.max(0, minOrderValue - total) : 0;

    // Desconto de cupom
    const discountAmount = appliedCoupon?.calculated_discount || 0;
    const grandTotal = Math.max(0, total + finalDeliveryFee - discountAmount);

    // Cálculo do troco em dinheiro
    const parsedChangeFor = parseFloat(changeForValue.replace(",", "."));
    const calculatedChange = (!isNaN(parsedChangeFor) && parsedChangeFor > grandTotal)
        ? (parsedChangeFor - grandTotal)
        : 0;

    const handleDateChange = (dateVal) => {
        const slots = getAvailableTimeSlots(dateVal, deliverySettings);
        const nextTime = slots[0] || "";
        setScheduleInfo(dateVal, nextTime);
    };

    const handleTimeChange = (timeVal) => {
        setScheduleInfo(currentSelectedDate, timeVal);
    };

    // Aplicar Cupom
    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setCouponLoading(true);
        try {
            const res = await axios.post(`${API}/coupons/validate`, {
                code: couponInput.trim(),
                subtotal: total
            });
            setAppliedCoupon(res.data);
            toast.success(res.data.message || "Cupom aplicado com sucesso!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Cupom inválido ou não atingiu o valor mínimo.");
            setAppliedCoupon(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput("");
        toast.info("Cupom removido.");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validação de Loja Fechada
        const isClosed = deliverySettings?.temporarily_closed || (deliverySettings?.allow_immediate_orders === false && deliverySettings?.allow_scheduled_orders === false);
        if (isClosed) {
            toast.error("A loja está temporariamente fechada para novos pedidos no momento.");
            return;
        }

        if (deliverySettings?.allow_immediate_orders === false && (!isScheduled || !currentSelectedDate || !currentSelectedTime)) {
            toast.error("Hoje é dia de produção na cozinha. Por favor, selecione data e horário para agendar seu pedido.");
            return;
        }

        if (isBelowMinOrder) {
            toast.error(`O valor mínimo para pedidos é de R$ ${minOrderValue.toFixed(2).replace(".", ",")}. Faltam R$ ${diffToMinOrder.toFixed(2).replace(".", ",")}.`);
            return;
        }

        if (!name.trim()) {
            toast.error("Por favor, informe seu nome.");
            return;
        }
        if (!phone.trim()) {
            toast.error("Por favor, informe seu WhatsApp.");
            return;
        }
        if (deliveryType === "entrega" && (!address.trim() || !neighborhood.trim())) {
            toast.error("Preencha seu endereço completo e bairro em Balneário Arroio do Silva.");
            return;
        }

        if (isScheduled && (!currentSelectedDate || !currentSelectedTime)) {
            toast.error("Por favor, selecione uma data e horário disponíveis para o agendamento.");
            return;
        }

        if (paymentMethod === "dinheiro" && needsChange) {
            if (isNaN(parsedChangeFor) || parsedChangeFor < grandTotal) {
                toast.error(`O valor para troco deve ser maior que o total do pedido (R$ ${grandTotal.toFixed(2)}).`);
                return;
            }
        }

        setLoading(true);
        try {
            // Salvar dados do cliente para preenchimento futuro
            localStorage.setItem("johb-name", name);
            localStorage.setItem("johb-phone", phone);
            if (deliveryType === "entrega") {
                localStorage.setItem("johb-address", address);
                localStorage.setItem("johb-neighborhood", neighborhood);
            }

            // 1. Criar pedido no backend
            const payload = {
                customer_name: name,
                customer_phone: phone,
                delivery_type: deliveryType,
                address: deliveryType === "entrega" ? address : "Retirada no Balcão",
                neighborhood: deliveryType === "entrega" ? neighborhood : "Balneário Arroio do Silva",
                items: items.map(i => ({
                    product_id: i.product_id || i.id,
                    name: i.name || i.product_name,
                    quantity: i.quantity,
                    price: i.price,
                    complements: i.complements || []
                })),
                subtotal: total,
                delivery_fee: finalDeliveryFee,
                total: grandTotal,
                observation: observation,
                payment_method: paymentMethod,
                change_for: (paymentMethod === "dinheiro" && needsChange) ? parsedChangeFor : null,
                scheduled_date: isScheduled ? currentSelectedDate : null,
                scheduled_time: isScheduled ? currentSelectedTime : null,
                coupon_code: appliedCoupon?.code || null,
                discount_amount: discountAmount
            };

            const res = await axios.post(`${API}/orders`, payload);
            const createdOrder = res.data;
            const orderId = createdOrder.id;

            // 2. Se o pagamento for Asaas (online)
            if (paymentMethod === "asaas") {
                try {
                    const checkoutRes = await axios.post(`${API}/payments/asaas/checkout`, {
                        order_id: orderId,
                        billing_type: "UNDEFINED"
                    });

                    clearCart();

                    if (checkoutRes.data?.invoice_url) {
                        toast.success("Pedido criado com sucesso! Redirecionando para o pagamento...");
                        window.location.href = checkoutRes.data.invoice_url;
                    } else {
                        toast.success("Pedido recebido com sucesso!");
                        navigate(`/pedido/${orderId}`);
                    }
                } catch (asaasErr) {
                    console.warn("Asaas Sandbox / Fallback:", asaasErr);
                    clearCart();
                    toast.success("Pedido registrado! Acompanhe os detalhes da entrega.");
                    navigate(`/pedido/${orderId}`);
                }
            } else {
                // Pagamento presencial (Maquininha ou Dinheiro)
                clearCart();
                toast.success("Pedido recebido com sucesso!");
                navigate(`/pedido/${orderId}`);
            }

        } catch (err) {
            console.error("Erro ao criar pedido:", err);
            toast.error("Não foi possível finalizar o pedido. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FFFAF0] antialiased pb-16">
            {/* Header de Checkout */}
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
                        <img src="/logo.png" alt="JOHB" className="h-8 w-auto object-contain" />
                        <span className="font-serif font-bold text-lg text-[#FFFAF0]">JOHB</span>
                    </div>

                    <div className="text-xs uppercase tracking-wider text-[#F4B544] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Checkout Seguro</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="text-center space-y-2 mb-8">
                    <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold">
                        Finalização do Pedido
                    </span>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFFAF0]">
                        Quase Pronto para Saborear
                    </h1>
                </div>

                {/* Banner de Loja Fechada Temporariamente */}
                {(deliverySettings?.temporarily_closed || (deliverySettings?.allow_immediate_orders === false && deliverySettings?.allow_scheduled_orders === false)) && (
                    <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 shadow-lg shadow-red-500/5">
                        <div className="flex items-center gap-2.5">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <span>🔴 A loja está fechada temporariamente para novos pedidos no momento.</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="px-4 py-2 rounded-xl bg-red-500/25 hover:bg-red-500/40 text-red-100 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                            Voltar ao Cardápio
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Coluna Principal: Formulário */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Bloco 1: Modalidade de Entrega */}
                        <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/20 space-y-4">
                            <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                <Truck className="w-5 h-5 text-[#F4B544]" />
                                <span>Como deseja receber seu pedido?</span>
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryType("entrega")}
                                    disabled={deliverySettings?.active === false}
                                    className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${deliveryType === "entrega"
                                            ? "bg-[#171612] border-[#F4B544] text-[#F4B544] gold-glow-sm"
                                            : "bg-[#050505] border-[#F4B544]/15 text-[#B8B1A3] hover:border-[#F4B544]/30"
                                        } ${deliverySettings?.active === false ? "opacity-40 cursor-not-allowed" : ""}`}
                                >
                                    <Truck className="w-6 h-6" />
                                    <span className="font-bold text-xs uppercase tracking-wider">Entrega em Domicílio</span>
                                    <span className="text-[11px] text-[#B8B1A3]">
                                        {deliverySettings?.active === false ? "Pausada no momento" : "Receba no seu endereço"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDeliveryType("retirada")}
                                    disabled={deliverySettings?.allow_pickup === false}
                                    className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${deliveryType === "retirada"
                                            ? "bg-[#171612] border-[#F4B544] text-[#F4B544] gold-glow-sm"
                                            : "bg-[#050505] border-[#F4B544]/15 text-[#B8B1A3] hover:border-[#F4B544]/30"
                                        } ${deliverySettings?.allow_pickup === false ? "opacity-40 cursor-not-allowed" : ""}`}
                                >
                                    <Store className="w-6 h-6" />
                                    <span className="font-bold text-xs uppercase tracking-wider">Retirar no Balcão</span>
                                    <span className={`text-[11px] font-medium ${deliverySettings?.allow_pickup === false ? "text-gray-500" : "text-emerald-400"}`}>
                                        {deliverySettings?.allow_pickup === false ? "Pausada no momento" : "Sem taxa de entrega"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Bloco 2: Quando deseja seu pedido? */}
                        <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-[#F4B544]" />
                                    <span>Quando deseja receber?</span>
                                </h2>
                            </div>

                            {/* Seletor Imediato vs Agendado */}
                            {deliverySettings?.allow_immediate_orders !== false && deliverySettings?.allow_scheduled_orders !== false && (
                                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#050505] border border-[#F4B544]/15">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsScheduled(false);
                                            setScheduleInfo("", "");
                                        }}
                                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${!isScheduled
                                                ? "bg-[#F4B544] text-black font-extrabold shadow-md"
                                                : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                            }`}
                                    >
                                        <span>⚡ O quanto antes</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsScheduled(true);
                                            setScheduleInfo(currentSelectedDate, currentSelectedTime);
                                        }}
                                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isScheduled
                                                ? "bg-[#F4B544] text-black font-extrabold shadow-md"
                                                : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                            }`}
                                    >
                                        <span>📅 Agendar Horário</span>
                                    </button>
                                </div>
                            )}

                            {deliverySettings?.allow_immediate_orders === false && (
                                <div className="p-3.5 rounded-xl bg-[#F4B544]/10 border border-[#F4B544]/30 flex items-center justify-between text-xs text-[#F4B544]">
                                    <span>🥖 <strong>Dia de Produção na Cozinha</strong> Pedidos exclusivamente por encomenda agendada.</span>
                                    <span className="font-bold">📅 Encomenda</span>
                                </div>
                            )}

                            {!isScheduled && deliverySettings?.allow_immediate_orders !== false ? (
                                <div className="p-3.5 rounded-xl bg-[#050505] border border-[#F4B544]/20 flex items-center justify-between text-xs text-[#B8B1A3]">
                                    <span>Preparo e envio na sequência da confirmação.</span>
                                    <span className="font-bold text-[#F4B544]">⚡ Envio Imediato</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-[#B8B1A3]">Data do Pedido</Label>
                                        <select
                                            value={currentSelectedDate}
                                            onChange={e => handleDateChange(e.target.value)}
                                            style={{ color: '#FFFAF0', backgroundColor: '#050505' }}
                                            className="w-full bg-[#050505] border border-[#F4B544]/30 text-[#FFFAF0] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#F4B544] cursor-pointer"
                                        >
                                            {availableDates.map(d => (
                                                <option key={d.value} value={d.value} className="bg-[#10100F] text-white">
                                                    {d.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-[#B8B1A3]">Horário Desejado</Label>
                                        <select
                                            value={currentSelectedTime}
                                            onChange={e => handleTimeChange(e.target.value)}
                                            style={{ color: '#FFFAF0', backgroundColor: '#050505' }}
                                            className="w-full bg-[#050505] border border-[#F4B544]/30 text-[#FFFAF0] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#F4B544] cursor-pointer"
                                        >
                                            {availableTimes.length > 0 ? (
                                                availableTimes.map(t => (
                                                    <option key={t} value={t} className="bg-[#10100F] text-white">
                                                        {t} hs
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" className="bg-[#10100F] text-white">Sem horários para esta data</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bloco 3: Dados de Contato e Endereço */}
                        <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/20 space-y-4">
                            <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#F4B544]" />
                                <span>Dados para Contato & Entrega</span>
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-[#B8B1A3]">WhatsApp / Telefone *</Label>
                                    <Input
                                        placeholder="(48) 99999-9999"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        onBlur={handlePhoneBlur}
                                        className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0] text-xs focus:border-[#F4B544]"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-[#B8B1A3]">Seu Nome Completo *</Label>
                                    <Input
                                        placeholder="Ex: Maria Silva"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0] text-xs focus:border-[#F4B544]"
                                        required
                                    />
                                </div>
                            </div>

                            {deliveryType === "entrega" && (
                                <div className="space-y-4 pt-2 border-t border-[#F4B544]/15">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-[#B8B1A3]">Bairro *</Label>
                                            {neighborhoodsList.length > 0 ? (
                                                <select
                                                    value={neighborhood}
                                                    onChange={e => setNeighborhood(e.target.value)}
                                                    className="w-full bg-[#050505] border border-[#F4B544]/30 text-[#FFFAF0] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#F4B544]"
                                                    required
                                                >
                                                    {neighborhoodsList.map(n => {
                                                        const isFree = minFree > 0 && total >= minFree;
                                                        return (
                                                            <option key={n.name} value={n.name} className="bg-[#10100F] text-white">
                                                                {n.name} — {isFree ? "Frete Grátis!" : `Taxa: R$ ${Number(n.fee || 0).toFixed(2)}`}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            ) : (
                                                <Input
                                                    placeholder="Digite seu bairro..."
                                                    value={neighborhood}
                                                    onChange={e => setNeighborhood(e.target.value)}
                                                    className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0] text-xs focus:border-[#F4B544]"
                                                    required
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-[#B8B1A3]">Rua e Número *</Label>
                                            <Input
                                                placeholder="Ex: Av. Barriga Verde, 120 - Apto 302"
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0] text-xs focus:border-[#F4B544]"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5 pt-2">
                                <Label className="text-xs text-[#B8B1A3]">Observações do Pedido (Opcional)</Label>
                                <Textarea
                                    placeholder="Ex: Ponto de referência, campainha, etc..."
                                    value={observation}
                                    onChange={e => setObservation(e.target.value)}
                                    className="bg-[#050505] border-[#F4B544]/30 text-[#FFFAF0] text-xs focus:border-[#F4B544] h-16"
                                />
                            </div>
                        </div>

                        {/* Bloco 4: Forma de Pagamento */}
                        <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/20 space-y-4">
                            <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-[#F4B544]" />
                                <span>Forma de Pagamento</span>
                            </h2>

                            <div className="space-y-2.5">
                                {/* Opção 1: Asaas (Online) */}
                                {deliverySettings?.accept_online_payment !== false && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("asaas")}
                                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${paymentMethod === "asaas"
                                                ? "bg-[#171612] border-[#F4B544] gold-glow-sm"
                                                : "bg-[#050505] border-[#F4B544]/15 hover:border-[#F4B544]/30"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#F4B544]/10 border border-[#F4B544]/30 flex items-center justify-center text-[#F4B544]">
                                                <QrCode className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block font-semibold text-sm text-[#FFFAF0]">Pagamento Online (PIX / Cartão)</span>
                                                <span className="block text-xs text-[#B8B1A3]">Liberação instantânea via Asaas</span>
                                            </div>
                                        </div>
                                        {paymentMethod === "asaas" && <Check className="w-5 h-5 text-[#F4B544]" />}
                                    </button>
                                )}

                                {/* Opção 2: Maquininha na Entrega */}
                                {deliverySettings?.accept_card_machine !== false && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("cartao_maquininha")}
                                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${paymentMethod === "cartao_maquininha"
                                                ? "bg-[#171612] border-[#F4B544] gold-glow-sm"
                                                : "bg-[#050505] border-[#F4B544]/15 hover:border-[#F4B544]/30"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#F4B544]/10 border border-[#F4B544]/30 flex items-center justify-center text-[#F4B544]">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block font-semibold text-sm text-[#FFFAF0]">Cartão na Entrega / Retirada</span>
                                                <span className="block text-xs text-[#B8B1A3]">Débito ou Crédito na maquininha</span>
                                            </div>
                                        </div>
                                        {paymentMethod === "cartao_maquininha" && <Check className="w-5 h-5 text-[#F4B544]" />}
                                    </button>
                                )}

                                {/* Opção 3: Dinheiro com Troco */}
                                {deliverySettings?.accept_cash !== false && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("dinheiro")}
                                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${paymentMethod === "dinheiro"
                                                ? "bg-[#171612] border-[#F4B544] gold-glow-sm"
                                                : "bg-[#050505] border-[#F4B544]/15 hover:border-[#F4B544]/30"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#F4B544]/10 border border-[#F4B544]/30 flex items-center justify-center text-[#F4B544]">
                                                <Banknote className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block font-semibold text-sm text-[#FFFAF0]">Dinheiro</span>
                                                <span className="block text-xs text-[#B8B1A3]">Pagamento em espécie</span>
                                            </div>
                                        </div>
                                        {paymentMethod === "dinheiro" && <Check className="w-5 h-5 text-[#F4B544]" />}
                                    </button>
                                )}

                                {deliverySettings?.accept_online_payment === false &&
                                    deliverySettings?.accept_card_machine === false &&
                                    deliverySettings?.accept_cash === false && (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                                            Nenhuma forma de pagamento configurada. Por favor, entre em contato via WhatsApp.
                                        </div>
                                    )}

                                {paymentMethod === "dinheiro" && (
                                    <div className="p-4 rounded-xl bg-[#050505] border border-[#F4B544]/30 space-y-3 mt-2 animate-in fade-in">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-[#FFFAF0]">Precisa de troco?</Label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setNeedsChange(false); setChangeForValue(""); }}
                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${!needsChange ? "bg-[#F4B544] text-black border-[#F4B544]" : "bg-[#10100F] text-[#B8B1A3] border-white/10"
                                                        }`}
                                                >
                                                    Não preciso
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNeedsChange(true)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${needsChange ? "bg-[#F4B544] text-black border-[#F4B544]" : "bg-[#10100F] text-[#B8B1A3] border-white/10"
                                                        }`}
                                                >
                                                    Sim, preciso
                                                </button>
                                            </div>
                                        </div>

                                        {needsChange && (
                                            <div className="space-y-2 pt-2 border-t border-[#F4B544]/15">
                                                <Label className="text-xs text-[#B8B1A3]">Troco para quanto?</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs text-[#B8B1A3]">R$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder={`Ex: ${(grandTotal + 20).toFixed(2)}`}
                                                        value={changeForValue}
                                                        onChange={e => setChangeForValue(e.target.value)}
                                                        className="bg-[#10100F] border-[#F4B544]/30 text-[#FFFAF0] pl-9 text-sm focus:border-[#F4B544]"
                                                    />
                                                </div>
                                                {calculatedChange > 0 && (
                                                    <p className="text-xs text-emerald-400 font-bold">
                                                        Levar R$ {calculatedChange.toFixed(2).replace(".", ",")} de troco.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Coluna Lateral: Resumo do Pedido & Cupom */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/30 space-y-6 sticky top-24 gold-glow-sm">
                            <div className="flex items-center justify-between border-b border-[#F4B544]/15 pb-4">
                                <h2 className="font-serif text-xl font-bold text-[#FFFAF0] flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-[#F4B544]" />
                                    <span>Resumo</span>
                                </h2>
                                <span className="text-xs font-bold text-[#F4B544] uppercase tracking-wider">
                                    {items.length} {items.length === 1 ? "Item" : "Itens"}
                                </span>
                            </div>

                            {/* Lista de Itens */}
                            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#171612] border border-[#F4B544]/10">
                                        <div className="w-12 h-12 rounded-lg bg-[#050505] border border-[#F4B544]/20 flex items-center justify-center p-1 overflow-hidden shrink-0">
                                            <img
                                                src={getImageUrl(item.image_url)}
                                                alt={item.name}
                                                onError={(e) => { e.currentTarget.src = "/logo-semfundo.png"; }}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="block font-medium text-xs text-[#FFFAF0] truncate">
                                                {item.quantity}x {item.name || item.product_name}
                                            </span>
                                            <span className="block text-[11px] font-bold text-[#F4B544]">
                                                R$ {((item.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Campo de Cupom de Desconto */}
                            <div className="p-3.5 rounded-xl bg-[#050505] border border-[#F4B544]/25 space-y-2">
                                <span className="text-[11px] font-bold uppercase text-[#F4B544] tracking-wider flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" /> Cupom de Desconto
                                </span>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                                        <div className="space-y-0.5">
                                            <span className="font-extrabold text-emerald-400 block">{appliedCoupon.code}</span>
                                            <span className="text-[10px] text-[#B8B1A3]">Desconto de R$ {appliedCoupon.calculated_discount.toFixed(2)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="p-1 text-red-400 hover:text-red-300"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Código do cupom"
                                            value={couponInput}
                                            onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                            className="bg-[#10100F] border-[#F4B544]/30 text-[#FFFAF0] text-xs uppercase h-9 focus:border-[#F4B544]"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading || !couponInput.trim()}
                                            className="bg-[#F4B544] text-[#050505] font-bold text-xs px-4 h-9 rounded-xl hover:bg-[#FFC85C]"
                                        >
                                            {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Card de Agendamento ou Imediato */}
                            <div className="p-3.5 rounded-xl bg-[#171612] border border-[#F4B544]/30 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-[#F4B544] tracking-wider block">
                                    {isScheduled ? "🗓️ Horário Agendado" : "⚡ Modalidade de Envio"}
                                </span>
                                <span className="text-xs font-extrabold text-[#FFFAF0] block">
                                    {isScheduled ? (
                                        (currentSelectedDate && currentSelectedTime) ? (
                                            `Data: ${new Date(currentSelectedDate + 'T00:00:00').toLocaleDateString("pt-BR")} às ${currentSelectedTime} hs`
                                        ) : (
                                            <span className="text-amber-400 font-semibold">⚠️ Selecione um horário para agendar</span>
                                        )
                                    ) : (
                                        "Preparo Imediato (O quanto antes)"
                                    )}
                                </span>
                            </div>

                            {/* Totais */}
                            <div className="space-y-2 border-t border-[#F4B544]/15 pt-4 text-xs">
                                <div className="flex justify-between text-[#B8B1A3]">
                                    <span>Subtotal:</span>
                                    <span>R$ {total.toFixed(2).replace(".", ",")}</span>
                                </div>
                                <div className="flex justify-between text-[#B8B1A3]">
                                    <span>Taxa de Entrega ({neighborhood}):</span>
                                    <span>
                                        {finalDeliveryFee > 0 ? (
                                            `R$ ${finalDeliveryFee.toFixed(2).replace(".", ",")}`
                                        ) : (
                                            <span className="text-emerald-400 font-bold">Grátis</span>
                                        )}
                                    </span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-400 font-bold">
                                        <span>Desconto do Cupom ({appliedCoupon?.code}):</span>
                                        <span>- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold text-[#FFFAF0] border-t border-[#F4B544]/20 pt-3">
                                    <span className="font-serif">Total do Pedido:</span>
                                    <span className="text-[#F4B544]">R$ {grandTotal.toFixed(2).replace(".", ",")}</span>
                                </div>
                            </div>

                            {/* Alerta de Pedido Mínimo se aplicável */}
                            {isBelowMinOrder && (
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs text-amber-300">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-amber-400" /> Pedido Mínimo: R$ {minOrderValue.toFixed(2).replace(".", ",")}
                                    </span>
                                    <p className="text-[11px] text-[#B8B1A3]">
                                        Adicione mais <strong className="text-amber-400">R$ {diffToMinOrder.toFixed(2).replace(".", ",")}</strong> em itens para finalizar o pedido.
                                    </p>
                                </div>
                            )}

                            {/* Botão de Finalização */}
                            {(() => {
                                const isClosed = deliverySettings?.temporarily_closed || (deliverySettings?.allow_immediate_orders === false && deliverySettings?.allow_scheduled_orders === false);
                                return (
                                    <button
                                        type="submit"
                                        disabled={loading || isClosed || isBelowMinOrder || (isScheduled && (!currentSelectedDate || !currentSelectedTime))}
                                        className="w-full py-4 px-6 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all flex items-center justify-center gap-2 gold-glow disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-[#050505]" />
                                                <span>Processando Pedido...</span>
                                            </>
                                        ) : isClosed ? (
                                            <span>Loja Fechada Temporariamente</span>
                                        ) : (
                                            <>
                                                <span>
                                                    {isBelowMinOrder
                                                        ? `Mínimo: R$ ${minOrderValue.toFixed(2).replace(".", ",")} (Faltam R$ ${diffToMinOrder.toFixed(2).replace(".", ",")})`
                                                        : paymentMethod === "asaas"
                                                            ? "Ir para Pagamento Online"
                                                            : isScheduled
                                                                ? (currentSelectedTime ? "Confirmar Pedido Agendado" : "Selecione um Horário Válido")
                                                                : "Confirmar Pedido Agora"
                                                    }
                                                </span>
                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                            </>
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
