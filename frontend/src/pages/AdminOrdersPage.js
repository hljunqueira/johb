import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
    Clock, Package, CheckCircle2, DollarSign, RefreshCw, 
    ThumbsUp, Timer, Truck, XCircle, CircleEllipsis,
    MoreVertical, ChevronRight, GripVertical
} from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const statusConfig = {
    aguardando: { 
        label: "Pendente", 
        color: "text-amber-500 bg-amber-50 border-amber-200", 
        icon: CircleEllipsis, 
    },
    confirmado: { 
        label: "Aceito", 
        color: "text-purple-500 bg-purple-50 border-purple-200", 
        icon: ThumbsUp, 
    },
    preparando: { 
        label: "Preparo", 
        color: "text-orange-500 bg-orange-50 border-orange-200", 
        icon: Timer, 
    },
    saiu_entrega: { 
        label: "Entrega", 
        color: "text-blue-500 bg-blue-50 border-blue-200", 
        icon: Truck, 
    },
    entregue: { 
        label: "Concluído", 
        color: "text-emerald-500 bg-emerald-50 border-emerald-200", 
        icon: CheckCircle2, 
    },
};

const KANBAN_COLUMNS = ['aguardando', 'confirmado', 'preparando', 'saiu_entrega', 'entregue'];

export default function AdminOrdersPage() {
    const [columns, setColumns] = useState({});
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchOrders = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/admin/orders`, { headers });
            const allOrders = res.data;
            
            const grouped = KANBAN_COLUMNS.reduce((acc, status) => {
                acc[status] = allOrders.filter(o => o.status === status);
                return acc;
            }, {});
            
            // Adiciona cancelados em uma aba separada se necessário, mas no Kanban focamos no fluxo ativo
            setColumns(grouped);
        } catch { toast.error("Erro ao carregar pedidos"); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchOrders(); const i = setInterval(fetchOrders, 10000); return () => clearInterval(i); }, [fetchOrders]);

    const updateStatus = async (orderId, status) => {
        try { 
            await axios.put(`${API}/admin/orders/${orderId}/status`, { status }, { headers }); 
            toast.success(`Pedido movido para ${statusConfig[status]?.label || status}`);
            fetchOrders(); 
        } catch { toast.error("Erro ao atualizar status"); }
    };

    const markPaid = async (orderId) => {
        try { await axios.put(`${API}/admin/orders/${orderId}/payment`, {}, { headers }); toast.success("Pagamento confirmado"); fetchOrders(); }
        catch { toast.error("Erro ao marcar pagamento"); }
    };

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        const orderId = draggableId;
        const newStatus = destination.droppableId;
        
        // Update local state for immediate feedback
        const sourceOrders = Array.from(columns[source.droppableId]);
        const destOrders = Array.from(columns[destination.droppableId]);
        const [movedOrder] = sourceOrders.splice(source.index, 1);
        destOrders.splice(destination.index, 0, { ...movedOrder, status: newStatus });
        
        setColumns({
            ...columns,
            [source.droppableId]: sourceOrders,
            [destination.droppableId]: destOrders
        });

        updateStatus(orderId, newStatus);
    };

    const isDelayed = (order) => {
        if (order.status === "entregue" || order.status === "cancelado") return false;
        const created = new Date(order.created_at);
        const now = new Date();
        return (now - created) > (order.estimated_time || 30) * 60 * 1000;
    };

    return (
        <div data-testid="admin-orders-page" className="h-[calc(100vh-64px)] bg-slate-50/50 flex flex-col overflow-hidden">
            <div className="p-4 md:px-6 md:py-4 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black font-heading text-slate-800 leading-tight">Monitor de Pedidos</h1>
                    <p className="text-slate-400 text-[10px] md:text-xs font-medium uppercase tracking-widest mt-0.5">Gestão de fluxo em tempo real</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-xl bg-white shadow-sm h-9">
                    <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Atualizar</span>
                </Button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 px-4 md:px-6 custom-scrollbar">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 h-full min-w-max pb-2">
                        {KANBAN_COLUMNS.map((colId) => {
                            const config = statusConfig[colId];
                            const orders = columns[colId] || [];
                            return (
                                <div key={colId} className="w-[260px] md:w-[280px] flex flex-col h-full bg-slate-200/40 rounded-[2rem] border border-slate-200/60 p-3">
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-lg ${config.color}`}>
                                                <config.icon className="h-3.5 w-3.5" />
                                            </div>
                                            <h3 className="font-bold text-slate-700 text-sm">{config.label}</h3>
                                        </div>
                                        <Badge variant="secondary" className="rounded-full bg-white text-slate-400 border-slate-200 text-[10px] px-1.5 py-0">
                                            {orders.length}
                                        </Badge>
                                    </div>

                                    <Droppable droppableId={colId}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex-1 overflow-y-auto space-y-3 rounded-2xl transition-colors min-h-[200px] p-1 custom-scrollbar ${
                                                    snapshot.isDraggingOver ? "bg-slate-300/20" : ""
                                                }`}
                                            >
                                                {orders.map((order, index) => (
                                                    <Draggable key={order.id} draggableId={order.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`bg-white rounded-[1.5rem] border-2 p-3.5 shadow-sm transition-all ${
                                                                    snapshot.isDragging ? "shadow-2xl ring-2 ring-primary border-primary rotate-1 scale-105" : "hover:border-slate-300"
                                                                } ${isDelayed(order) ? "border-red-200 bg-red-50/30" : "border-slate-100"}`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <GripVertical className="h-3 w-3 text-slate-300" />
                                                                        <span className="text-sm font-black font-heading text-slate-900">#{order.order_number}</span>
                                                                    </div>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                                                                <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-slate-100">
                                                                            <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1.5">Pagamento</DropdownMenuLabel>
                                                                            <DropdownMenuItem 
                                                                                disabled={order.payment_status === "pago"}
                                                                                onClick={() => markPaid(order.id)}
                                                                                className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium focus:bg-emerald-50 text-emerald-600 cursor-pointer"
                                                                            >
                                                                                <DollarSign className="h-3 w-3" /> Marcar como Pago
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator className="my-1 mx-2 bg-slate-100" />
                                                                            <DropdownMenuItem 
                                                                                onClick={() => setConfirmModal({ isOpen: true, orderId: order.id })}
                                                                                className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium focus:bg-red-50 text-red-600 cursor-pointer"
                                                                            >
                                                                                <XCircle className="h-3 w-3" /> Recusar Pedido
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>

                                                                <div className="mb-3">
                                                                    <p className="font-bold text-slate-700 text-xs truncate uppercase tracking-tighter">{order.customer_name}</p>
                                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 mt-0.5">
                                                                        <Clock className="h-2.5 w-2.5" />
                                                                        {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1 mb-3 max-h-24 overflow-y-auto pr-1">
                                                                    {(Array.isArray(order.items) ? order.items : []).map((item, i) => (
                                                                        <div key={i} className="text-[10px] flex justify-between leading-tight">
                                                                            <span className="text-slate-500 font-medium line-clamp-1">
                                                                                <span className="text-primary font-bold mr-1">{item.quantity}x</span> {item.product_name}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                                                                    <span className="text-sm font-black text-primary font-heading leading-none">R$ {order.total?.toFixed(2)}</span>
                                                                    <Badge className={`px-1.5 py-0 rounded text-[8px] font-black uppercase tracking-widest border-none ${
                                                                        order.payment_status === "pago" ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                                                                    }`}>
                                                                        {order.payment_status === "pago" ? "PAGO" : "PENDENTE"}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            </div>

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
