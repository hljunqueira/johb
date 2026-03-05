import { useState, useEffect, useCallback } from "react";
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

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getImageUrl = (url) => { if (!url) return ""; if (url.startsWith("http")) return url; return `${BACKEND_URL}${url}`; };

export default function AdminCardapioPage() {
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };
    
    // Tab atual
    const [activeTab, setActiveTab] = useState("menus"); // menus, categories, products, optionals, banners, combos

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
                <MenusTabRefactored headers={headers} />
            )}
            
            {activeTab === "categories" && (
                <CategoriesTab headers={headers} />
            )}
            
            {activeTab === "products" && (
                <ProductsTab headers={headers} />
            )}
            
            {activeTab === "optionals" && (
                <OptionalsTab headers={headers} />
            )}
            
            {activeTab === "banners" && (
                <BannersTab headers={headers} />
            )}
            
            {activeTab === "combos" && (
                <CombosTab headers={headers} />
            )}
        </div>
    );
}

/* ==================== MENUS TAB (REFATORADO) ==================== */
function MenusTabRefactored({ headers }) {
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
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">Crie menus para organizar seu cardápio.</p>
                    <p className="text-xs text-muted-foreground mt-1">Os menus agrupam categorias no cardápio público.</p>
                </div>
                <Button onClick={handleNew} className="bg-primary text-white rounded-full" data-testid="add-menu-btn"><Plus className="h-4 w-4 mr-1" />Novo Menu</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {menus.map(m => (
                    <div key={m.id} className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <div className="flex justify-between items-start mb-2">
                            <div><h3 className="font-semibold font-heading">{m.name}</h3><p className="text-xs text-muted-foreground">{m.description}</p></div>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <Badge className={`rounded-full text-xs ${m.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{m.active ? "Ativo" : "Inativo"}</Badge>
                        </div>
                    </div>
                ))}
            </div>
            {menus.length === 0 && <div className="text-center py-12"><Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhum menu criado</p></div>}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Menu" : "Novo Menu"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="menu-name" /></div>
                        <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="menu-desc" /></div>
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-menu-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== CATEGORIES TAB ==================== */
function CategoriesTab({ headers }) {
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

    const del = async (id) => { 
        if (!window.confirm("Excluir categoria?")) return; 
        await axios.delete(`${API}/admin/categories/${id}`, { headers }); 
        toast.success("Excluida"); 
        fetchCategories(); 
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
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">Gerencie todas as categorias.</p>
                    <p className="text-xs text-muted-foreground mt-1">Vincule categorias a menus para organizar o cardápio.</p>
                </div>
                <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", icon: "", menu_id: "", active: true }); setShowForm(true); }} className="bg-primary text-white rounded-full" data-testid="add-category-btn"><Plus className="h-4 w-4 mr-1" />Nova Categoria</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categories.map(c => (
                    <div key={c.id} 
                         className={`bg-white dark:bg-card rounded-2xl border border-border p-4 flex items-center justify-between ${!c.active ? "opacity-50" : ""}`} 
                         data-testid={`category-${c.id}`}>
                        <div>
                            <h3 className="font-semibold font-heading text-sm">{c.name}</h3>
                            <p className="text-xs text-muted-foreground">{c.description}</p>
                            <p className="text-xs text-primary mt-1">Menu: {getMenuName(c.menu_id)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                            <Button size="icon" variant="ghost" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ))}
            </div>
            {categories.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Grid3X3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma categoria neste menu</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie uma categoria para começar</p>
                </div>
            )}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="cat-name" /></div>
                        <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="cat-desc" /></div>
                        <div><Label>Icone (slug)</Label><Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="salad, bowl, juice..." className="mt-1 rounded-lg" data-testid="cat-icon" /></div>
                        <div><Label>Menu</Label>
                            <select value={form.menu_id} onChange={e => setForm(f => ({ ...f, menu_id: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm">
                                <option value="">Selecione um menu</option>
                                {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
    return (
        <Dialog open={open} onOpenChange={onCancel}>
            <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-heading">{title}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="flex gap-3 mt-4">
                    <Button variant="outline" className="flex-1 rounded-full" onClick={onCancel}>Cancelar</Button>
                    <Button className={`flex-1 rounded-full text-white ${danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary"}`} onClick={onConfirm}>{confirmLabel}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ==================== SKELETON ==================== */
function ProductCardSkeleton() {
    return (
        <div className="bg-white dark:bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
            <div className="h-32 bg-muted w-full" />
            <div className="p-4 space-y-3">
                <div className="flex justify-between"><div className="space-y-1.5"><div className="h-4 w-32 bg-muted rounded" /><div className="h-3 w-20 bg-muted rounded" /></div><div className="h-4 w-16 bg-muted rounded" /></div>
                <div className="flex gap-2"><div className="h-5 w-16 bg-muted rounded-full" /><div className="h-5 w-20 bg-muted rounded-full" /></div>
                <div className="flex justify-between items-center pt-2 border-t"><div className="h-5 w-12 bg-muted rounded-full" /><div className="flex gap-1"><div className="h-8 w-8 bg-muted rounded-lg" /><div className="h-8 w-8 bg-muted rounded-lg" /><div className="h-8 w-8 bg-muted rounded-lg" /></div></div>
            </div>
        </div>
    );
}

/* ==================== PRODUCTS TAB ==================== */
function ProductsTab({ headers }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [complements, setComplements] = useState([]);
    const [compCategories, setCompCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ 
        name: "", description: "", price: "", category_id: "", image_url: "", stock: -1, tags: [], complement_ids: [], complement_rules: {}, active: true 
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

    const filtered = products.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategory || p.category_id === filterCategory;
        const matchStatus = filterStatus === "all" || (filterStatus === "active" ? p.active : !p.active);
        return matchSearch && matchCat && matchStatus;
    });

    const totalActive = products.filter(p => p.active).length;
    const totalInactive = products.filter(p => !p.active).length;

    const getOptionalsCount = (p) => {
        if (Array.isArray(p.additionals) && p.additionals.length > 0) return p.additionals.length;
        if (Array.isArray(p.complement_ids) && p.complement_ids.length > 0) return p.complement_ids.length;
        return 0;
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

    const askDelete = (id) => { setConfirmTarget(id); setConfirmOpen(true); };
    const confirmDelete = async () => {
        try { await axios.delete(`${API}/admin/products/${confirmTarget}`, { headers }); toast.success("Produto excluído"); fetchAll(); }
        catch { toast.error("Erro ao excluir"); }
        finally { setConfirmOpen(false); setConfirmTarget(null); }
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
        // Extrair complement_ids e complement_rules a partir de additionals ou complement_ids existentes
        const existingAdditionals = Array.isArray(p.additionals) ? p.additionals : [];
        const matchedIds = existingAdditionals
            .map(add => { const found = complements.find(c => c.name === add.name); return found?.id; })
            .filter(Boolean);
        // Construir regras por categoria a partir dos additionals existentes
        const rules = {};
        existingAdditionals.forEach(add => {
            const catKey = add.category || "extras";
            if (!rules[catKey]) {
                rules[catKey] = {
                    required: add.required || false,
                    min_select: add.min_select || 0,
                    max_select: add.max_select || 1,
                };
            }
        });
        setForm({ 
            name: p.name, description: p.description, price: p.price, 
            category_id: p.category_id || "", image_url: p.image_url, stock: p.stock, 
            tags: p.tags || [], 
            complement_ids: matchedIds.length > 0 ? matchedIds : (p.complement_ids || []),
            complement_rules: rules,
            active: p.active 
        }); 
        setShowForm(true); 
    };
    
    const openNew = () => { 
        setEditing(null); 
        setForm({ 
            name: "", description: "", price: "", category_id: "", 
            image_url: "", stock: -1, tags: [], complement_ids: [], complement_rules: {}, active: true 
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
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm font-medium">{products.length} produtos</p>
                    <p className="text-xs text-muted-foreground"><span className="text-green-600">{totalActive} ativos</span>{" · "}<span className="text-gray-400">{totalInactive} inativos</span></p>
                </div>
                <Button onClick={openNew} className="bg-primary text-white rounded-full" data-testid="add-product-btn"><Plus className="h-4 w-4 mr-1" />Novo Produto</Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-5">
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="rounded-lg border border-input bg-white px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Todas categorias</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex rounded-lg border border-input overflow-hidden bg-white text-sm">
                    {[["all","Todos"],["active","Ativos"],["inactive","Inativos"]].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setFilterStatus(val)}
                            className={`px-3 py-2 transition-colors ${filterStatus === val ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50"}`}>{label}</button>
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
                                className={`bg-white dark:bg-card rounded-2xl border border-border overflow-hidden ${!p.active ? "opacity-50" : ""}`}
                                data-testid={`admin-product-${p.id}`}>
                                {p.image_url
                                    ? <img src={getImageUrl(p.image_url)} alt={p.name} className="h-32 w-full object-cover" />
                                    : <div className="h-32 w-full bg-muted/40 flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/30" /></div>
                                }
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-semibold font-heading text-sm truncate">{p.name}</h3>
                                            <p className="text-xs text-muted-foreground">{getCategoryName(p.category_id)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`font-bold text-sm ${hasZeroPrice ? "text-amber-500" : "text-primary"}`}>R$ {p.price?.toFixed(2)}</span>
                                            {hasZeroPrice && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">sob consulta</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 my-2">
                                        {p.tags?.map(t => <Badge key={t} variant="secondary" className="text-xs rounded-full">{t}</Badge>)}
                                        {optCount > 0 && <Badge className="bg-accent/10 text-accent text-xs rounded-full">{optCount} opcionais</Badge>}
                                        {p.stock === 0 && <Badge variant="destructive" className="text-xs rounded-full">Sem estoque</Badge>}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div className="flex items-center gap-2">
                                            <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
                                            <span className="text-xs text-muted-foreground">{p.active ? "Ativo" : "Inativo"}</span>
                                        </div>
                                        <div className="flex gap-0.5">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(p)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => clone(p.id)} title="Clonar"><Copy className="h-3.5 w-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => askDelete(p.id)} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
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

            <ConfirmDialog open={confirmOpen} title="Excluir produto?" description="Esta ação não pode ser desfeita. O produto será removido do cardápio." confirmLabel="Excluir" danger onConfirm={confirmDelete} onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />

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
                            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required>
                                <option value="">Selecione uma categoria</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                {["vegano", "leve", "mais_pedido", "recomendado"].map(t => (
                                    <button key={t} type="button" onClick={() => toggleTag(t)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                            form.tags.includes(t)
                                                ? "bg-primary text-white border-primary"
                                                : "bg-white text-foreground border-border hover:border-primary/50"
                                        }`}>{t}
                                    </button>
                                ))}
                                {form.tags.filter(t => !["vegano", "leve", "mais_pedido", "recomendado"].includes(t)).map(t => (
                                    <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/30">
                                        {t}
                                        <button type="button" onClick={() => toggleTag(t)} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag personalizada..." className="rounded-lg flex-1 text-sm" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} data-testid="new-tag-input" />
                                <Button type="button" size="sm" variant="outline" onClick={addCustomTag} className="rounded-lg shrink-0"><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
                            </div>
                        </div>

                        {/* Opcionais */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label className="text-sm font-medium">Opcionais / Complementos</Label>
                                {form.complement_ids.length > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{form.complement_ids.length} selecionado{form.complement_ids.length > 1 ? "s" : ""}</span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">Selecione os complementos e configure as regras por categoria</p>

                            {complements.filter(c => c.active).length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                                    <p className="text-xs text-muted-foreground">Nenhum complemento cadastrado.</p>
                                    <p className="text-xs text-muted-foreground">Crie na aba <strong>Opcionais</strong>.</p>
                                </div>
                            ) : (() => {
                                // Usar categorias dinâmicas do banco
                                const grouped = {};
                                complements.filter(c => c.active).forEach(c => {
                                    const k = c.category || "extras";
                                    if (!grouped[k]) grouped[k] = [];
                                    grouped[k].push(c);
                                });
                                // Ordenar categorias pelo order_index
                                const sortedCats = compCategories
                                    .filter(cat => grouped[cat.key])
                                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                                    .map(cat => cat.key);
                                return (
                                    <div className="space-y-4">
                                        {sortedCats.map(catKey => {
                                            const catInfo = compCategories.find(c => c.key === catKey);
                                            const info = catInfo ? { label: catInfo.name, icon: catInfo.icon || "➕" } : { label: catKey, icon: "➕" };
                                            const items = grouped[catKey];
                                            const rule = form.complement_rules[catKey] || { required: false, min_select: 0, max_select: 1 };
                                            const selectedInCat = items.filter(c => form.complement_ids.includes(c.id)).length;
                                            const hasSomeSelected = selectedInCat > 0;
                                            return (
                                                <div key={catKey} className={`rounded-xl border-2 overflow-hidden transition-all ${
                                                    hasSomeSelected ? "border-primary/40" : "border-border"
                                                }`}>
                                                    {/* Cabeçalho da categoria */}
                                                    <div className={`flex items-center justify-between px-3 py-2 ${
                                                        hasSomeSelected ? "bg-primary/5" : "bg-muted/30"
                                                    }`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">{info.icon}</span>
                                                            <span className="text-sm font-semibold">{info.label}</span>
                                                            {hasSomeSelected && (
                                                                <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{selectedInCat} item{selectedInCat > 1 ? "ns" : ""}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Itens da categoria */}
                                                    <div className="p-2 space-y-1.5">
                                                        {items.map(c => (
                                                            <button key={c.id} type="button" onClick={() => toggleComp(c.id)}
                                                                className={`w-full flex items-center justify-between p-2 rounded-lg border text-left text-sm transition-all ${
                                                                    form.complement_ids.includes(c.id)
                                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                                        : "border-border hover:border-primary/30 bg-white"
                                                                }`} data-testid={`comp-select-${c.id}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${
                                                                        form.complement_ids.includes(c.id) ? "bg-primary border-primary" : "border-gray-300"
                                                                    }`}>
                                                                        {form.complement_ids.includes(c.id) && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                    <span className="font-medium">{c.name}</span>
                                                                </div>
                                                                <span className="text-primary font-semibold">R$ {parseFloat(c.price).toFixed(2)}</span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Regras da categoria — só aparece se tem algum selecionado */}
                                                    {hasSomeSelected && (
                                                        <div className="border-t border-primary/20 bg-primary/3 px-3 py-2.5 space-y-2">
                                                            <p className="text-xs font-semibold text-primary/80">Regras para "{info.label}"</p>
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                {/* Obrigatório */}
                                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                    <div
                                                                        role="checkbox"
                                                                        aria-checked={rule.required}
                                                                        onClick={() => updateCatRule(catKey, "required", !rule.required)}
                                                                        className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                                                            rule.required ? "bg-amber-500 border-amber-500" : "border-gray-300 bg-white"
                                                                        }`}>
                                                                        {rule.required && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                    <span className="text-xs font-medium text-gray-700">
                                                                        Seleção obrigatória
                                                                        {rule.required && <span className="ml-1 text-xs text-amber-600">(cliente deve escolher)</span>}
                                                                    </span>
                                                                </label>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                {/* Mínimo */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-600 whitespace-nowrap">Mín:</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <button type="button"
                                                                            onClick={() => updateCatRule(catKey, "min_select", Math.max(0, (rule.min_select || 0) - 1))}
                                                                            className="h-6 w-6 rounded border border-border bg-white flex items-center justify-center hover:bg-muted text-sm">−</button>
                                                                        <span className="w-6 text-center text-sm font-semibold">{rule.min_select || 0}</span>
                                                                        <button type="button"
                                                                            onClick={() => updateCatRule(catKey, "min_select", Math.min(rule.max_select || 1, (rule.min_select || 0) + 1))}
                                                                            className="h-6 w-6 rounded border border-border bg-white flex items-center justify-center hover:bg-muted text-sm">+</button>
                                                                    </div>
                                                                </div>
                                                                {/* Máximo */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-600 whitespace-nowrap">Máx:</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <button type="button"
                                                                            onClick={() => updateCatRule(catKey, "max_select", Math.max(rule.min_select || 0, Math.max(1, (rule.max_select || 1) - 1)))}
                                                                            className="h-6 w-6 rounded border border-border bg-white flex items-center justify-center hover:bg-muted text-sm">−</button>
                                                                        <span className="w-6 text-center text-sm font-semibold">{rule.max_select || 1}</span>
                                                                        <button type="button"
                                                                            onClick={() => updateCatRule(catKey, "max_select", (rule.max_select || 1) + 1)}
                                                                            className="h-6 w-6 rounded border border-border bg-white flex items-center justify-center hover:bg-muted text-sm">+</button>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {rule.max_select > 1 ? `cliente pode escolher até ${rule.max_select}` : "apenas 1 escolha"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-3 pt-2 border-t">
                            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" className="flex-1 bg-primary text-white rounded-full" data-testid="save-product-btn">{editing ? "Salvar alterações" : "Criar Produto"}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== OPTIONALS TAB ==================== */
function OptionalsTab({ headers }) {
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

    const del = async (id) => { 
        if (!window.confirm("Excluir complemento?")) return; 
        await axios.delete(`${API}/admin/complements/${id}`, { headers }); 
        toast.success("Excluido"); 
        fetch(); 
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

    // Categorias ordenadas
    const sortedCategories = [...compCategories].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

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
    
    const delCategory = async (id) => {
        if (!window.confirm("Excluir categoria?\n\nOs complementos desta categoria ficarão sem categoria.")) return;
        try {
            await axios.delete(`${API}/admin/complement-categories/${id}`, { headers });
            toast.success("Categoria excluida");
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Erro ao excluir");
        }
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
                        <div key={cat.id} className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${isActive ? "bg-white border-primary/20 hover:border-primary/40" : "bg-muted/30 border-border hover:border-muted-foreground/30"}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{cat.icon || "📦"}</span>
                                {cat.required && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" title="Obrigatório" />
                                )}
                            </div>
                            <p className="font-medium text-sm truncate">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</p>
                            <div className="mt-2 flex gap-1">
                                <button onClick={() => editCategory(cat)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Editar">
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => delCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Excluir">
                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {/* Card para adicionar nova categoria */}
                <button onClick={openNewCategory} className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">Nova Categoria</span>
                </button>
            </div>

            {/* Barra de busca */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar complementos..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="pl-10 rounded-full max-w-md"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20">
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
                                    <h4 className="font-semibold text-foreground">{cat.name}</h4>
                                    <p className="text-xs text-muted-foreground">{comps.length} item{comps.length !== 1 ? "s" : ""}</p>
                                </div>
                                {cat.required && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Obrigatório</Badge>
                                )}
                            </div>
                            
                            {comps.length > 0 ? (
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {comps.map(c => (
                                        <div key={c.id} 
                                            className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                                            data-testid={`complement-${c.id}`}>
                                            <div className="flex items-center gap-3">
                                                {c.image_url ? (
                                                    <img src={getImageUrl(c.image_url)} alt={c.name} className="h-12 w-12 rounded-xl object-cover" />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                                        <Tag className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-semibold font-heading text-sm">{c.name}</h3>
                                                    {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                                                    <span className="text-sm font-bold text-primary">R$ {c.price?.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
                                                <Button size="icon" variant="ghost" onClick={() => edit(c)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-muted/30 rounded-xl border-2 border-dashed border-border">
                                    <p className="text-sm text-muted-foreground">Nenhum complemento nesta categoria</p>
                                    <Button variant="link" onClick={() => { setEditing(null); setForm({ ...form, category: cat.key }); setShowForm(true); }} className="text-primary">
                                        Adicionar primeiro item
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {complements.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum complemento cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie um complemento para começar</p>
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
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm">
                                        {sortedCategories.map(cat => (
                                            <option key={cat.key} value={cat.key}>{cat.icon} {cat.name}</option>
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
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => delCategory(cat.id)}>
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
        if (!window.confirm("Excluir banner?")) return;
        await axios.delete(`${API}/admin/banners/${id}`, { headers });
        toast.success("Banner excluido");
        fetch();
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

    const del = async (id) => {
        if (!window.confirm("Excluir combo?")) return;
        await axios.delete(`${API}/admin/combos/${id}`, { headers });
        toast.success("Combo excluido");
        fetch();
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
