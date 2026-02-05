import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Truck, Plus, Trash2, DollarSign, MapPin, Save } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDeliveryPage() {
    const [settings, setSettings] = useState({ areas: [], delivery_fee: 5, min_free_delivery: 60, active: true });
    const [pixSettings, setPixSettings] = useState({ pix_key: "", pix_name: "Salada Soul", qr_code_url: "" });
    const [newArea, setNewArea] = useState({ name: "", fee: 0 });
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        axios.get(`${API}/admin/delivery-settings`, { headers }).then(r => setSettings(r.data));
        axios.get(`${API}/admin/pix-settings`, { headers }).then(r => setPixSettings(r.data));
    }, []); // eslint-disable-line

    const saveDelivery = async () => {
        setLoading(true);
        try { await axios.put(`${API}/admin/delivery-settings`, settings, { headers }); toast.success("Configuracoes salvas"); }
        catch { toast.error("Erro ao salvar"); }
        finally { setLoading(false); }
    };

    const savePix = async () => {
        try { await axios.put(`${API}/admin/pix-settings`, pixSettings, { headers }); toast.success("Pix salvo"); }
        catch { toast.error("Erro ao salvar pix"); }
    };

    const addArea = () => {
        if (!newArea.name) return;
        setSettings(s => ({ ...s, areas: [...s.areas, { ...newArea, fee: parseFloat(newArea.fee) || 0 }] }));
        setNewArea({ name: "", fee: 0 });
    };

    const removeArea = (i) => setSettings(s => ({ ...s, areas: s.areas.filter((_, idx) => idx !== i) }));

    return (
        <div data-testid="admin-delivery-page">
            <h1 className="text-2xl font-bold font-heading mb-6">Configuracoes de Entrega</h1>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Delivery Settings */}
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 space-y-5">
                    <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold font-heading">Areas de Entrega</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch checked={settings.active} onCheckedChange={v => setSettings(s => ({ ...s, active: v }))} data-testid="delivery-active" />
                        <span className="text-sm">{settings.active ? "Entregas ativas" : "Entregas desativadas"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>Taxa padrao (R$)</Label><Input type="number" step="0.01" value={settings.delivery_fee} onChange={e => setSettings(s => ({ ...s, delivery_fee: parseFloat(e.target.value) || 0 }))} className="mt-1 rounded-lg" data-testid="default-fee" /></div>
                        <div><Label>Minimo frete gratis (R$)</Label><Input type="number" step="0.01" value={settings.min_free_delivery} onChange={e => setSettings(s => ({ ...s, min_free_delivery: parseFloat(e.target.value) || 0 }))} className="mt-1 rounded-lg" data-testid="min-free" /></div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Bairros</p>
                        {settings.areas.map((area, i) => (
                            <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm flex-1">{area.name}</span>
                                <span className="text-sm font-medium">{area.fee > 0 ? `R$ ${area.fee.toFixed(2)}` : "Gratis"}</span>
                                <Button size="icon" variant="ghost" onClick={() => removeArea(i)} className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <Input value={newArea.name} onChange={e => setNewArea(a => ({ ...a, name: e.target.value }))} placeholder="Nome do bairro" className="rounded-lg flex-1" data-testid="new-area-name" />
                            <Input type="number" step="0.01" value={newArea.fee} onChange={e => setNewArea(a => ({ ...a, fee: e.target.value }))} placeholder="Taxa" className="rounded-lg w-24" data-testid="new-area-fee" />
                            <Button size="icon" onClick={addArea} className="bg-primary text-white rounded-lg" data-testid="add-area-btn"><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <Button onClick={saveDelivery} disabled={loading} className="w-full bg-primary text-white rounded-full" data-testid="save-delivery-btn">
                        <Save className="h-4 w-4 mr-1" /> Salvar Configuracoes
                    </Button>
                </div>

                {/* Pix Settings */}
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 space-y-5">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold font-heading">Configuracoes Pix</h2>
                    </div>

                    <div>
                        <Label>Chave Pix</Label>
                        <Input value={pixSettings.pix_key} onChange={e => setPixSettings(s => ({ ...s, pix_key: e.target.value }))} placeholder="CPF, email ou telefone" className="mt-1 rounded-lg" data-testid="pix-key" />
                    </div>
                    <div>
                        <Label>Nome do titular</Label>
                        <Input value={pixSettings.pix_name} onChange={e => setPixSettings(s => ({ ...s, pix_name: e.target.value }))} placeholder="Nome" className="mt-1 rounded-lg" data-testid="pix-name" />
                    </div>
                    <div>
                        <Label>URL do QR Code (imagem)</Label>
                        <Input value={pixSettings.qr_code_url} onChange={e => setPixSettings(s => ({ ...s, qr_code_url: e.target.value }))} placeholder="https://..." className="mt-1 rounded-lg" data-testid="pix-qr-url" />
                        {pixSettings.qr_code_url && <img src={pixSettings.qr_code_url} alt="QR" className="mt-2 h-32 w-32 rounded-lg object-contain" />}
                    </div>

                    <Button onClick={savePix} className="w-full bg-primary text-white rounded-full" data-testid="save-pix-btn">
                        <Save className="h-4 w-4 mr-1" /> Salvar Pix
                    </Button>
                </div>
            </div>
        </div>
    );
}
