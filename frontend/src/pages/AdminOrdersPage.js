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
    cancelado: {
        label: "Cancelado",
        color: "text-red-500 bg-red-50 border-red-200",
        icon: XCircle,
    }
};

const KANBAN_COLUMNS = ['aguardando', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'];

export default function AdminOrdersPage() {
    const [columns, setColumns] = useState({});
    const [activeTab, setActiveTab] = useState("aguardando");
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, orderId: null });
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
        <div data-testid="admin-orders-page" className="h-[calc(100vh-64px)] bg-white flex flex-col overflow-hidden">
            {/* Header Estilo Print */}
            <div className="p-6 md:px-10 md:py-8 border-b border-slate-50">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black font-heading text-slate-900 tracking-tight">Pedidos</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Gerencie e acompanhe os pedidos em tempo real.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-xl h-10 w-10 p-0 bg-white">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-6">
                    {KANBAN_COLUMNS.map(colId => {
                        const StatusIcon = statusConfig[colId].icon;
                        return (
                            <Button 
                                key={colId}
                                variant={activeTab === colId ? "default" : "outline"} 
                                onClick={() => setActiveTab(colId)} 
                                className={`rounded-2xl px-6 h-10 font-bold text-xs gap-2 ${activeTab === colId ? statusConfig[colId].color : ""}`}
                            >
                                <StatusIcon className="h-4 w-4" />
                                {statusConfig[colId].label} ({columns[colId]?.length || 0})
                            </Button>
                        );
                    })}
                    <Button variant={activeTab === "all" ? "default" : "outline"} onClick={() => setActiveTab("all")} className="rounded-2xl px-6 h-10 font-bold text-xs gap-2">
                        Todos ({Object.values(columns).flat().length})
                    </Button>
                </div>
            </div>

            {/* Kanban / Grid Area */}
            <div className="flex-1 overflow-auto p-6 md:px-10 bg-slate-50/30 custom-scrollbar">
                <DragDropContext onDragEnd={onDragEnd}>
                    {activeTab === "all" ? (
                        /* Kanban View */
                        <div className="flex gap-6 h-full min-w-max pb-4">
                            {KANBAN_COLUMNS.map((colId) => {
                                const config = statusConfig[colId];
                                const orders = columns[colId] || [];
                                
                                return (
                                    <div key={colId} className="w-[300px] flex flex-col h-full bg-slate-100/40 rounded-[2.5rem] border border-slate-200/50 p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-xl ${config.color} shadow-sm`}>
                                                    {(() => {
                                                        const StatusIcon = config.icon;
                                                        return <StatusIcon className="h-4 w-4" />;
                                                    })()}
                                                </div>
                                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-tighter">{config.label}</h3>
                                            </div>
                                            <Badge variant="secondary" className="rounded-full bg-white text-slate-400 border-slate-100 text-[10px] font-black px-2 py-0.5 shadow-sm">
                                                {orders.length}
                                            </Badge>
                                        </div>

                                        <Droppable droppableId={colId}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`flex-1 overflow-y-auto space-y-4 rounded-[2rem] transition-all p-1 custom-scrollbar ${
                                                        snapshot.isDraggingOver ? "bg-slate-200/40" : ""
                                                    }`}
                                                >
                                                    {orders.length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tudo limpo por aqui!</p>
                                                            <p className="text-[9px] font-bold text-slate-400">Aguardando novos pedidos.</p>
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
                                            <div className="col-span-full h-[400px] flex flex-col items-center justify-center text-center opacity-40">
                                                <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Tudo limpo por aqui!</p>
                                                <p className="text-xs font-bold text-slate-400">Nenhum pedido encontrado neste status.</p>
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
                                                    isGrid
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
