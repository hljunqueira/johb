import React, { useState, useEffect, useCallback } from "react";
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
    CreditCard, QrCode, ShoppingBag, ShieldCheck, Sparkles 
} from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const getImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
};

export default function CheckoutPage() {
    const { items, total, clearCart } = useCart();
    const navigate = useNavigate();
    
    // Dados do cliente vêm do localStorage
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
    const [neighborhood, setNeighborhood] = useState(() => localStorage.getItem("johb-neighborhood") || "Centro");
    const [observation, setObservation] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("asaas"); // 'asaas' (PIX/Cartão online) ou 'pix_manual'
    
    const [deliveryFee, setDeliveryFee] = useState(5.00); // Taxa padrã de Balneário Arroio do Silva — SC
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (items.length === 0) {
            toast.error("Seu carrinho está vazio!");
            navigate("/");
        }
    }, [items, navigate]);

    const finalDeliveryFee = deliveryType === "entrega" ? deliveryFee : 0;
    const grandTotal = total + finalDeliveryFee;

    const handleSubmit = async (e) => {
        e.preventDefault();

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

        setLoading(true);
        try {
            // salvar dados no localStorage
            localStorage.setItem("johb-name", name);
            localStorage.setItem("johb-phone", phone);
            if (deliveryType === "entrega") {
                localStorage.setItem("johb-address", address);
                localStorage.setItem("johb-neighborhood", neighborhood);
            }

            // 1. Criar pedido no backend
            const res = await axios.post(`${API}/orders`, {
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
                payment_method: paymentMethod
            });

            const createdOrder = res.data;
            const orderId = createdOrder.id;

            // 2. Criar cobrança no Asaas
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
                toast.success("Pedido registrado! Acompanhe o status do pagamento.");
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
                    <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Balneário Arroio do Silva — SC</span>
                    </span>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFFAF0]">
                        Finalizar Seu Pedido
                    </h1>
                    <p className="text-xs sm:text-sm text-[#B8B1A3] font-light">
                        Salgados artesanais quentinhos preparados especialmente para você.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Coluna Principal: Formulário */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* 1. Tipo de Entrega */}
                        <div className="bg-[#10100F] rounded-2xl p-5 border border-[#F4B544]/20 space-y-4">
                            <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                <Truck className="w-5 h-5 text-[#F4B544]" />
                                <span>1. Modalidade de Entrega</span>
                            </h2>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryType("entrega")}
                                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                                        deliveryType === "entrega"
                                            ? "bg-[#171612] border-[#F4B544] gold-glow-sm"
                                            : "bg-[#050505] border-[#F4B544]/15 hover:border-[#F4B544]/30"
                                    }`}
                                >
                                    <Truck className={`w-5 h-5 mt-0.5 ${deliveryType === "entrega" ? "text-[#F4B544]" : "text-[#B8B1A3]"}`} />
                                    <div>
                                        <span className="block font-semibold text-sm text-[#FFFAF0]">Entrega em Casa</span>
                                        <span className="block text-[11px] text-[#B8B1A3]">Balneário Arroio do Silva</span>
                                        <span className="block text-xs font-bold text-[#F4B544] mt-1">Taxa: R$ 5,00</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDeliveryType("retirada")}
                                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                                        deliveryType === "retirada"
                                            ? "bg-[#171612] border-[#F4B544] gold-glow-sm"
                                            : "bg-[#050505] border-[#F4B544]/15 hover:border-[#F4B544]/30"
                                    }`}
                                >
                                    <Store className={`w-5 h-5 mt-0.5 ${deliveryType === "retirada" ? "text-[#F4B544]" : "text-[#B8B1A3]"}`} />
                                    <div>
                                        <span className="block font-semibold text-sm text-[#FFFAF0]">Retirada no Balcão</span>
                                        <span className="block text-[11px] text-[#B8B1A3]">Sem taxa de entrega</span>
                                        <span className="block text-xs font-bold text-emerald-400 mt-1">Grátis</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* 2. Seus Dados */}
                        <div className="bg-[#10100F] rounded-2xl p-5 border border-[#F4B544]/20 space-y-4">
                            <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#F4B544]" />
                                <span>2. Seus Dados de Contato</span>
                            </h2>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-[#B8B1A3]">Nome Completo</Label>
                                    <Input
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Seu nome"
                                        className="bg-[#050505] border-[#F4B544]/20 text-[#FFFAF0] mt-1 text-sm focus:border-[#F4B544]"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-[#B8B1A3]">WhatsApp (para atualizações)</Label>
                                    <Input
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="(48) 99999-9999"
                                        className="bg-[#050505] border-[#F4B544]/20 text-[#FFFAF0] mt-1 text-sm focus:border-[#F4B544]"
                                    />
                                </div>

                                {deliveryType === "entrega" && (
                                    <>
                                        <div>
                                            <Label className="text-xs uppercase tracking-wider text-[#B8B1A3]">Endereço Completo (Rua, Número, Apto/Bloco)</Label>
                                            <Input
                                                required
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                placeholder="Ex: Av. Barriga Verde, 123, Apto 102"
                                                className="bg-[#050505] border-[#F4B544]/20 text-[#FFFAF0] mt-1 text-sm focus:border-[#F4B544]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs uppercase tracking-wider text-[#B8B1A3]">Bairro</Label>
                                            <Input
                                                required
                                                value={neighborhood}
                                                onChange={e => setNeighborhood(e.target.value)}
                                                placeholder="Ex: Centro, Praia dos Golfinhos, etc."
                                                className="bg-[#050505] border-[#F4B544]/20 text-[#FFFAF0] mt-1 text-sm focus:border-[#F4B544]"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-[#B8B1A3]">Observações do Pedido (Opcional)</Label>
                                    <Textarea
                                        value={observation}
                                        onChange={e => setObservation(e.target.value)}
                                        placeholder="Ex: Mandar maionese temperada extra, embalar para presente..."
                                        className="bg-[#050505] border-[#F4B544]/20 text-[#FFFAF0] mt-1 text-sm focus:border-[#F4B544] min-h-[70px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Forma de Pagamento (Asaas) */}
                        <div className="bg-[#10100F] rounded-2xl p-5 border border-[#F4B544]/20 space-y-4">
                            <h2 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-[#F4B544]" />
                                <span>3. Forma de Pagamento Online (Asaas)</span>
                            </h2>

                            <div className="p-4 rounded-xl bg-[#171612] border border-[#F4B544]/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#F4B544]/10 border border-[#F4B544]/30 flex items-center justify-center text-[#F4B544]">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="block font-semibold text-sm text-[#FFFAF0]">PIX & Cartão de Crédito</span>
                                        <span className="block text-xs text-[#B8B1A3]">Pagamento online instantâneo via Asaas</span>
                                    </div>
                                </div>
                                <Check className="w-5 h-5 text-[#F4B544]" />
                            </div>
                        </div>

                    </div>

                    {/* Coluna Lateral: Resumo do Pedido */}
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
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#171612] border border-[#F4B544]/10">
                                        <img
                                            src={getImageUrl(item.image_url)}
                                            alt={item.name}
                                            className="w-12 h-12 rounded-lg object-cover border border-[#F4B544]/20"
                                        />
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

                            {/* Totais */}
                            <div className="space-y-2 border-t border-[#F4B544]/15 pt-4 text-xs">
                                <div className="flex justify-between text-[#B8B1A3]">
                                    <span>Subtotal:</span>
                                    <span>R$ {total.toFixed(2).replace(".", ",")}</span>
                                </div>
                                <div className="flex justify-between text-[#B8B1A3]">
                                    <span>Taxa de Entrega:</span>
                                    <span>{finalDeliveryFee > 0 ? `R$ ${finalDeliveryFee.toFixed(2).replace(".", ",")}` : "Grátis"}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-[#FFFAF0] border-t border-[#F4B544]/20 pt-3">
                                    <span className="font-serif">Total do Pedido:</span>
                                    <span className="text-[#F4B544]">R$ {grandTotal.toFixed(2).replace(".", ",")}</span>
                                </div>
                            </div>

                            {/* Botão de Finalização */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 px-6 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all flex items-center justify-center gap-2 gold-glow disabled:opacity-50 transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-[#050505]" />
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ir para o Pagamento Asaas</span>
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
