import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Truck, Plus, Trash2, DollarSign, MapPin, Save, Clock, Upload, Image, X, QrCode, Navigation } from "lucide-react";

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

// Taxas padrão baseadas na tabela do iFood
const DEFAULT_DISTANCE_RATES = [
    { max_distance: 2.4, fee: 8.0 },
    { max_distance: 2.5, fee: 9.0 },
    { max_distance: 3.4, fee: 9.0 },
    { max_distance: 3.5, fee: 10.0 },
    { max_distance: 4.4, fee: 10.0 },
    { max_distance: 4.5, fee: 11.0 },
    { max_distance: 5.4, fee: 11.0 },
    { max_distance: 5.5, fee: 12.0 },
    { max_distance: 6.4, fee: 12.0 },
    { max_distance: 6.5, fee: 13.0 },
    { max_distance: 7.4, fee: 13.0 },
    { max_distance: 7.5, fee: 14.0 },
    { max_distance: 8.4, fee: 14.0 },
    { max_distance: 8.5, fee: 15.0 },
    { max_distance: 9.4, fee: 15.0 },
    { max_distance: 9.5, fee: 16.0 },
    { max_distance: 10.4, fee: 16.0 },
    { max_distance: 10.5, fee: 17.0 },
];

export default function AdminDeliveryPage() {
    const [settings, setSettings] = useState({ 
        areas: [], 
        delivery_fee: 5, 
        min_free_delivery: 60, 
        active: true, 
        business_hours: DEFAULT_HOURS,
        restaurant_address: "",
        distance_rates: DEFAULT_DISTANCE_RATES,
        max_delivery_distance: 10.5
    });
    const [pixSettings, setPixSettings] = useState({ pix_key: "", pix_key_type: "cpf", pix_name: "Salada Soul", qr_code_url: "" });
    const [newArea, setNewArea] = useState({ name: "", fee: 0 });
    const [newRate, setNewRate] = useState({ max_distance: "", fee: "" });
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
                    : DEFAULT_HOURS,
                distance_rates: (data.distance_rates && data.distance_rates.length > 0)
                    ? data.distance_rates
                    : DEFAULT_DISTANCE_RATES,
                max_delivery_distance: data.max_delivery_distance || 10.5,
                restaurant_address: data.restaurant_address || ""
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

    const addRate = () => {
        if (!newRate.max_distance || !newRate.fee) return;
        const rate = { 
            max_distance: parseFloat(newRate.max_distance), 
            fee: parseFloat(newRate.fee) 
        };
        setSettings(s => ({ 
            ...s, 
            distance_rates: [...(s.distance_rates || []), rate].sort((a, b) => a.max_distance - b.max_distance) 
        }));
        setNewRate({ max_distance: "", fee: "" });
    };

    const removeRate = (i) => setSettings(s => ({ 
        ...s, 
        distance_rates: (s.distance_rates || []).filter((_, idx) => idx !== i) 
    }));

    const resetToDefaultRates = () => {
        setSettings(s => ({ ...s, distance_rates: [...DEFAULT_DISTANCE_RATES] }));
        toast.success("Taxas restauradas para o padrão!");
    };

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
                        <h2 className="font-semibold font-heading">Configurações de Entrega</h2>
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

                    {/* Endereço do Restaurante */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">Endereço do Restaurante</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Usado para calcular a distância até o cliente</p>
                        <Input 
                            value={settings.restaurant_address || ""} 
                            onChange={e => setSettings(s => ({ ...s, restaurant_address: e.target.value }))}
                            placeholder="Ex: Rua das Flores, 123, Centro, São Paulo - SP"
                            className="rounded-lg"
                        />
                    </div>

                    <Separator />

                    {/* Taxas por Distância */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold">Taxas por Distância (km)</p>
                            </div>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={resetToDefaultRates}
                                className="text-xs text-primary hover:text-primary/80"
                            >
                                Restaurar padrão
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Configure a taxa para cada faixa de distância</p>
                        
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {(settings.distance_rates || []).length === 0 && (
                                <p className="text-xs text-muted-foreground italic py-2 text-center border-2 border-dashed border-border rounded-lg">
                                    Nenhuma taxa cadastrada
                                </p>
                            )}
                            {(settings.distance_rates || []).map((rate, i) => (
                                <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                    <span className="text-xs text-muted-foreground w-16">Até</span>
                                    <span className="text-sm font-medium flex-1">{rate.max_distance} km</span>
                                    <span className="text-sm font-semibold text-primary">
                                        R$ {Number(rate.fee).toFixed(2)}
                                    </span>
                                    <Button size="icon" variant="ghost" onClick={() => removeRate(i)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-2 mt-2">
                            <div className="relative flex-1">
                                <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    value={newRate.max_distance}
                                    onChange={e => setNewRate(r => ({ ...r, max_distance: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRate(); } }}
                                    placeholder="Km máx" 
                                    className="rounded-lg" 
                                />
                            </div>
                            <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0" 
                                    value={newRate.fee}
                                    onChange={e => setNewRate(r => ({ ...r, fee: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRate(); } }}
                                    className="rounded-lg pl-9" 
                                />
                            </div>
                            <Button size="icon" onClick={addRate} className="bg-primary text-white rounded-lg shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Distância Máxima */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold">Distância Máxima de Entrega</p>
                        <div className="relative">
                            <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                value={settings.max_delivery_distance || 10.5}
                                onChange={e => setSettings(s => ({ ...s, max_delivery_distance: parseFloat(e.target.value) || 10.5 }))}
                                className="rounded-lg pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Pedidos além desta distância não serão aceitos</p>
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
