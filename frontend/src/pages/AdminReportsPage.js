import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BarChart3, TrendingUp, Clock, Download, DollarSign, ShoppingCart, Truck, Store } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const COLORS = ["#2A7D4B", "#F28F5E", "#386641", "#E53935", "#FFC107"];

export default function AdminReportsPage() {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchReport = async () => {
        setLoading(true);
        try { const res = await axios.get(`${API}/admin/reports/sales?date=${date}`, { headers }); setReport(res.data); }
        catch { toast.error("Erro ao carregar relatorio"); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchReport(); }, [date]); // eslint-disable-line

    const exportCSV = () => { window.open(`${API}/admin/reports/export?date=${date}`, "_blank"); };

    const hourlyData = report ? Object.entries(report.hourly_breakdown || {}).map(([h, v]) => ({ hour: h, pedidos: v })).sort((a, b) => a.hour.localeCompare(b.hour)) : [];
    const deliveryData = report ? [{ name: "Entrega", value: report.delivery_count }, { name: "Retirada", value: report.pickup_count }].filter(d => d.value > 0) : [];

    return (
        <div data-testid="admin-reports-page">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold font-heading">Relatorios</h1>
                <div className="flex items-center gap-3">
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg w-auto" data-testid="report-date" />
                    <Button variant="outline" onClick={exportCSV} className="rounded-full" data-testid="export-csv-btn"><Download className="h-4 w-4 mr-1" /> CSV</Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : !report ? (
                <div className="text-center py-16"><BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Sem dados para esta data</p></div>
            ) : (
                <div className="space-y-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard icon={DollarSign} label="Vendas do Dia" value={`R$ ${report.total_sales.toFixed(2)}`} color="text-primary" />
                        <MetricCard icon={ShoppingCart} label="Total Pedidos" value={report.total_orders} color="text-accent" />
                        <MetricCard icon={TrendingUp} label="Ticket Medio" value={`R$ ${report.avg_ticket.toFixed(2)}`} color="text-secondary" />
                        <MetricCard icon={Clock} label="Horario de Pico" value={report.peak_hour} color="text-foreground" />
                    </div>

                    {/* Charts */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Hourly */}
                        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                            <h3 className="font-semibold font-heading mb-4">Pedidos por Horario</h3>
                            {hourlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={hourlyData}>
                                        <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="pedidos" fill="#2A7D4B" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>}
                        </div>

                        {/* Delivery vs Pickup */}
                        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                            <h3 className="font-semibold font-heading mb-4">Tipo de Entrega</h3>
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
                                        <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><span className="text-sm">Entrega: {report.delivery_count}</span></div>
                                        <div className="flex items-center gap-2"><Store className="h-4 w-4 text-accent" /><span className="text-sm">Retirada: {report.pickup_count}</span></div>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>}
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h3 className="font-semibold font-heading mb-4">Produtos Mais Vendidos</h3>
                        {report.top_products?.length > 0 ? (
                            <div className="space-y-3">
                                {report.top_products.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                        <div className="flex-1"><div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(p.quantity / report.top_products[0].quantity) * 100}%` }} /></div></div>
                                        <span className="text-sm font-medium min-w-[120px]">{p.name}</span>
                                        <span className="text-sm text-muted-foreground">{p.quantity} un</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground text-center">Sem dados</p>}
                    </div>

                    {/* Highlights */}
                    <div className="bg-primary/5 rounded-2xl p-5">
                        <h3 className="font-semibold font-heading mb-3">Destaques do Dia</h3>
                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Pedidos pagos:</span> <span className="font-bold">{report.paid_orders} de {report.total_orders}</span></div>
                            <div><span className="text-muted-foreground">Mais vendido:</span> <span className="font-bold">{report.top_products?.[0]?.name || "N/A"}</span></div>
                            <div><span className="text-muted-foreground">Pico:</span> <span className="font-bold">{report.peak_hour}</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5" data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold font-heading ${color}`}>{value}</p>
        </div>
    );
}
