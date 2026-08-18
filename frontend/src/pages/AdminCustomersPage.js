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
            const [res, ordersRes] = await Promise.all([
                axios.get(`${API}/admin/customers/${id}`, { headers }),
                axios.get(`${API}/admin/customers/${id}/orders`, { headers }).catch(() => ({ data: [] }))
            ]);
            
            const orders = Array.isArray(ordersRes.data) ? ordersRes.data.map(o => {
                let parsedItems = o.items;
                if (typeof parsedItems === "string") {
                    try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
                }
                return { ...o, items: parsedItems };
            }) : [];

            setSelectedCustomer({ ...res.data, orders }); 
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
        <div className="text-white space-y-6" data-testid="admin-customers-page">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Gestão de Clientes</h1>
                    <p className="text-xs text-gray-400 mt-1">Histórico de compras, notas internas e contatos dos clientes</p>
                </div>
                <Badge className="bg-[#141414] text-[#F4B544] border border-[#D4AF37]/30 rounded-xl px-4 py-1.5 text-xs font-extrabold">{customers.length} Clientes</Badge>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="pl-10 rounded-xl bg-[#1E1E1E] text-white border-white/10 focus:border-[#F4B544]" data-testid="customer-search" />
                </div>
                {["", "novo", "frequente", "vip"].map(t => (
                    <Button key={t} size="sm" onClick={() => setTagFilter(t)}
                        className={`rounded-xl text-xs font-extrabold transition-all ${
                            tagFilter === t 
                                ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black shadow-md shadow-[#F4B544]/20" 
                                : "bg-[#141414] text-gray-300 border border-white/10 hover:border-white/30"
                        }`} data-testid={`tag-filter-${t || "all"}`}>
                        {t ? t.toUpperCase() : "TODOS"}
                    </Button>
                ))}
            </div>

            {customers.length === 0 ? (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/10"><Users className="h-12 w-12 text-gray-500 mx-auto mb-4" /><p className="text-gray-400">Nenhum cliente encontrado</p></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {customers.map(c => (
                        <div key={c.id} className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 cursor-pointer hover:border-[#D4AF37]/40 transition-all shadow-lg hover:scale-[1.01]" onClick={() => viewCustomer(c.id)} data-testid={`customer-${c.id}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-extrabold text-white text-lg">{c.name}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1.5"><Phone className="h-3.5 w-3.5 text-[#F4B544]" />{c.phone}</p>
                                </div>
                                <div className="flex gap-1">
                                    {c.tags?.map(t => <Badge key={t} className="bg-[#F4B544]/20 text-[#F4B544] border border-[#F4B544]/30 text-[10px] rounded-lg uppercase font-black">{t}</Badge>)}
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-4 pt-3 border-t border-white/10">
                                <span className="font-semibold text-white">{c.orders_count || 0} pedidos</span>
                                {c.last_order_date && <span>Último: {new Date(c.last_order_date).toLocaleDateString("pt-BR")}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Customer Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-lg rounded-2xl bg-[#141414] text-white border border-[#D4AF37]/30 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" data-testid="customer-detail">
                    {selectedCustomer && (
                        <div className="flex flex-col">
                            <div className="p-6 bg-[#1E1E1E] text-white border-b border-white/10 rounded-t-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        {isEditing ? (
                                            <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="bg-[#10100F] border-white/20 text-white font-extrabold text-xl h-10" />
                                        ) : (
                                            <h2 className="text-2xl font-extrabold text-white">{selectedCustomer.name}</h2>
                                        )}
                                        <p className="text-gray-400 text-xs mt-1">ID: {selectedCustomer.id.slice(0, 8)}...</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)} className="rounded-xl hover:bg-white/10 text-gray-300">
                                            {isEditing ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)} className="rounded-xl hover:bg-white/10 text-gray-300">
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
                                        }} className={`cursor-pointer transition-all ${selectedCustomer.tags?.includes(t) ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black" : "bg-white/10 text-gray-400 hover:bg-white/20"} rounded-xl px-3 py-1 text-[10px] uppercase font-extrabold border-none`}>
                                            {t}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Telefone</label>
                                        {isEditing ? (
                                            <Input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="rounded-xl bg-[#1E1E1E] text-white border-white/10" />
                                        ) : (
                                            <p className="text-sm font-extrabold text-white flex items-center gap-2 mt-1"><Phone className="h-4 w-4 text-[#F4B544]" />{selectedCustomer.phone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total de Pedidos</label>
                                        <p className="text-sm font-extrabold text-white mt-1">{selectedCustomer.orders_count || 0} pedidos</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Endereço Principal</label>
                                    {isEditing ? (
                                        <textarea value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="w-full rounded-xl bg-[#1E1E1E] text-white border border-white/10 p-3 text-sm min-h-[80px]" />
                                    ) : (
                                        <p className="text-sm text-gray-300 flex items-start gap-2 leading-relaxed mt-1">
                                            <MapPin className="h-4 w-4 text-[#F4B544] mt-0.5 shrink-0" />
                                            {selectedCustomer.address || "Não informado"}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Notas Internas</label>
                                    <div className="relative mt-1">
                                        <textarea value={editData.internal_note} onChange={e => setEditData({ ...editData, internal_note: e.target.value })} placeholder="Observações sobre este cliente..." className="w-full rounded-2xl border border-white/10 bg-[#1E1E1E] text-white p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-[#F4B544]/20 transition-all outline-none" />
                                        <MessageSquare className="absolute right-4 bottom-4 h-4 w-4 text-gray-500" />
                                    </div>
                                </div>

                                {isEditing && (
                                    <Button onClick={handleSave} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold gap-2 shadow-lg shadow-[#F4B544]/20">
                                        <Save className="h-5 w-5" /> Salvar Alterações
                                    </Button>
                                )}

                                <Separator className="bg-white/10 my-6" />
                                
                                <div>
                                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">Últimos Pedidos</p>
                                    {selectedCustomer.orders?.length === 0 ? <p className="text-xs text-gray-500 bg-[#1E1E1E] p-4 rounded-xl text-center italic">Nenhum pedido realizado ainda.</p> : (
                                        <div className="space-y-3 max-h-60 overflow-auto pr-2 custom-scrollbar">
                                            {selectedCustomer.orders?.map(o => (
                                                <div key={o.id} className="bg-[#1E1E1E] border border-white/10 rounded-xl p-4 shadow-sm">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-extrabold text-white">#{o.order_number}</span>
                                                        <Badge className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border-none ${o.status === "entregue" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"}`}>{o.status.toUpperCase()}</Badge>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{o.items?.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}</p>
                                                    <div className="flex justify-between items-end border-t border-white/10 pt-2">
                                                        <span className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                                                        <span className="text-sm font-extrabold text-[#F4B544]">R$ {o.total?.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="p-4 bg-[#1E1E1E] rounded-b-2xl border-t border-white/10 sm:justify-start">
                                <Button variant="ghost" onClick={() => setConfirmDelete({ isOpen: true, customerId: selectedCustomer.id })} className="text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl font-extrabold gap-2">
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
