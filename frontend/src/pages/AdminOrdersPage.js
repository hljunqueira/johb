import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Clock, Package, CheckCircle, DollarSign, RefreshCw } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const statusConfig = {
    aguardando: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock, next: "preparando" },
    preparando: { label: "Preparando", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Package, next: "entregue" },
    entregue: { label: "Entregue", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle, next: null },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: CheckCircle, next: null },
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
        if (order.status === "entregue") return false;
        const created = new Date(order.created_at);
        const now = new Date();
        return (now - created) > (order.estimated_time || 30) * 60 * 1000;
    };

    return (
        <div data-testid="admin-orders-page">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold font-heading">Pedidos</h1>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={fetchOrders} data-testid="refresh-orders"><RefreshCw className="h-4 w-4" /></Button>
                    {["", "aguardando", "preparando", "entregue"].map(s => (
                        <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}
                            className={`rounded-full text-xs ${filter === s ? "bg-primary text-white" : ""}`} data-testid={`filter-${s || "all"}`}>
                            {s ? statusConfig[s]?.label : "Todos"} {s === "" && <span className="ml-1 opacity-60">({orders.length})</span>}
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16"><Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhum pedido encontrado</p></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {orders.map(order => {
                        const sc = statusConfig[order.status] || statusConfig.aguardando;
                        const delayed = isDelayed(order);
                        return (
                            <div key={order.id} className={`bg-white dark:bg-card rounded-2xl border p-5 transition-all ${delayed ? "border-destructive pulse-new-order" : "border-border"}`} data-testid={`admin-order-${order.id}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold font-heading text-lg">#{order.order_number}</p>
                                            {delayed && <Badge variant="destructive" className="text-xs rounded-full">Atrasado</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{order.customer_name} - {order.customer_phone}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                    <Badge className={`${sc.color} rounded-full border`}>{sc.label}</Badge>
                                </div>

                                <div className="space-y-1 mb-3">
                                    {(Array.isArray(order.items) ? order.items : []).map((item, i) => (
                                        <div key={i} className="text-sm flex justify-between">
                                            <span>{item.quantity}x {item.product_name}</span>
                                            {item.observation && <span className="text-xs text-accent font-medium bg-accent/10 px-2 py-0.5 rounded-full ml-1">{item.observation}</span>}
                                        </div>
                                    ))}
                                </div>

                                {order.observation && (
                                    <div className="bg-accent/10 rounded-lg p-2 mb-3"><p className="text-xs text-accent font-medium">Obs: {order.observation}</p></div>
                                )}

                                <Separator className="mb-3" />

                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary font-heading">R$ {order.total?.toFixed(2)}</span>
                                        <Badge className={`text-xs rounded-full ${order.payment_status === "pago" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                            {order.payment_status === "pago" ? "Pago" : "Pendente"}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{order.delivery_type === "entrega" ? "Entrega" : "Retirada"}</span>
                                </div>

                                <div className="flex gap-2">
                                    {sc.next && (
                                        <Button size="sm" onClick={() => updateStatus(order.id, sc.next)} className="flex-1 bg-primary text-white rounded-full" data-testid={`advance-${order.id}`}>
                                            {sc.next === "preparando" ? "Preparar" : "Marcar Entregue"}
                                        </Button>
                                    )}
                                    {order.status !== "entregue" && order.status !== "cancelado" && (
                                        <Button size="sm" variant="ghost" onClick={() => setConfirmModal({ isOpen: true, orderId: order.id })} className="text-destructive hover:text-destructive hover:bg-red-50 rounded-full" data-testid={`cancel-${order.id}`}>
                                            Recusar
                                        </Button>
                                    )}
                                    {order.payment_status !== "pago" && order.status !== "cancelado" && (
                                        <Button size="sm" variant="outline" onClick={() => markPaid(order.id)} className="rounded-full" data-testid={`pay-${order.id}`}>
                                            <DollarSign className="h-3 w-3 mr-1" /> Pago
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
                    setConfirmModal({ isOpen: false, orderId: null });
                }}
                title="Recusar Pedido"
                description="Deseja realmente recusar este pedido? O estorno será processado automaticamente."
                confirmText="Recusar Pedido"
                variant="destructive"
            />
        </div>
    );
}
