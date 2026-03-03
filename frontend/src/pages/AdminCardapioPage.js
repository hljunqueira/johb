import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Upload, Package, Layers, Tag, Grid3X3, X, Image, Gift } from "lucide-react";
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
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="menu-desc" /></div>
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
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="cat-desc" /></div>
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

/* ==================== PRODUCTS TAB ==================== */
function ProductsTab({ headers }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [complements, setComplements] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ 
        name: "", description: "", price: "", category_id: "", image_url: "", stock: -1, tags: [], complement_ids: [], active: true 
    });
    const [newTag, setNewTag] = useState("");

    const fetchAll = async () => {
        const [p, c, co] = await Promise.all([
            axios.get(`${API}/admin/products`, { headers }),
            axios.get(`${API}/admin/categories`, { headers }),
            axios.get(`${API}/admin/complements`, { headers })
        ]);
        setProducts(p.data); 
        setCategories(c.data);
        setComplements(co.data);
    };
    useEffect(() => { fetchAll(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        const data = { 
            ...form, 
            price: parseFloat(form.price), 
            stock: parseInt(form.stock) 
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

    const del = async (id) => { 
        if (!window.confirm("Excluir?")) return; 
        await axios.delete(`${API}/admin/products/${id}`, { headers }); 
        toast.success("Excluido"); 
        fetchAll(); 
    };
    
    const clone = async (id) => { 
        await axios.post(`${API}/admin/products/${id}/clone`, {}, { headers }); 
        toast.success("Clonado"); 
        fetchAll(); 
    };
    
    const toggle = async (p) => { 
        await axios.put(`${API}/admin/products/${p.id}`, { active: !p.active }, { headers }); 
        fetchAll(); 
    };
    
    const edit = (p) => { 
        setEditing(p.id); 
        setForm({ 
            name: p.name, description: p.description, price: p.price, 
            category_id: p.category_id || "", image_url: p.image_url, stock: p.stock, 
            tags: p.tags || [], complement_ids: p.complement_ids || [], active: p.active 
        }); 
        setShowForm(true); 
    };
    
    const openNew = () => { 
        setEditing(null); 
        setForm({ 
            name: "", description: "", price: "", category_id: "", 
            image_url: "", stock: -1, tags: [], complement_ids: [], active: true 
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

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try { 
            const fd = new FormData(); 
            fd.append("file", file); 
            const r = await axios.post(`${API}/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } }); 
            setForm(f => ({ ...f, image_url: r.data.url })); 
            toast.success("Imagem enviada"); 
        }
        catch { 
            toast.error("Erro no upload"); 
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">Gerencie todos os produtos.</p>
                    <p className="text-xs text-muted-foreground mt-1">Vincule produtos a categorias para organizar o cardápio.</p>
                </div>
                <Button onClick={openNew} className="bg-primary text-white rounded-full" data-testid="add-product-btn"><Plus className="h-4 w-4 mr-1" />Novo Produto</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map(p => (
                    <div key={p.id} 
                         className={`bg-white dark:bg-card rounded-2xl border border-border overflow-hidden ${!p.active ? "opacity-50" : ""}`} 
                         data-testid={`admin-product-${p.id}`}>
                        {p.image_url && <img src={getImageUrl(p.image_url)} alt={p.name} className="h-32 w-full object-cover" />}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h3 className="font-semibold font-heading text-sm">{p.name}</h3>
                                    <p className="text-xs text-muted-foreground">{getCategoryName(p.category_id)}</p>
                                </div>
                                <span className="font-bold text-primary text-sm">R$ {p.price?.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 my-2">
                                {p.tags?.map(t => <Badge key={t} variant="secondary" className="text-xs rounded-full">{t}</Badge>)}
                                {(p.complement_ids?.length > 0 || p.additionals?.length > 0) && <Badge className="bg-accent/10 text-accent text-xs rounded-full">{p.complement_ids?.length || p.additionals?.length} opcionais</Badge>}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
                                    <span className="text-xs text-muted-foreground">{p.active ? "Ativo" : "Inativo"}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-0.5 mt-2 pt-2 border-t">
                                <Button size="icon" variant="ghost" onClick={() => edit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => clone(p.id)}><Copy className="h-3.5 w-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {products.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum produto cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie um produto para começar</p>
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" data-testid="product-form">
                    <DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="product-name" /></div>
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="product-desc" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label>Preco (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 rounded-lg" required data-testid="product-price" /></div>
                            <div><Label>Estoque (-1 = ilimitado)</Label><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="mt-1 rounded-lg" data-testid="product-stock" /></div>
                        </div>
                        <div><Label>Categoria</Label>
                            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm" required>
                                <option value="">Selecione uma categoria</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div><Label>Imagem</Label>
                            <div className="mt-1 flex gap-2 items-center">
                                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL da imagem" className="rounded-lg flex-1" data-testid="product-image-url" />
                                <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handleUpload} /><Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button></label>
                            </div>
                            {form.image_url && <img src={getImageUrl(form.image_url)} alt="" className="mt-2 h-20 w-20 object-cover rounded-lg" />}
                        </div>
                        <div><Label>Tags</Label>
                            <div className="flex flex-wrap gap-2 mt-1 mb-2">{["vegano", "leve", "mais_pedido", "recomendado"].map(t => (
                                <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1 rounded-full text-xs font-medium ${form.tags.includes(t) ? "bg-primary text-white" : "bg-muted text-foreground"}`}>{t}</button>
                            ))}</div>
                            {form.tags.filter(t => !["vegano", "leve", "mais_pedido", "recomendado"].includes(t)).map(t => (
                                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 mr-1 mb-1 rounded-full text-xs font-medium bg-accent/15 text-accent"><Tag className="h-3 w-3" />{t}<button type="button" onClick={() => toggleTag(t)}><X className="h-3 w-3" /></button></span>
                            ))}
                            <div className="flex gap-2 mt-1"><Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag..." className="rounded-lg flex-1 text-sm" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} data-testid="new-tag-input" /><Button type="button" size="sm" variant="outline" onClick={addCustomTag} className="rounded-lg"><Plus className="h-3 w-3 mr-1" />Tag</Button></div>
                        </div>
                        <div><Label>Opcionais / Complementos</Label>
                            <p className="text-xs text-muted-foreground mb-2">Selecione os complementos disponiveis para este produto</p>
                            <div className="space-y-1.5 max-h-40 overflow-auto">
                                {complements.filter(c => c.active).map(c => (
                                    <button key={c.id} type="button" onClick={() => toggleComp(c.id)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-sm transition-all ${form.complement_ids.includes(c.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`} data-testid={`comp-select-${c.id}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${form.complement_ids.includes(c.id) ? "bg-primary border-primary" : "border-gray-300"}`}>
                                                {form.complement_ids.includes(c.id) && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="font-medium">{c.name}</span>
                                        </div>
                                        <span className="text-primary font-medium">R$ {c.price.toFixed(2)}</span>
                                    </button>
                                ))}
                                {complements.filter(c => c.active).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum complemento. Crie na aba "Opcionais".</p>}
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-product-btn">{editing ? "Atualizar" : "Criar"} Produto</Button>
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
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [form, setForm] = useState({ name: "", price: "", description: "", category: "extras", active: true });
    const [categoryForm, setCategoryForm] = useState({ key: "", name: "", icon: "", order_index: 0, required: false, min_select: 1, max_select: 1 });

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
        
        // Validar tamanho (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem muito grande. Máximo 2MB.");
            return;
        }
        
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/upload`, fd, { 
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
        
        // Validar tipo
        if (!file.type.startsWith("image/")) {
            toast.error("Apenas imagens são permitidas");
            return;
        }
        
        // Validar tamanho (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem muito grande. Máximo 2MB.");
            return;
        }
        
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/upload`, fd, { 
                headers: { ...headers, "Content-Type": "multipart/form-data" } 
            });
            setForm(f => ({ ...f, image_url: r.data.url }));
            toast.success("Imagem enviada!");
        } catch {
            toast.error("Erro ao enviar imagem");
        }
    };

    // Categorias dinâmicas do banco
    const complementCategories = compCategories.reduce((acc, cat) => {
        acc[cat.key] = cat.name;
        return acc;
    }, {});

    // Agrupar complementos por categoria
    const groupedComplements = {};
    complements.filter(c => c.active).forEach(c => {
        const cat = c.category || "extras";
        if (!groupedComplements[cat]) groupedComplements[cat] = [];
        groupedComplements[cat].push(c);
    });

    // Salvar categoria
    const saveCategory = async (e) => {
        e.preventDefault();
        try {
            const fd = new FormData();
            fd.append("key", categoryForm.key);
            fd.append("name", categoryForm.name);
            fd.append("icon", categoryForm.icon);
            fd.append("order_index", categoryForm.order_index);
            fd.append("required", categoryForm.required);
            fd.append("min_select", categoryForm.required ? categoryForm.min_select : 0);
            fd.append("max_select", categoryForm.max_select);
            
            if (editingCategory) {
                await axios.put(`${API}/admin/complement-categories/${editingCategory}`, fd, { headers });
                toast.success("Categoria atualizada");
            } else {
                await axios.post(`${API}/admin/complement-categories`, fd, { headers });
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
        if (!window.confirm("Excluir categoria?")) return;
        try {
            await axios.delete(`${API}/admin/complement-categories/${id}`, { headers });
            toast.success("Categoria excluida");
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Erro ao excluir");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">Gerencie todos os complementos/opcionais.</p>
                    <p className="text-xs text-muted-foreground mt-1">Os complementos podem ser vinculados aos produtos na aba Produtos.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { setEditingCategory(null); setCategoryForm({ key: "", name: "", icon: "", order_index: 0, required: false, min_select: 1, max_select: 1 }); setShowCategoryForm(true); }} variant="outline" className="rounded-full">
                        <Layers className="h-4 w-4 mr-1" />Gerenciar Categorias
                    </Button>
                    <Button onClick={() => { setEditing(null); setForm({ name: "", price: "", description: "", image_url: "", category: compCategories[0]?.key || "extras", required: false, min_select: 0, max_select: 1, active: true }); setShowForm(true); }} className="bg-primary text-white rounded-full" data-testid="add-complement-btn"><Plus className="h-4 w-4 mr-1" />Novo Complemento</Button>
                </div>
            </div>

            {/* Lista de complementos agrupados por categoria */}
            <div className="space-y-6">
                {Object.entries(groupedComplements).map(([cat, comps]) => (
                    <div key={cat}>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                            {complementCategories[cat] || cat}
                        </h4>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {comps.map(c => (
                                <div key={c.id} 
                                     className="bg-white dark:bg-card rounded-2xl border border-border p-4 flex items-center justify-between"
                                     data-testid={`complement-${c.id}`}>
                                    <div>
                                        <h3 className="font-semibold font-heading text-sm">{c.name}</h3>
                                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                                        <span className="text-sm font-bold text-primary">R$ {c.price?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
                                        <Button size="icon" variant="ghost" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {complements.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-2xl">
                    <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum complemento cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie um complemento para começar</p>
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-heading">{editing ? "Editar Complemento" : "Novo Complemento"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        {/* Layout em duas colunas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Coluna Esquerda - Upload de Imagem */}
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
                                            <img 
                                                src={form.image_url.startsWith("http") ? form.image_url : `${BACKEND_URL}${form.image_url}`} 
                                                alt="Preview" 
                                                className="w-full h-48 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, image_url: "" })); }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
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
                                    <input 
                                        id="comp-image-upload"
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageUpload}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground text-center">
                                    Formatos: JPG, PNG, WEBP (max 2MB)
                                </div>
                            </div>
                            
                            {/* Coluna Direita - Dados */}
                            <div className="space-y-4">
                                <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="comp-name" /></div>
                                <div><Label>Preco (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 rounded-lg" required data-testid="comp-price" /></div>
                                <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="comp-desc" /></div>
                                
                                <div><Label>Categoria</Label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm">
                                        {Object.entries(complementCategories).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Obrigatoriedade */}
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <Switch checked={form.required} onCheckedChange={v => setForm(f => ({ ...f, required: v }))} />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Obrigatório no pedido</span>
                                <span className="text-xs text-muted-foreground">Cliente deve selecionar pelo menos um item desta categoria</span>
                            </div>
                        </div>
                        
                        {/* Min/Max seleção */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm">Mínimo para selecionar</Label>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    value={form.min_select || 0} 
                                    onChange={e => setForm(f => ({ ...f, min_select: parseInt(e.target.value) || 0 }))} 
                                    className="mt-1 rounded-lg" 
                                />
                            </div>
                            <div>
                                <Label className="text-sm">Máximo permitido</Label>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    value={form.max_select || 1} 
                                    onChange={e => setForm(f => ({ ...f, max_select: parseInt(e.target.value) || 1 }))} 
                                    className="mt-1 rounded-lg" 
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-comp-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Modal de Gerenciar Categorias */}
            <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
                <DialogContent className="rounded-2xl max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-heading">Gerenciar Categorias de Complemento</DialogTitle>
                    </DialogHeader>
                    
                    {/* Lista de categorias existentes */}
                    <div className="space-y-2 mb-6 max-h-60 overflow-auto">
                        {compCategories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{cat.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{cat.name}</p>
                                            {cat.required && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Obrigatório</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            key: {cat.key} | ordem: {cat.order_index}
                                            {cat.required && ` | min: ${cat.min_select} | max: ${cat.max_select}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => editCategory(cat)}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => delCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                        {compCategories.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">Nenhuma categoria cadastrada</p>
                        )}
                    </div>
                    
                    {/* Formulário de nova/editar categoria */}
                    <form onSubmit={saveCategory} className="border-t pt-4 space-y-4">
                        <h4 className="font-medium">{editingCategory ? "Editar Categoria" : "Nova Categoria"}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Código da categoria*</Label>
                                <Input 
                                    value={categoryForm.key} 
                                    onChange={e => setCategoryForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} 
                                    className="mt-1 rounded-lg" 
                                    placeholder="ex: frutas_frescas"
                                    required
                                    disabled={!!editingCategory}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Usado internamente, não pode ter espaços</p>
                            </div>
                            <div>
                                <Label className="text-xs">Nome da categoria*</Label>
                                <Input 
                                    value={categoryForm.name} 
                                    onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} 
                                    className="mt-1 rounded-lg" 
                                    placeholder="ex: Frutas Frescas"
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Nome exibido no cardápio</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Ícone (emoji)</Label>
                                <Input 
                                    value={categoryForm.icon} 
                                    onChange={e => setCategoryForm(f => ({ ...f, icon: e.target.value }))} 
                                    className="mt-1 rounded-lg" 
                                    placeholder="🍓"
                                    maxLength={2}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Emoji que aparece antes do nome</p>
                            </div>
                            <div>
                                <Label className="text-xs">Posição na lista</Label>
                                <Input 
                                    type="number"
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
            const r = await axios.post(`${API}/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
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
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" /></div>
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
