import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, Users, Phone, MessageSquare } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [editNote, setEditNote] = useState("");
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchCustomers = async () => {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (tagFilter) params.append("tag", tagFilter);
        try { const res = await axios.get(`${API}/admin/customers?${params}`, { headers }); setCustomers(res.data); }
        catch { toast.error("Erro ao carregar clientes"); }
    };
    useEffect(() => { fetchCustomers(); }, [search, tagFilter]); // eslint-disable-line

    const viewCustomer = async (id) => {
        try {
            const res = await axios.get(`${API}/admin/customers/${id}`, { headers });
            setSelectedCustomer(res.data); setEditNote(res.data.internal_note || ""); setShowDetail(true);
        } catch { toast.error("Erro ao carregar cliente"); }
    };

    const saveNote = async () => {
        try {
            await axios.put(`${API}/admin/customers/${selectedCustomer.id}`, { internal_note: editNote }, { headers });
            toast.success("Nota salva"); fetchCustomers();
        } catch { toast.error("Erro ao salvar"); }
    };

    const updateTags = async (customerId, tags) => {
        try { await axios.put(`${API}/admin/customers/${customerId}`, { tags }, { headers }); fetchCustomers(); }
        catch { toast.error("Erro ao atualizar tags"); }
    };

    const tagColors = { novo: "bg-blue-100 text-blue-700", frequente: "bg-green-100 text-green-700", vip: "bg-amber-100 text-amber-700" };

    return (
        <div data-testid="admin-customers-page">
            <h1 className="text-2xl font-bold font-heading mb-6">Clientes</h1>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="pl-10 rounded-full" data-testid="customer-search" />
                </div>
                {["", "novo", "frequente", "vip"].map(t => (
                    <Button key={t} size="sm" variant={tagFilter === t ? "default" : "outline"} onClick={() => setTagFilter(t)}
                        className={`rounded-full text-xs ${tagFilter === t ? "bg-primary text-white" : ""}`} data-testid={`tag-filter-${t || "all"}`}>
                        {t || "Todos"}
                    </Button>
                ))}
            </div>

            {customers.length === 0 ? (
                <div className="text-center py-16"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhum cliente encontrado</p></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {customers.map(c => (
                        <div key={c.id} className="bg-white dark:bg-card rounded-2xl border border-border p-5 cursor-pointer hover:border-primary/30 transition-all" onClick={() => viewCustomer(c.id)} data-testid={`customer-${c.id}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-semibold font-heading">{c.name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>
                                </div>
                                <div className="flex gap-1">
                                    {c.tags?.map(t => <Badge key={t} className={`${tagColors[t] || "bg-gray-100"} text-xs rounded-full`}>{t}</Badge>)}
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-3">
                                <span>{c.orders_count || 0} pedidos</span>
                                {c.last_order_date && <span>Ultimo: {new Date(c.last_order_date).toLocaleDateString("pt-BR")}</span>}
                            </div>
                            {c.internal_note && <div className="mt-2 bg-muted rounded-lg p-2"><p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" />{c.internal_note}</p></div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Customer Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" data-testid="customer-detail">
                    {selectedCustomer && (
                        <>
                            <DialogHeader><DialogTitle className="font-heading">{selectedCustomer.name}</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{selectedCustomer.phone}</span></div>
                                {selectedCustomer.address && <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>}

                                <div>
                                    <p className="text-sm font-medium mb-2">Tags</p>
                                    <div className="flex gap-2">
                                        {["novo", "frequente", "vip"].map(t => (
                                            <button key={t} onClick={() => {
                                                const tags = selectedCustomer.tags?.includes(t) ? selectedCustomer.tags.filter(x => x !== t) : [...(selectedCustomer.tags || []), t];
                                                updateTags(selectedCustomer.id, tags);
                                                setSelectedCustomer(s => ({ ...s, tags }));
                                            }} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedCustomer.tags?.includes(t) ? "bg-primary text-white" : "bg-muted text-foreground"}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-1">Nota interna</p>
                                    <textarea value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Ex: Prefere sem cebola" className="w-full rounded-lg border border-input p-3 text-sm bg-white" data-testid="customer-note" />
                                    <Button size="sm" onClick={saveNote} className="mt-2 rounded-full bg-primary text-white" data-testid="save-note-btn">Salvar nota</Button>
                                </div>

                                <Separator />
                                <div>
                                    <p className="text-sm font-medium mb-3">Historico de Pedidos</p>
                                    {selectedCustomer.orders?.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum pedido</p> : (
                                        <div className="space-y-2 max-h-60 overflow-auto">
                                            {selectedCustomer.orders?.map(o => (
                                                <div key={o.id} className="bg-muted rounded-lg p-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium">#{o.order_number}</span>
                                                        <Badge className={`text-xs rounded-full ${o.status === "entregue" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{o.status}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">{o.items?.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}</p>
                                                    <div className="flex justify-between mt-1"><span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span><span className="text-sm font-bold text-primary">R$ {o.total?.toFixed(2)}</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
