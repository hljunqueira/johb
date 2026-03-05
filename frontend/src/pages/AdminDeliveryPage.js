import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Truck, Plus, Trash2, DollarSign, MapPin, Save, Clock, Upload, Image, X, QrCode } from "lucide-react";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const DAYS = [
    { key: "seg", label: "Segunda" },
    { key: "ter", label: "Terça" },
    { key: "qua", label: "Quarta" },
    { key: "qui", label: "Quinta" },
    { key: "sex", label: "Sexta" },
    { key: "sab", label: "Sábado" },
    { key: "dom", label: "Domingo" },
];

const DEFAULT_HOURS = DAYS.reduce((acc, d) => ({
    ...acc,
    [d.key]: { open: true, start: "11:00", end: "22:00" }
}), {});

const PIX_KEY_TYPES = [
    { value: "cpf", label: "CPF" },
    { value: "cnpj", label: "CNPJ" },
    { value: "email", label: "E-mail" },
    { value: "telefone", label: "Telefone" },
    { value: "aleatoria", label: "Chave aleatória" },
];

export default function AdminDeliveryPage() {
    const [settings, setSettings] = useState({ areas: [], delivery_fee: 5, min_free_delivery: 60, active: true, business_hours: DEFAULT_HOURS });
    const [pixSettings, setPixSettings] = useState({ pix_key: "", pix_key_type: "cpf", pix_name: "Salada Soul", qr_code_url: "" });
    const [newArea, setNewArea] = useState({ name: "", fee: 0 });
    const [loading, setLoading] = useState(false);
    const [uploadingQr, setUploadingQr] = useState(false);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        axios.get(`${API}/admin/delivery-settings`, { headers }).then(r => {
            const data = r.data;
            setSettings(prev => ({
                ...prev,
                ...data,
                business_hours: (data.business_hours && Object.keys(data.business_hours).length > 0)
                    ? data.business_hours
                    : DEFAULT_HOURS
            }));
        }).catch(() => {});
        axios.get(`${API}/admin/pix-settings`, { headers }).then(r => {
            setPixSettings(prev => ({ ...prev, ...r.data }));
        }).catch(() => {});
    }, []); // eslint-disable-line

    const saveDelivery = async () => {
        setLoading(true);
        try {
            await axios.put(`${API}/admin/delivery-settings`, settings, { headers });
            toast.success("Configurações salvas com sucesso!");
        } catch {
            toast.error("Erro ao salvar configurações");
        } finally {
            setLoading(false);
        }
    };

    const savePix = async () => {
        try {
            await axios.put(`${API}/admin/pix-settings`, pixSettings, { headers });
            toast.success("Configurações Pix salvas!");
        } catch {
            toast.error("Erro ao salvar Pix");
        }
    };

    const addArea = () => {
        if (!newArea.name.trim()) return;
        setSettings(s => ({ ...s, areas: [...s.areas, { ...newArea, fee: parseFloat(newArea.fee) || 0 }] }));
        setNewArea({ name: "", fee: 0 });
    };

    const removeArea = (i) => setSettings(s => ({ ...s, areas: s.areas.filter((_, idx) => idx !== i) }));

    const updateHour = (day, field, value) => setSettings(s => ({
        ...s,
        business_hours: {
            ...s.business_hours,
            [day]: { ...(s.business_hours[day] || { open: true, start: "11:00", end: "22:00" }), [field]: value }
        }
    }));

    const handleQrUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingQr(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await axios.post(`${API}/admin/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
            setPixSettings(s => ({ ...s, qr_code_url: r.data.url }));
            toast.success("QR Code enviado!");
        } catch {
            toast.error("Erro no upload do QR Code");
        } finally {
            setUploadingQr(false);
        }
    };

    return (
        <div data-testid="admin-delivery-page">
            <h1 className="text-2xl font-bold font-heading mb-1">Configurações</h1>
            <p className="text-sm text-muted-foreground mb-6">Entrega, pagamento e horários de funcionamento</p>

            <div className="grid md:grid-cols-2 gap-6">
                {/* ===== ENTREGA ===== */}
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 space-y-5">
                    <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold font-heading">Áreas de Entrega</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch checked={settings.active} onCheckedChange={v => setSettings(s => ({ ...s, active: v }))} data-testid="delivery-active" />
                        <span className="text-sm font-medium">{settings.active ? "Entregas ativas" : "Entregas desativadas"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm">Taxa padrão (R$)</Label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input type="number" step="0.01" min="0" value={settings.delivery_fee}
                                    onChange={e => setSettings(s => ({ ...s, delivery_fee: parseFloat(e.target.value) || 0 }))}
                                    className="rounded-lg pl-9" data-testid="default-fee" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm">Mínimo para frete grátis (R$)</Label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input type="number" step="0.01" min="0" value={settings.min_free_delivery}
                                    onChange={e => setSettings(s => ({ ...s, min_free_delivery: parseFloat(e.target.value) || 0 }))}
                                    className="rounded-lg pl-9" data-testid="min-free" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Use 0 para nunca oferecer grátis</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Bairros */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold">Bairros atendidos</p>
                        <p className="text-xs text-muted-foreground">Taxa 0 = frete grátis neste bairro</p>
                        {Array.isArray(settings.areas) && settings.areas.length === 0 && (
                            <p className="text-xs text-muted-foreground italic py-2 text-center border-2 border-dashed border-border rounded-lg">Nenhum bairro cadastrado — usa a taxa padrão para todos</p>
                        )}
                        {Array.isArray(settings.areas) && settings.areas.map((area, i) => (
                            <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm flex-1">{area.name}</span>
                                <span className={`text-sm font-semibold ${area.fee === 0 ? "text-green-600" : "text-primary"}`}>
                                    {area.fee === 0 ? "Grátis" : `R$ ${Number(area.fee).toFixed(2)}`}
                                </span>
                                <Button size="icon" variant="ghost" onClick={() => removeArea(i)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                            <Input value={newArea.name} onChange={e => setNewArea(a => ({ ...a, name: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }}
                                placeholder="Nome do bairro" className="rounded-lg flex-1" data-testid="new-area-name" />
                            <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input type="number" step="0.01" min="0" value={newArea.fee}
                                    onChange={e => setNewArea(a => ({ ...a, fee: e.target.value }))}
                                    className="rounded-lg pl-9" data-testid="new-area-fee" />
                            </div>
                            <Button size="icon" onClick={addArea} className="bg-primary text-white rounded-lg shrink-0" data-testid="add-area-btn">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <Button onClick={saveDelivery} disabled={loading} className="w-full bg-primary text-white rounded-full" data-testid="save-delivery-btn">
                        <Save className="h-4 w-4 mr-2" /> Salvar Configurações de Entrega
                    </Button>
                </div>

                {/* ===== PIX ===== */}
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 space-y-5">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold font-heading">Configurações Pix</h2>
                    </div>

                    {/* Tipo de chave */}
                    <div>
                        <Label className="text-sm">Tipo de chave Pix</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {PIX_KEY_TYPES.map(t => (
                                <button key={t.value} type="button"
                                    onClick={() => setPixSettings(s => ({ ...s, pix_key_type: t.value }))}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                        pixSettings.pix_key_type === t.value
                                            ? "bg-primary text-white border-primary"
                                            : "bg-white text-foreground border-border hover:border-primary/50"
                                    }`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chave */}
                    <div>
                        <Label className="text-sm">Chave Pix</Label>
                        <Input value={pixSettings.pix_key}
                            onChange={e => setPixSettings(s => ({ ...s, pix_key: e.target.value }))}
                            placeholder={
                                pixSettings.pix_key_type === "cpf" ? "000.000.000-00" :
                                pixSettings.pix_key_type === "cnpj" ? "00.000.000/0000-00" :
                                pixSettings.pix_key_type === "email" ? "seuemail@exemplo.com" :
                                pixSettings.pix_key_type === "telefone" ? "+55 (00) 00000-0000" :
                                "Chave aleatória (UUID)"
                            }
                            className="mt-1 rounded-lg" data-testid="pix-key" />
                    </div>

                    {/* Nome */}
                    <div>
                        <Label className="text-sm">Nome do titular</Label>
                        <Input value={pixSettings.pix_name}
                            onChange={e => setPixSettings(s => ({ ...s, pix_name: e.target.value }))}
                            placeholder="Nome que aparece no Pix" className="mt-1 rounded-lg" data-testid="pix-name" />
                    </div>

                    {/* QR Code */}
                    <div>
                        <Label className="text-sm">QR Code Pix</Label>
                        {pixSettings.qr_code_url ? (
                            <div className="mt-2 flex items-start gap-4">
                                <div className="relative inline-block">
                                    <img src={pixSettings.qr_code_url} alt="QR Code Pix" className="h-32 w-32 rounded-xl object-contain border p-1 bg-white" />
                                    <button type="button" onClick={() => setPixSettings(s => ({ ...s, qr_code_url: "" }))}
                                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-xs text-muted-foreground">Imagem atual do QR Code</p>
                                    <label className="cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                                        <Button type="button" variant="outline" size="sm" className="rounded-lg w-full" disabled={uploadingQr} asChild>
                                            <span><Upload className="h-3.5 w-3.5 mr-1.5" />{uploadingQr ? "Enviando..." : "Substituir imagem"}</span>
                                        </Button>
                                    </label>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Ou cole a URL:</p>
                                        <Input value={pixSettings.qr_code_url}
                                            onChange={e => setPixSettings(s => ({ ...s, qr_code_url: e.target.value }))}
                                            placeholder="https://..." className="rounded-lg text-xs" data-testid="pix-qr-url" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2 space-y-2">
                                <label className="cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                                    {uploadingQr ? (
                                        <><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /><span className="text-sm text-muted-foreground">Enviando...</span></>
                                    ) : (
                                        <><QrCode className="h-8 w-8 text-muted-foreground/40" /><span className="text-sm text-muted-foreground">Clique para enviar o QR Code</span><span className="text-xs text-muted-foreground/60">PNG, JPG — máx. 2MB</span></>
                                    )}
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs text-muted-foreground">ou</span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <Input value={pixSettings.qr_code_url}
                                    onChange={e => setPixSettings(s => ({ ...s, qr_code_url: e.target.value }))}
                                    placeholder="Cole a URL da imagem do QR Code" className="rounded-lg text-sm" data-testid="pix-qr-url" />
                            </div>
                        )}
                    </div>

                    <Button onClick={savePix} className="w-full bg-primary text-white rounded-full" data-testid="save-pix-btn">
                        <Save className="h-4 w-4 mr-2" /> Salvar Configurações Pix
                    </Button>
                </div>
            </div>

            {/* ===== HORÁRIOS ===== */}
            <div className="mt-6 bg-white dark:bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-3 mb-5">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="font-semibold font-heading">Horário de Funcionamento</h2>
                        <p className="text-xs text-muted-foreground">Defina os horários em que o restaurante aceita pedidos</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {DAYS.map(({ key, label }) => {
                        const h = settings.business_hours?.[key] || { open: true, start: "11:00", end: "22:00" };
                        return (
                            <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${h.open ? "border-primary/20 bg-primary/3" : "border-border bg-muted/20"}`}>
                                {/* Toggle */}
                                <Switch checked={h.open} onCheckedChange={v => updateHour(key, "open", v)} />
                                {/* Dia */}
                                <span className={`text-sm font-medium w-20 ${h.open ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                                {/* Horários */}
                                {h.open ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input type="time" value={h.start}
                                            onChange={e => updateHour(key, "start", e.target.value)}
                                            className="rounded-lg border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        <span className="text-muted-foreground text-sm">até</span>
                                        <input type="time" value={h.end}
                                            onChange={e => updateHour(key, "end", e.target.value)}
                                            className="rounded-lg border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground flex-1 italic">Fechado</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <Button onClick={saveDelivery} disabled={loading} className="mt-5 w-full bg-primary text-white rounded-full">
                    <Save className="h-4 w-4 mr-2" /> Salvar Horários
                </Button>
            </div>
        </div>
    );
}
