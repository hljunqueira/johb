import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart3, TrendingUp, Clock, Download, DollarSign, ShoppingCart, Truck, Store } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { API } from "@/lib/constants";
const COLORS = ["#F4B544", "#C88A24", "#E5A83B", "#386641", "#E53935"];

export default function AdminReportsPage() {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchReport = async () => {
        setLoading(true);
        try { const res = await axios.get(`${API}/admin/reports/sales?date=${date}`, { headers }); setReport(res.data); }
        catch { toast.error("Erro ao carregar relatório"); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchReport(); }, [date]); // eslint-disable-line

    const exportCSV = () => { window.open(`${API}/admin/reports/export?date=${date}`, "_blank"); };

    const hourlyData = report ? Object.entries(report.hourly_breakdown || {}).map(([h, v]) => ({ hour: h, pedidos: v })).sort((a, b) => a.hour.localeCompare(b.hour)) : [];
    const deliveryData = report ? [{ name: "Entrega", value: report.delivery_count }, { name: "Retirada", value: report.pickup_count }].filter(d => d.value > 0) : [];

    return (
        <div className="text-white space-y-6" data-testid="admin-reports-page">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Relatórios de Vendas</h1>
                    <p className="text-xs text-gray-400 mt-1">Acompanhe métricas, horários de pico e produtos mais vendidos</p>
                </div>
                <div className="flex items-center gap-3">
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl bg-[#1E1E1E] text-white border-white/10 w-auto focus:border-[#F4B544]" data-testid="report-date" />
                    <Button onClick={exportCSV} className="bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20 hover:scale-105 transition-all" data-testid="export-csv-btn"><Download className="h-4 w-4 mr-1" /> CSV</Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-[#F4B544] border-t-transparent rounded-full" /></div>
            ) : !report ? (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/10"><BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" /><p className="text-gray-400">Sem dados para esta data</p></div>
            ) : (
                <div className="space-y-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard icon={DollarSign} label="Vendas do Dia" value={`R$ ${(report.total_sales || 0).toFixed(2)}`} color="text-[#F4B544]" />
                        <MetricCard icon={ShoppingCart} label="Total Pedidos" value={report.total_orders || 0} color="text-emerald-400" />
                        <MetricCard icon={TrendingUp} label="Ticket Médio" value={`R$ ${(report.avg_ticket || 0).toFixed(2)}`} color="text-amber-300" />
                        <MetricCard icon={Clock} label="Horário de Pico" value={report.peak_hour || "N/A"} color="text-blue-400" />
                    </div>

                    {/* Charts */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Hourly */}
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
                            ) : <p className="text-sm text-gray-500 py-8 text-center">Sem dados</p>}
                        </div>

                        {/* Delivery vs Pickup */}
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
                            ) : <p className="text-sm text-gray-500 py-8 text-center">Sem dados</p>}
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 shadow-lg">
                        <h3 className="font-extrabold text-white text-lg mb-4">Produtos Mais Vendidos</h3>
                        {report.top_products?.length > 0 ? (
                            <div className="space-y-3">
                                {report.top_products.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#F4B544]/20 text-[#F4B544] text-xs font-extrabold flex items-center justify-center">{i + 1}</span>
                                        <div className="flex-1"><div className="h-2.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] rounded-full" style={{ width: `${(p.quantity / report.top_products[0].quantity) * 100}%` }} /></div></div>
                                        <span className="text-sm font-semibold text-white min-w-[120px]">{p.name}</span>
                                        <span className="text-sm text-gray-400">{p.quantity} un</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-gray-500 text-center">Sem dados</p>}
                    </div>

                    {/* Highlights */}
                    <div className="bg-[#141414] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-xl">
                        <h3 className="font-extrabold text-white text-lg mb-3">Destaques do Dia</h3>
                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div><span className="text-gray-400">Pedidos pagos:</span> <span className="font-extrabold text-white">{report.paid_orders || 0} de {report.total_orders || 0}</span></div>
                            <div><span className="text-gray-400">Mais vendido:</span> <span className="font-extrabold text-[#F4B544]">{report.top_products?.[0]?.name || "N/A"}</span></div>
                            <div><span className="text-gray-400">Pico:</span> <span className="font-extrabold text-white">{report.peak_hour || "N/A"}</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-[#141414] rounded-2xl border border-white/10 p-5 shadow-lg hover:border-[#D4AF37]/40 transition-all" data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
            <Icon className={`h-6 w-6 ${color} mb-2`} />
            <p className="text-xs font-semibold text-gray-400">{label}</p>
            <p className={`text-2xl font-black ${color} mt-1`}>{value}</p>
        </div>
    );
}
