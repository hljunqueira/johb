import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle, Package, Star, MessageCircle } from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const statusInfo = {
    aguardando: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    preparando: { label: "Preparando", color: "bg-blue-100 text-blue-800", icon: Package },
    entregue: { label: "Entregue", color: "bg-green-100 text-green-800", icon: CheckCircle }
};

export default function OrderConfirmationPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    useEffect(() => {
        const fetch = () => axios.get(`${API}/orders/${id}`).then(r => {
            setOrder(r.data);
            if (r.data.rating) { setRating(r.data.rating); setRatingSubmitted(true); }
        });
        fetch();
        const interval = setInterval(fetch, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const submitRating = async () => {
        if (rating === 0) return;
        try { await axios.post(`${API}/orders/${id}/rate`, { rating, comment }); toast.success("Avaliacao enviada! Obrigado."); setRatingSubmitted(true); }
        catch { toast.error("Erro ao enviar avaliacao"); }
    };

    if (!order) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

    const status = statusInfo[order.status] || statusInfo.aguardando;
    const StatusIcon = status.icon;

    return (
        <div className="min-h-screen bg-background" data-testid="order-confirmation-page">
            <header className="bg-white border-b border-border">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="back-home-btn"><ArrowLeft className="h-5 w-5" /></Button>
                    <h1 className="text-xl font-bold font-heading">Pedido #{order.order_number}</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                {/* Banner */}
                <div className="bg-primary/10 rounded-2xl p-8 text-center">
                    <StatusIcon className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h2 className="text-2xl font-bold font-heading text-foreground mb-1">
                        {order.status === "aguardando" ? "Pedido recebido!" : order.status === "preparando" ? "Estamos preparando!" : "Pedido entregue!"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {order.status === "aguardando" ? "Estamos preparando com carinho." : order.status === "preparando" ? "Seu pedido esta quase pronto." : "Esperamos que tenha gostado!"}
                    </p>
                </div>

                {/* Details */}
                <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Status</span><Badge className={`${status.color} rounded-full`} data-testid="order-status">{status.label}</Badge></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Tempo estimado</span><span className="text-sm font-medium">{order.estimated_time} min</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Tipo</span><span className="text-sm font-medium">{order.delivery_type === "entrega" ? "Entrega" : "Retirada"}</span></div>
                    <Separator />
                    {order.items?.map((item, i) => <div key={i} className="flex justify-between text-sm"><span>{item.quantity}x {item.product_name}</span><span>R$ {(item.price * item.quantity).toFixed(2)}</span></div>)}
                    <Separator />
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {order.subtotal?.toFixed(2)}</span></div>
                    {order.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entrega</span><span>R$ {order.delivery_fee.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-bold text-lg font-heading"><span>Total</span><span className="text-primary">R$ {order.total?.toFixed(2)}</span></div>
                </div>

                <Button variant="outline" className="w-full rounded-full py-5" onClick={() => window.open("https://wa.me/", "_blank")} data-testid="whatsapp-btn">
                    <MessageCircle className="h-5 w-5 mr-2 text-green-600" /> Falar com a loja no WhatsApp
                </Button>

                {order.status === "entregue" && !ratingSubmitted && (
                    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" data-testid="rating-section">
                        <h3 className="font-semibold font-heading">Como foi seu pedido?</h3>
                        <div className="flex gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`} className="transition-transform hover:scale-110">
                                    <Star className={`h-8 w-8 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                </button>
                            ))}
                        </div>
                        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comentario (opcional)" className="w-full rounded-lg border border-input p-3 text-sm bg-white" data-testid="rating-comment" />
                        <Button onClick={submitRating} className="w-full bg-primary text-white rounded-full" data-testid="submit-rating-btn">Enviar Avaliacao</Button>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-full" onClick={() => navigate("/")} data-testid="new-order-btn">Novo Pedido</Button>
                    <Button variant="outline" className="flex-1 rounded-full" onClick={() => navigate("/historico")} data-testid="history-link-btn">Meus Pedidos</Button>
                </div>
            </div>
        </div>
    );
}
