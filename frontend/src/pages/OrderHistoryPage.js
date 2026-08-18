import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { ArrowLeft, Search, Clock, RotateCcw, ShoppingBag, MapPin } from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const statusLabels = {
    aguardando: { label: "Aguardando", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    preparando: { label: "Na Cozinha", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    pronto: { label: "Pronto", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    saiu_entrega: { label: "A Caminho", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    entregue: { label: "Entregue", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    cancelado: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" }
};

export default function OrderHistoryPage() {
    const [phone, setPhone] = useState(() => localStorage.getItem("johb-phone") || "");
    const [orders, setOrders] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { addItem } = useCart();

    const searchOrders = async (targetPhone) => {
        const phoneToUse = targetPhone || phone;
        const cleanPhone = phoneToUse.replace(/\D/g, "");
        if (!cleanPhone) { 
            toast.error("Digite seu WhatsApp para localizar os pedidos"); 
            return; 
        }
        localStorage.setItem("johb-phone", cleanPhone);
        setLoading(true);
        try { 
            const res = await axios.get(`${API}/orders/phone/${encodeURIComponent(cleanPhone)}`); 
            setOrders(Array.isArray(res.data) ? res.data : []); 
            setSearched(true); 
        } catch { 
            toast.error("Erro ao buscar pedidos"); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem("johb-phone");
        if (saved && saved.replace(/\D/g, "").length >= 8) {
            searchOrders(saved);
        }
    }, []);

    const repeatOrder = (order) => {
        let itemsList = order.items;
        if (typeof itemsList === "string") {
            try { itemsList = JSON.parse(itemsList); } catch { itemsList = []; }
        }
        if (!Array.isArray(itemsList) || itemsList.length === 0) {
            toast.error("Itens deste pedido não estão mais disponíveis.");
            return;
        }

        itemsList.forEach(item => {
            addItem({
                id: item.product_id || item.id,
                name: item.product_name || item.name,
                price: item.price,
                image_url: item.image_url || ""
            }, item.quantity || 1, item.complements || [], "");
        });

        toast.success("Itens adicionados ao seu carrinho!");
        navigate("/checkout");
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FFFAF0] antialiased pb-16" data-testid="order-history-page">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#10100F]/95 backdrop-blur-md border-b border-[#F4B544]/20 py-4 px-4 sm:px-8">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#B8B1A3] hover:text-[#F4B544] transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Cardápio</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="JOHB" className="h-7 w-auto object-contain" />
                        <span className="font-serif font-bold text-base text-[#FFFAF0]">Meus Pedidos</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="text-center space-y-2 mb-6">
                    <span className="text-xs uppercase tracking-widest text-[#F4B544] font-semibold">
                        Acompanhamento & Histórico
                    </span>
                    <h1 className="font-serif text-3xl font-bold text-[#FFFAF0]">
                        Seus Pedidos no JOHB
                    </h1>
                </div>

                {/* Busca por Telefone */}
                <div className="p-5 rounded-2xl bg-[#10100F] border border-[#F4B544]/20 space-y-3 shadow-lg">
                    <label className="text-xs text-[#B8B1A3] block font-medium">
                        Informe seu WhatsApp cadastrado para carregar seu histórico:
                    </label>
                    <div className="flex gap-2">
                        <Input
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="(48) 99999-9999"
                            className="rounded-xl bg-[#050505] border-[#F4B544]/30 text-white text-xs focus:border-[#F4B544] h-11"
                            data-testid="history-phone-input"
                            onKeyDown={e => e.key === "Enter" && searchOrders()}
                        />
                        <Button
                            onClick={searchOrders}
                            disabled={loading}
                            className="bg-[#F4B544] text-[#050505] hover:bg-[#FFC85C] rounded-xl px-6 font-bold text-xs h-11 gold-glow"
                            data-testid="search-orders-btn"
                        >
                            {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Nenhum Pedido */}
                {searched && orders.length === 0 && (
                    <div className="text-center py-16 bg-[#10100F] rounded-2xl border border-[#F4B544]/15 p-6">
                        <Clock className="h-12 w-12 text-[#F4B544] mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-serif font-bold text-[#FFFAF0]">Nenhum pedido encontrado</p>
                        <p className="text-xs text-[#B8B1A3] mt-1">Verifique se o número de WhatsApp está correto ou faça seu primeiro pedido no cardápio!</p>
                        <Button
                            onClick={() => navigate("/")}
                            className="mt-6 rounded-full bg-[#F4B544] text-[#050505] font-bold text-xs px-6 hover:bg-[#FFC85C]"
                        >
                            Ver Cardápio
                        </Button>
                    </div>
                )}

                {/* Lista de Pedidos */}
                <div className="space-y-4">
                    {orders.map(order => {
                        const statusObj = statusLabels[order.status] || { label: order.status, color: "bg-white/10 text-white" };
                        let parsedItems = order.items;
                        if (typeof parsedItems === "string") {
                            try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
                        }

                        return (
                            <div key={order.id} className="bg-[#10100F] rounded-2xl border border-[#F4B544]/20 p-5 space-y-4 shadow-lg gold-glow-sm" data-testid={`order-${order.id}`}>
                                <div className="flex justify-between items-start border-b border-[#F4B544]/15 pb-3">
                                    <div>
                                        <span className="font-serif font-bold text-lg text-[#FFFAF0] block">
                                            Pedido #{order.order_number}
                                        </span>
                                        <span className="text-[11px] text-[#B8B1A3]">
                                            {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusObj.color}`}>
                                        {statusObj.label}
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    {Array.isArray(parsedItems) && parsedItems.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs text-[#FFFAF0]">
                                            <span>{item.quantity}x {item.product_name || item.name}</span>
                                            <span className="text-[#F4B544] font-semibold">
                                                R$ {((item.price || 0) * (item.quantity || 1)).toFixed(2).replace(".", ",")}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-[#F4B544]/15">
                                    <div>
                                        <span className="text-[10px] text-[#B8B1A3] uppercase block">Total</span>
                                        <span className="font-serif font-bold text-lg text-[#F4B544]">
                                            R$ {(order.total || 0).toFixed(2).replace(".", ",")}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {order.rating ? (
                                            <span className="text-xs text-[#F4B544] flex items-center gap-1 font-bold px-2 py-1 bg-[#F4B544]/10 rounded-full border border-[#F4B544]/20">
                                                <span>⭐</span>
                                                <span>{order.rating}/5</span>
                                            </span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigate(`/pedido/${order.id}`)}
                                                className="rounded-full text-xs border-[#F4B544]/40 text-[#F4B544] hover:bg-[#F4B544]/10"
                                            >
                                                ⭐ Avaliar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/pedido/${order.id}`)}
                                            className="rounded-full text-xs border-white/20 text-[#FFFAF0] hover:bg-white/10"
                                        >
                                            Acompanhar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => repeatOrder(order)}
                                            className="rounded-full text-xs bg-[#F4B544] text-[#050505] hover:bg-[#FFC85C] font-bold gap-1 gold-glow"
                                        >
                                            <RotateCcw className="h-3 w-3" /> Pedir Novamente
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
