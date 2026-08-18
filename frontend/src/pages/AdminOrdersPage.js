import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
    Clock, Package, CheckCircle2, DollarSign, RefreshCw, 
    ThumbsUp, Timer, Truck, XCircle, CircleEllipsis,
    MoreVertical, ChevronRight, GripVertical, Volume2, VolumeX,
    Printer, ReceiptText, MapPin, Phone, Banknote, Calendar
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
import { API } from "@/lib/constants";
import { startOrderAlertLoop, stopOrderAlertLoop, playOrderAlertChime } from "@/lib/soundAlert";

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

const OrderCard = ({ order, index, markPaid, updateStatus, setConfirmModal, setDeleteConfirm, setSelectedPrintOrder }) => {
    const isToday = (() => {
        if (!order.scheduled_date) return false;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        return order.scheduled_date === todayStr;
    })();

    return (
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
                            <GripVertical className="h-4 w-4 text-gray-500 cursor-grab" />
                            <span className="text-lg font-black text-[#F4B544] leading-none">#{order.order_number}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Ver Comanda de Cozinha / Imprimir"
                                onClick={() => setSelectedPrintOrder(order)}
                                className="h-8 w-8 rounded-xl hover:bg-white/10 text-gray-300 hover:text-[#F4B544]"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10 text-gray-300">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60 rounded-xl p-2 shadow-2xl bg-[#1A1A1A] border-white/10 text-white">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1.5">Mover Status</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                        onClick={() => updateStatus(order.id, "aguardando")}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-amber-400 focus:bg-amber-500/20 cursor-pointer"
                                    >
                                        <CircleEllipsis className="h-3.5 w-3.5" /> Pendente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => updateStatus(order.id, "confirmado")}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-purple-400 focus:bg-purple-500/20 cursor-pointer"
                                    >
                                        <ThumbsUp className="h-3.5 w-3.5" /> Aceito
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => updateStatus(order.id, "preparando")}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-orange-400 focus:bg-orange-500/20 cursor-pointer"
                                    >
                                        <Timer className="h-3.5 w-3.5" /> Em Preparo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => updateStatus(order.id, "saiu_entrega")}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-blue-400 focus:bg-blue-500/20 cursor-pointer"
                                    >
                                        <Truck className="h-3.5 w-3.5" /> Saiu para Entrega
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => updateStatus(order.id, "entregue")}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 focus:bg-emerald-500/20 cursor-pointer"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => updateStatus(order.id, "cancelado")}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-400 focus:bg-red-500/20 cursor-pointer"
                                    >
                                        <XCircle className="h-3.5 w-3.5" /> Cancelar Pedido
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1 mx-2 bg-white/10" />

                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1.5">Ações Rápidas</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                        disabled={order.payment_status === "pago"}
                                        onClick={() => markPaid(order.id)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold focus:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                                    >
                                        <DollarSign className="h-4 w-4" /> Marcar como Pago
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => setSelectedPrintOrder(order)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold focus:bg-[#F4B544]/20 text-[#F4B544] cursor-pointer"
                                    >
                                        <Printer className="h-4 w-4" /> Imprimir Comanda
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold focus:bg-red-500/30 text-red-300 cursor-pointer"
                                    >
                                        <Package className="h-4 w-4" /> Excluir Registro
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="mb-3">
                        <div className="flex items-center justify-between">
                            <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{order.customer_name}</p>
                            <span className="text-[10px] uppercase font-bold text-gray-400">
                                {order.delivery_type === "entrega" ? "🛵 Entrega" : "🏪 Balcão"}
                            </span>
                        </div>

                        {(order.scheduled_date || order.scheduled_time) ? (
                            <div className={`mt-2 py-1.5 px-2.5 rounded-lg border text-[11px] font-extrabold flex items-center gap-1.5 ${
                                isToday
                                    ? "bg-[#F4B544]/25 border-[#F4B544] text-[#F4B544]"
                                    : "bg-purple-500/20 border-purple-500/40 text-purple-300"
                            }`}>
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                    {isToday ? "HOJE" : (order.scheduled_date ? new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : "")} 
                                    {order.scheduled_time ? ` às ${order.scheduled_time}h` : ""}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mt-1">
                                <Clock className="h-3.5 w-3.5 text-[#F4B544]" />
                                {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        )}

                        {/* Informação de Pagamento e Troco */}
                        <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                            <span>
                                {order.payment_method === "asaas" ? "💳 Online (Asaas)" :
                                 order.payment_method === "cartao_maquininha" ? "💳 Maquininha" :
                                 order.payment_method === "dinheiro" ? (
                                     order.change_for ? `💵 Dinheiro (Troco p/ R$ ${Number(order.change_for).toFixed(2)})` : "💵 Dinheiro (Exato)"
                                 ) : (order.payment_method || "Online")}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1.5 mb-4 flex-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {(Array.isArray(order.items) ? order.items : []).map((item, i) => (
                            <div key={i} className="text-xs flex justify-between leading-tight text-gray-300">
                                <span>
                                    <span className="text-[#F4B544] font-bold mr-1">{item.quantity}x</span> {item.name || item.product_name}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/10 mt-auto">
                        <span className="text-lg font-black text-[#F4B544] tracking-tighter">R$ {order.total?.toFixed(2)}</span>
                        <Badge className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-none ${
                            order.payment_status === "pago" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}>
                            {order.payment_status === "pago" ? "PGTO PAGO" : "PGTO PENDENTE"}
                        </Badge>
                    </div>

                    {/* Botão de Avanço Rápido de Status */}
                    {order.status === "aguardando" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "confirmado")}
                            className="w-full mt-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <ThumbsUp className="h-3.5 w-3.5" /> Aceitar Pedido
                        </button>
                    )}
                    {order.status === "confirmado" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "preparando")}
                            className="w-full mt-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Timer className="h-3.5 w-3.5" /> Iniciar Preparo
                        </button>
                    )}
                    {order.status === "preparando" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "saiu_entrega")}
                            className="w-full mt-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Truck className="h-3.5 w-3.5" /> Despachar / Saiu p/ Entrega
                        </button>
                    )}
                    {order.status === "saiu_entrega" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "entregue")}
                            className="w-full mt-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir Pedido
                        </button>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default function AdminOrdersPage() {
    const [columns, setColumns] = useState({});
    const [activeTab, setActiveTab] = useState("all"); // Modo Kanban completo como padrão
    const [scheduleFilter, setScheduleFilter] = useState("all"); // 'all', 'today', 'future'
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, orderId: null });
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin/orders`, { headers });
            const allOrders = Array.isArray(res.data) ? res.data : [];
            
            const grouped = KANBAN_COLUMNS.reduce((acc, status) => {
                acc[status] = allOrders.filter(o => o.status === status);
                return acc;
            }, {});
            
            setColumns(grouped);

            // Alerta sonoro se tiver pedido pendente
            const pendingOrders = grouped['aguardando'] || [];
            if (pendingOrders.length > 0 && soundEnabled) {
                startOrderAlertLoop();
            } else {
                stopOrderAlertLoop();
            }

        } catch (err) { 
            console.error("Erro ao carregar pedidos:", err); 
        }
        finally { setLoading(false); }
    }, [token, soundEnabled]); // eslint-disable-line

    useEffect(() => { 
        fetchOrders(); 
        const i = setInterval(fetchOrders, 10000); 
        return () => {
            clearInterval(i);
            stopOrderAlertLoop();
        }; 
    }, [fetchOrders]);

    const toggleSound = () => {
        if (soundEnabled) {
            stopOrderAlertLoop();
            setSoundEnabled(false);
            toast.info("Alerta sonoro silenciado.");
        } else {
            setSoundEnabled(true);
            playOrderAlertChime();
            toast.success("Alerta sonoro ativado!");
        }
    };

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
        
        const sourceOrders = Array.from(columns[source.droppableId] || []);
        const destOrders = Array.from(columns[destination.droppableId] || []);
        const [movedOrder] = sourceOrders.splice(source.index, 1);
        if (movedOrder) {
            destOrders.splice(destination.index, 0, { ...movedOrder, status: newStatus });
            
            setColumns({
                ...columns,
                [source.droppableId]: sourceOrders,
                [destination.droppableId]: destOrders
            });

            updateStatus(orderId, newStatus);
        }
    };

    // Filtro adicional por agendamento
    const filterOrdersBySchedule = (ordersList) => {
        if (!Array.isArray(ordersList)) return [];
        if (scheduleFilter === "all") return ordersList;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        if (scheduleFilter === "today") {
            return ordersList.filter(o => o.scheduled_date === todayStr);
        }
        if (scheduleFilter === "future") {
            return ordersList.filter(o => o.scheduled_date && o.scheduled_date > todayStr);
        }
        return ordersList;
    };

    return (
        <div data-testid="admin-orders-page" className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] text-white flex flex-col">
            {/* Header Estilo Premium JOHB */}
            <div className="pb-6 border-b border-[#D4AF37]/15">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Pedidos em Tempo Real</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">Painel KDS de produção e entregas JOHB Café & Salgados.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Botão de Som */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleSound}
                            className={`rounded-xl px-3 h-10 gap-2 font-bold text-xs border ${
                                soundEnabled 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" 
                                    : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            }`}
                        >
                            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-red-400" />}
                            <span>{soundEnabled ? "Som Ativo" : "Som Mudo"}</span>
                        </Button>

                        <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-xl h-10 w-10 p-0 bg-[#141414] hover:bg-white/10 border-white/10 text-[#F4B544]">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* Filtros de Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                    <div className="flex flex-wrap gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setActiveTab("all")} 
                            className={`rounded-xl px-4 h-9 font-bold text-xs gap-2 transition-all cursor-pointer ${
                                activeTab === "all" 
                                    ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold shadow-lg shadow-[#F4B544]/20 border-none scale-105" 
                                    : "bg-[#141414] text-gray-300 border-white/10 hover:border-[#D4AF37]/40 hover:text-white"
                            }`}
                        >
                            <GripVertical className="h-3.5 w-3.5" />
                            Quadro Kanban Completo
                        </Button>

                        {KANBAN_COLUMNS.map(colId => {
                            const config = statusConfig[colId] || { label: colId, icon: CircleEllipsis };
                            const StatusIcon = config.icon || CircleEllipsis;
                            const isTabActive = activeTab === colId;
                            const count = filterOrdersBySchedule(columns[colId] || []).length;
                            return (
                                <Button 
                                    key={colId}
                                    variant="outline" 
                                    onClick={() => setActiveTab(colId)} 
                                    className={`rounded-xl px-4 h-9 font-bold text-xs gap-2 transition-all cursor-pointer ${
                                        isTabActive 
                                            ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold shadow-lg shadow-[#F4B544]/20 border-none scale-105" 
                                            : "bg-[#141414] text-gray-300 border-white/10 hover:border-[#D4AF37]/40 hover:text-white"
                                    }`}
                                >
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    {config.label} ({count})
                                </Button>
                            );
                        })}
                    </div>

                    {/* Filtros de Agendamento */}
                    <div className="flex items-center gap-1.5 bg-[#141414] p-1 rounded-xl border border-white/10 text-xs">
                        <button
                            type="button"
                            onClick={() => setScheduleFilter("all")}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                scheduleFilter === "all" ? "bg-[#F4B544] text-black" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Todos
                        </button>
                        <button
                            type="button"
                            onClick={() => setScheduleFilter("today")}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                scheduleFilter === "today" ? "bg-[#F4B544] text-black" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            🗓️ Agendados Hoje
                        </button>
                        <button
                            type="button"
                            onClick={() => setScheduleFilter("future")}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                scheduleFilter === "future" ? "bg-[#F4B544] text-black" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            📅 Futuros
                        </button>
                    </div>
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
                                const orders = filterOrdersBySchedule(columns[colId] || []);
                                
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
                                                                updateStatus={updateStatus}
                                                                setConfirmModal={setConfirmModal}
                                                                setDeleteConfirm={setDeleteConfirm}
                                                                setSelectedPrintOrder={setSelectedPrintOrder}
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
                                {(provided) => {
                                    const filteredList = filterOrdersBySchedule(columns[activeTab] || []);
                                    return (
                                        <div 
                                            {...provided.droppableProps} 
                                            ref={provided.innerRef}
                                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10"
                                        >
                                            {filteredList.length === 0 ? (
                                                <div className="col-span-full h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center bg-[#141414]">
                                                    <p className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-1">Tudo limpo por aqui!</p>
                                                    <p className="text-xs text-gray-500">Nenhum pedido encontrado neste status.</p>
                                                </div>
                                            ) : (
                                                filteredList.map((order, index) => (
                                                    <OrderCard 
                                                        key={order.id} 
                                                        order={order} 
                                                        index={index} 
                                                        markPaid={markPaid} 
                                                        updateStatus={updateStatus}
                                                        setConfirmModal={setConfirmModal}
                                                        setDeleteConfirm={setDeleteConfirm}
                                                        setSelectedPrintOrder={setSelectedPrintOrder}
                                                    />
                                                ))
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    );
                                }}
                            </Droppable>
                        </div>
                    )}
                </DragDropContext>
            </div>

            {/* Modal e Impressão de Cupom Não Fiscal Térmico (58mm / 80mm / A4) */}
            {selectedPrintOrder && (
                <>
                    {/* Modal de Pré-Visualização na Tela */}
                    <Dialog open={Boolean(selectedPrintOrder)} onOpenChange={() => setSelectedPrintOrder(null)}>
                        <DialogContent className="max-w-md bg-[#10100F] border border-[#F4B544]/30 text-white rounded-2xl p-6 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-serif text-xl text-[#F4B544] flex items-center justify-between border-b border-white/10 pb-3">
                                    <span>Cupom Não Fiscal #{selectedPrintOrder.order_number}</span>
                                    <Button 
                                        size="sm"
                                        onClick={() => window.print()}
                                        className="bg-[#F4B544] text-black font-extrabold text-xs gap-1.5 shadow-md hover:bg-[#FFC85C] cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Imprimir Cupom</span>
                                    </Button>
                                </DialogTitle>
                            </DialogHeader>

                            {/* Prévia Estilo Papel Térmico */}
                            <div className="bg-white text-black p-5 rounded-xl font-mono text-xs shadow-inner space-y-3 border border-gray-300 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-3">
                                    <h3 className="font-bold text-base tracking-tight">JOHB CAFÉ & SALGADOS</h3>
                                    <p className="text-[11px] text-gray-700">Balneário Arroio do Silva - SC</p>
                                    <p className="text-[10px] font-bold text-gray-600 tracking-wider mt-1">*** CUPOM NÃO FISCAL ***</p>
                                </div>

                                <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2">
                                    <div className="flex justify-between font-bold text-sm">
                                        <span>PEDIDO #{selectedPrintOrder.order_number}</span>
                                        <span className="uppercase text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                                            {selectedPrintOrder.delivery_type === "entrega" ? "ENTREGA" : "RETIRADA"}
                                        </span>
                                    </div>
                                    <p className="text-gray-700">
                                        Data Emissão: {new Date(selectedPrintOrder.created_at || new Date()).toLocaleString("pt-BR")}
                                    </p>
                                    {(selectedPrintOrder.scheduled_date || selectedPrintOrder.scheduled_time) && (
                                        <div className="font-bold bg-amber-100 p-1.5 rounded border border-amber-300 text-amber-900 mt-1">
                                            🗓️ AGENDADO: {selectedPrintOrder.scheduled_date ? new Date(selectedPrintOrder.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : ""} {selectedPrintOrder.scheduled_time ? `às ${selectedPrintOrder.scheduled_time}h` : ""}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2">
                                    <p><strong className="text-black">CLIENTE:</strong> {selectedPrintOrder.customer_name}</p>
                                    <p><strong className="text-black">TELEFONE:</strong> {selectedPrintOrder.customer_phone}</p>
                                    {selectedPrintOrder.delivery_type === "entrega" && selectedPrintOrder.address && (
                                        <p><strong className="text-black">ENDEREÇO:</strong> {selectedPrintOrder.address}{selectedPrintOrder.neighborhood ? ` - ${selectedPrintOrder.neighborhood}` : ""}</p>
                                    )}
                                </div>

                                <div className="space-y-2 border-b border-dashed border-gray-400 pb-2">
                                    <div className="flex justify-between font-bold text-[10px] uppercase text-gray-600 border-b border-gray-200 pb-1">
                                        <span>QTD  ITEM</span>
                                        <span>TOTAL</span>
                                    </div>
                                    {(Array.isArray(selectedPrintOrder.items) ? selectedPrintOrder.items : []).map((it, idx) => (
                                        <div key={idx} className="space-y-0.5 text-xs">
                                            <div className="flex justify-between items-start font-medium">
                                                <span><strong>{it.quantity}x</strong> {it.name || it.product_name}</span>
                                                <span className="font-bold shrink-0 ml-2">R$ {((it.price || 0) * it.quantity).toFixed(2).replace('.', ',')}</span>
                                            </div>
                                            {Array.isArray(it.complements) && it.complements.length > 0 && (
                                                <div className="pl-4 text-[10px] text-gray-600">
                                                    {it.complements.map((c, cIdx) => (
                                                        <p key={cIdx}>+ {c.name || c} {c.price ? `(R$ ${Number(c.price).toFixed(2).replace('.', ',')})` : ''}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1 text-xs border-b border-dashed border-gray-400 pb-2">
                                    <div className="flex justify-between text-gray-700">
                                        <span>Subtotal:</span>
                                        <span>R$ {Number(selectedPrintOrder.subtotal || selectedPrintOrder.total).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    {Number(selectedPrintOrder.delivery_fee) > 0 && (
                                        <div className="flex justify-between text-gray-700">
                                            <span>Taxa de Entrega:</span>
                                            <span>R$ {Number(selectedPrintOrder.delivery_fee).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    )}
                                    {Number(selectedPrintOrder.discount_amount) > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-bold">
                                            <span>Desconto Cupom ({selectedPrintOrder.coupon_code || ''}):</span>
                                            <span>- R$ {Number(selectedPrintOrder.discount_amount).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-sm text-black pt-1 border-t border-gray-300">
                                        <span>TOTAL:</span>
                                        <span>R$ {Number(selectedPrintOrder.total).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                </div>

                                <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2">
                                    <p>
                                        <strong>PAGAMENTO:</strong> {
                                            selectedPrintOrder.payment_method === "asaas" ? "Online (Asaas - PIX/Cartão)" :
                                            selectedPrintOrder.payment_method === "cartao_maquininha" ? "Cartão na Maquininha" :
                                            selectedPrintOrder.payment_method === "dinheiro" ? (
                                                selectedPrintOrder.change_for ? `Dinheiro (Troco para R$ ${Number(selectedPrintOrder.change_for).toFixed(2).replace('.', ',')})` : "Dinheiro (Sem Troco)"
                                            ) : (selectedPrintOrder.payment_method || "Não especificado")
                                        }
                                    </p>
                                    <p>
                                        <strong>STATUS PGTO:</strong> <span className={selectedPrintOrder.payment_status === "pago" ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                                            {selectedPrintOrder.payment_status === "pago" ? "PAGO" : "PENDENTE"}
                                        </span>
                                    </p>
                                    {selectedPrintOrder.observation && (
                                        <div className="mt-1.5 p-1.5 bg-gray-100 rounded border border-gray-300">
                                            <strong>OBSERVAÇÕES:</strong> {selectedPrintOrder.observation}
                                        </div>
                                    )}
                                </div>

                                <div className="text-center text-[10px] text-gray-600 pt-1 space-y-0.5">
                                    <p>Feito com carinho para você!</p>
                                    <p className="font-bold">WhatsApp: (48) 99101-3293</p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Container Invisível na Tela / Exclusivo para Impressão Térmica */}
                    <div id="printable-thermal-ticket" className="font-mono text-black">
                        <div style={{ textAlign: "center", marginBottom: "8px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
                            <div style={{ fontSize: "15px", fontWeight: "bold", letterSpacing: "1px" }}>JOHB CAFÉ & SALGADOS</div>
                            <div style={{ fontSize: "11px" }}>Balneário Arroio do Silva - SC</div>
                            <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "3px" }}>*** CUPOM NÃO FISCAL ***</div>
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "8px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold" }}>
                                <span>PEDIDO #{selectedPrintOrder.order_number}</span>
                                <span>{selectedPrintOrder.delivery_type === "entrega" ? "ENTREGA" : "RETIRADA"}</span>
                            </div>
                            <div>Data: {new Date(selectedPrintOrder.created_at || new Date()).toLocaleString("pt-BR")}</div>
                            {(selectedPrintOrder.scheduled_date || selectedPrintOrder.scheduled_time) && (
                                <div style={{ fontWeight: "bold", marginTop: "3px" }}>
                                    AGENDADO: {selectedPrintOrder.scheduled_date ? new Date(selectedPrintOrder.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : ""} {selectedPrintOrder.scheduled_time ? `às ${selectedPrintOrder.scheduled_time}h` : ""}
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "8px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
                            <div><strong>CLIENTE:</strong> {selectedPrintOrder.customer_name}</div>
                            <div><strong>TELEFONE:</strong> {selectedPrintOrder.customer_phone}</div>
                            {selectedPrintOrder.delivery_type === "entrega" && selectedPrintOrder.address && (
                                <div><strong>ENDEREÇO:</strong> {selectedPrintOrder.address}{selectedPrintOrder.neighborhood ? ` - ${selectedPrintOrder.neighborhood}` : ""}</div>
                            )}
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "8px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px solid #ddd", paddingBottom: "3px", marginBottom: "4px" }}>
                                <span>QTD  ITEM</span>
                                <span>VALOR</span>
                            </div>
                            {(Array.isArray(selectedPrintOrder.items) ? selectedPrintOrder.items : []).map((it, idx) => (
                                <div key={idx} style={{ marginBottom: "4px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span><strong>{it.quantity}x</strong> {it.name || it.product_name}</span>
                                        <strong>R$ {((it.price || 0) * it.quantity).toFixed(2).replace('.', ',')}</strong>
                                    </div>
                                    {Array.isArray(it.complements) && it.complements.length > 0 && (
                                        <div style={{ paddingLeft: "12px", fontSize: "10px", color: "#444" }}>
                                            {it.complements.map((c, cIdx) => (
                                                <div key={cIdx}>+ {c.name || c} {c.price ? `(R$ ${Number(c.price).toFixed(2).replace('.', ',')})` : ''}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "8px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Subtotal:</span>
                                <span>R$ {Number(selectedPrintOrder.subtotal || selectedPrintOrder.total).toFixed(2).replace('.', ',')}</span>
                            </div>
                            {Number(selectedPrintOrder.delivery_fee) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Taxa Entrega:</span>
                                    <span>R$ {Number(selectedPrintOrder.delivery_fee).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            {Number(selectedPrintOrder.discount_amount) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Desconto:</span>
                                    <span>- R$ {Number(selectedPrintOrder.discount_amount).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", borderTop: "1px solid #000", paddingTop: "4px", marginTop: "3px" }}>
                                <span>TOTAL:</span>
                                <span>R$ {Number(selectedPrintOrder.total).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "8px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
                            <div>
                                <strong>PAGAMENTO:</strong> {
                                    selectedPrintOrder.payment_method === "asaas" ? "Online (Asaas)" :
                                    selectedPrintOrder.payment_method === "cartao_maquininha" ? "Cartão na Maquininha" :
                                    selectedPrintOrder.payment_method === "dinheiro" ? (
                                        selectedPrintOrder.change_for ? `Dinheiro (Troco p/ R$ ${Number(selectedPrintOrder.change_for).toFixed(2).replace('.', ',')})` : "Dinheiro (Sem Troco)"
                                    ) : (selectedPrintOrder.payment_method || "Não informado")
                                }
                            </div>
                            <div>
                                <strong>STATUS:</strong> {selectedPrintOrder.payment_status === "pago" ? "PAGO" : "PENDENTE"}
                            </div>
                            {selectedPrintOrder.observation && (
                                <div style={{ marginTop: "4px" }}>
                                    <strong>OBS:</strong> {selectedPrintOrder.observation}
                                </div>
                            )}
                        </div>

                        <div style={{ textAlign: "center", fontSize: "10px", marginTop: "6px" }}>
                            <div>Feito com carinho para você!</div>
                            <div style={{ fontWeight: "bold" }}>WhatsApp: (48) 99101-3293</div>
                        </div>
                    </div>
                </>
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
