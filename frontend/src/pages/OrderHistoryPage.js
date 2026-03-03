import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { ArrowLeft, Search, Clock, RotateCcw } from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const statusColors = { aguardando: "bg-yellow-100 text-yellow-800", preparando: "bg-blue-100 text-blue-800", entregue: "bg-green-100 text-green-800" };

export default function OrderHistoryPage() {
    const [phone, setPhone] = useState(() => localStorage.getItem("salada-soul-phone") || "");
    const [orders, setOrders] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { addItem } = useCart();

    const searchOrders = async () => {
        if (!phone) { toast.error("Digite seu telefone"); return; }
        setLoading(true);
        try { const res = await axios.get(`${API}/orders/phone/${encodeURIComponent(phone)}`); setOrders(res.data); setSearched(true); }
        catch { toast.error("Erro ao buscar pedidos"); }
        finally { setLoading(false); }
    };

    const repeatOrder = (order) => {
        order.items?.forEach(item => addItem({ id: item.product_id, name: item.product_name, price: item.price, image_url: "" }, item.quantity));
        toast.success("Itens adicionados ao carrinho!");
        navigate("/checkout");
    };

    return (
        <div className="min-h-screen bg-background" data-testid="order-history-page">
            <header className="bg-white border-b border-border">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></Button>
                    <h1 className="text-xl font-bold font-heading">Meus Pedidos</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                <div className="flex gap-2">
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Digite seu telefone" className="rounded-full" data-testid="history-phone-input" onKeyDown={e => e.key === "Enter" && searchOrders()} />
                    <Button onClick={searchOrders} disabled={loading} className="bg-primary text-white rounded-full px-6" data-testid="search-orders-btn"><Search className="h-4 w-4" /></Button>
                </div>

                {searched && orders.length === 0 && (
                    <div className="text-center py-16">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                        <p className="text-muted-foreground text-sm">Verifique o numero de telefone</p>
                    </div>
                )}

                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-2xl border border-border p-5 animate-fade-up" data-testid={`order-${order.id}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-semibold font-heading">Pedido #{order.order_number}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                                <Badge className={`${statusColors[order.status]} rounded-full`}>{order.status}</Badge>
                            </div>
                            <div className="space-y-1 mb-3">
                                {order.items?.map((item, i) => <p key={i} className="text-sm text-muted-foreground">{item.quantity}x {item.product_name}</p>)}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-primary font-heading">R$ {order.total?.toFixed(2)}</span>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => navigate(`/pedido/${order.id}`)} data-testid={`view-${order.id}`}>Ver detalhes</Button>
                                    <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => repeatOrder(order)} data-testid={`repeat-${order.id}`}><RotateCcw className="h-3 w-3 mr-1" /> Repetir</Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
