import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
    Clock, Package, CheckCircle2, DollarSign, RefreshCw, 
    ThumbsUp, Timer, Truck, XCircle, CircleEllipsis,
    MoreVertical, ChevronRight, GripVertical, Volume2, VolumeX,
    Printer, ReceiptText, MapPin, Phone, Banknote, Calendar,
    Search, MessageCircle, ExternalLink, User, AlertCircle, X, Sparkles,
    Trash2
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

const getElapsedTime = (createdAt) => {
    if (!createdAt) return "";
    const created = new Date(createdAt);
    const now = new Date();
    const diffMin = Math.floor((now - created) / 60000);
    if (diffMin < 1) return "Agora";
    if (diffMin < 60) return `${diffMin}m`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}h${mins > 0 ? `${mins}m` : ''}`;
};

const OrderCard = ({ 
    order, 
    index, 
    markPaid, 
    updateStatus, 
    setConfirmModal, 
    setDeleteConfirm, 
    setSelectedPrintOrder,
    setSelectedDetailOrder 
}) => {
    const isToday = (() => {
        if (!order.scheduled_date) return false;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        return order.scheduled_date === todayStr;
    })();

    const itemsList = Array.isArray(order.items) ? order.items : [];
    const totalItemCount = itemsList.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const delayed = isDelayed(order);
    const elapsed = getElapsedTime(order.created_at);

    return (
        <Draggable key={order.id} draggableId={order.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-[#181714] rounded-2xl border p-3.5 shadow-md transition-all flex flex-col gap-2.5 cursor-grab active:cursor-grabbing select-none ${
                        snapshot.isDragging 
                            ? "shadow-2xl ring-2 ring-[#F4B544] border-[#F4B544] scale-105 rotate-1 z-50 opacity-95 bg-[#201E19]" 
                            : "border-white/10 hover:border-[#F4B544]/50 hover:bg-[#1C1A16]"
                    } ${delayed ? "border-red-500/50 bg-red-950/15" : ""}`}
                >
                    {/* Header Compacto: Drag, #Pedido, Tempo & Ações */}
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="text-[#F4B544]/70 group-hover:text-[#F4B544]">
                                <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-base font-black text-[#F4B544] leading-none tracking-tight">
                                #{order.order_number}
                            </span>
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-[#10100F] border border-white/10 text-gray-300">
                                {order.delivery_type === "entrega" ? "🛵 Entrega" : "🏪 Balcão"}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            {/* Indicador de Tempo Decorrido */}
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                delayed 
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" 
                                    : "bg-white/5 text-gray-400 border border-white/10"
                            }`}>
                                <Clock className="h-2.5 w-2.5" />
                                {elapsed}
                            </span>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Imprimir Comanda Térmica"
                                onClick={() => setSelectedPrintOrder(order)}
                                className="h-7 w-7 rounded-lg hover:bg-white/10 text-gray-400 hover:text-[#F4B544]"
                            >
                                <Printer className="h-3.5 w-3.5" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10 text-gray-400">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-2xl bg-[#1A1A1A] border-white/10 text-white">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1">Ações</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                        onClick={() => setSelectedDetailOrder(order)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#F4B544] focus:bg-[#F4B544]/20 cursor-pointer"
                                    >
                                        <Package className="h-3.5 w-3.5" /> Ver Detalhes Completos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => setSelectedPrintOrder(order)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white/10 cursor-pointer"
                                    >
                                        <Printer className="h-3.5 w-3.5" /> Imprimir Comanda
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        disabled={order.payment_status === "pago"}
                                        onClick={() => markPaid(order.id)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold focus:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                                    >
                                        <DollarSign className="h-3.5 w-3.5" /> Marcar como Pago
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator className="my-1 bg-white/10" />
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1">Mover Status</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => updateStatus(order.id, "aguardando")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-amber-400 focus:bg-amber-500/20 cursor-pointer">
                                        <CircleEllipsis className="h-3 w-3" /> Pendente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatus(order.id, "confirmado")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-purple-400 focus:bg-purple-500/20 cursor-pointer">
                                        <ThumbsUp className="h-3 w-3" /> Aceito
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatus(order.id, "preparando")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-orange-400 focus:bg-orange-500/20 cursor-pointer">
                                        <Timer className="h-3 w-3" /> Em Preparo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatus(order.id, "saiu_entrega")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-blue-400 focus:bg-blue-500/20 cursor-pointer">
                                        <Truck className="h-3 w-3" /> Saiu p/ Entrega
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatus(order.id, "entregue")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-emerald-400 focus:bg-emerald-500/20 cursor-pointer">
                                        <CheckCircle2 className="h-3 w-3" /> Concluído
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatus(order.id, "cancelado")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-red-400 focus:bg-red-500/20 cursor-pointer">
                                        <XCircle className="h-3 w-3" /> Cancelar
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1 bg-white/10" />
                                    <DropdownMenuItem 
                                        onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-red-300 focus:bg-red-500/30 cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Excluir Registro
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Cliente e Agendamento */}
                    <div 
                        onClick={() => setSelectedDetailOrder(order)}
                        className="cursor-pointer group"
                    >
                        <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-white text-xs truncate uppercase group-hover:text-[#F4B544] transition-colors">
                                {order.customer_name}
                            </span>
                            <span className="text-[10px] font-bold text-[#B8B1A3] shrink-0">
                                ({totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'})
                            </span>
                        </div>

                        {(order.scheduled_date || order.scheduled_time) && (
                            <div className={`mt-1.5 py-1 px-2 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 ${
                                isToday
                                    ? "bg-[#F4B544]/20 border-[#F4B544] text-[#F4B544]"
                                    : "bg-purple-500/20 border-purple-500/40 text-purple-300"
                            }`}>
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>
                                    {isToday ? "HOJE" : (order.scheduled_date ? new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : "")} 
                                    {order.scheduled_time ? ` às ${order.scheduled_time}h` : ""}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Lista Compacta de Itens (Máximo 2 com indicador +X) */}
                    <div 
                        onClick={() => setSelectedDetailOrder(order)}
                        className="space-y-1 bg-[#10100F] p-2 rounded-xl border border-white/5 cursor-pointer hover:border-white/15 transition-all text-xs"
                    >
                        {itemsList.slice(0, 2).map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] leading-tight text-gray-300 truncate">
                                <span className="truncate">
                                    <strong className="text-[#F4B544] mr-1">{item.quantity}x</strong> {item.name || item.product_name}
                                </span>
                            </div>
                        ))}

                        {itemsList.length > 2 && (
                            <span className="text-[10px] font-extrabold text-gray-400 block pt-0.5">
                                + {itemsList.length - 2} outros {itemsList.length - 2 === 1 ? 'item' : 'itens'}...
                            </span>
                        )}

                        {order.observation && (
                            <span className="text-[10px] text-amber-300/90 font-medium block truncate pt-0.5">
                                💬 "{order.observation}"
                            </span>
                        )}
                    </div>

                    {/* Rodapé: Total e Status de Pagamento */}
                    <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="font-black text-[#F4B544] text-base tracking-tight">
                            R$ {(order.total || 0).toFixed(2).replace('.', ',')}
                        </span>
                        <Badge className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border-none ${
                            order.payment_status === "pago" 
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}>
                            {order.payment_status === "pago" ? "PGTO PAGO" : "PGTO PENDENTE"}
                        </Badge>
                    </div>

                    {/* Botão de Avanço Rápido de 1 Toque */}
                    {order.status === "aguardando" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "confirmado")}
                            className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <ThumbsUp className="h-3.5 w-3.5" /> Aceitar Pedido
                        </button>
                    )}
                    {order.status === "confirmado" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "preparando")}
                            className="w-full py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Timer className="h-3.5 w-3.5" /> Iniciar Preparo
                        </button>
                    )}
                    {order.status === "preparando" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "saiu_entrega")}
                            className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Truck className="h-3.5 w-3.5" /> Despachar Pedido
                        </button>
                    )}
                    {order.status === "saiu_entrega" && (
                        <button
                            type="button"
                            onClick={() => updateStatus(order.id, "entregue")}
                            className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
    const [scheduleFilter, setScheduleFilter] = useState("today"); // 'today' (padrão: zera automaticamente a cada novo dia), 'all', 'future'
    const [orderSearch, setOrderSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
    const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, orderId: null });
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    // Mouse drag horizontal scroll para o Kanban Board
    const kanbanScrollRef = useRef(null);
    const [isBoardDragging, setIsBoardDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragScrollLeft, setDragScrollLeft] = useState(0);

    const handleBoardMouseDown = (e) => {
        // Ignora drag do board se o clique foi em um card draggable, botão, input ou dropdown
        if (
            e.target.closest('[data-rfd-draggable-id]') ||
            e.target.closest('button') ||
            e.target.closest('input') ||
            e.target.closest('select') ||
            e.target.closest('a')
        ) {
            return;
        }
        if (!kanbanScrollRef.current) return;
        setIsBoardDragging(true);
        setDragStartX(e.pageX - kanbanScrollRef.current.offsetLeft);
        setDragScrollLeft(kanbanScrollRef.current.scrollLeft);
    };

    const handleBoardMouseLeave = () => {
        setIsBoardDragging(false);
    };

    const handleBoardMouseUp = () => {
        setIsBoardDragging(false);
    };

    const handleBoardMouseMove = (e) => {
        if (!isBoardDragging || !kanbanScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - kanbanScrollRef.current.offsetLeft;
        const walk = (x - dragStartX) * 1.5;
        kanbanScrollRef.current.scrollLeft = dragScrollLeft - walk;
    };

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

    const updateStatus = (orderId, newStatus) => {
        // Atualização Otimista Imediata (0ms de resposta visual na tela)
        setColumns(prev => {
            let foundOrder = null;
            const next = {};
            for (const col of KANBAN_COLUMNS) {
                const list = prev[col] || [];
                const filtered = list.filter(o => {
                    if (o.id === orderId) {
                        foundOrder = { ...o, status: newStatus };
                        return false;
                    }
                    return true;
                });
                next[col] = filtered;
            }
            if (foundOrder) {
                next[newStatus] = [foundOrder, ...(next[newStatus] || [])];
            }
            return next;
        });

        toast.success(`Pedido movido para ${statusConfig[newStatus]?.label || newStatus}`);

        // Requisição assíncrona em background
        axios.put(`${API}/admin/orders/${orderId}/status`, { status: newStatus }, { headers })
            .catch(err => {
                console.error("Erro ao atualizar status:", err);
                toast.error("Erro ao sincronizar status com o servidor");
                fetchOrders();
            });
    };

    const markPaid = (orderId) => {
        // Atualização Otimista Imediata (0ms)
        setColumns(prev => {
            const next = {};
            for (const col of KANBAN_COLUMNS) {
                next[col] = (prev[col] || []).map(o => o.id === orderId ? { ...o, payment_status: "pago" } : o);
            }
            return next;
        });
        toast.success("Pagamento confirmado");

        axios.put(`${API}/admin/orders/${orderId}/payment`, {}, { headers })
            .catch(() => {
                toast.error("Erro ao salvar pagamento");
                fetchOrders();
            });
    };

    const handleDeleteOrder = (orderId) => {
        // Remoção Otimista Imediata (0ms)
        setColumns(prev => {
            const next = {};
            for (const col of KANBAN_COLUMNS) {
                next[col] = (prev[col] || []).filter(o => o.id !== orderId);
            }
            return next;
        });
        toast.success("Pedido excluído com sucesso");

        axios.delete(`${API}/admin/orders/${orderId}`, { headers })
            .catch(() => {
                toast.error("Erro ao excluir no servidor");
                fetchOrders();
            });
    };

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const orderId = draggableId;
        const newStatus = destination.droppableId;
        
        setColumns(prev => {
            const sourceOrders = Array.from(prev[source.droppableId] || []);
            const destOrders = source.droppableId === destination.droppableId 
                ? sourceOrders 
                : Array.from(prev[destination.droppableId] || []);
            
            const [movedOrder] = sourceOrders.splice(source.index, 1);
            if (movedOrder) {
                const updated = { ...movedOrder, status: newStatus };
                if (source.droppableId === destination.droppableId) {
                    sourceOrders.splice(destination.index, 0, updated);
                    return { ...prev, [source.droppableId]: sourceOrders };
                } else {
                    destOrders.splice(destination.index, 0, updated);
                    return {
                        ...prev,
                        [source.droppableId]: sourceOrders,
                        [destination.droppableId]: destOrders
                    };
                }
            }
            return prev;
        });

        if (source.droppableId !== destination.droppableId) {
            toast.success(`Pedido movido para ${statusConfig[newStatus]?.label || newStatus}`);
            axios.put(`${API}/admin/orders/${orderId}/status`, { status: newStatus }, { headers })
                .catch(() => {
                    toast.error("Erro ao sincronizar status");
                    fetchOrders();
                });
        }
    };

    // Filtro adicional por data: 'today' (pedidos de hoje + em andamento), 'all' (todos), 'future' (agendados futuros)
    const filterOrdersBySchedule = (ordersList) => {
        if (!Array.isArray(ordersList)) return [];
        if (scheduleFilter === "all") return ordersList;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        if (scheduleFilter === "today") {
            return ordersList.filter(o => {
                const orderDate = o.created_at ? o.created_at.slice(0, 10) : "";
                if (orderDate === todayStr) return true;
                if (o.scheduled_date === todayStr) return true;
                // Pedidos pendentes ou em produção não concluídos
                if (["aguardando", "confirmado", "preparando", "saiu_entrega"].includes(o.status)) return true;
                return false;
            });
        }
        if (scheduleFilter === "future") {
            return ordersList.filter(o => o.scheduled_date && o.scheduled_date > todayStr);
        }
        return ordersList;
    };

    // Contadores em tempo real para as abas operacionais
    const todayStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    const totalAll = useMemo(() => {
        let sum = 0;
        Object.values(columns).forEach(list => { sum += (list || []).length; });
        return sum;
    }, [columns]);

    const totalToday = useMemo(() => {
        let sum = 0;
        Object.values(columns).forEach(list => {
            (list || []).forEach(o => {
                const orderDate = o.created_at ? o.created_at.slice(0, 10) : "";
                if (orderDate === todayStr || o.scheduled_date === todayStr || ["aguardando", "confirmado", "preparando", "saiu_entrega"].includes(o.status)) {
                    sum++;
                }
            });
        });
        return sum;
    }, [columns, todayStr]);

    const totalFuture = useMemo(() => {
        let sum = 0;
        Object.values(columns).forEach(list => {
            (list || []).forEach(o => {
                if (o.scheduled_date && o.scheduled_date > todayStr) {
                    sum++;
                }
            });
        });
        return sum;
    }, [columns, todayStr]);

    return (
        <div data-testid="admin-orders-page" className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] text-white flex flex-col">
            {/* Header Estilo Premium JOHB */}
            <div className="pb-6 border-b border-[#D4AF37]/15">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Pedidos & Produção KDS</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">Painel operacional com separação automática de pedidos do dia e agendamentos futuros.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {/* Busca Operacional Instantânea */}
                        <div className="relative flex-1 sm:w-64 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <Input 
                                value={orderSearch}
                                onChange={e => setOrderSearch(e.target.value)}
                                placeholder="Buscar por #nº ou cliente..."
                                className="pl-9 h-10 rounded-xl bg-[#141414] border-white/10 text-xs text-white focus:border-[#F4B544]"
                            />
                            {orderSearch && (
                                <button 
                                    type="button" 
                                    onClick={() => setOrderSearch("")} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Seletor de Visão Operacional Inteligente */}
                        <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-2xl border border-[#F4B544]/20 text-xs shadow-inner">
                            <button
                                type="button"
                                onClick={() => setScheduleFilter("today")}
                                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    scheduleFilter === "today"
                                        ? "bg-[#F4B544] text-[#050505] shadow-md font-extrabold"
                                        : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                }`}
                            >
                                <span>🟢 Hoje</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                    scheduleFilter === "today" ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"
                                }`}>
                                    {totalToday}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScheduleFilter("future")}
                                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    scheduleFilter === "future"
                                        ? "bg-[#F4B544] text-[#050505] shadow-md font-extrabold"
                                        : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                }`}
                            >
                                <span>📅 Futuros</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                    scheduleFilter === "future" ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"
                                }`}>
                                    {totalFuture}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScheduleFilter("all")}
                                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    scheduleFilter === "all"
                                        ? "bg-[#F4B544] text-[#050505] shadow-md font-extrabold"
                                        : "text-[#B8B1A3] hover:text-[#FFFAF0]"
                                }`}
                            >
                                <span>📋 Todos</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                    scheduleFilter === "all" ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"
                                }`}>
                                    {totalAll}
                                </span>
                            </button>
                        </div>

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
                            <span>{soundEnabled ? "Som Ativo" : "Mudo"}</span>
                        </Button>

                        <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-xl h-10 w-10 p-0 bg-[#141414] hover:bg-white/10 border-white/10 text-[#F4B544]">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* Filtros de Status Kanban */}
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
                            Quadro Completo
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
                </div>
            </div>

            {/* Kanban / Grid Area com Scroll Horizontal e Vertical Otimizado */}
            <div className="flex-1 w-full overflow-hidden pt-4 flex flex-col">
                <DragDropContext onDragEnd={onDragEnd}>
                    {activeTab === "all" ? (
                        /* Kanban View Horizontal Scroll com suporte a Mouse Drag */
                        <div 
                            ref={kanbanScrollRef}
                            onMouseDown={handleBoardMouseDown}
                            onMouseLeave={handleBoardMouseLeave}
                            onMouseUp={handleBoardMouseUp}
                            onMouseMove={handleBoardMouseMove}
                            className={`flex-1 w-full overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar ${
                                isBoardDragging ? "cursor-grabbing select-none" : "cursor-default"
                            }`}
                        >
                            <div className="flex gap-5 h-full min-w-max pr-6">
                                {KANBAN_COLUMNS.map((colId) => {
                                    const config = statusConfig[colId] || { label: colId, icon: CircleEllipsis };
                                    const StatusIcon = config.icon || CircleEllipsis;
                                    let orders = filterOrdersBySchedule(columns[colId] || []);
                                    if (orderSearch.trim()) {
                                        const q = orderSearch.trim().toLowerCase();
                                        orders = orders.filter(o => 
                                            String(o.order_number).includes(q) ||
                                            (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
                                            (o.customer_phone && o.customer_phone.includes(q))
                                        );
                                    }
                                    
                                    return (
                                        <div key={colId} className="w-[330px] shrink-0 flex flex-col h-[calc(100vh-235px)] bg-[#141414] rounded-2xl border border-white/10 p-4 shadow-xl">
                                            <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
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
                                                        className={`flex-1 overflow-y-auto space-y-3.5 rounded-xl transition-all p-1.5 custom-scrollbar pr-1 min-h-[150px] ${
                                                            snapshot.isDraggingOver ? "bg-[#1E1E1E]/80 ring-2 ring-[#F4B544]/60" : ""
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
                                                                    setSelectedDetailOrder={setSelectedDetailOrder}
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
                        </div>
                    ) : (
                        /* Grid View for Filtered Status com Scroll Vertical */
                        <div className="flex-1 w-full overflow-y-auto custom-scrollbar pb-10">
                            <Droppable droppableId={activeTab}>
                                {(provided) => {
                                    let filteredList = filterOrdersBySchedule(columns[activeTab] || []);
                                    if (orderSearch.trim()) {
                                        const q = orderSearch.trim().toLowerCase();
                                        filteredList = filteredList.filter(o => 
                                            String(o.order_number).includes(q) ||
                                            (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
                                            (o.customer_phone && o.customer_phone.includes(q))
                                        );
                                    }
                                    return (
                                        <div 
                                            {...provided.droppableProps} 
                                            ref={provided.innerRef}
                                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2"
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
                                                        setSelectedDetailOrder={setSelectedDetailOrder}
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

            {/* Modal de Detalhes Completos do Pedido */}
            <Dialog open={Boolean(selectedDetailOrder)} onOpenChange={() => setSelectedDetailOrder(null)}>
                <DialogContent className="max-w-2xl bg-[#12110E] border border-[#F4B544]/30 text-white rounded-3xl p-0 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                    {selectedDetailOrder && (() => {
                        const ord = selectedDetailOrder;
                        const cleanPhone = (ord.customer_phone || "").replace(/\D/g, "");
                        const waNumber = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
                        const statusInfo = statusConfig[ord.status] || { label: ord.status, color: "text-gray-300" };
                        const items = Array.isArray(ord.items) ? ord.items : [];

                        const waMessage = encodeURIComponent(
                            `Olá *${ord.customer_name}*! Tudo bem? Acompanhe seu pedido *#${ord.order_number}* no JOHB Café & Salgados:\n\n` +
                            `*Status Atual:* ${statusInfo.label}\n` +
                            `*Total:* R$ ${(ord.total || 0).toFixed(2).replace('.', ',')}\n\n` +
                            `Qualquer dúvida estamos à disposição!`
                        );

                        return (
                            <div className="flex flex-col">
                                {/* Header do Modal */}
                                <div className="p-6 bg-[#181714] border-b border-white/10 rounded-t-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-2xl font-black text-[#F4B544] tracking-tight">
                                                Pedido #{ord.order_number}
                                            </span>
                                            <Badge className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase ${
                                                ord.status === "entregue" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                ord.status === "preparando" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                                                ord.status === "saiu_entrega" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                                                ord.status === "cancelado" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                                                "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                            }`}>
                                                {statusInfo.label}
                                            </Badge>
                                            <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-gray-300">
                                                {ord.delivery_type === "entrega" ? "🛵 Entrega" : "🏪 Balcão / Retirada"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                            <span>📅 Criado em {new Date(ord.created_at || new Date()).toLocaleString("pt-BR")}</span>
                                            <span>•</span>
                                            <span className="text-[#F4B544] font-bold">⏱️ Há {getElapsedTime(ord.created_at)}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => setSelectedPrintOrder(ord)}
                                            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl h-9 gap-1.5 cursor-pointer border border-white/15"
                                        >
                                            <Printer className="h-4 w-4 text-[#F4B544]" /> Imprimir
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Alerta de Agendamento */}
                                    {(ord.scheduled_date || ord.scheduled_time) && (
                                        <div className="p-3.5 rounded-2xl bg-[#F4B544]/15 border border-[#F4B544]/30 flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-[#F4B544] shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-[#F4B544] uppercase tracking-wide">Pedido com Entrega / Retirada Agendada</p>
                                                <p className="text-xs text-gray-200 mt-0.5">
                                                    Data: <strong>{ord.scheduled_date ? new Date(ord.scheduled_date + 'T00:00:00').toLocaleDateString("pt-BR") : "Hoje"}</strong>
                                                    {ord.scheduled_time && <span> às <strong>{ord.scheduled_time}h</strong></span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Dados do Cliente */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-[#181714] border border-white/10 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5 text-[#F4B544]" /> Cliente
                                                </span>
                                                {cleanPhone && (
                                                    <a
                                                        href={`https://wa.me/${waNumber}?text=${waMessage}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30"
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-base font-extrabold text-white">{ord.customer_name}</p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5 text-[#F4B544]" /> {ord.customer_phone || "Não informado"}
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-[#181714] border border-white/10 space-y-2">
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-[#F4B544]" /> Local de Entrega
                                            </span>
                                            {ord.delivery_type === "entrega" ? (
                                                <div className="text-xs text-gray-300 space-y-1">
                                                    <p className="font-bold text-white">{ord.address || "Endereço não informado"}</p>
                                                    {ord.neighborhood && <p className="text-gray-400">Bairro: <strong className="text-gray-200">{ord.neighborhood}</strong></p>}
                                                    {ord.complement && <p className="text-gray-400">Compl: <strong className="text-gray-200">{ord.complement}</strong></p>}
                                                    {ord.reference && <p className="text-gray-400">Ref: <strong className="text-gray-200">{ord.reference}</strong></p>}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-300">
                                                    <p className="font-bold text-amber-300">🏪 Retirada no Balcão da Loja</p>
                                                    <p className="text-gray-400 text-[11px] mt-0.5">O cliente irá buscar o pedido no balcão.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Itens do Pedido */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
                                                Itens do Pedido ({items.length})
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl bg-[#181714] border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                    <div className="space-y-1 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-[#F4B544]/20 text-[#F4B544] font-black text-xs px-2 py-0.5 rounded-lg border border-[#F4B544]/30">
                                                                {item.quantity}x
                                                            </span>
                                                            <span className="font-extrabold text-sm text-white">
                                                                {item.name || item.product_name}
                                                            </span>
                                                        </div>

                                                        {/* Complementos */}
                                                        {Array.isArray(item.complements) && item.complements.length > 0 && (
                                                            <div className="pl-8 text-xs text-gray-400 space-y-0.5">
                                                                {item.complements.map((c, cIdx) => (
                                                                    <p key={cIdx} className="text-[11px] text-[#B8B1A3]">
                                                                        + {c.name || c} {c.price ? `(R$ ${Number(c.price).toFixed(2).replace('.', ',')})` : ''}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {item.observation && (
                                                            <p className="pl-8 text-[11px] text-amber-300 italic">
                                                                Obs: "{item.observation}"
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="text-right sm:self-center self-end">
                                                        <span className="text-sm font-black text-white">
                                                            R$ {((item.price || 0) * (item.quantity || 1)).toFixed(2).replace('.', ',')}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 block">
                                                            (R$ {(item.price || 0).toFixed(2).replace('.', ',')} un.)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observação Geral */}
                                    {ord.observation && (
                                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5" /> Observação do Pedido
                                            </span>
                                            <p className="text-xs text-amber-200 font-medium">
                                                "{ord.observation}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Resumo Financeiro e Pagamento */}
                                    <div className="p-4 rounded-2xl bg-[#181714] border border-white/10 space-y-3">
                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                            <span>Subtotal dos Itens:</span>
                                            <span className="text-white font-bold">R$ {Number(ord.subtotal || ord.total).toFixed(2).replace('.', ',')}</span>
                                        </div>

                                        {Number(ord.delivery_fee) > 0 && (
                                            <div className="flex justify-between items-center text-xs text-gray-400">
                                                <span>Taxa de Entrega:</span>
                                                <span className="text-white font-bold">R$ {Number(ord.delivery_fee).toFixed(2).replace('.', ',')}</span>
                                            </div>
                                        )}

                                        {Number(ord.discount_amount) > 0 && (
                                            <div className="flex justify-between items-center text-xs text-emerald-400">
                                                <span>Desconto Aplicado {ord.coupon_code ? `(${ord.coupon_code})` : ''}:</span>
                                                <span className="font-bold">- R$ {Number(ord.discount_amount).toFixed(2).replace('.', ',')}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-2 border-t border-white/10 text-base font-black">
                                            <span className="text-white">Total do Pedido:</span>
                                            <span className="text-[#F4B544] text-xl">R$ {Number(ord.total).toFixed(2).replace('.', ',')}</span>
                                        </div>

                                        <div className="pt-2 border-t border-white/10 flex flex-wrap justify-between items-center gap-2 text-xs">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Forma de Pagamento</span>
                                                <span className="font-extrabold text-white">
                                                    {ord.payment_method === "asaas" ? "💳 Pix / Cartão Online (Asaas)" :
                                                     ord.payment_method === "cartao_maquininha" ? "💳 Cartão na Maquininha" :
                                                     ord.payment_method === "dinheiro" ? (
                                                         ord.change_for ? `💵 Dinheiro (Troco p/ R$ ${Number(ord.change_for).toFixed(2).replace('.', ',')})` : "💵 Dinheiro (Valor Exato)"
                                                     ) : (ord.payment_method || "Não informado")}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                                                    ord.payment_status === "pago" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                }`}>
                                                    {ord.payment_status === "pago" ? "PAGO" : "PENDENTE"}
                                                </Badge>

                                                {ord.payment_status !== "pago" && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            markPaid(ord.id);
                                                            setSelectedDetailOrder(prev => ({ ...prev, payment_status: "pago" }));
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl h-8 gap-1 shadow-md cursor-pointer"
                                                    >
                                                        <DollarSign className="h-3.5 w-3.5" /> Marcar Pago
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de Ações Rápidas no Rodapé */}
                                <div className="p-4 bg-[#181714] border-t border-white/10 rounded-b-3xl flex flex-wrap justify-between items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 font-bold">Mudar Status:</span>
                                        <select
                                            value={ord.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value;
                                                updateStatus(ord.id, newStatus);
                                                setSelectedDetailOrder(prev => ({ ...prev, status: newStatus }));
                                            }}
                                            className="bg-[#10100F] text-white border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-[#F4B544] outline-none cursor-pointer"
                                        >
                                            <option value="aguardando">⏳ Pendente</option>
                                            <option value="confirmado">👍 Aceito</option>
                                            <option value="preparando">⏱️ Em Preparo</option>
                                            <option value="saiu_entrega">🛵 Saiu p/ Entrega</option>
                                            <option value="entregue">✅ Concluído</option>
                                            <option value="cancelado">❌ Cancelado</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {ord.status === "aguardando" && (
                                            <Button
                                                onClick={() => {
                                                    updateStatus(ord.id, "confirmado");
                                                    setSelectedDetailOrder(prev => ({ ...prev, status: "confirmado" }));
                                                }}
                                                className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl h-9 px-4 gap-1.5 cursor-pointer shadow-md"
                                            >
                                                <ThumbsUp className="h-3.5 w-3.5" /> Aceitar Pedido
                                            </Button>
                                        )}
                                        {ord.status === "confirmado" && (
                                            <Button
                                                onClick={() => {
                                                    updateStatus(ord.id, "preparando");
                                                    setSelectedDetailOrder(prev => ({ ...prev, status: "preparando" }));
                                                }}
                                                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl h-9 px-4 gap-1.5 cursor-pointer shadow-md"
                                            >
                                                <Timer className="h-3.5 w-3.5" /> Iniciar Preparo
                                            </Button>
                                        )}
                                        {ord.status === "preparando" && (
                                            <Button
                                                onClick={() => {
                                                    updateStatus(ord.id, "saiu_entrega");
                                                    setSelectedDetailOrder(prev => ({ ...prev, status: "saiu_entrega" }));
                                                }}
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl h-9 px-4 gap-1.5 cursor-pointer shadow-md"
                                            >
                                                <Truck className="h-3.5 w-3.5" /> Despachar Pedido
                                            </Button>
                                        )}
                                        {ord.status === "saiu_entrega" && (
                                            <Button
                                                onClick={() => {
                                                    updateStatus(ord.id, "entregue");
                                                    setSelectedDetailOrder(prev => ({ ...prev, status: "entregue" }));
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl h-9 px-4 gap-1.5 cursor-pointer shadow-md"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Concluir Pedido
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

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
