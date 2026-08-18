import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
    BarChart3, TrendingUp, Clock, Download, DollarSign, 
    ShoppingCart, Truck, Store, Banknote, CreditCard, QrCode, Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { API } from "@/lib/constants";
const COLORS = ["#F4B544", "#C88A24", "#E5A83B", "#386641", "#E53935"];

export default function AdminReportsPage() {
    const [period, setPeriod] = useState("today"); // 'today', '7days', '30days', 'custom'
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchReport = async () => {
        setLoading(true);
        try {
            let url = `${API}/admin/reports/sales?`;
            if (period === "custom") {
                url += `date=${date}`;
            } else {
                url += `period=${period}`;
            }
            const res = await axios.get(url, { headers });
            setReport(res.data);
        } catch {
            toast.error("Erro ao carregar relatório");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [period, date]); // eslint-disable-line

    const exportCSV = () => {
        const exportUrl = period === "custom" 
            ? `${API}/admin/reports/export?date=${date}`
            : `${API}/admin/reports/export?period=${period}`;
        window.open(exportUrl, "_blank");
    };

    const hourlyData = report ? Object.entries(report.hourly_breakdown || {}).map(([h, v]) => ({ hour: h, pedidos: v })).sort((a, b) => a.hour.localeCompare(b.hour)) : [];
    const deliveryData = report ? [{ name: "Entrega", value: report.delivery_count }, { name: "Retirada", value: report.pickup_count }].filter(d => d.value > 0) : [];

    return (
        <div className="text-white space-y-6" data-testid="admin-reports-page">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Relatórios de Vendas & Caixa</h1>
                    <p className="text-xs text-gray-400 mt-1">Métricas financeiras, fechamento de caixa e itens mais vendidos</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filtros de Período */}
                    <div className="flex items-center gap-1.5 bg-[#141414] p-1.5 rounded-xl border border-white/10">
                        <Button
                            size="sm"
                            onClick={() => setPeriod("today")}
                            className={`rounded-lg text-xs font-bold ${
                                period === "today"
                                    ? "bg-[#F4B544] text-black shadow-md shadow-[#F4B544]/20"
                                    : "bg-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            Hoje
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setPeriod("7days")}
                            className={`rounded-lg text-xs font-bold ${
                                period === "7days"
                                    ? "bg-[#F4B544] text-black shadow-md shadow-[#F4B544]/20"
                                    : "bg-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            7 Dias
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setPeriod("30days")}
                            className={`rounded-lg text-xs font-bold ${
                                period === "30days"
                                    ? "bg-[#F4B544] text-black shadow-md shadow-[#F4B544]/20"
                                    : "bg-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            30 Dias
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={date}
                            onChange={e => {
                                setDate(e.target.value);
                                setPeriod("custom");
                            }}
                            className="rounded-xl bg-[#1E1E1E] text-white border-white/10 w-auto focus:border-[#F4B544] text-xs h-9"
                            data-testid="report-date"
                        />
                        <Button
                            onClick={exportCSV}
                            className="bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20 hover:scale-105 transition-all text-xs h-9"
                            data-testid="export-csv-btn"
                        >
                            <Download className="h-4 w-4 mr-1" /> CSV
                        </Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin h-8 w-8 border-4 border-[#F4B544] border-t-transparent rounded-full" />
                </div>
            ) : !report ? (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/10">
                    <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Sem dados para este período</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Cards de Métricas Principais */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard icon={DollarSign} label="Faturamento Total" value={`R$ ${(report.total_sales || 0).toFixed(2)}`} color="text-[#F4B544]" />
                        <MetricCard icon={ShoppingCart} label="Total de Pedidos" value={report.total_orders || 0} color="text-emerald-400" />
                        <MetricCard icon={TrendingUp} label="Ticket Médio" value={`R$ ${(report.avg_ticket || 0).toFixed(2)}`} color="text-amber-300" />
                        <MetricCard icon={Clock} label="Horário de Pico" value={report.peak_hour || "N/A"} color="text-blue-400" />
                    </div>

                    {/* Card de Fechamento de Caixa Diário / Período */}
                    <div className="bg-[#141414] border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-[#F4B544]" />
                                <span>Fechamento de Caixa ({period === "today" ? "Hoje" : (period === "7days" ? "Últimos 7 Dias" : (period === "30days" ? "Últimos 30 Dias" : date))})</span>
                            </h3>
                            <span className="text-xs font-extrabold text-[#F4B544] bg-[#F4B544]/10 px-3 py-1 rounded-full border border-[#F4B544]/30">
                                Conferência Financeira
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-[#1E1E1E] border border-white/10 space-y-1">
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                                    <Banknote className="w-4 h-4 text-emerald-400" />
                                    <span>Dinheiro (Gaveta Física)</span>
                                </div>
                                <p className="text-xl font-black text-emerald-400">
                                    R$ {(report.cash_total || 0).toFixed(2).replace(".", ",")}
                                </p>
                                <span className="text-[10px] text-gray-500">Valor para conferir em espécie</span>
                            </div>

                            <div className="p-4 rounded-xl bg-[#1E1E1E] border border-white/10 space-y-1">
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                                    <CreditCard className="w-4 h-4 text-blue-400" />
                                    <span>Maquininha (Entrega/Balcão)</span>
                                </div>
                                <p className="text-xl font-black text-blue-400">
                                    R$ {(report.card_machine_total || 0).toFixed(2).replace(".", ",")}
                                </p>
                                <span className="text-[10px] text-gray-500">Valor para bater com as filipetas</span>
                            </div>

                            <div className="p-4 rounded-xl bg-[#1E1E1E] border border-white/10 space-y-1">
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                                    <QrCode className="w-4 h-4 text-[#F4B544]" />
                                    <span>Online (Asaas PIX/Cartão)</span>
                                </div>
                                <p className="text-xl font-black text-[#F4B544]">
                                    R$ {(report.online_total || 0).toFixed(2).replace(".", ",")}
                                </p>
                                <span className="text-[10px] text-gray-500">Liquidado na conta Asaas</span>
                            </div>
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Horários */}
                        <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 shadow-lg">
                            <h3 className="font-extrabold text-white text-lg mb-4">Pedidos por Horário</h3>
                            {hourlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={hourlyData}>
                                        <XAxis dataKey="hour" tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                                        <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#F4B544', color: '#FFF', borderRadius: '12px' }} />
                                        <Bar dataKey="pedidos" fill="#F4B544" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-sm text-gray-500 py-8 text-center">Sem dados de horários</p>}
                        </div>

                        {/* Entrega vs Retirada */}
                        <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 shadow-lg">
                            <h3 className="font-extrabold text-white text-lg mb-4">Tipo de Entrega</h3>
                            {deliveryData.length > 0 ? (
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width="50%" height={180}>
                                        <PieChart>
                                            <Pie data={deliveryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                                {deliveryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-gray-300"><Truck className="h-4 w-4 text-[#F4B544]" /><span className="text-sm">Entrega: {report.delivery_count || 0}</span></div>
                                        <div className="flex items-center gap-2 text-gray-300"><Store className="h-4 w-4 text-emerald-400" /><span className="text-sm">Retirada: {report.pickup_count || 0}</span></div>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-gray-500 py-8 text-center">Sem dados de entrega</p>}
                        </div>
                    </div>

                    {/* Produtos Mais Vendidos */}
                    <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 shadow-lg">
                        <h3 className="font-extrabold text-white text-lg mb-4">Produtos Mais Vendidos</h3>
                        {report.top_products?.length > 0 ? (
                            <div className="space-y-3">
                                {report.top_products.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#F4B544]/20 text-[#F4B544] text-xs font-extrabold flex items-center justify-center">{i + 1}</span>
                                        <div className="flex-1"><div className="h-2.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] rounded-full" style={{ width: `${(p.quantity / report.top_products[0].quantity) * 100}%` }} /></div></div>
                                        <span className="text-sm font-semibold text-white min-w-[140px]">{p.name}</span>
                                        <span className="text-sm text-gray-400">{p.quantity} un</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-gray-500 text-center">Sem dados de produtos</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 flex items-center gap-4 shadow-lg">
            <div className={`p-3 rounded-xl bg-white/5 ${color}`}><Icon className="h-6 w-6" /></div>
            <div>
                <p className="text-xs text-gray-400 font-semibold">{label}</p>
                <p className={`text-xl font-extrabold ${color} mt-0.5`}>{value}</p>
            </div>
        </div>
    );
}
