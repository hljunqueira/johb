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
import { API } from "@/lib/constants";

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
    cancelado: {
        label: "Cancelado",
        color: "text-red-500 bg-red-50 border-red-200",
        icon: XCircle,
    }
};

const KANBAN_COLUMNS = ['aguardando', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'];

const isDelayed = (order) => {
    if (order.status === "entregue" || order.status === "cancelado") return false;
    const created = new Date(order.created_at);
    const now = new Date();
    return (now - created) > (order.estimated_time || 30) * 60 * 1000;
};

const OrderCard = ({ order, index, markPaid, setConfirmModal, setDeleteConfirm }) => (
    <Draggable key={order.id} draggableId={order.id} index={index}>
        {(provided, snapshot) => (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`bg-[#1E1E1E] rounded-2xl border p-5 shadow-lg transition-all h-full flex flex-col ${
                    snapshot.isDragging ? "shadow-2xl ring-2 ring-[#F4B544] border-[#F4B544] scale-105 rotate-1" : "border-white/10 hover:border-[#D4AF37]/40"
                } ${isDelayed(order) ? "border-red-500/40 bg-red-950/10" : ""}`}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-500" />
                        <span className="text-lg font-black text-[#F4B544] leading-none">#{order.order_number}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10 text-gray-300">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-2xl bg-[#1A1A1A] border-white/10 text-white">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Ações</DropdownMenuLabel>
                            <DropdownMenuItem 
                                disabled={order.payment_status === "pago"}
                                onClick={() => markPaid(order.id)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold focus:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                            >
                                <DollarSign className="h-4 w-4" /> Marcar como Pago
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 mx-2 bg-white/10" />
                            <DropdownMenuItem 
                                onClick={() => setConfirmModal({ isOpen: true, orderId: order.id })}
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold focus:bg-red-500/20 text-red-400 cursor-pointer"
                            >
                                <XCircle className="h-4 w-4" /> Recusar Pedido
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold focus:bg-red-500/30 text-red-300 cursor-pointer"
                            >
                                <Package className="h-4 w-4" /> Excluir Pedido
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mb-4">
                    <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{order.customer_name}</p>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mt-1">
                        <Clock className="h-3.5 w-3.5 text-[#F4B544]" />
                        {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                </div>

                <div className="space-y-1.5 mb-4 flex-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {(Array.isArray(order.items) ? order.items : []).map((item, i) => (
                        <div key={i} className="text-xs flex justify-between leading-tight text-gray-300">
                            <span>
                                <span className="text-[#F4B544] font-bold mr-1">{item.quantity}x</span> {item.product_name}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-auto">
                    <span className="text-lg font-black text-[#F4B544] tracking-tighter">R$ {order.total?.toFixed(2)}</span>
                    <Badge className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-none ${
                        order.payment_status === "pago" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                        {order.payment_status === "pago" ? "PGTO PAGO" : "PGTO PENDENTE"}
                    </Badge>
                </div>
            </div>
        )}
    </Draggable>
);

export default function AdminOrdersPage() {
    const [columns, setColumns] = useState({});
    const [activeTab, setActiveTab] = useState("aguardando");
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, orderId: null });
    const { token } = useAuth();
    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
            const allOrders = Array.isArray(res.data) ? res.data : [];
            
            const grouped = KANBAN_COLUMNS.reduce((acc, status) => {
                acc[status] = allOrders.filter(o => o.status === status);
                return acc;
            }, {});
            
            setColumns(grouped);
        } catch (err) { 
            console.error("Erro ao carregar pedidos:", err); 
        }
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

    const handleDeleteOrder = async (orderId) => {
        try {
            await axios.delete(`${API}/admin/orders/${orderId}`, { headers });
            toast.success("Pedido excluído com sucesso");
            fetchOrders();
        } catch {
            toast.error("Erro ao excluir pedido");
        }
    };

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        const orderId = draggableId;
        const newStatus = destination.droppableId;
        
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

    return (
        <div data-testid="admin-orders-page" className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] text-white flex flex-col">
            {/* Header Estilo Premium JOHB */}
            <div className="pb-6 border-b border-[#D4AF37]/15">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Pedidos em Tempo Real</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">Gerencie e acompanhe a preparação e entregas da JOHB.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-xl h-10 w-10 p-0 bg-[#141414] hover:bg-white/10 border-white/10 text-[#F4B544]">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
                
                <div className="flex flex-wrap gap-2.5 mt-6">
                    {KANBAN_COLUMNS.map(colId => {
                        const config = statusConfig[colId] || { label: colId, icon: CircleEllipsis };
                        const StatusIcon = config.icon || CircleEllipsis;
                        const isTabActive = activeTab === colId;
                        const count = Array.isArray(columns[colId]) ? columns[colId].length : 0;
                        return (
                            <Button 
                                key={colId}
                                variant="outline" 
                                onClick={() => setActiveTab(colId)} 
                                className={`rounded-xl px-5 h-10 font-bold text-xs gap-2 transition-all ${
                                    isTabActive 
                                        ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold shadow-lg shadow-[#F4B544]/20 border-none scale-105" 
                                        : "bg-[#141414] text-gray-300 border-white/10 hover:border-[#D4AF37]/40 hover:text-white"
                                }`}
                            >
                                <StatusIcon className="h-4 w-4" />
                                {config.label} ({count})
                            </Button>
                        );
                    })}
                    <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("all")} 
                        className={`rounded-xl px-5 h-10 font-bold text-xs gap-2 transition-all ${
                            activeTab === "all" 
                                ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold shadow-lg shadow-[#F4B544]/20 border-none scale-105" 
                                : "bg-[#141414] text-gray-300 border-white/10 hover:border-[#D4AF37]/40 hover:text-white"
                        }`}
                    >
                        Todos ({Object.values(columns || {}).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)})
                    </Button>
                </div>
            </div>

            {/* Kanban / Grid Area */}
            <div className="flex-1 overflow-auto pt-6 custom-scrollbar">
                <DragDropContext onDragEnd={onDragEnd}>
                    {activeTab === "all" ? (
                        /* Kanban View */
                        <div className="flex gap-6 h-full min-w-max pb-6">
                            {KANBAN_COLUMNS.map((colId) => {
                                const config = statusConfig[colId] || { label: colId, icon: CircleEllipsis };
                                const StatusIcon = config.icon || CircleEllipsis;
                                const orders = Array.isArray(columns[colId]) ? columns[colId] : [];
                                
                                return (
                                    <div key={colId} className="w-[320px] flex flex-col h-full bg-[#141414] rounded-2xl border border-white/10 p-4 shadow-xl">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-[#1E1E1E] text-[#F4B544] border border-[#D4AF37]/30 shadow-sm">
                                                    <StatusIcon className="h-4 w-4" />
                                                </div>
                                                <h3 className="font-bold text-white text-sm uppercase tracking-wider">{config.label}</h3>
                                            </div>
                                            <Badge variant="secondary" className="rounded-full bg-[#1E1E1E] text-gray-300 border-white/10 text-xs font-bold px-2.5 py-0.5">
                                                {orders.length}
                                            </Badge>
                                        </div>

                                        <Droppable droppableId={colId}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`flex-1 overflow-y-auto space-y-4 rounded-xl transition-all p-1.5 custom-scrollbar min-h-[300px] ${
                                                        snapshot.isDraggingOver ? "bg-[#1E1E1E]/60 ring-1 ring-[#D4AF37]/30" : ""
                                                    }`}
                                                >
                                                    {orders.length === 0 ? (
                                                        <div className="h-40 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Tudo limpo por aqui!</p>
                                                            <p className="text-[11px] text-gray-500">Aguardando novos pedidos.</p>
                                                        </div>
                                                    ) : (
                                                        orders.map((order, index) => (
                                                            <OrderCard 
                                                                key={order.id} 
                                                                order={order} 
                                                                index={index} 
                                                                markPaid={markPaid} 
                                                                setConfirmModal={setConfirmModal}
                                                                setDeleteConfirm={setDeleteConfirm}
                                                            />
                                                        ))
                                                    )}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Grid View for Filtered Status */
                        <div className="h-full">
                            <Droppable droppableId={activeTab}>
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10"
                                    >
                                        {(columns[activeTab] || []).length === 0 ? (
                                            <div className="col-span-full h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center bg-[#141414]">
                                                <p className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-1">Tudo limpo por aqui!</p>
                                                <p className="text-xs text-gray-500">Nenhum pedido encontrado neste status.</p>
                                            </div>
                                        ) : (
                                            (columns[activeTab] || []).map((order, index) => (
                                                <OrderCard 
                                                    key={order.id} 
                                                    order={order} 
                                                    index={index} 
                                                    markPaid={markPaid} 
                                                    setConfirmModal={setConfirmModal}
                                                    setDeleteConfirm={setDeleteConfirm}
                                                />
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    )}
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

            <ConfirmModal 
                isOpen={deleteConfirm.isOpen} 
                onClose={() => setDeleteConfirm({ isOpen: false, orderId: null })}
                onConfirm={() => {
                    handleDeleteOrder(deleteConfirm.orderId);
                    setDeleteConfirm({ isOpen: false, orderId: null });
                }}
                title="Excluir Pedido"
                description="Deseja realmente excluir este pedido permanentemente? Esta ação não pode ser desfeita."
                confirmText="Excluir Permanentemente"
                variant="destructive"
            />
        </div>
    );
}
