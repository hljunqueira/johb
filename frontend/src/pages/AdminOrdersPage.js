import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
    Clock, Package, CheckCircle2, DollarSign, RefreshCw, 
    ThumbsUp, Timer, Truck, XCircle, CircleEllipsis 
} from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const statusConfig = {
    aguardando: { 
        label: "Pendente", 
        color: "text-amber-500 bg-amber-50 border-amber-200", 
        activeColor: "bg-amber-100 border-amber-400",
        icon: CircleEllipsis, 
        next: "confirmado" 
    },
    confirmado: { 
        label: "Aceito", 
        color: "text-purple-500 bg-purple-50 border-purple-200", 
        activeColor: "bg-purple-100 border-purple-400",
        icon: ThumbsUp, 
        next: "preparando" 
    },
    preparando: { 
        label: "Preparo", 
        color: "text-orange-500 bg-orange-50 border-orange-200", 
        activeColor: "bg-orange-100 border-orange-400",
        icon: Timer, 
        next: "saiu_entrega" 
    },
    saiu_entrega: { 
        label: "Entrega", 
        color: "text-blue-500 bg-blue-50 border-blue-200", 
        activeColor: "bg-blue-100 border-blue-400",
        icon: Truck, 
        next: "entregue" 
    },
    entregue: { 
        label: "Concluído", 
        color: "text-emerald-500 bg-emerald-50 border-emerald-200", 
        activeColor: "bg-emerald-100 border-emerald-400",
        icon: CheckCircle2, 
        next: null 
    },
    cancelado: { 
        label: "Cancelado", 
        color: "text-red-500 bg-red-50 border-red-200", 
        activeColor: "bg-red-100 border-red-400",
        icon: XCircle, 
        next: null 
    },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchOrders = async () => {
        try {
            const params = filter ? `?status=${filter}` : "";
            const res = await axios.get(`${API}/admin/orders${params}`, { headers });
            setOrders(res.data);
        } catch { toast.error("Erro ao carregar pedidos"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); const i = setInterval(fetchOrders, 10000); return () => clearInterval(i); }, [filter]); // eslint-disable-line

    const updateStatus = async (orderId, status) => {
        try { await axios.put(`${API}/admin/orders/${orderId}/status`, { status }, { headers }); toast.success("Status atualizado"); fetchOrders(); }
        catch { toast.error("Erro ao atualizar status"); }
    };

    const markPaid = async (orderId) => {
        try { await axios.put(`${API}/admin/orders/${orderId}/payment`, {}, { headers }); toast.success("Pagamento confirmado"); fetchOrders(); }
        catch { toast.error("Erro ao marcar pagamento"); }
    };

    const isDelayed = (order) => {
        if (order.status === "entregue" || order.status === "cancelado") return false;
        const created = new Date(order.created_at);
        const now = new Date();
        return (now - created) > (order.estimated_time || 30) * 60 * 1000;
    };

    return (
        <div data-testid="admin-orders-page" className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-heading text-slate-800">Pedidos</h1>
                        <p className="text-slate-500 text-sm mt-1">Gerencie e acompanhe os pedidos em tempo real.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={fetchOrders} 
                            className="rounded-xl hover:bg-slate-100"
                            data-testid="refresh-orders"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                        
                        {Object.entries(statusConfig).map(([key, config]) => {
                            const Icon = config.icon;
                            const isActive = filter === key;
                            return (
                                <button 
                                    key={key}
                                    onClick={() => setFilter(key)}
                                    className={`flex items-center gap-2 px-4 py-2 h-10 rounded-xl border transition-all duration-200 text-sm font-medium ${
                                        isActive 
                                        ? `${config.activeColor} shadow-sm translate-y-[-1px]` 
                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className={`p-1 rounded-full ${isActive ? "bg-white" : "bg-slate-100"}`}>
                                        <Icon className={`h-4 w-4 ${isActive ? config.color.split(' ')[0] : "text-slate-400"}`} />
                                    </div>
                                    {config.label}
                                </button>
                            );
                        })}

                        <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setFilter("")}
                            className={`rounded-xl px-4 py-2 h-10 text-sm font-medium transition-all ${filter === "" ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
                        >
                            Todos ({orders.length})
                        </Button>
                    </div>
                </div>

                {loading && orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4" />
                        <p className="text-slate-500 animate-pulse">Buscando novos pedidos...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500 text-center">
                        <h3 className="text-2xl font-bold font-heading text-slate-800">Tudo limpo por aqui!</h3>
                        <p className="text-slate-500 mt-2">Aguardando os novos pedidos.</p>
                        <Button 
                            variant="outline" 
                            className="mt-6 rounded-full border-slate-200" 
                            onClick={fetchOrders}
                        >
                            Atualizar Agora
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {orders.map(order => {
                            const sc = statusConfig[order.status] || statusConfig.aguardando;
                            const Icon = sc.icon;
                            const delayed = isDelayed(order);
                            return (
                                <div 
                                    key={order.id} 
                                    className={`bg-white rounded-[2rem] border-2 p-6 transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px] ${
                                        delayed ? "border-red-200 shadow-lg shadow-red-50" : "border-slate-100 shadow-sm"
                                    }`} 
                                    data-testid={`admin-order-${order.id}`}
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-black font-heading text-slate-900">#{order.order_number}</span>
                                                {delayed && <Badge className="bg-red-500 text-white border-none rounded-full px-3 py-0.5 animate-pulse">ATRASADO</Badge>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 text-sm">{order.customer_name}</span>
                                                <span className="text-xs text-slate-400 font-medium">{order.customer_phone}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest ${sc.color}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                            {sc.label}
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                                        {(Array.isArray(order.items) ? order.items : []).map((item, i) => (
                                            <div key={i} className="text-sm flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-slate-700">
                                                        <span className="text-primary mr-2">{item.quantity}x</span> 
                                                        {item.product_name}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                                {item.observation && (
                                                    <div className="text-[11px] italic text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                        "{item.observation}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        
                                        {order.observation && (
                                            <div className="mt-2 pt-2 border-t border-slate-200">
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    <span className="text-slate-400 uppercase tracking-tighter mr-1">Observação do pedido:</span>
                                                    {order.observation}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mb-6 px-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Total do Pedido</span>
                                            <span className="text-2xl font-black text-primary font-heading leading-none">R$ {order.total?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border-none ${
                                                order.payment_status === "pago" ? "bg-emerald-500 text-white shadow-sm shadow-emerald-100" : 
                                                (order.payment_status === "estornado" ? "bg-red-500 text-white" : "bg-amber-400 text-white shadow-sm shadow-amber-100")
                                            }`}>
                                                {order.payment_status === "pago" ? "PAGO" : (order.payment_status === "estornado" ? "ESTORNADO" : "PENDENTE")}
                                            </Badge>
                                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${order.delivery_type === "entrega" ? "text-blue-500" : "text-purple-500"}`}>
                                                {order.delivery_type === "entrega" ? "Motoboy" : "Retirada no Balcão"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {sc.next && (
                                            <Button 
                                                onClick={() => updateStatus(order.id, sc.next)} 
                                                className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95" 
                                                data-testid={`advance-${order.id}`}
                                            >
                                                {sc.next === "confirmado" ? "Aceitar Pedido" : 
                                                 sc.next === "preparando" ? "Iniciar Preparo" : 
                                                 sc.next === "saiu_entrega" ? "Saiu para Entrega" : "Finalizar Pedido"}
                                            </Button>
                                        )}
                                        {order.status !== "entregue" && order.status !== "cancelado" && (
                                            <Button 
                                                variant="ghost" 
                                                onClick={() => setConfirmModal({ isOpen: true, orderId: order.id })} 
                                                className="h-12 w-12 rounded-2xl text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all" 
                                                data-testid={`cancel-${order.id}`}
                                            >
                                                <XCircle className="h-6 w-6" />
                                            </Button>
                                        )}
                                        {order.payment_status !== "pago" && order.status !== "cancelado" && order.payment_status !== "estornado" && (
                                            <Button 
                                                variant="outline" 
                                                onClick={() => markPaid(order.id)} 
                                                className="h-12 px-4 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                                                data-testid={`pay-${order.id}`}
                                            >
                                                <DollarSign className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <ConfirmModal 
                    isOpen={confirmModal.isOpen} 
                    onClose={() => setConfirmModal({ isOpen: false, orderId: null })}
                    onConfirm={() => {
                        updateStatus(confirmModal.orderId, "cancelado");
                        setFilter("cancelado");
                        setConfirmModal({ isOpen: false, orderId: null });
                    }}
                    title="Recusar Pedido"
                    description="Deseja realmente recusar este pedido? O estorno será processado automaticamente."
                    confirmText="Recusar Pedido"
                    variant="destructive"
                />
            </div>
        </div>
    );
}
