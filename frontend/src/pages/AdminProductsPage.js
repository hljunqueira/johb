import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Upload, Package, X, Tag } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const getImageUrl = (url) => { if (!url) return ""; if (url.startsWith("http")) return url; return `${BACKEND_URL}${url}`; };

const emptyProduct = { name: "", description: "", price: "", category_id: "", image_url: "", stock: -1, tags: [], active: true };

export default function AdminProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [form, setForm] = useState(emptyProduct);
    const [uploading, setUploading] = useState(false);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        const [p, c] = await Promise.all([
            axios.get(`${API}/admin/products`, { headers }),
            axios.get(`${API}/admin/categories`, { headers })
        ]);
        setProducts(p.data);
        setCategories(c.data);
    };
    useEffect(() => { fetchData(); }, []); // eslint-disable-line

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
        try {
            if (editingProduct) {
                await axios.put(`${API}/admin/products/${editingProduct}`, data, { headers });
                toast.success("Produto atualizado");
            } else {
                await axios.post(`${API}/admin/products`, data, { headers });
                toast.success("Produto criado");
            }
            setShowForm(false); setEditingProduct(null); setForm(emptyProduct); fetchData();
        } catch { toast.error("Erro ao salvar produto"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Excluir este produto?")) return;
        try { await axios.delete(`${API}/admin/products/${id}`, { headers }); toast.success("Produto excluido"); fetchData(); }
        catch { toast.error("Erro ao excluir"); }
    };

    const handleClone = async (id) => {
        try { await axios.post(`${API}/admin/products/${id}/clone`, {}, { headers }); toast.success("Produto clonado"); fetchData(); }
        catch { toast.error("Erro ao clonar"); }
    };

    const handleToggle = async (product) => {
        try { await axios.put(`${API}/admin/products/${product.id}`, { active: !product.active }, { headers }); fetchData(); }
        catch { toast.error("Erro ao alterar status"); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData(); fd.append("file", file);
            const res = await axios.post(`${API}/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
            setForm(f => ({ ...f, image_url: res.data.url }));
            toast.success("Imagem enviada");
        } catch { toast.error("Erro ao enviar imagem"); }
        finally { setUploading(false); }
    };

    const openEdit = (p) => { setEditingProduct(p.id); setForm({ name: p.name, description: p.description, price: p.price, category_id: p.category_id, image_url: p.image_url, stock: p.stock, tags: p.tags || [], active: p.active }); setShowForm(true); };
    const openNew = () => { setEditingProduct(null); setForm(emptyProduct); setShowForm(true); };

    const toggleTag = (tag) => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
    const [newTag, setNewTag] = useState("");
    const addCustomTag = () => {
        const tag = newTag.trim().toLowerCase().replace(/\s+/g, "_");
        if (tag && !form.tags.includes(tag)) { setForm(f => ({ ...f, tags: [...f.tags, tag] })); }
        setNewTag("");
    };
    const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

    const getCategoryName = (id) => categories.find(c => c.id === id)?.name || "";

    return (
        <div data-testid="admin-products-page">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold font-heading">Produtos</h1>
                <Button onClick={openNew} className="bg-primary text-white rounded-full" data-testid="add-product-btn"><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map(p => (
                    <div key={p.id} className={`bg-white dark:bg-card rounded-2xl border border-border overflow-hidden ${!p.active ? "opacity-60" : ""}`} data-testid={`admin-product-${p.id}`}>
                        {p.image_url && <img src={getImageUrl(p.image_url)} alt={p.name} className="h-36 w-full object-cover" />}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold font-heading">{p.name}</h3>
                                    <p className="text-xs text-muted-foreground">{getCategoryName(p.category_id)}</p>
                                </div>
                                <span className="font-bold text-primary">R$ {p.price?.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                            <div className="flex flex-wrap gap-1 mb-3">
                                {p.tags?.map(t => <Badge key={t} variant="secondary" className="text-xs rounded-full">{t}</Badge>)}
                                {p.stock >= 0 && <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="text-xs rounded-full">Estoque: {p.stock}</Badge>}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Switch checked={p.active} onCheckedChange={() => handleToggle(p)} data-testid={`toggle-${p.id}`} />
                                    <span className="text-xs text-muted-foreground">{p.active ? "Ativo" : "Inativo"}</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`edit-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleClone(p.id)} data-testid={`clone-${p.id}`}><Copy className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} className="text-destructive" data-testid={`delete-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {products.length === 0 && (
                <div className="text-center py-16"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhum produto cadastrado</p></div>
            )}

            {/* Product Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" data-testid="product-form">
                    <DialogHeader><DialogTitle className="font-heading">{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" required data-testid="product-name" /></div>
                        <div><Label>Descricao</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-lg" data-testid="product-desc" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label>Preco (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 rounded-lg" required data-testid="product-price" /></div>
                            <div><Label>Estoque (-1 = ilimitado)</Label><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="mt-1 rounded-lg" data-testid="product-stock" /></div>
                        </div>
                        <div>
                            <Label>Categoria</Label>
                            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm" required data-testid="product-category">
                                <option value="">Selecione</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label>Imagem</Label>
                            <div className="mt-1 flex gap-2 items-center">
                                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL da imagem" className="rounded-lg flex-1" data-testid="product-image-url" />
                                <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handleUpload} /><Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button></label>
                            </div>
                            {form.image_url && <img src={getImageUrl(form.image_url)} alt="" className="mt-2 h-24 w-24 object-cover rounded-lg" />}
                        </div>
                        <div>
                            <Label>Tags</Label>
                            <div className="flex flex-wrap gap-2 mt-1 mb-2">
                                {["vegano", "leve", "mais_pedido", "recomendado"].map(tag => (
                                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${form.tags.includes(tag) ? "bg-primary text-white" : "bg-muted text-foreground"}`}>
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            {form.tags.filter(t => !["vegano", "leve", "mais_pedido", "recomendado"].includes(t)).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {form.tags.filter(t => !["vegano", "leve", "mais_pedido", "recomendado"].includes(t)).map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent">
                                            <Tag className="h-3 w-3" />{tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag customizada..." className="rounded-lg flex-1 text-sm" data-testid="new-tag-input"
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} />
                                <Button type="button" size="sm" variant="outline" onClick={addCustomTag} className="rounded-lg" data-testid="add-tag-btn"><Plus className="h-3 w-3 mr-1" />Tag</Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-primary text-white rounded-full" data-testid="save-product-btn">
                            {editingProduct ? "Atualizar" : "Criar"} Produto
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
