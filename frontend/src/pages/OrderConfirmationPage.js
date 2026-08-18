import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
    ArrowLeft, Clock, CheckCircle2, Package, Star, 
    MessageCircle, ThumbsUp, Truck, XCircle, 
    CircleEllipsis, MapPin, ReceiptText, PhoneCall, Sparkles 
} from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const statusSteps = [
    { id: 'aguardando', label: "Recebido", icon: CircleEllipsis },
    { id: 'confirmado', label: "Aceito", icon: ThumbsUp },
    { id: 'preparando', label: "Na Cozinha", icon: Clock },
    { id: 'saiu_entrega', label: "A Caminho", icon: Truck },
    { id: 'entregue', label: "Entregue", icon: CheckCircle2 },
];

const getStatusIndex = (status) => {
    return statusSteps.findIndex(s => s.id === status);
};

export default function OrderConfirmationPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    const fetchOrder = async () => {
        try {
            const res = await axios.get(`${API}/orders/${id}`);
            setOrder(res.data);
            if (res.data.rating) { 
                setRating(res.data.rating); 
                setRatingSubmitted(true); 
            }
        } catch (err) {
            console.error("Erro ao carregar pedido", err);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 8000); // Sincronização a cada 8s
        return () => clearInterval(interval);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const submitRating = async (e) => {
        e.preventDefault();
        if (rating === 0) return;
        try { 
            await axios.post(`${API}/orders/${id}/rate`, { rating, comment }); 
            toast.success("Avaliação enviada! Muito obrigado."); 
            setRatingSubmitted(true); 
        } catch { 
            toast.error("Erro ao enviar avaliação"); 
        }
    };

    if (!order) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-[#FFFAF0] gap-4">
            <div className="animate-spin h-10 w-10 border-4 border-[#F4B544] border-t-transparent rounded-full" />
            <p className="text-[#B8B1A3] font-serif animate-pulse">Sincronizando seu pedido com a cozinha JOHB...</p>
        </div>
    );

    const currentStepIndex = getStatusIndex(order.status);
    const isCancelled = order.status === 'cancelado';
    const isPaid = order.payment_status === 'pago';

    return (
        <div className="min-h-screen bg-[#050505] text-[#FFFAF0] pb-16 antialiased" data-testid="order-confirmation-page">
            {/* Header */}
            <header className="bg-[#10100F] border-b border-[#F4B544]/20 sticky top-0 z-20 py-4 px-4 sm:px-8">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <button 
                        onClick={() => navigate("/")} 
                        className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#B8B1A3] hover:text-[#F4B544] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Início</span>
                    </button>

                    <div className="text-center">
                        <h1 className="text-base font-serif font-bold text-[#FFFAF0]">Pedido #{order.order_number}</h1>
                        <span className="text-[10px] text-[#F4B544] font-medium uppercase tracking-widest block">
                            Balneário Arroio do Silva — SC
                        </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isCancelled 
                            ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                            : isPaid 
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-[#F4B544]/20 text-[#F4B544] border border-[#F4B544]/30"
                    }`}>
                        {isCancelled ? "Cancelado" : isPaid ? "Pago" : "Aguardando Pagamento"}
                    </span>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
                
                {/* Stepper de Acompanhamento em Tempo Real */}
                {!isCancelled ? (
                    <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/30 gold-glow-sm">
                        <div className="text-center space-y-1 mb-6">
                            <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold flex items-center justify-center">
                                <span>Acompanhamento ao Vivo</span>
                            </span>
                            <h2 className="font-serif text-2xl font-bold text-[#FFFAF0]">
                                {statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0]?.label}
                            </h2>
                        </div>

                        {/* Linha do Tempo */}
                        <div className="relative flex items-center justify-between pt-4">
                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#F4B544]/15 -z-0" />
                            {statusSteps.map((step, idx) => {
                                const Icon = step.icon;
                                const isDone = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;

                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                            isDone 
                                                ? "bg-[#F4B544] text-[#050505] border-[#F4B544] font-bold shadow-md gold-glow-sm" 
                                                : "bg-[#050505] text-[#B8B1A3] border-[#F4B544]/20"
                                        }`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] uppercase font-semibold tracking-wider ${
                                            isCurrent ? "text-[#F4B544]" : "text-[#B8B1A3]"
                                        }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center space-y-2">
                        <XCircle className="w-8 h-8 text-red-400 mx-auto" />
                        <h2 className="font-serif text-xl font-bold text-red-400">Pedido Cancelado</h2>
                        <p className="text-xs text-[#B8B1A3]">
                            Entre em contato conosco pelo WhatsApp caso tenha dúvidas sobre o seu pedido.
                        </p>
                    </div>
                )}

                {/* Resumo dos Itens do Pedido */}
                <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/20 space-y-4">
                    <h3 className="font-serif text-lg font-bold text-[#FFFAF0] flex items-center gap-2 border-b border-[#F4B544]/15 pb-3">
                        <ReceiptText className="w-5 h-5 text-[#F4B544]" />
                        <span>Detalhes do Pedido</span>
                    </h3>

                    {/* Lista de itens */}
                    <div className="space-y-2 pb-3 border-b border-[#F4B544]/10">
                        {(Array.isArray(order.items) ? order.items : []).map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#FFFAF0]">
                                <span>
                                    <strong className="text-[#F4B544] mr-1">{it.quantity}x</strong> {it.name || it.product_name}
                                </span>
                                <span className="text-[#B8B1A3]">
                                    R$ {((it.price || 0) * it.quantity).toFixed(2).replace(".", ",")}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 text-xs text-[#B8B1A3]">
                        <div className="flex justify-between">
                            <span>Cliente:</span>
                            <span className="font-medium text-[#FFFAF0]">{order.customer_name} ({order.customer_phone})</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tipo de Entrega:</span>
                            <span className="font-medium text-[#FFFAF0] capitalize">
                                {order.delivery_type === "entrega" ? "Entrega em Domicílio" : "Retirada no Balcão"}
                            </span>
                        </div>
                        {order.address && order.delivery_type === "entrega" && (
                            <div className="flex justify-between">
                                <span>Endereço:</span>
                                <span className="font-medium text-[#FFFAF0] text-right">{order.address} ({order.neighborhood})</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Forma de Pagamento:</span>
                            <span className="font-medium text-[#FFFAF0]">
                                {order.payment_method === "asaas" ? "Online (PIX / Cartão)" :
                                 order.payment_method === "cartao_maquininha" ? "Cartão (Maquininha)" :
                                 order.payment_method === "dinheiro" ? (
                                     order.change_for ? `Dinheiro (Troco p/ R$ ${floatVal(order.change_for).toFixed(2)})` : "Dinheiro (Sem troco)"
                                 ) : (order.payment_method || "Online")}
                            </span>
                        </div>
                        {(order.scheduled_date || order.scheduled_time) && (
                            <div className="flex justify-between py-2 px-3 rounded-xl bg-[#171612] border border-[#F4B544]/30 text-[#F4B544] font-extrabold my-2">
                                <span>🗓️ Horário Agendado:</span>
                                <span>{order.scheduled_date ? new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : ""} {order.scheduled_time ? `às ${order.scheduled_time}h` : ""}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-[#F4B544]/15 pt-2 text-sm font-bold text-[#FFFAF0]">
                            <span className="font-serif">Total:</span>
                            <span className="text-[#F4B544]">R$ {floatVal(order.total).toFixed(2).replace(".", ",")}</span>
                        </div>
                    </div>
                </div>

                {/* Card de Avaliação / Feedback do Cliente */}
                <div className="bg-[#10100F] rounded-2xl p-6 border border-[#F4B544]/30 space-y-4 shadow-xl gold-glow-sm">
                    <div className="flex items-center justify-between border-b border-[#F4B544]/15 pb-3">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-[#F4B544] fill-[#F4B544]" />
                            <h3 className="font-serif text-lg font-bold text-[#FFFAF0]">Como foi sua experiência?</h3>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-[#F4B544] bg-[#F4B544]/10 px-2.5 py-0.5 rounded-full border border-[#F4B544]/30">
                            Feedback Real
                        </span>
                    </div>

                    {ratingSubmitted ? (
                        <div className="text-center py-4 space-y-3 bg-[#171612] rounded-xl border border-[#F4B544]/20 p-4">
                            <div className="flex justify-center gap-1.5 text-[#F4B544]">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-6 h-6 ${star <= rating ? "text-[#F4B544] fill-[#F4B544]" : "text-gray-600"}`}
                                    />
                                ))}
                            </div>
                            <p className="text-sm font-serif text-[#FFFAF0] italic">
                                "{comment || "Excelente experiência!"}"
                            </p>
                            <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Obrigado pelo seu carinho! Sua avaliação foi compartilhada.</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => setRatingSubmitted(false)}
                                className="text-[11px] text-[#B8B1A3] hover:text-[#F4B544] underline pt-1 cursor-pointer"
                            >
                                Alterar minha avaliação
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={submitRating} className="space-y-4">
                            <p className="text-xs text-[#B8B1A3]">
                                Avalie os produtos e o atendimento do <strong>JOHB Café & Salgados</strong>:
                            </p>

                            {/* Seletor de Estrelas */}
                            <div className="flex items-center justify-center gap-2 py-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="p-1.5 rounded-lg hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                                    >
                                        <Star
                                            className={`w-8 h-8 transition-colors ${
                                                star <= rating
                                                    ? "text-[#F4B544] fill-[#F4B544] drop-shadow-[0_0_8px_rgba(244,181,68,0.5)]"
                                                    : "text-[#333] hover:text-[#F4B544]/60"
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Sugestões Rápidas de Elogio */}
                            <div className="flex flex-wrap gap-1.5 justify-center">
                                {[
                                    "Salgados quentinhos e deliciosos!",
                                    "Entrega super rápida e pontual!",
                                    "Massa leve e recheio generoso!",
                                    "Atendimento nota 10!"
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setComment(suggestion)}
                                        className={`px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer ${
                                            comment === suggestion
                                                ? "bg-[#F4B544] text-black font-bold border-[#F4B544]"
                                                : "bg-[#171612] text-[#B8B1A3] border-white/10 hover:border-[#F4B544]/40 hover:text-[#FFFAF0]"
                                        }`}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            {/* Campo de Comentário */}
                            <div>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Deixe uma mensagem para a equipe ou conte o que mais gostou..."
                                    rows={3}
                                    className="w-full bg-[#050505] border border-[#F4B544]/30 rounded-xl p-3 text-xs text-[#FFFAF0] placeholder:text-[#B8B1A3]/50 focus:outline-none focus:border-[#F4B544] resize-none"
                                />
                            </div>

                            {/* Botão de Enviar */}
                            <button
                                type="submit"
                                disabled={rating === 0}
                                className="w-full py-3 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs uppercase tracking-widest hover:bg-[#FFC85C] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg gold-glow flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>{rating > 0 ? "Enviar Minha Avaliação" : "Selecione as estrelas para avaliar"}</span>
                            </button>
                        </form>
                    )}
                </div>

                {/* Botão de Suporte WhatsApp */}
                <a
                    href={`https://wa.me/message/FUNP4LBHYBA3O1?text=${encodeURIComponent(
                        `Olá JOHB! Gostaria de falar sobre o meu pedido agendado #${order.order_number}:\n` +
                        `• Cliente: ${order.customer_name}\n` +
                        `• Modalidade: ${order.delivery_type === 'entrega' ? 'Entrega em Casa' : 'Retirada no Balcão'}\n` +
                        `• Horário: ${order.scheduled_date ? new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : "Hoje"}${order.scheduled_time ? ` às ${order.scheduled_time}h` : ''}\n` +
                        `• Total: R$ ${floatVal(order.total).toFixed(2)}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 px-6 rounded-full bg-[#171612] border border-[#F4B544]/30 hover:border-[#F4B544] text-[#FFFAF0] hover:text-[#F4B544] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all gold-glow-sm"
                >
                    <PhoneCall className="w-4 h-4 text-[#F4B544]" />
                    <span>Falar sobre o Pedido Agendado no WhatsApp</span>
                </a>

            </main>
        </div>
    );
}

function floatVal(v) {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? 0 : parsed;
}
