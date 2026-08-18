import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Upload, Package, Layers, Tag, Grid3X3, X, Image, Gift, Search } from "lucide-react";
import { useMenus } from "@/hooks/useCardapioData";
import { ConfirmModal } from "@/components/ConfirmModal";

import { API, API_URL as BACKEND_URL, TAG_CONFIG } from "@/lib/constants";
const getImageUrl = (url) => { if (!url) return ""; if (url.startsWith("http")) return url; return `${BACKEND_URL}${url}`; };

export default function AdminCardapioPage() {
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };
    
    // Tab atual
    const [activeTab, setActiveTab] = useState("menus"); // menus, categories, products, optionals, banners, combos
    
    // Modal de confirmação global para a página
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", description: "", onConfirm: () => {}, variant: "destructive" });
    
    return (
        <div data-testid="admin-cardapio-page">
            {/* Header com Tabs de Navegação */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold font-heading mb-4">Gerenciar Cardapio</h1>
                
                {/* Tabs de navegação - sempre acessíveis */}
                <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
                    {/* Tab Menus */}
                    <button 
                        onClick={() => setActiveTab("menus")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "menus" 
                                ? "bg-primary text-white border-primary" 
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Menus
                    </button>
                    
                    {/* Tab Categorias */}
                    <button 
                        onClick={() => setActiveTab("categories")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "categories" 
                                ? "bg-primary text-white border-primary" 
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Grid3X3 className="h-4 w-4" />
                        Categorias
                    </button>
                    
                    {/* Tab Produtos */}
                    <button 
                        onClick={() => setActiveTab("products")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "products" 
                                ? "bg-primary text-white border-primary" 
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Package className="h-4 w-4" />
                        Produtos
                    </button>
                    
                    {/* Tab Opcionais */}
                    <button 
                        onClick={() => setActiveTab("optionals")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "optionals" 
                                ? "bg-primary text-white border-primary" 
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Tag className="h-4 w-4" />
                        Opcionais
                    </button>
                    
                    {/* Tab Banners */}
                    <button 
                        onClick={() => setActiveTab("banners")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "banners" 
                                ? "bg-primary text-white border-primary" 
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Image className="h-4 w-4" />
                        Banners
                    </button>
                    
                    {/* Tab Combos */}
                    <button 
                        onClick={() => setActiveTab("combos")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "combos" 
                                ? "bg-primary text-white border-primary" 
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Gift className="h-4 w-4" />
                        Combos
                    </button>
                </div>
            </div>
 
            {/* Conteúdo baseado na tab atual */}
            {activeTab === "menus" && (
                <MenusTabRefactored headers={headers} setConfirmModal={setConfirmModal} />
            )}
            
            {activeTab === "categories" && (
                <CategoriesTab headers={headers} setConfirmModal={setConfirmModal} />
            )}
            
            {activeTab === "products" && (
                <ProductsTab headers={headers} setConfirmModal={setConfirmModal} />
            )}
            
            {activeTab === "optionals" && (
                <OptionalsTab headers={headers} setConfirmModal={setConfirmModal} />
            )}
            
            {activeTab === "banners" && (
                <BannersTab headers={headers} setConfirmModal={setConfirmModal} />
            )}
            
            {activeTab === "combos" && (
                <CombosTab headers={headers} setConfirmModal={setConfirmModal} />
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmText="Confirmar"
                variant={confirmModal.variant}
            />
        </div>
    );
}

/* ==================== MENUS TAB (REFATORADO) ==================== */
function MenusTabRefactored({ headers, setConfirmModal }) {
    const { items: menus, create, update, remove } = useMenus(headers);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", active: true });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await update(editing, form);
            } else {
                await create(form);
            }
            setShowForm(false);
            setEditing(null);
            setForm({ name: "", description: "", active: true });
        } catch {
            // Error handled by hook
        }
    };

    const handleEdit = (menu) => {
        setEditing(menu.id);
        setForm({
            name: menu.name,
            description: menu.description || "",
            active: menu.active,
        });
        setShowForm(true);
    };

    const handleNew = () => {
        setEditing(null);
        setForm({ name: "", description: "", active: true });
        setShowForm(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-sm font-semibold text-gray-300">Crie menus para organizar seu cardápio.</p>
                    <p className="text-xs text-gray-500 mt-1">Os menus agrupam categorias no cardápio público.</p>
                </div>
                <Button onClick={handleNew} className="bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20 hover:scale-105 transition-all" data-testid="add-menu-btn"><Plus className="h-4 w-4 mr-1" />Novo Menu</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {menus.map(m => (
                    <div key={m.id} className="bg-[#141414] text-white rounded-2xl border border-white/10 p-5 shadow-lg flex flex-col justify-between hover:border-[#D4AF37]/40 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-extrabold text-white text-lg">{m.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">{m.description}</p>
                            </div>
                            <div className="flex gap-1.5">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg" onClick={() => setConfirmModal({
                                    isOpen: true,
                                    title: "Excluir Menu",
                                    description: `Deseja realmente excluir o menu "${m.name}"?`,
                                    onConfirm: () => remove(m.id)
                                })}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                            <Badge className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${m.active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-500/20 text-gray-400 border border-gray-500/30"}`}>{m.active ? "Ativo" : "Inativo"}</Badge>
                        </div>
                    </div>
                ))}
            </div>
            {menus.length === 0 && <div className="text-center py-12 bg-[#141414] border border-dashed border-white/10 rounded-2xl"><Layers className="h-10 w-10 text-gray-500 mx-auto mb-3" /><p className="text-gray-300 font-bold">Nenhum menu criado</p></div>}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl bg-[#141414] text-white border border-[#D4AF37]/30">
                    <DialogHeader><DialogTitle className="font-extrabold text-white text-lg">{editing ? "Editar Menu" : "Novo Menu"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><Label className="text-gray-300">Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-xl bg-[#1E1E1E] text-white border-white/10 focus:border-[#F4B544]" required data-testid="menu-name" /></div>
                        <div><Label className="text-gray-300">Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-xl bg-[#1E1E1E] text-white border-white/10 focus:border-[#F4B544]" data-testid="menu-desc" /></div>
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm font-semibold text-gray-300">Ativo</span></div>
                        <Button type="submit" className="w-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20" data-testid="save-menu-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== CATEGORIES TAB ==================== */
function CategoriesTab({ headers, setConfirmModal }) {
    const [categories, setCategories] = useState([]);
    const [menus, setMenus] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", icon: "", menu_id: "", active: true });

    const fetchCategories = async () => { 
        const r = await axios.get(`${API}/admin/categories`, { headers }); 
        setCategories(r.data); 
    };
    
    const fetchMenus = async () => {
        const r = await axios.get(`${API}/admin/menus`, { headers });
        setMenus(r.data);
    };
    
    useEffect(() => { 
        fetchCategories(); 
        fetchMenus();
    }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) await axios.put(`${API}/admin/categories/${editing}`, form, { headers });
            else await axios.post(`${API}/admin/categories`, form, { headers });
            toast.success(editing ? "Categoria atualizada" : "Categoria criada"); 
            setShowForm(false); 
            setEditing(null); 
            fetchCategories();
        } catch { 
            toast.error("Erro ao salvar"); 
        }
    };

    const del = async (id, name) => { 
        setConfirmModal({
            isOpen: true,
            title: "Excluir Categoria",
            description: `Deseja realmente excluir a categoria "${name}"?`,
            onConfirm: async () => {
                await axios.delete(`${API}/admin/categories/${id}`, { headers }); 
                toast.success("Excluida"); 
                fetchCategories(); 
            }
        });
    };
    
    const edit = (c) => { 
        setEditing(c.id); 
        setForm({ name: c.name, description: c.description || "", icon: c.icon || "", menu_id: c.menu_id || "", active: c.active }); 
        setShowForm(true); 
    };
    
    const toggleActive = async (c) => { 
        await axios.put(`${API}/admin/categories/${c.id}`, { active: !c.active }, { headers }); 
        fetchCategories(); 
    };
    
    const getMenuName = (menuId) => {
        const menu = menus.find(m => m.id === menuId);
        return menu ? menu.name : "Sem menu";
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-sm font-semibold text-gray-300">Gerencie todas as categorias.</p>
                    <p className="text-xs text-gray-500 mt-1">Vincule categorias a menus para organizar o cardápio.</p>
                </div>
                <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", icon: "", menu_id: "", active: true }); setShowForm(true); }} className="bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20 hover:scale-105 transition-all" data-testid="add-category-btn"><Plus className="h-4 w-4 mr-1" />Nova Categoria</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categories.map(c => (
                    <div key={c.id} 
                         className={`bg-[#141414] text-white rounded-2xl border border-white/10 p-5 flex items-center justify-between shadow-lg transition-all hover:border-[#D4AF37]/40 ${!c.active ? "opacity-40" : ""}`} 
                         data-testid={`category-${c.id}`}>
                        <div>
                            <h3 className="font-extrabold text-white text-base">{c.name}</h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.description}</p>
                            <p className="text-xs text-[#F4B544] font-semibold mt-2">Menu: {getMenuName(c.menu_id)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-4">
                            <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg" onClick={() => del(c.id, c.name)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ))}
            </div>
            {categories.length === 0 && (
                <div className="text-center py-12 bg-[#141414] border border-dashed border-white/10 rounded-2xl">
                    <Grid3X3 className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 font-bold">Nenhuma categoria encontrada</p>
                    <p className="text-xs text-gray-500 mt-1">Crie uma categoria para começar</p>
                </div>
            )}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="cat-name" /></div>
                        <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="cat-desc" /></div>
                        <div><Label>Icone (slug)</Label><Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="salad, bowl, juice..." className="mt-1 rounded-lg" data-testid="cat-icon" /></div>
                        <div><Label>Menu</Label>
                            <select value={form.menu_id} onChange={e => setForm(f => ({ ...f, menu_id: e.target.value }))} className="w-full mt-1 rounded-xl border border-[#F4B544]/30 bg-[#0D0D0C] text-[#FFFAF0] px-3 py-2 text-sm focus:border-[#F4B544] focus:outline-none">
                                <option value="" className="bg-[#10100F] text-[#FFFAF0]">Selecione um menu</option>
                                {menus.map(m => <option key={m.id} value={m.id} className="bg-[#10100F] text-[#FFFAF0]">{m.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-cat-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== CONFIRM DIALOG ==================== */
function ConfirmDialog({ open, title, description, onConfirm, onCancel, confirmLabel = "Excluir", danger = true }) {
    return null; // Removido para usar ConfirmModal global
}

/* ==================== SKELETON ==================== */
function ProductCardSkeleton() {
    return (
        <div className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden animate-pulse">
            <div className="h-36 bg-[#1E1E1E] w-full" />
            <div className="p-4 space-y-3">
                <div className="flex justify-between"><div className="space-y-1.5"><div className="h-4 w-32 bg-white/10 rounded" /><div className="h-3 w-20 bg-[#F4B544]/20 rounded" /></div><div className="h-4 w-16 bg-[#F4B544]/20 rounded" /></div>
                <div className="flex gap-2"><div className="h-5 w-16 bg-white/10 rounded-full" /><div className="h-5 w-20 bg-white/10 rounded-full" /></div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10"><div className="h-5 w-12 bg-white/10 rounded-full" /><div className="flex gap-1"><div className="h-8 w-8 bg-white/10 rounded-lg" /><div className="h-8 w-8 bg-white/10 rounded-lg" /><div className="h-8 w-8 bg-white/10 rounded-lg" /></div></div>
            </div>
        </div>
    );
}

/* ==================== PRODUCTS TAB ==================== */
function ProductsTab({ headers, setConfirmModal }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [complements, setComplements] = useState([]);
    const [compCategories, setCompCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showLinkCategoriesModal, setShowLinkCategoriesModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ 
        name: "", description: "", price: "", category_id: "", image_url: "", stock: -1, tags: [], complement_ids: [], complement_rules: {}, linked_categories: [], active: true 
    });
    const [newTag, setNewTag] = useState("");
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [p, c, co, cc] = await Promise.all([
                axios.get(`${API}/admin/products`, { headers }),
                axios.get(`${API}/admin/categories`, { headers }),
                axios.get(`${API}/admin/complements`, { headers }),
                axios.get(`${API}/admin/complement-categories`, { headers })
            ]);
            setProducts(p.data);
            setCategories(c.data);
            setComplements(co.data);
            setCompCategories(cc.data);
        } catch { toast.error("Erro ao carregar produtos"); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchAll(); }, []); // eslint-disable-line

    const filtered = (Array.isArray(products) ? products : []).filter(p => {
        if (!p) return false;
        const matchSearch = !search || (p.name && p.name.toLowerCase().includes(search.toLowerCase()));
        const matchCat = !filterCategory || p.category_id === filterCategory;
        const matchStatus = filterStatus === "all" || (filterStatus === "active" ? Boolean(p.active) : !p.active);
        return matchSearch && matchCat && matchStatus;
    });

    const totalActive = (Array.isArray(products) ? products : []).filter(p => p && p.active).length;
    const totalInactive = (Array.isArray(products) ? products : []).filter(p => p && !p.active).length;

    const getOptionalsCount = (p) => {
        if (!p) return 0;
        const compIds = p.complement_ids || [];
        if (!Array.isArray(compIds) || compIds.length === 0) return 0;
        const activeComps = (Array.isArray(complements) ? complements : []).filter(c => c && compIds.includes(c.id));
        return activeComps.length;
    };

    const save = async (e) => {
        e.preventDefault();
        // Montar additionals a partir dos complement_ids selecionados + regras por categoria
        const selectedComps = complements.filter(c => form.complement_ids.includes(c.id));
        const additionals = selectedComps.map(c => {
            const catKey = c.category || "extras";
            const rule = form.complement_rules[catKey] || {};
            return {
                name: c.name,
                price: parseFloat(c.price),
                category: catKey,
                image_url: c.image_url || null,
                required: rule.required || false,
                min_select: rule.min_select !== undefined ? parseInt(rule.min_select) : 0,
                max_select: rule.max_select !== undefined ? parseInt(rule.max_select) : 1,
            };
        });
        const data = { 
            ...form, 
            price: parseFloat(form.price), 
            stock: parseInt(form.stock),
            additionals,
        };
        try {
            if (editing) await axios.put(`${API}/admin/products/${editing}`, data, { headers });
            else await axios.post(`${API}/admin/products`, data, { headers });
            toast.success(editing ? "Produto atualizado" : "Produto criado"); 
            setShowForm(false); 
            setEditing(null); 
            fetchAll();
        } catch { 
            toast.error("Erro ao salvar"); 
        }
    };

    const askDelete = (p) => { 
        setConfirmModal({
            isOpen: true,
            title: "Excluir Produto",
            description: `Deseja realmente excluir o produto "${p.name}"? Esta ação não pode ser desfeita.`,
            onConfirm: async () => {
                try { await axios.delete(`${API}/admin/products/${p.id}`, { headers }); toast.success("Produto excluído"); fetchAll(); }
                catch { toast.error("Erro ao excluir"); }
            }
        });
    };
    
    const clone = async (id) => { 
        await axios.post(`${API}/admin/products/${id}/clone`, {}, { headers }); 
        toast.success("Clonado"); 
        fetchAll(); 
    };
    
    const toggle = async (p) => {
        try { await axios.put(`${API}/admin/products/${p.id}`, { active: !p.active }, { headers }); fetchAll(); }
        catch { toast.error("Erro ao alterar status"); }
    };
    
    const edit = (p) => { 
        setEditing(p.id); 
        const existingAdditionals = Array.isArray(p.additionals) ? p.additionals : [];
        const matchedIds = existingAdditionals
            .map(add => { const found = complements.find(c => c.name === add.name); return found?.id; })
            .filter(Boolean);
        const allCompIds = [...new Set([...matchedIds, ...(p.complement_ids || [])])];
        
        const selectedComps = complements.filter(c => allCompIds.includes(c.id));
        const catKeysFromComps = selectedComps.map(c => c.category || "extras");
        const catKeysFromAdd = existingAdditionals.map(add => add.category || "extras");
        const linkedCats = [...new Set([...catKeysFromAdd, ...catKeysFromComps, ...(p.linked_categories || [])])];

        const rules = {};
        linkedCats.forEach(catKey => {
            const addRule = existingAdditionals.find(add => (add.category || "extras") === catKey);
            rules[catKey] = {
                required: addRule?.required || false,
                min_select: addRule?.min_select || 0,
                max_select: addRule?.max_select || 1,
            };
        });

        setForm({ 
            name: p.name, description: p.description || "", price: p.price, 
            category_id: p.category_id || "", image_url: p.image_url || "", stock: p.stock ?? -1, 
            tags: p.tags || [], 
            complement_ids: allCompIds,
            complement_rules: rules,
            linked_categories: linkedCats,
            active: p.active 
        }); 
        setShowForm(true); 
    };
    
    const openNew = () => { 
        setEditing(null); 
        setForm({ 
            name: "", description: "", price: "", category_id: "", 
            image_url: "", stock: -1, tags: [], complement_ids: [], complement_rules: {}, linked_categories: [], active: true 
        }); 
        setShowForm(true); 
    };
    
    const getCategoryName = (catId) => {
        const cat = categories.find(c => c.id === catId);
        return cat ? cat.name : "Sem categoria";
    };

    const toggleTag = (t) => setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }));
    const addCustomTag = () => { 
        const t = newTag.trim().toLowerCase().replace(/\s+/g, "_"); 
        if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] })); 
        setNewTag(""); 
    };
    const toggleComp = (id) => setForm(f => ({ ...f, complement_ids: f.complement_ids.includes(id) ? f.complement_ids.filter(c => c !== id) : [...f.complement_ids, id] }));
    const updateCatRule = (catKey, field, value) => setForm(f => ({
        ...f,
        complement_rules: {
            ...f.complement_rules,
            [catKey]: { ...(f.complement_rules[catKey] || { required: false, min_select: 0, max_select: 1 }), [field]: value }
        }
    }));
    
    const linkCategory = (catKey) => setForm(f => ({
        ...f,
        linked_categories: f.linked_categories.includes(catKey) 
            ? f.linked_categories.filter(k => k !== catKey)
            : [...f.linked_categories, catKey]
    }));
    
    const unlinkCategory = (catKey) => setForm(f => ({
        ...f,
        linked_categories: f.linked_categories.filter(k => k !== catKey),
        // Remover complementos desta categoria e regras
        complement_ids: f.complement_ids.filter(id => {
            const comp = complements.find(c => c.id === id);
            return comp && comp.category !== catKey;
        }),
        complement_rules: Object.fromEntries(
            Object.entries(f.complement_rules).filter(([k]) => k !== catKey)
        )
    }));

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try { 
            const fd = new FormData(); 
            fd.append("file", file); 
            const r = await axios.post(`${API}/admin/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } }); 
            setForm(f => ({ ...f, image_url: r.data.url })); 
            toast.success("Imagem enviada"); 
        }
        catch { 
            toast.error("Erro no upload"); 
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <div>
                    <p className="text-sm font-bold text-gray-200">{products.length} produtos cadastrados</p>
                    <p className="text-xs text-gray-400 mt-0.5"><span className="text-emerald-400 font-semibold">{totalActive} ativos</span>{" · "}<span className="text-gray-500">{totalInactive} inativos</span></p>
                </div>
                <Button onClick={openNew} className="bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20 hover:scale-105 transition-all" data-testid="add-product-btn"><Plus className="h-4 w-4 mr-1" />Novo Produto</Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto por nome..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#141414] text-white text-sm focus:outline-none focus:border-[#F4B544] placeholder-gray-500" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#141414] text-white px-4 py-2.5 text-sm min-w-[160px] focus:outline-none focus:border-[#F4B544]">
                    <option value="" className="bg-[#141414] text-white">Todas categorias</option>
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-[#141414] text-white">{c.name}</option>)}
                </select>
                <div className="flex rounded-xl border border-white/10 overflow-hidden bg-[#141414] text-sm p-1 gap-1">
                    {[["all","Todos"],["active","Ativos"],["inactive","Inativos"]].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setFilterStatus(val)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === val ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>{label}</button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
                    : filtered.map(p => {
                        const optCount = getOptionalsCount(p);
                        const hasZeroPrice = !p.price || p.price === 0 || parseFloat(p.price) === 0;
                        return (
                            <div key={p.id}
                                className={`bg-[#141414] text-white rounded-2xl border border-white/10 overflow-hidden shadow-lg transition-all hover:border-[#D4AF37]/40 ${!p.active ? "opacity-40" : ""}`}
                                data-testid={`admin-product-${p.id}`}>
                                {p.image_url
                                    ? <img src={getImageUrl(p.image_url)} alt={p.name} className="h-36 w-full object-cover" />
                                    : <div className="h-36 w-full bg-[#1E1E1E] flex items-center justify-center border-b border-white/5"><Package className="h-10 w-10 text-gray-600" /></div>
                                }
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-extrabold text-white text-base truncate">{p.name}</h3>
                                            <p className="text-xs text-[#F4B544] font-semibold mt-0.5">{getCategoryName(p.category_id)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`font-black text-base ${hasZeroPrice ? "text-amber-400" : "text-[#F4B544]"}`}>R$ {p.price?.toFixed(2)}</span>
                                            {hasZeroPrice && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">sob consulta</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 my-3">
                                         {p.tags?.map(t => {
                                             const conf = TAG_CONFIG[t] || { label: t.replace(/_/g, " ") };
                                             return (
                                                 <Badge key={t} variant="secondary" className="text-[10px] rounded-md bg-[#1E1E1E] text-[#FFFAF0] border border-[#F4B544]/20 flex items-center gap-1 font-semibold">
                                                     {conf.icon && <span>{conf.icon}</span>}
                                                     <span>{conf.label}</span>
                                                 </Badge>
                                             );
                                         })}
                                         {optCount > 0 && <Badge className="bg-[#F4B544]/20 text-[#F4B544] border border-[#D4AF37]/30 text-[10px] rounded-md font-bold">{optCount} adicionais</Badge>}
                                         {p.stock === 0 && <Badge variant="destructive" className="text-[10px] rounded-md bg-red-500/20 text-red-400 border border-red-500/30">Sem estoque</Badge>}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div className="flex items-center gap-2">
                                            <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
                                            <span className="text-xs text-muted-foreground">{p.active ? "Ativo" : "Inativo"}</span>
                                        </div>
                                        <div className="flex gap-0.5">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(p)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => clone(p.id)} title="Clonar"><Copy className="h-3.5 w-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => askDelete(p)} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
            </div>

            {!loading && filtered.length === 0 && products.length > 0 && (
                <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">Nenhum produto encontrado.</p>
                    <button type="button" className="text-primary text-sm mt-2 underline" onClick={() => { setSearch(""); setFilterCategory(""); setFilterStatus("all"); }}>Limpar filtros</button>
                </div>
            )}
            {!loading && products.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum produto cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie um produto para começar</p>
                </div>
            )}


            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto" data-testid="product-form">
                    <DialogHeader>
                        <DialogTitle className="font-heading text-lg">{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                        <p className="text-xs text-muted-foreground">{editing ? "Atualize as informações do produto" : "Preencha os dados para criar um novo produto"}</p>
                    </DialogHeader>
                    <form onSubmit={save} className="space-y-5 pt-1">

                        {/* Linha 1: Nome + Status */}
                        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                            <div>
                                <Label className="text-sm font-medium">Nome <span className="text-destructive">*</span></Label>
                                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" placeholder="Ex: Salada Caesar" required data-testid="product-name" />
                            </div>
                            <div className="flex flex-col items-center gap-1 pb-1">
                                <span className="text-xs text-muted-foreground">Ativo</span>
                                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                            </div>
                        </div>

                        {/* Descrição */}
                        <div>
                            <Label className="text-sm font-medium">Descrição</Label>
                            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg resize-none" rows={3} placeholder="Descreva os ingredientes, sabor, diferencial..." data-testid="product-desc" />
                        </div>

                        {/* Preço + Estoque */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-sm font-medium">Preço (R$) <span className="text-destructive">*</span></Label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                    <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="rounded-lg pl-9" placeholder="0.00" required data-testid="product-price" />
                                </div>
                                {(form.price === "0" || form.price === "0.00" || form.price === 0 || form.price === "") && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>Preço sob consulta — soma dos complementos</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Estoque</Label>
                                <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="mt-1 rounded-lg" data-testid="product-stock" />
                                <p className="text-xs text-muted-foreground mt-1">Use -1 para ilimitado</p>
                            </div>
                        </div>

                        {/* Categoria */}
                        <div>
                            <Label className="text-sm font-medium">Categoria <span className="text-destructive">*</span></Label>
                            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full mt-1 rounded-xl border border-[#F4B544]/30 bg-[#0D0D0C] text-[#FFFAF0] px-3 py-2 text-sm focus:border-[#F4B544] focus:outline-none" required>
                                <option value="" className="bg-[#10100F] text-[#FFFAF0]">Selecione uma categoria</option>
                                {categories.map(c => <option key={c.id} value={c.id} className="bg-[#10100F] text-[#FFFAF0]">{c.name}</option>)}
                            </select>
                        </div>

                        {/* Imagem */}
                        <div>
                            <Label className="text-sm font-medium">Imagem do produto</Label>
                            {form.image_url ? (
                                <div className="mt-2 relative inline-block">
                                    <img src={getImageUrl(form.image_url)} alt="" className="h-28 w-28 object-cover rounded-xl border" />
                                    <button type="button" onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition">
                                        <X className="h-3 w-3" />
                                    </button>
                                    <label className="absolute bottom-1 right-1 cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 transition">
                                            <Upload className="h-3 w-3 text-white" />
                                        </span>
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer mt-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                    <Image className="h-8 w-8 text-muted-foreground/40" />
                                    <span className="text-sm text-muted-foreground">Clique para enviar imagem</span>
                                    <span className="text-xs text-muted-foreground/60">JPG, PNG, WEBP — máx. 2MB</span>
                                </label>
                            )}
                            {form.image_url && (
                                <div className="mt-2 flex gap-2 items-center">
                                    <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="Ou cole a URL da imagem" className="rounded-lg flex-1 text-xs" data-testid="product-image-url" />
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        <div>
                            <Label className="text-sm font-medium">Tags</Label>
                            <p className="text-xs text-muted-foreground mb-2">Clique para ativar/desativar</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {["mais_pedido", "recomendado", "assado", "frito", "doce", "artesanal", "vegano"].map(t => {
                                    const conf = TAG_CONFIG[t] || { label: t.replace(/_/g, " ") };
                                    return (
                                        <button key={t} type="button" onClick={() => toggleTag(t)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all inline-flex items-center gap-1.5 ${
                                                form.tags.includes(t)
                                                    ? "bg-[#F4B544] text-[#050505] border-[#F4B544] shadow-sm"
                                                    : "bg-[#1A1A1A] text-gray-300 border-white/20 hover:border-[#F4B544]/50 hover:text-white"
                                            }`}>
                                            {conf.icon && <span>{conf.icon}</span>}
                                            <span>{conf.label}</span>
                                        </button>
                                    );
                                })}
                                {form.tags.filter(t => !["mais_pedido", "recomendado", "assado", "frito", "doce", "artesanal", "vegano"].includes(t)).map(t => {
                                    const conf = TAG_CONFIG[t] || { label: t.replace(/_/g, " ") };
                                    return (
                                        <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F4B544]/20 text-[#F4B544] border border-[#F4B544]/40">
                                            {conf.icon && <span>{conf.icon}</span>}
                                            <span>{conf.label}</span>
                                            <button type="button" onClick={() => toggleTag(t)} className="hover:text-red-400 transition-colors ml-0.5"><X className="h-3 w-3" /></button>
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag personalizada..." className="rounded-lg flex-1 text-sm" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} data-testid="new-tag-input" />
                                <Button type="button" size="sm" variant="outline" onClick={addCustomTag} className="rounded-lg shrink-0"><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
                            </div>
                        </div>

                        {/* Opcionais / Complementos */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label className="text-sm font-medium">Opcionais / Complementos</Label>
                                {form.linked_categories?.length > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{form.linked_categories.length} categoria{form.linked_categories.length > 1 ? "s" : ""}</span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">Vincule categorias de complemento a este produto</p>

                            {(Array.isArray(complements) ? complements : []).filter(c => c && c.active).length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                                    <p className="text-xs text-muted-foreground">Nenhum complemento cadastrado.</p>
                                    <p className="text-xs text-muted-foreground">Crie na aba <strong>Opcionais</strong>.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Botão para vincular categorias */}
                                    {(!form.linked_categories || form.linked_categories.length === 0) ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowLinkCategoriesModal(true)}
                                            className="w-full py-4 border-2 border-dashed border-primary/30 rounded-xl text-primary hover:bg-primary/5 transition-colors flex flex-col items-center gap-2"
                                        >
                                            <Plus className="h-5 w-5" />
                                            <span className="text-sm font-medium">Vincular Categorias</span>
                                            <span className="text-xs text-muted-foreground">Adicione categorias de complemento a este produto</span>
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Categorias vinculadas */}
                                            {form.linked_categories.map(catKey => {
                                                const catInfo = compCategories.find(c => c && (c.key === catKey || c.id === catKey || (c.name && c.name.toLowerCase() === String(catKey).toLowerCase())))
                                                    || { name: String(catKey).charAt(0).toUpperCase() + String(catKey).slice(1).replace(/_/g, " "), icon: "🏷️", key: catKey };
                                                
                                                // Agrupar complementos desta categoria
                                                const items = (Array.isArray(complements) ? complements : []).filter(c => c && c.active && (
                                                    c.category === catKey || 
                                                    (c.category && c.category.toLowerCase() === String(catKey).toLowerCase()) ||
                                                    (catInfo.id && c.category_id === catInfo.id)
                                                ));
                                                const rule = form.complement_rules[catKey] || { required: false, min_select: 0, max_select: 1 };
                                                const selectedInCat = items.filter(c => form.complement_ids.includes(c.id)).length;
                                                const hasSomeSelected = selectedInCat > 0;
                                                
                                                return (
                                                    <div key={catKey} className={`rounded-xl border-2 overflow-hidden transition-all ${
                                                        hasSomeSelected ? "border-[#F4B544]/50" : "border-[#F4B544]/20"
                                                    }`}>
                                                        {/* Cabeçalho da categoria */}
                                                        <div className={`flex items-center justify-between px-3 py-2 ${
                                                            hasSomeSelected ? "bg-[#F4B544]/10" : "bg-[#10100F]"
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base">{catInfo.icon || "➕"}</span>
                                                                <span className="text-sm font-semibold text-[#FFFAF0]">{catInfo.name}</span>
                                                                {hasSomeSelected && (
                                                                    <span className="text-xs bg-[#F4B544]/20 text-[#F4B544] px-2 py-0.5 rounded-full font-bold">{selectedInCat} item{selectedInCat > 1 ? "s" : ""}</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => unlinkCategory(catKey)}
                                                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                                                            >
                                                                Remover
                                                            </button>
                                                        </div>

                                                        {/* Itens da categoria */}
                                                        <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto bg-[#050505]">
                                                            {items.length === 0 ? (
                                                                <p className="text-xs text-[#B8B1A3] text-center py-2">Nenhum item nesta categoria</p>
                                                            ) : (
                                                                items.map(c => (
                                                                    <button key={c.id} type="button" onClick={() => toggleComp(c.id)}
                                                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-sm transition-all ${
                                                                            form.complement_ids.includes(c.id)
                                                                                ? "border-[#F4B544] bg-[#F4B544]/15 text-[#F4B544] shadow-sm font-semibold"
                                                                                : "border-[#F4B544]/20 hover:border-[#F4B544]/40 bg-[#0D0D0C] text-[#FFFAF0]"
                                                                        }`} data-testid={`comp-select-${c.id}`}>
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                                                                                form.complement_ids.includes(c.id) ? "bg-[#F4B544] border-[#F4B544]" : "border-[#F4B544]/40 bg-[#050505]"
                                                                            }`}>
                                                                                {form.complement_ids.includes(c.id) && <svg className="h-2.5 w-2.5 text-[#050505]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                            </div>
                                                                            <span>{c.name}</span>
                                                                        </div>
                                                                        <span className="text-[#F4B544] font-bold">R$ {parseFloat(c.price).toFixed(2)}</span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Regras da categoria — só aparece se tem algum selecionado */}
                                                        {hasSomeSelected && (
                                                            <div className="border-t border-[#F4B544]/20 bg-[#0D0D0C] px-3 py-2.5 space-y-2">
                                                                <p className="text-xs font-semibold text-[#F4B544]">Regras para "{catInfo.name}"</p>
                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    {/* Obrigatório */}
                                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                        <div
                                                                            role="checkbox"
                                                                            aria-checked={rule.required}
                                                                            onClick={() => updateCatRule(catKey, "required", !rule.required)}
                                                                            className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                                                                rule.required ? "bg-[#F4B544] border-[#F4B544]" : "border-[#F4B544]/40 bg-[#050505]"
                                                                            }`}>
                                                                            {rule.required && <svg className="h-2.5 w-2.5 text-[#050505]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                        </div>
                                                                        <span className="text-xs font-medium text-[#FFFAF0]">
                                                                            Seleção obrigatória
                                                                            {rule.required && <span className="ml-1 text-xs text-[#F4B544]">(cliente deve escolher)</span>}
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    {/* Mínimo */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-[#B8B1A3] whitespace-nowrap">Mín:</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <button type="button"
                                                                                onClick={() => updateCatRule(catKey, "min_select", Math.max(0, (rule.min_select || 0) - 1))}
                                                                                className="h-6 w-6 rounded border border-[#F4B544]/30 bg-[#1A1A1A] text-[#FFFAF0] flex items-center justify-center hover:bg-[#F4B544] hover:text-black transition-colors text-sm font-bold">−</button>
                                                                            <span className="w-6 text-center text-sm font-bold text-[#F4B544]">{rule.min_select || 0}</span>
                                                                            <button type="button"
                                                                                onClick={() => updateCatRule(catKey, "min_select", Math.min(rule.max_select || 1, (rule.min_select || 0) + 1))}
                                                                                className="h-6 w-6 rounded border border-[#F4B544]/30 bg-[#1A1A1A] text-[#FFFAF0] flex items-center justify-center hover:bg-[#F4B544] hover:text-black transition-colors text-sm font-bold">+</button>
                                                                        </div>
                                                                    </div>
                                                                    {/* Máximo */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-[#B8B1A3] whitespace-nowrap">Máx:</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <button type="button"
                                                                                onClick={() => updateCatRule(catKey, "max_select", Math.max(rule.min_select || 0, Math.max(1, (rule.max_select || 1) - 1)))}
                                                                                className="h-6 w-6 rounded border border-[#F4B544]/30 bg-[#1A1A1A] text-[#FFFAF0] flex items-center justify-center hover:bg-[#F4B544] hover:text-black transition-colors text-sm font-bold">−</button>
                                                                            <span className="w-6 text-center text-sm font-bold text-[#F4B544]">{rule.max_select || 1}</span>
                                                                            <button type="button"
                                                                                onClick={() => updateCatRule(catKey, "max_select", (rule.max_select || 1) + 1)}
                                                                                className="h-6 w-6 rounded border border-[#F4B544]/30 bg-[#1A1A1A] text-[#FFFAF0] flex items-center justify-center hover:bg-[#F4B544] hover:text-black transition-colors text-sm font-bold">+</button>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs text-[#B8B1A3]">
                                                                        {rule.max_select > 1 ? `cliente pode escolher até ${rule.max_select}` : "apenas 1 escolha"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            {/* Botão para adicionar mais categorias */}
                                            <button
                                                type="button"
                                                onClick={() => setShowLinkCategoriesModal(true)}
                                                className="w-full py-3 border border-dashed border-[#F4B544]/40 rounded-xl text-[#F4B544] hover:border-[#F4B544] hover:bg-[#F4B544]/10 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span>Vincular mais categorias</span>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-3 pt-2 border-t">
                            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" className="flex-1 bg-primary text-white rounded-full" data-testid="save-product-btn">{editing ? "Salvar alterações" : "Criar Produto"}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Modal para vincular categorias */}
            <Dialog open={showLinkCategoriesModal} onOpenChange={setShowLinkCategoriesModal}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="font-heading">Vincular Categorias</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">Selecione as categorias de complemento que este produto terá:</p>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            {compCategories
                                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                                .map(cat => {
                                    const isLinked = form.linked_categories.includes(cat.key);
                                    const count = complements.filter(c => c.category === cat.key && c.active).length;
                                    return (
                                        <button
                                            key={cat.key}
                                            type="button"
                                            onClick={() => linkCategory(cat.key)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                                isLinked 
                                                    ? "border-primary bg-primary/5" 
                                                    : "border-border hover:border-primary/30 bg-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{cat.icon || "📦"}</span>
                                                <div className="text-left">
                                                    <p className="font-medium text-sm">{cat.name}</p>
                                                    <p className="text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</p>
                                                </div>
                                            </div>
                                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                                isLinked ? "bg-primary border-primary" : "border-gray-300"
                                            }`}>
                                                {isLinked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2 border-t">
                        <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowLinkCategoriesModal(false)}>Cancelar</Button>
                        <Button type="button" className="flex-1 bg-primary text-white rounded-full" onClick={() => setShowLinkCategoriesModal(false)}>
                            Confirmar ({form.linked_categories.length} categoria{form.linked_categories.length !== 1 ? "s" : ""})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== OPTIONALS TAB ==================== */
function OptionalsTab({ headers, setConfirmModal }) {
    const [complements, setComplements] = useState([]);
    const [compCategories, setCompCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [form, setForm] = useState({ name: "", price: "", description: "", category: "extras", active: true });
    const [categoryForm, setCategoryForm] = useState({ key: "", name: "", icon: "", order_index: 0, required: false, min_select: 1, max_select: 1 });
    const [search, setSearch] = useState("");

    const fetch = async () => { 
        const res = await axios.get(`${API}/admin/complements`, { headers });
        setComplements(res.data);
    };
    
    const fetchCategories = async () => {
        const res = await axios.get(`${API}/admin/complement-categories`, { headers });
        setCompCategories(res.data);
    };
    
    useEffect(() => { 
        fetch(); 
        fetchCategories();
    }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        const data = { ...form, price: parseFloat(form.price) };
        try {
            if (editing) {
                await axios.put(`${API}/admin/complements/${editing}`, data, { headers });
                toast.success("Complemento atualizado");
            } else {
                await axios.post(`${API}/admin/complements`, data, { headers });
                toast.success("Complemento criado");
            }
            setShowForm(false); 
            setEditing(null); 
            fetch();
        } catch { 
            toast.error("Erro ao salvar"); 
        }
    };

    const del = async (id, name) => { 
        setConfirmModal({
            isOpen: true,
            title: "Excluir Complemento",
            description: `Deseja realmente excluir o complemento "${name}"?`,
            onConfirm: async () => {
                await axios.delete(`${API}/admin/complements/${id}`, { headers }); 
                toast.success("Excluido"); 
                fetch(); 
            }
        });
    };
    
    const edit = (c) => { 
        setEditing(c.id); 
        setForm({ 
            name: c.name, 
            price: c.price, 
            description: c.description || "", 
            image_url: c.image_url || "",
            category: c.category || "extras", 
            required: c.required || false,
            min_select: c.min_select || 0,
            max_select: c.max_select || 1,
            active: c.active 
        }); 
        setShowForm(true); 
    };
    
    const toggle = async (c) => { 
        await axios.put(`${API}/admin/complements/${c.id}`, { active: !c.active }, { headers }); 
        fetch(); 
    };

    // Upload de imagem
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem muito grande. Máximo 2MB.");
            return;
        }
        
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/admin/upload`, fd, { 
                headers: { ...headers, "Content-Type": "multipart/form-data" } 
            });
            setForm(f => ({ ...f, image_url: r.data.url }));
            toast.success("Imagem enviada!");
        } catch {
            toast.error("Erro ao enviar imagem");
        }
    };

    // Drag and drop de imagem
    const handleImageDrop = async (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("border-primary", "bg-primary/5");
        
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        
        if (!file.type.startsWith("image/")) {
            toast.error("Apenas imagens são permitidas");
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem muito grande. Máximo 2MB.");
            return;
        }
        
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/admin/upload`, fd, { 
                headers: { ...headers, "Content-Type": "multipart/form-data" } 
            });
            setForm(f => ({ ...f, image_url: r.data.url }));
            toast.success("Imagem enviada!");
        } catch {
            toast.error("Erro ao enviar imagem");
        }
    };

    // Categorias ordenadas com fallback inteligente
    const sortedCategories = useMemo(() => {
        const list = [...compCategories];
        const knownKeys = new Set(list.map(c => c.key));
        
        complements.forEach(comp => {
            const key = comp.category || "extras";
            if (!knownKeys.has(key)) {
                knownKeys.add(key);
                list.push({
                    id: `fallback-${key}`,
                    key: key,
                    name: key === "molhos" ? "Molhos & Cremes" : key === "adicionais" ? "Adicionais & Recheios Extra" : key,
                    icon: key === "molhos" ? "🥣" : key === "adicionais" ? "🧀" : "📦",
                    order_index: 99
                });
            }
        });

        return list.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [compCategories, complements]);

    // Mapear categorias para dropdown
    const complementCategories = sortedCategories.reduce((acc, cat) => {
        acc[cat.key] = cat.name;
        return acc;
    }, {});

    // Agrupar complementos por categoria
    const groupedComplements = {};
    const filteredComplements = search 
        ? complements.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
        : complements;
    
    filteredComplements.forEach(c => {
        const cat = c.category || "extras";
        if (!groupedComplements[cat]) groupedComplements[cat] = [];
        groupedComplements[cat].push(c);
    });

    // Salvar categoria
    const saveCategory = async (e) => {
        e.preventDefault();
        try {
            const data = {
                key: categoryForm.key,
                name: categoryForm.name,
                icon: categoryForm.icon,
                order_index: parseInt(categoryForm.order_index) || 0,
                required: categoryForm.required,
                min_select: categoryForm.required ? (parseInt(categoryForm.min_select) || 1) : 0,
                max_select: parseInt(categoryForm.max_select) || 1
            };
            
            if (editingCategory) {
                await axios.put(`${API}/admin/complement-categories/${editingCategory}`, data, { headers });
                toast.success("Categoria atualizada");
            } else {
                await axios.post(`${API}/admin/complement-categories`, data, { headers });
                toast.success("Categoria criada");
            }
            setShowCategoryForm(false);
            setEditingCategory(null);
            setCategoryForm({ key: "", name: "", icon: "", order_index: 0, required: false, min_select: 1, max_select: 1 });
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Erro ao salvar categoria");
        }
    };
    
    const editCategory = (cat) => {
        setEditingCategory(cat.id);
        setCategoryForm({
            key: cat.key,
            name: cat.name,
            icon: cat.icon || "",
            order_index: cat.order_index || 0,
            required: cat.required || false,
            min_select: cat.min_select || 1,
            max_select: cat.max_select || 1
        });
        setShowCategoryForm(true);
    };
    
    const delCategory = async (id, name) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Categoria de Complemento",
            description: `Deseja realmente excluir a categoria "${name}"?\n\nOs complementos desta categoria ficarão sem categoria.`,
            onConfirm: async () => {
                try {
                    await axios.delete(`${API}/admin/complement-categories/${id}`, { headers });
                    toast.success("Categoria excluida");
                    fetchCategories();
                } catch (err) {
                    toast.error(err.response?.data?.detail || "Erro ao excluir");
                }
            }
        });
    };

    const openNewCategory = () => {
        setEditingCategory(null);
        setCategoryForm({ key: "", name: "", icon: "", order_index: compCategories.length, required: false, min_select: 1, max_select: 1 });
        setShowCategoryForm(true);
    };

    return (
        <div>
            {/* Header com ações */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-semibold font-heading">Complementos & Opcionais</h2>
                    <p className="text-sm text-muted-foreground">Gerencie os itens que os clientes podem adicionar aos produtos</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowCategoryManager(true)} variant="outline" className="rounded-full">
                        <Layers className="h-4 w-4 mr-1.5" />Gerenciar Categorias
                    </Button>
                    <Button onClick={() => { setEditing(null); setForm({ name: "", price: "", description: "", image_url: "", category: sortedCategories[0]?.key || "extras", required: false, min_select: 0, max_select: 1, active: true }); setShowForm(true); }} className="bg-primary text-white rounded-full" data-testid="add-complement-btn">
                        <Plus className="h-4 w-4 mr-1.5" />Novo Complemento
                    </Button>
                </div>
            </div>

            {/* Cards de Categorias */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
                {sortedCategories.map(cat => {
                    const count = complements.filter(c => c.category === cat.key).length;
                    const isActive = count > 0;
                    return (
                        <div key={cat.id} className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                            isActive ? "bg-[#10100F] border-[#F4B544]/40 hover:border-[#F4B544] shadow-sm" : "bg-[#0D0D0C] border-[#F4B544]/15 hover:border-[#F4B544]/30"
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{cat.icon || "📦"}</span>
                                {cat.required && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#F4B544] rounded-full shadow-sm" title="Obrigatório" />
                                )}
                            </div>
                            <p className="font-semibold text-sm truncate text-[#FFFAF0]">{cat.name}</p>
                            <p className="text-xs text-[#B8B1A3]">{count} item{count !== 1 ? "s" : ""}</p>
                            <div className="mt-2 flex gap-1">
                                <button onClick={() => editCategory(cat)} className="p-1.5 rounded-lg hover:bg-[#F4B544]/15 transition-colors" title="Editar">
                                    <Pencil className="h-3.5 w-3.5 text-[#F4B544]" />
                                </button>
                                <button onClick={() => delCategory(cat.id, cat.name)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors" title="Excluir">
                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {/* Card para adicionar nova categoria */}
                <button onClick={openNewCategory} className="p-4 rounded-xl border-2 border-dashed border-[#F4B544]/30 hover:border-[#F4B544] hover:bg-[#F4B544]/10 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]">
                    <div className="w-10 h-10 rounded-full bg-[#F4B544]/15 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-[#F4B544]" />
                    </div>
                    <span className="text-sm font-semibold text-[#F4B544]">Nova Categoria</span>
                </button>
            </div>

            {/* Barra de busca */}
            <div className="relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#F4B544]" />
                <Input 
                    placeholder="Buscar complementos..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="pl-10 rounded-full max-w-md bg-[#10100F] border-[#F4B544]/30 text-[#FFFAF0] placeholder:text-[#B8B1A3]"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#1A1A1A] flex items-center justify-center hover:bg-[#F4B544] text-[#FFFAF0] hover:text-black">
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Lista de complementos agrupados por categoria */}
            <div className="space-y-8">
                {sortedCategories.map(cat => {
                    const comps = groupedComplements[cat.key] || [];
                    if (comps.length === 0 && search) return null;
                    
                    return (
                        <div key={cat.id}>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xl">{cat.icon || "📦"}</span>
                                <div>
                                    <h4 className="font-semibold text-[#FFFAF0] text-base">{cat.name}</h4>
                                    <p className="text-xs text-[#B8B1A3]">{comps.length} item{comps.length !== 1 ? "s" : ""}</p>
                                </div>
                                {cat.required && (
                                    <Badge variant="secondary" className="bg-[#F4B544]/20 text-[#F4B544] border border-[#F4B544]/30 font-bold">Obrigatório</Badge>
                                )}
                            </div>
                            
                            {comps.length > 0 ? (
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {comps.map(c => (
                                        <div key={c.id} 
                                            className="bg-[#10100F] rounded-2xl border border-[#F4B544]/20 p-4 flex items-center justify-between hover:border-[#F4B544]/50 hover:shadow-md transition-all"
                                            data-testid={`complement-${c.id}`}>
                                            <div className="flex items-center gap-3">
                                                {c.image_url ? (
                                                    <img src={getImageUrl(c.image_url)} alt={c.name} className="h-12 w-12 rounded-xl object-cover" />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-xl bg-[#1A1A1A] border border-[#F4B544]/20 flex items-center justify-center">
                                                        <Tag className="h-5 w-5 text-[#F4B544]" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-semibold font-heading text-sm text-[#FFFAF0]">{c.name}</h3>
                                                    {c.description && <p className="text-xs text-[#B8B1A3] line-clamp-1">{c.description}</p>}
                                                    <span className="text-sm font-bold text-[#F4B544]">R$ {c.price?.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
                                                <Button size="icon" variant="ghost" onClick={() => edit(c)} className="h-8 w-8 text-[#F4B544] hover:bg-[#F4B544]/15"><Pencil className="h-4 w-4" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/15" onClick={() => del(c.id, c.name)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-[#10100F] rounded-xl border-2 border-dashed border-[#F4B544]/20">
                                    <p className="text-sm text-[#B8B1A3]">Nenhum complemento nesta categoria</p>
                                    <Button variant="link" onClick={() => { setEditing(null); setForm({ ...form, category: cat.key }); setShowForm(true); }} className="text-[#F4B544] font-bold">
                                        Adicionar primeiro item
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {complements.length === 0 && (
                <div className="text-center py-12 bg-[#10100F] rounded-2xl border border-[#F4B544]/20">
                    <Tag className="h-10 w-10 text-[#F4B544] mx-auto mb-3 opacity-60" />
                    <p className="text-[#FFFAF0] font-semibold">Nenhum complemento cadastrado</p>
                    <p className="text-xs text-[#B8B1A3] mt-1">Crie um complemento para começar</p>
                </div>
            )}

            {/* Modal de Complemento */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-heading">{editing ? "Editar Complemento" : "Novo Complemento"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Label>Foto do Complemento</Label>
                                <div 
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary/50 hover:bg-gray-50 transition-all cursor-pointer relative"
                                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                                    onDragLeave={e => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                                    onDrop={handleImageDrop}
                                    onClick={() => document.getElementById("comp-image-upload").click()}
                                >
                                    {form.image_url ? (
                                        <div className="relative">
                                            <img src={form.image_url.startsWith("http") ? form.image_url : `${BACKEND_URL}${form.image_url}`} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, image_url: "" })); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                                <Image className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <p className="text-sm text-gray-600">Arraste uma imagem aqui</p>
                                            <p className="text-xs text-gray-400">ou clique para selecionar</p>
                                        </div>
                                    )}
                                    <input id="comp-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </div>
                                <div className="text-xs text-muted-foreground text-center">Formatos: JPG, PNG, WEBP (max 2MB)</div>
                            </div>
                            
                            <div className="space-y-4">
                                <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="comp-name" /></div>
                                <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 rounded-lg" required data-testid="comp-price" /></div>
                                <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="comp-desc" /></div>
                                
                                <div><Label>Categoria</Label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 rounded-xl border border-[#F4B544]/30 bg-[#0D0D0C] text-[#FFFAF0] px-3 py-2 text-sm focus:border-[#F4B544] focus:outline-none">
                                        {sortedCategories.map(cat => (
                                            <option key={cat.key} value={cat.key} className="bg-[#10100F] text-[#FFFAF0]">{cat.icon} {cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <Switch checked={form.required} onCheckedChange={v => setForm(f => ({ ...f, required: v }))} />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Obrigatório no pedido</span>
                                <span className="text-xs text-muted-foreground">Cliente deve selecionar pelo menos um item desta categoria</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm">Mínimo para selecionar</Label>
                                <Input type="number" min="0" value={form.min_select || 0} onChange={e => setForm(f => ({ ...f, min_select: parseInt(e.target.value) || 0 }))} className="mt-1 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm">Máximo permitido</Label>
                                <Input type="number" min="1" value={form.max_select || 1} onChange={e => setForm(f => ({ ...f, max_select: parseInt(e.target.value) || 1 }))} className="mt-1 rounded-lg" />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" className="flex-1 bg-primary text-white rounded-full" data-testid="save-comp-btn">{editing ? "Atualizar" : "Criar"}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Modal de Gerenciamento de Categorias */}
            <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
                <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Layers className="h-5 w-5" /> Gerenciar Categorias
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-3 max-h-[50vh] overflow-auto pr-2">
                        {sortedCategories.length === 0 ? (
                            <div className="text-center py-8">
                                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
                            </div>
                        ) : (
                            sortedCategories.map((cat, index) => {
                                const count = complements.filter(c => c.category === cat.key).length;
                                return (
                                    <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center gap-1">
                                                <button onClick={() => { /* reorder up */ }} disabled={index === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                                                    ↑
                                                </button>
                                                <span className="text-xs font-medium text-muted-foreground">{cat.order_index}</span>
                                                <button onClick={() => { /* reorder down */ }} disabled={index === sortedCategories.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                                                    ↓
                                                </button>
                                            </div>
                                            <span className="text-2xl bg-white w-12 h-12 rounded-xl flex items-center justify-center border border-border">{cat.icon || "📦"}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{cat.name}</p>
                                                    {cat.required && (
                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">Obrigatório</Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    ID: {cat.key} · {count} item{count !== 1 ? "s" : ""}
                                                    {cat.required && ` · min: ${cat.min_select} · max: ${cat.max_select}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" onClick={() => { setShowCategoryManager(false); editCategory(cat); }} className="h-9 w-9">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => delCategory(cat.id, cat.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    <div className="border-t pt-4 flex justify-end">
                        <Button onClick={() => { setShowCategoryManager(false); openNewCategory(); }} className="bg-primary text-white rounded-full">
                            <Plus className="h-4 w-4 mr-1.5" />Nova Categoria
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Modal de Categoria (Nova/Editar) */}
            <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-heading">{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={saveCategory} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Código da categoria*</Label>
                                <Input value={categoryForm.key} onChange={e => setCategoryForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} className="mt-1 rounded-lg" placeholder="ex: frutas_frescas" required disabled={!!editingCategory} />
                                <p className="text-[10px] text-muted-foreground mt-1">Usado internamente, não pode ter espaços</p>
                            </div>
                            <div>
                                <Label className="text-xs">Nome da categoria*</Label>
                                <Input value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" placeholder="ex: Frutas Frescas" required />
                                <p className="text-[10px] text-muted-foreground mt-1">Nome exibido no cardápio</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Ícone (emoji)</Label>
                                <Input value={categoryForm.icon} onChange={e => setCategoryForm(f => ({ ...f, icon: e.target.value }))} className="mt-1 rounded-lg text-lg" placeholder="🍓" maxLength={2} />
                                <p className="text-[10px] text-muted-foreground mt-1">Emoji que aparece antes do nome</p>
                            </div>
                            <div>
                                <Label className="text-xs">Posição na lista</Label>
                                <Input 
                                    type="number"
                                    min="0"
                                    value={categoryForm.order_index} 
                                    onChange={e => setCategoryForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} 
                                    className="mt-1 rounded-lg" 
                                    placeholder="0"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">0 = primeiro, 1 = segundo, etc.</p>
                            </div>
                        </div>
                        
                        {/* Obrigatoriedade */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="cat-required"
                                    checked={categoryForm.required}
                                    onChange={e => setCategoryForm(f => ({ ...f, required: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="cat-required" className="text-sm font-medium cursor-pointer">Categoria obrigatória</Label>
                            </div>
                        </div>
                        
                        {/* Min/Max selection - só aparece se for obrigatório */}
                        {categoryForm.required && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Mínimo de seleções*</Label>
                                    <Input 
                                        type="number"
                                        min={1}
                                        value={categoryForm.min_select} 
                                        onChange={e => setCategoryForm(f => ({ ...f, min_select: parseInt(e.target.value) || 1 }))} 
                                        className="mt-1 rounded-lg" 
                                        placeholder="1"
                                        required={categoryForm.required}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">Mínimo de itens que o cliente deve escolher</p>
                                </div>
                                <div>
                                    <Label className="text-xs">Máximo de seleções*</Label>
                                    <Input 
                                        type="number"
                                        min={1}
                                        value={categoryForm.max_select} 
                                        onChange={e => setCategoryForm(f => ({ ...f, max_select: parseInt(e.target.value) || 1 }))} 
                                        className="mt-1 rounded-lg" 
                                        placeholder="1"
                                        required={categoryForm.required}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">Máximo de itens que o cliente pode escolher</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1 bg-primary text-white rounded-full">
                                {editingCategory ? "Atualizar" : "Criar"} Categoria
                            </Button>
                            {editingCategory && (
                                <Button type="button" variant="outline" onClick={() => { setEditingCategory(null); setCategoryForm({ key: "", name: "", icon: "", order_index: 0 }); }} className="rounded-full">
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== BANNERS TAB ==================== */
function BannersTab({ headers }) {
    const [banners, setBanners] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ 
        title: "", subtitle: "", image_url: "", 
        cta_text: "Ver mais", cta_link: "#", active: true, order: 0 
    });

    const fetch = async () => {
        const res = await axios.get(`${API}/admin/banners`, { headers });
        setBanners(res.data);
    };
    useEffect(() => { fetch(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) await axios.put(`${API}/admin/banners/${editing}`, form, { headers });
            else await axios.post(`${API}/admin/banners`, form, { headers });
            toast.success(editing ? "Banner atualizado" : "Banner criado");
            setShowForm(false);
            setEditing(null);
            fetch();
        } catch {
            toast.error("Erro ao salvar");
        }
    };

    const del = async (id) => { 
        setConfirmModal({
            isOpen: true,
            title: "Excluir Banner",
            description: "Deseja realmente excluir este banner?",
            onConfirm: async () => {
                await axios.delete(`${API}/admin/banners/${id}`, { headers }); 
                toast.success("Excluido"); 
                fetch(); 
            }
        });
    };

    const edit = (b) => {
        setEditing(b.id);
        setForm({
            title: b.title, subtitle: b.subtitle || "", image_url: b.image_url || "",
            cta_text: b.cta_text || "Ver mais", cta_link: b.cta_link || "#",
            active: b.active, order: b.order || 0
        });
        setShowForm(true);
    };

    const toggle = async (b) => {
        await axios.put(`${API}/admin/banners/${b.id}`, { active: !b.active }, { headers });
        fetch();
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/admin/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
            setForm(f => ({ ...f, image_url: r.data.url }));
            toast.success("Imagem enviada");
        } catch {
            toast.error("Erro no upload");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">Gerencie os banners promocionais do cardápio.</p>
                    <p className="text-xs text-muted-foreground mt-1">Os banners aparecem no topo da página inicial.</p>
                </div>
                <Button onClick={() => { setEditing(null); setForm({ title: "", subtitle: "", image_url: "", cta_text: "Ver mais", cta_link: "#", active: true, order: 0 }); setShowForm(true); }} className="bg-primary text-white rounded-full"><Plus className="h-4 w-4 mr-1" />Novo Banner</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {banners.map(b => (
                    <div key={b.id} className="bg-white dark:bg-card rounded-2xl border border-border overflow-hidden">
                        {b.image_url && (
                            <div className="h-32 bg-muted">
                                <img src={getImageUrl(b.image_url)} alt={b.title} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold font-heading">{b.title}</h3>
                                    <p className="text-xs text-muted-foreground">{b.subtitle}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Switch checked={b.active} onCheckedChange={() => toggle(b)} />
                                    <Button size="icon" variant="ghost" onClick={() => edit(b)}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(b.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>CTA: {b.cta_text}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {banners.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Image className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum banner cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie um banner para aparecer no cardápio</p>
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Banner" : "Novo Banner"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Titulo</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1 rounded-lg" required /></div>
                        <div><Label>Subtitulo</Label><Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="mt-1 rounded-lg" /></div>
                        <div><Label>Imagem</Label>
                            <div className="mt-1 flex gap-2 items-center">
                                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL da imagem" className="rounded-lg flex-1" />
                                <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handleUpload} /><Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button></label>
                            </div>
                            {form.image_url && <img src={getImageUrl(form.image_url)} alt="" className="mt-2 h-20 w-full object-cover rounded-lg" />}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label>Texto do Botao</Label><Input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} className="mt-1 rounded-lg" /></div>
                            <div><Label>Link do Botao</Label><Input value={form.cta_link} onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))} className="mt-1 rounded-lg" /></div>
                        </div>
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== COMBOS TAB ==================== */
function CombosTab({ headers }) {
    const [combos, setCombos] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: "", description: "", image_url: "", base_price: "",
        discount_percent: 0, active: true, items: []
    });
    const [newItem, setNewItem] = useState({ category_id: "", quantity: 1, allow_choices: true });

    const fetch = async () => {
        const [combosRes, catRes] = await Promise.all([
            axios.get(`${API}/admin/combos`, { headers }),
            axios.get(`${API}/admin/categories`, { headers })
        ]);
        setCombos(combosRes.data);
        setCategories(catRes.data);
    };
    useEffect(() => { fetch(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            const data = { ...form, base_price: parseFloat(form.base_price) };
            if (editing) await axios.put(`${API}/admin/combos/${editing}`, data, { headers });
            else await axios.post(`${API}/admin/combos`, data, { headers });
            toast.success(editing ? "Combo atualizado" : "Combo criado");
            setShowForm(false);
            setEditing(null);
            fetch();
        } catch {
            toast.error("Erro ao salvar");
        }
    };

    const del = async (id, name) => { 
        setConfirmModal({
            isOpen: true,
            title: "Excluir Combo",
            description: `Deseja realmente excluir o combo "${name}"?`,
            onConfirm: async () => {
                await axios.delete(`${API}/admin/combos/${id}`, { headers }); 
                toast.success("Excluido"); 
                fetch(); 
            }
        });
    };

    const edit = (c) => {
        setEditing(c.id);
        setForm({
            name: c.name, description: c.description || "", image_url: c.image_url || "",
            base_price: c.base_price.toString(), discount_percent: c.discount_percent || 0,
            active: c.active, items: c.items || []
        });
        setShowForm(true);
    };

    const toggle = async (c) => {
        await axios.put(`${API}/admin/combos/${c.id}`, { active: !c.active }, { headers });
        fetch();
    };

    const addItem = () => {
        if (!newItem.category_id) return;
        setForm(f => ({ ...f, items: [...f.items, { ...newItem }] }));
        setNewItem({ category_id: "", quantity: 1, allow_choices: true });
    };

    const removeItem = (index) => {
        setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
            setForm(f => ({ ...f, image_url: r.data.url }));
            toast.success("Imagem enviada");
        } catch {
            toast.error("Erro no upload");
        }
    };

    const getCategoryName = (id) => {
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name : "Categoria";
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">Gerencie os combos promocionais.</p>
                    <p className="text-xs text-muted-foreground mt-1">Os combos permitem criar ofertas especiais no cardápio.</p>
                </div>
                <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", image_url: "", base_price: "", discount_percent: 0, active: true, items: [] }); setShowForm(true); }} className="bg-primary text-white rounded-full"><Plus className="h-4 w-4 mr-1" />Novo Combo</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {combos.map(c => (
                    <div key={c.id} className="bg-white dark:bg-card rounded-2xl border border-border overflow-hidden">
                        {c.image_url && (
                            <div className="h-32 bg-muted">
                                <img src={getImageUrl(c.image_url)} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold font-heading">{c.name}</h3>
                                    <p className="text-xs text-muted-foreground">{c.description}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
                                    <Button size="icon" variant="ghost" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <span className="font-bold text-primary">R$ {c.base_price?.toFixed(2)}</span>
                                {c.discount_percent > 0 && (
                                    <Badge className="bg-green-100 text-green-700">-{c.discount_percent}%</Badge>
                                )}
                            </div>
                            {c.items?.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground mb-1">Itens do combo:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {c.items.map((item, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {item.quantity}x {item.category_name || getCategoryName(item.category_id)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {combos.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum combo cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie um combo para oferecer no cardápio</p>
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Combo" : "Novo Combo"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required /></div>
                        <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" /></div>
                        <div><Label>Imagem</Label>
                            <div className="mt-1 flex gap-2 items-center">
                                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL da imagem" className="rounded-lg flex-1" />
                                <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handleUpload} /><Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button></label>
                            </div>
                            {form.image_url && <img src={getImageUrl(form.image_url)} alt="" className="mt-2 h-20 w-full object-cover rounded-lg" />}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label>Preco Base (R$)</Label><Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} className="mt-1 rounded-lg" required /></div>
                            <div><Label>Desconto (%)</Label><Input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: parseInt(e.target.value) || 0 }))} className="mt-1 rounded-lg" /></div>
                        </div>

                        {/* Items do combo */}
                        <div>
                            <Label>Itens do Combo</Label>
                            <div className="mt-2 space-y-2">
                                {form.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                        <span className="flex-1 text-sm">{item.quantity}x {getCategoryName(item.category_id)}</span>
                                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(index)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <select value={newItem.category_id} onChange={e => setNewItem(i => ({ ...i, category_id: e.target.value }))} className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm">
                                        <option value="">Selecione uma categoria</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <Input type="number" min="1" value={newItem.quantity} onChange={e => setNewItem(i => ({ ...i, quantity: parseInt(e.target.value) || 1 }))} className="w-20 rounded-lg" />
                                    <Button type="button" onClick={addItem} variant="outline"><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
