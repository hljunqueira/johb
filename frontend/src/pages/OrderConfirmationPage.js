import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
    ArrowLeft, Clock, CheckCircle2, Package, Star, 
    MessageCircle, ThumbsUp, Truck, XCircle, 
    CircleEllipsis, MapPin, ReceiptText
} from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const statusSteps = [
    { id: 'aguardando', label: "Recebido", icon: CircleEllipsis, color: "text-amber-500", bgColor: "bg-amber-50" },
    { id: 'confirmado', label: "Aceito", icon: ThumbsUp, color: "text-purple-500", bgColor: "bg-purple-50" },
    { id: 'preparando', label: "Na Cozinha", icon: Clock, color: "text-orange-500", bgColor: "bg-orange-50" },
    { id: 'saiu_entrega', label: "A Caminho", icon: Truck, color: "text-blue-500", bgColor: "bg-blue-50" },
    { id: 'entregue', label: "Entregue", icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-50" },
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
        const interval = setInterval(fetchOrder, 10000); // Atualiza a cada 10s
        return () => clearInterval(interval);
    }, [id]);

    const submitRating = async () => {
        if (rating === 0) return;
        try { 
            await axios.post(`${API}/orders/${id}/rate`, { rating, comment }); 
            toast.success("Avaliação enviada! Obrigado."); 
            setRatingSubmitted(true); 
        } catch { 
            toast.error("Erro ao enviar avaliação"); 
        }
    };

    if (!order) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-slate-500 font-medium animate-pulse">Sincronizando com a cozinha...</p>
        </div>
    );

    const currentStepIndex = getStatusIndex(order.status);
    const isCancelled = order.status === 'cancelado';

    return (
        <div className="min-h-screen bg-slate-50 pb-12" data-testid="order-confirmation-page">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-black font-heading text-slate-800">Pedido #{order.order_number}</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status em tempo real</p>
                        </div>
                    </div>
                    {isCancelled ? (
                        <Badge className="bg-red-500 text-white border-none rounded-full px-3 py-1 uppercase font-black text-[10px] tracking-widest">Cancelado</Badge>
                    ) : (
                        <Badge className="bg-emerald-500 text-white border-none rounded-full px-3 py-1 uppercase font-black text-[10px] tracking-widest">Ativo</Badge>
                    )}
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 py-8 space-y-8">
                {/* Status Stepper */}
                {!isCancelled ? (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-10">
                            {statusSteps.map((step, idx) => {
                                const Icon = step.icon;
                                const isActive = idx === currentStepIndex;
                                const isCompleted = idx < currentStepIndex;
                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-3 relative flex-1">
                                        {/* Connector Line */}
                                        {idx < statusSteps.length - 1 && (
                                            <div className={`absolute left-1/2 top-5 w-full h-[2px] z-0 ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                                        )}
                                        
                                        <div className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                            isActive ? `${step.bgColor} ${step.color} ring-4 ring-offset-2 ring-primary/20 scale-110 shadow-lg` :
                                            isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-300'
                                        }`}>
                                            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black font-heading text-slate-800">
                                {order.status === "aguardando" && "Aguardando confirmação"}
                                {order.status === "confirmado" && "Pedido confirmado!"}
                                {order.status === "preparando" && "Sua salada está na cozinha!"}
                                {order.status === "saiu_entrega" && "Seu pedido saiu para entrega!"}
                                {order.status === "entregue" && "Bom apetite!"}
                            </h2>
                            <p className="text-slate-500 text-sm leading-relaxed px-4">
                                {order.status === "aguardando" && "Seu pedido já chegou para nós e será aceito em instantes."}
                                {order.status === "confirmado" && "Recebemos tudo certinho! Logo começaremos o preparo."}
                                {order.status === "preparando" && "Nossos chefs estão montando sua salada com todo carinho."}
                                {order.status === "saiu_entrega" && "O motoboy já está a caminho do seu endereço."}
                                {order.status === "entregue" && "Obrigado por escolher a Salada Soul! Não esqueça de nos avaliar."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-50 rounded-[2.5rem] p-10 text-center border-2 border-red-100">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black font-heading text-red-700 mb-2">Pedido Cancelado</h2>
                        <p className="text-red-600/80 text-sm mb-6">Infelizmente não pudemos processar seu pedido no momento. Se você já pagou via Pix, o estorno será automático.</p>
                        <Button variant="outline" onClick={() => window.open("https://wa.me/5511999999999", "_blank")} className="rounded-2xl border-red-200 text-red-600 hover:bg-red-100">
                            Falar com Suporte
                        </Button>
                    </div>
                )}

                {/* Order Details */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <ReceiptText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-black font-heading text-slate-800">Detalhes do Pedido</h3>
                    </div>

                    <div className="space-y-4">
                        {order.items?.map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-800">
                                        <span className="text-primary mr-2">{item.quantity}x</span> {item.product_name}
                                    </span>
                                    {item.complements?.length > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-1">{item.complements.map(c => c.name).join(", ")}</p>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-slate-600">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="space-y-2 px-1">
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span>R$ {order.subtotal?.toFixed(2)}</span>
                        </div>
                        {order.delivery_fee > 0 && (
                            <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                                <span>Taxa de Entrega</span>
                                <span>R$ {order.delivery_fee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-xl font-black font-heading text-slate-800">Total</span>
                            <span className="text-2xl font-black font-heading text-primary">R$ {order.total?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Endereço de Entrega</span>
                            <span className="text-xs font-bold text-slate-600 leading-tight">{order.address}, {order.neighborhood}</span>
                        </div>
                    </div>
                </div>

                {/* Rating Section */}
                {order.status === "entregue" && !ratingSubmitted && (
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700" data-testid="rating-section">
                        <div className="text-center">
                            <h3 className="text-xl font-black font-heading mb-2 text-white">Como foi sua experiência?</h3>
                            <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Avalie sua salada agora</p>
                        </div>
                        
                        <div className="flex gap-3 justify-center py-2">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`} className="transition-transform hover:scale-125 active:scale-95 outline-none">
                                    <Star className={`h-10 w-10 ${n <= rating ? "fill-primary text-primary" : "text-white/20"}`} />
                                </button>
                            ))}
                        </div>
                        
                        <textarea 
                            value={comment} 
                            onChange={e => setComment(e.target.value)} 
                            placeholder="Deixe um comentário se desejar..." 
                            className="w-full rounded-2xl border border-white/10 p-4 text-sm bg-white/5 text-white placeholder:text-white/20 focus:border-primary focus:ring-0 transition-all outline-none" 
                            data-testid="rating-comment" 
                        />
                        
                        <Button 
                            onClick={submitRating} 
                            disabled={rating === 0}
                            className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-30" 
                            data-testid="submit-rating-btn"
                        >
                            Enviar Avaliação
                        </Button>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <Button 
                        variant="outline" 
                        className="w-full h-14 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-all gap-2" 
                        onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                    >
                        <MessageCircle className="h-5 w-5 text-green-500" /> Precisando de ajuda? Chamar no WhatsApp
                    </Button>
                    
                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl text-slate-400 font-bold text-xs" onClick={() => navigate("/")} data-testid="new-order-btn">Página Inicial</Button>
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl text-slate-400 font-bold text-xs" onClick={() => navigate("/historico")} data-testid="history-link-btn">Meus Pedidos</Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
