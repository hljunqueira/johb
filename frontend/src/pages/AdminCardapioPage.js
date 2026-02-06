import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Upload, Package, Layers, Tag, Grid3X3, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const getImageUrl = (url) => { if (!url) return ""; if (url.startsWith("http")) return url; return `${BACKEND_URL}${url}`; };

export default function AdminCardapioPage() {
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    return (
        <div data-testid="admin-cardapio-page">
            <h1 className="text-2xl font-bold font-heading mb-6">Cardapio</h1>
            <Tabs defaultValue="produtos" className="w-full">
                <TabsList className="bg-muted rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto">
                    <TabsTrigger value="menus" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm" data-testid="tab-menus"><Layers className="h-4 w-4 mr-1.5" />Menus</TabsTrigger>
                    <TabsTrigger value="categorias" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm" data-testid="tab-categorias"><Grid3X3 className="h-4 w-4 mr-1.5" />Categorias</TabsTrigger>
                    <TabsTrigger value="produtos" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm" data-testid="tab-produtos"><Package className="h-4 w-4 mr-1.5" />Produtos</TabsTrigger>
                    <TabsTrigger value="opcionais" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm" data-testid="tab-opcionais"><Tag className="h-4 w-4 mr-1.5" />Opcionais</TabsTrigger>
                </TabsList>
                <TabsContent value="menus"><MenusTab headers={headers} /></TabsContent>
                <TabsContent value="categorias"><CategoriasTab headers={headers} /></TabsContent>
                <TabsContent value="produtos"><ProdutosTab headers={headers} /></TabsContent>
                <TabsContent value="opcionais"><OpcionaisTab headers={headers} /></TabsContent>
            </Tabs>
        </div>
    );
}

/* ==================== MENUS TAB ==================== */
function MenusTab({ headers }) {
    const [menus, setMenus] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", category_ids: [], active: true });

    const fetch = async () => {
        const [m, c] = await Promise.all([
            axios.get(`${API}/admin/menus`, { headers }),
            axios.get(`${API}/admin/categories`, { headers })
        ]);
        setMenus(m.data); setCategories(c.data);
    };
    useEffect(() => { fetch(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) await axios.put(`${API}/admin/menus/${editing}`, form, { headers });
            else await axios.post(`${API}/admin/menus`, form, { headers });
            toast.success(editing ? "Menu atualizado" : "Menu criado"); setShowForm(false); setEditing(null); fetch();
        } catch { toast.error("Erro ao salvar"); }
    };

    const del = async (id) => { if (!window.confirm("Excluir menu?")) return; await axios.delete(`${API}/admin/menus/${id}`, { headers }); toast.success("Menu excluido"); fetch(); };
    const edit = (m) => { setEditing(m.id); setForm({ name: m.name, description: m.description, category_ids: m.category_ids || [], active: m.active }); setShowForm(true); };
    const toggleCat = (catId) => setForm(f => ({ ...f, category_ids: f.category_ids.includes(catId) ? f.category_ids.filter(c => c !== catId) : [...f.category_ids, catId] }));

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Gerencie os menus do seu restaurante. Cada menu agrupa categorias.</p>
                <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", category_ids: [], active: true }); setShowForm(true); }} className="bg-primary text-white rounded-full" data-testid="add-menu-btn"><Plus className="h-4 w-4 mr-1" />Novo Menu</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {menus.map(m => (
                    <div key={m.id} className="bg-white dark:bg-card rounded-2xl border border-border p-5" data-testid={`menu-${m.id}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div><h3 className="font-semibold font-heading">{m.name}</h3><p className="text-xs text-muted-foreground">{m.description}</p></div>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => edit(m)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(m.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {m.category_ids?.map(cid => { const cat = categories.find(c => c.id === cid); return cat ? <Badge key={cid} variant="secondary" className="rounded-full text-xs">{cat.name}</Badge> : null; })}
                        </div>
                        <div className="flex items-center gap-2 mt-3"><Badge className={`rounded-full text-xs ${m.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{m.active ? "Ativo" : "Inativo"}</Badge></div>
                    </div>
                ))}
            </div>
            {menus.length === 0 && <div className="text-center py-12"><Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhum menu criado</p></div>}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Menu" : "Novo Menu"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="menu-name" /></div>
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="menu-desc" /></div>
                        <div><Label>Categorias</Label>
                            <div className="flex flex-wrap gap-2 mt-2">{categories.map(c => (
                                <button key={c.id} type="button" onClick={() => toggleCat(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.category_ids.includes(c.id) ? "bg-primary text-white" : "bg-muted text-foreground"}`}>{c.name}</button>
                            ))}</div>
                        </div>
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-menu-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== CATEGORIAS TAB ==================== */
function CategoriasTab({ headers }) {
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", icon: "" });

    const fetch = async () => { const r = await axios.get(`${API}/admin/categories`, { headers }); setCategories(r.data); };
    useEffect(() => { fetch(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) await axios.put(`${API}/admin/categories/${editing}`, form, { headers });
            else await axios.post(`${API}/admin/categories`, form, { headers });
            toast.success(editing ? "Categoria atualizada" : "Categoria criada"); setShowForm(false); setEditing(null); fetch();
        } catch { toast.error("Erro ao salvar"); }
    };

    const del = async (id) => { if (!window.confirm("Excluir categoria?")) return; await axios.delete(`${API}/admin/categories/${id}`, { headers }); toast.success("Excluida"); fetch(); };
    const edit = (c) => { setEditing(c.id); setForm({ name: c.name, description: c.description || "", icon: c.icon || "" }); setShowForm(true); };
    const toggleActive = async (c) => { await axios.put(`${API}/admin/categories/${c.id}`, { active: !c.active }, { headers }); fetch(); };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Organize seus produtos em categorias.</p>
                <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", icon: "" }); setShowForm(true); }} className="bg-primary text-white rounded-full" data-testid="add-category-btn"><Plus className="h-4 w-4 mr-1" />Nova Categoria</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categories.map(c => (
                    <div key={c.id} className={`bg-white dark:bg-card rounded-2xl border border-border p-4 flex items-center justify-between ${!c.active ? "opacity-50" : ""}`} data-testid={`category-${c.id}`}>
                        <div><h3 className="font-semibold font-heading text-sm">{c.name}</h3><p className="text-xs text-muted-foreground">{c.description}</p></div>
                        <div className="flex items-center gap-1">
                            <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                            <Button size="icon" variant="ghost" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ))}
            </div>
            {categories.length === 0 && <div className="text-center py-12"><Grid3X3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhuma categoria</p></div>}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="cat-name" /></div>
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="cat-desc" /></div>
                        <div><Label>Icone (slug)</Label><Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="salad, bowl, juice..." className="mt-1 rounded-lg" data-testid="cat-icon" /></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-cat-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ==================== PRODUTOS TAB ==================== */
function ProdutosTab({ headers }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [complements, setComplements] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", price: "", category_id: "", image_url: "", stock: -1, tags: [], complement_ids: [], active: true });
    const [newTag, setNewTag] = useState("");

    const fetchAll = async () => {
        const [p, c, co] = await Promise.all([
            axios.get(`${API}/admin/products`, { headers }),
            axios.get(`${API}/admin/categories`, { headers }),
            axios.get(`${API}/admin/complements`, { headers })
        ]);
        setProducts(p.data); setCategories(c.data); setComplements(co.data);
    };
    useEffect(() => { fetchAll(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
        try {
            if (editing) await axios.put(`${API}/admin/products/${editing}`, data, { headers });
            else await axios.post(`${API}/admin/products`, data, { headers });
            toast.success(editing ? "Produto atualizado" : "Produto criado"); setShowForm(false); setEditing(null); fetchAll();
        } catch { toast.error("Erro ao salvar"); }
    };

    const del = async (id) => { if (!window.confirm("Excluir?")) return; await axios.delete(`${API}/admin/products/${id}`, { headers }); toast.success("Excluido"); fetchAll(); };
    const clone = async (id) => { await axios.post(`${API}/admin/products/${id}/clone`, {}, { headers }); toast.success("Clonado"); fetchAll(); };
    const toggle = async (p) => { await axios.put(`${API}/admin/products/${p.id}`, { active: !p.active }, { headers }); fetchAll(); };
    const edit = (p) => { setEditing(p.id); setForm({ name: p.name, description: p.description, price: p.price, category_id: p.category_id, image_url: p.image_url, stock: p.stock, tags: p.tags || [], complement_ids: p.complement_ids || [], active: p.active }); setShowForm(true); };
    const openNew = () => { setEditing(null); setForm({ name: "", description: "", price: "", category_id: "", image_url: "", stock: -1, tags: [], complement_ids: [], active: true }); setShowForm(true); };

    const toggleTag = (t) => setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }));
    const addCustomTag = () => { const t = newTag.trim().toLowerCase().replace(/\s+/g, "_"); if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] })); setNewTag(""); };
    const toggleComp = (id) => setForm(f => ({ ...f, complement_ids: f.complement_ids.includes(id) ? f.complement_ids.filter(c => c !== id) : [...f.complement_ids, id] }));

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try { const fd = new FormData(); fd.append("file", file); const r = await axios.post(`${API}/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } }); setForm(f => ({ ...f, image_url: r.data.url })); toast.success("Imagem enviada"); }
        catch { toast.error("Erro no upload"); }
    };

    const getCatName = (id) => categories.find(c => c.id === id)?.name || "";

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Gerencie seus produtos. Vincule opcionais/complementos a cada produto.</p>
                <Button onClick={openNew} className="bg-primary text-white rounded-full" data-testid="add-product-btn"><Plus className="h-4 w-4 mr-1" />Novo Produto</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map(p => (
                    <div key={p.id} className={`bg-white dark:bg-card rounded-2xl border border-border overflow-hidden ${!p.active ? "opacity-50" : ""}`} data-testid={`admin-product-${p.id}`}>
                        {p.image_url && <img src={getImageUrl(p.image_url)} alt={p.name} className="h-32 w-full object-cover" />}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-1"><div><h3 className="font-semibold font-heading text-sm">{p.name}</h3><p className="text-xs text-muted-foreground">{getCatName(p.category_id)}</p></div><span className="font-bold text-primary text-sm">R$ {p.price?.toFixed(2)}</span></div>
                            <div className="flex flex-wrap gap-1 my-2">
                                {p.tags?.map(t => <Badge key={t} variant="secondary" className="text-xs rounded-full">{t}</Badge>)}
                                {(p.complement_ids?.length > 0 || p.additionals?.length > 0) && <Badge className="bg-accent/10 text-accent text-xs rounded-full">{p.complement_ids?.length || p.additionals?.length} opcionais</Badge>}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><Switch checked={p.active} onCheckedChange={() => toggle(p)} /><span className="text-xs text-muted-foreground">{p.active ? "Ativo" : "Inativo"}</span></div>
                                <div className="flex gap-0.5">
                                    <Button size="icon" variant="ghost" onClick={() => edit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => clone(p.id)}><Copy className="h-3.5 w-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {products.length === 0 && <div className="text-center py-12"><Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhum produto</p></div>}

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
                            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm" required data-testid="product-category">
                                <option value="">Selecione</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

/* ==================== OPCIONAIS TAB ==================== */
function OpcionaisTab({ headers }) {
    const [complements, setComplements] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", price: "", description: "", active: true });

    const fetch = async () => { const r = await axios.get(`${API}/admin/complements`, { headers }); setComplements(r.data); };
    useEffect(() => { fetch(); }, []); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        const data = { ...form, price: parseFloat(form.price) };
        try {
            if (editing) await axios.put(`${API}/admin/complements/${editing}`, data, { headers });
            else await axios.post(`${API}/admin/complements`, data, { headers });
            toast.success(editing ? "Complemento atualizado" : "Complemento criado"); setShowForm(false); setEditing(null); fetch();
        } catch { toast.error("Erro ao salvar"); }
    };

    const del = async (id) => { if (!window.confirm("Excluir complemento?")) return; await axios.delete(`${API}/admin/complements/${id}`, { headers }); toast.success("Excluido"); fetch(); };
    const edit = (c) => { setEditing(c.id); setForm({ name: c.name, price: c.price, description: c.description || "", active: c.active }); setShowForm(true); };
    const toggle = async (c) => { await axios.put(`${API}/admin/complements/${c.id}`, { active: !c.active }, { headers }); fetch(); };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Crie complementos/opcionais que podem ser vinculados aos produtos.</p>
                <Button onClick={() => { setEditing(null); setForm({ name: "", price: "", description: "", active: true }); setShowForm(true); }} className="bg-primary text-white rounded-full" data-testid="add-complement-btn"><Plus className="h-4 w-4 mr-1" />Novo Complemento</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {complements.map(c => (
                    <div key={c.id} className={`bg-white dark:bg-card rounded-2xl border border-border p-4 flex items-center justify-between ${!c.active ? "opacity-50" : ""}`} data-testid={`complement-${c.id}`}>
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
            {complements.length === 0 && <div className="text-center py-12"><Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhum complemento</p></div>}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Complemento" : "Novo Complemento"}</DialogTitle></DialogHeader>
                    <form onSubmit={save} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="comp-name" /></div>
                        <div><Label>Preco (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 rounded-lg" required data-testid="comp-price" /></div>
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="comp-desc" /></div>
                        <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><span className="text-sm">Ativo</span></div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-comp-btn">{editing ? "Atualizar" : "Criar"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
