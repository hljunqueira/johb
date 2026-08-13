import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, Users, Phone, MessageSquare, Trash2, Edit2, Save, X, MapPin } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

import { API } from "@/lib/constants";

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: "", phone: "", address: "", internal_note: "" });
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, customerId: null });
    
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
            setSelectedCustomer(res.data); 
            setEditData({
                name: res.data.name,
                phone: res.data.phone,
                address: res.data.address || "",
                internal_note: res.data.internal_note || ""
            });
            setIsEditing(false);
            setShowDetail(true);
        } catch { toast.error("Erro ao carregar cliente"); }
    };

    const handleSave = async () => {
        try {
            await axios.put(`${API}/admin/customers/${selectedCustomer.id}`, editData, { headers });
            toast.success("Cliente atualizado");
            setIsEditing(false);
            fetchCustomers();
            // Refresh detail view
            setSelectedCustomer(prev => ({ ...prev, ...editData }));
        } catch { toast.error("Erro ao salvar alterações"); }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${API}/admin/customers/${confirmDelete.customerId}`, { headers });
            toast.success("Cliente removido");
            setConfirmDelete({ isOpen: false, customerId: null });
            setShowDetail(false);
            fetchCustomers();
        } catch { toast.error("Erro ao remover cliente"); }
    };

    const updateTags = async (customerId, tags) => {
        try { await axios.put(`${API}/admin/customers/${customerId}`, { tags }, { headers }); fetchCustomers(); }
        catch { toast.error("Erro ao atualizar tags"); }
    };

    const tagColors = { novo: "bg-blue-100 text-blue-700", frequente: "bg-green-100 text-green-700", vip: "bg-amber-100 text-amber-700" };

    return (
        <div data-testid="admin-customers-page">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-heading">Clientes</h1>
                <Badge variant="outline" className="rounded-full px-3">{customers.length} Clientes</Badge>
            </div>

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
                        <div key={c.id} className="bg-white dark:bg-card rounded-2xl border border-border p-5 cursor-pointer hover:border-primary/30 transition-all shadow-sm hover:shadow-md" onClick={() => viewCustomer(c.id)} data-testid={`customer-${c.id}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold font-heading text-lg">{c.name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{c.phone}</p>
                                </div>
                                <div className="flex gap-1">
                                    {c.tags?.map(t => <Badge key={t} className={`${tagColors[t] || "bg-gray-100"} text-[10px] rounded-full uppercase font-bold tracking-tighter`}>{t}</Badge>)}
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-3 border-t">
                                <span>{c.orders_count || 0} pedidos</span>
                                {c.last_order_date && <span>Ultimo: {new Date(c.last_order_date).toLocaleDateString("pt-BR")}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Customer Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-lg rounded-[2rem] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl" data-testid="customer-detail">
                    {selectedCustomer && (
                        <div className="flex flex-col">
                            <div className="p-6 bg-slate-900 text-white rounded-t-[2rem]">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        {isEditing ? (
                                            <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="bg-white/10 border-white/20 text-white font-heading text-xl h-10" />
                                        ) : (
                                            <h2 className="text-2xl font-black font-heading">{selectedCustomer.name}</h2>
                                        )}
                                        <p className="text-white/60 text-xs mt-1">ID: {selectedCustomer.id.slice(0, 8)}...</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)} className="rounded-xl hover:bg-white/10 text-white">
                                            {isEditing ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)} className="rounded-xl hover:bg-white/10 text-white">
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {["novo", "frequente", "vip"].map(t => (
                                        <Badge key={t} onClick={() => {
                                            const tags = selectedCustomer.tags?.includes(t) ? selectedCustomer.tags.filter(x => x !== t) : [...(selectedCustomer.tags || []), t];
                                            updateTags(selectedCustomer.id, tags);
                                            setSelectedCustomer(s => ({ ...s, tags }));
                                        }} className={`cursor-pointer transition-all ${selectedCustomer.tags?.includes(t) ? "bg-primary text-white" : "bg-white/10 text-white/60 hover:bg-white/20"} rounded-full px-3 py-1 text-[10px] uppercase font-bold border-none`}>
                                            {t}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone</label>
                                        {isEditing ? (
                                            <Input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="rounded-xl" />
                                        ) : (
                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{selectedCustomer.phone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Pedidos</label>
                                        <p className="text-sm font-bold text-slate-700">{selectedCustomer.orders_count || 0} pedidos feitos</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço Principal</label>
                                    {isEditing ? (
                                        <textarea value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="w-full rounded-xl border border-input p-3 text-sm min-h-[80px]" />
                                    ) : (
                                        <p className="text-sm text-slate-600 flex items-start gap-2 leading-relaxed">
                                            <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                            {selectedCustomer.address || "Não informado"}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notas Internas</label>
                                    <div className="relative">
                                        <textarea value={editData.internal_note} onChange={e => setEditData({ ...editData, internal_note: e.target.value })} placeholder="Observações importantes sobre este cliente..." className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                        <MessageSquare className="absolute right-4 bottom-4 h-4 w-4 text-slate-300" />
                                    </div>
                                </div>

                                {isEditing && (
                                    <Button onClick={handleSave} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2">
                                        <Save className="h-5 w-5" /> Salvar Alterações
                                    </Button>
                                )}

                                <Separator className="my-6" />
                                
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Últimos Pedidos</p>
                                    {selectedCustomer.orders?.length === 0 ? <p className="text-xs text-muted-foreground bg-slate-50 p-4 rounded-xl text-center italic">Nenhum pedido realizado ainda.</p> : (
                                        <div className="space-y-3 max-h-60 overflow-auto pr-2 custom-scrollbar">
                                            {selectedCustomer.orders?.map(o => (
                                                <div key={o.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-black font-heading">#{o.order_number}</span>
                                                        <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border-none ${o.status === "entregue" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{o.status.toUpperCase()}</Badge>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">{o.items?.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}</p>
                                                    <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                                                        <span className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                                                        <span className="text-sm font-black text-primary">R$ {o.total?.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-50 rounded-b-[2rem] border-t border-slate-100 sm:justify-start">
                                <Button variant="ghost" onClick={() => setConfirmDelete({ isOpen: true, customerId: selectedCustomer.id })} className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold gap-2">
                                    <Trash2 className="h-4 w-4" /> Remover Cliente
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmModal 
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, customerId: null })}
                onConfirm={handleDelete}
                title="Remover Cliente"
                description="Esta ação é permanente e removerá todo o histórico de faturamento associado a este cliente. Deseja prosseguir?"
                confirmText="Sim, Remover"
                variant="destructive"
            />
        </div>
    );
}
