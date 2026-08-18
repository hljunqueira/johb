import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Truck, Store, Plus, Trash2, DollarSign, MapPin, Save, Clock, Upload, X, QrCode, Navigation } from "lucide-react";

import { API } from "@/lib/constants";

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

// Helper para garantir que distance_rates seja sempre um array
const parseDistanceRates = (rates) => {
    if (!rates) return DEFAULT_DISTANCE_RATES;
    if (Array.isArray(rates)) return rates;
    if (typeof rates === 'string') {
        try {
            const parsed = JSON.parse(rates);
            return Array.isArray(parsed) ? parsed : DEFAULT_DISTANCE_RATES;
        } catch {
            return DEFAULT_DISTANCE_RATES;
        }
    }
    return DEFAULT_DISTANCE_RATES;
};

// Helper para garantir que business_hours seja sempre um objeto estruturado
const parseBusinessHoursClient = (raw) => {
    if (!raw) return DEFAULT_HOURS;
    if (typeof raw === "object" && !Array.isArray(raw)) {
        if ("seg" in raw) return raw;
        if ("0" in raw && "1" in raw) {
            try {
                const sortedKeys = Object.keys(raw).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
                const str = sortedKeys.map(k => raw[k]).join("");
                const parsed = JSON.parse(str);
                const obj = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
                if (obj && typeof obj === "object" && "seg" in obj) return obj;
            } catch {}
        }
        return raw;
    }
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            const obj = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
            if (obj && typeof obj === "object" && "seg" in obj) return obj;
        } catch {}
    }
    return DEFAULT_HOURS;
};

export default function AdminDeliveryPage() {
    const [activeTab, setActiveTab] = useState("delivery");
    const [settings, setSettings] = useState({ 
        areas: [], 
        delivery_fee: 5, 
        min_free_delivery: 60, 
        active: true, 
        allow_pickup: true,
        business_hours: DEFAULT_HOURS,
        restaurant_address: "",
        distance_rates: DEFAULT_DISTANCE_RATES,
        max_delivery_distance: 10.5,
        always_open: false,
        temporarily_closed: false,
        accept_online_payment: true,
        accept_card_machine: true,
        accept_cash: true,
        allow_immediate_orders: true,
        allow_scheduled_orders: true,
        min_lead_hours: 0.5,
        max_schedule_days: 7
    });
    const [pixSettings, setPixSettings] = useState({ pix_key: "", pix_key_type: "cpf", pix_name: "JOHB", qr_code_url: "" });
    const [newArea, setNewArea] = useState({ name: "", fee: 0 });
    const [newRate, setNewRate] = useState({ max_distance: "", fee: "" });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [uploadingQr, setUploadingQr] = useState(false);
    const { token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        setInitialLoading(true);
        Promise.all([
            axios.get(`${API}/admin/delivery-settings`, { headers }).then(r => {
                const data = r.data;
                if (!data) return;
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    business_hours: parseBusinessHoursClient(data.business_hours),
                    distance_rates: parseDistanceRates(data.distance_rates),
                    max_delivery_distance: data.max_delivery_distance || 10.5,
                    restaurant_address: data.restaurant_address || "",
                    always_open: Boolean(data.always_open),
                    temporarily_closed: Boolean(data.temporarily_closed),
                    accept_online_payment: Boolean(data.accept_online_payment),
                    accept_card_machine: Boolean(data.accept_card_machine),
                    accept_cash: Boolean(data.accept_cash),
                    allow_immediate_orders: Boolean(data.allow_immediate_orders),
                    allow_scheduled_orders: Boolean(data.allow_scheduled_orders),
                    active: Boolean(data.active),
                    allow_pickup: data.allow_pickup !== false,
                    min_lead_hours: Number(data.min_lead_hours ?? 0.5),
                    max_schedule_days: parseInt(data.max_schedule_days) || 7
                }));
            }).catch(() => {}),
            axios.get(`${API}/admin/pix-settings`, { headers }).then(r => {
                setPixSettings(prev => ({ ...prev, ...r.data }));
            }).catch(() => {})
        ]).finally(() => {
            setInitialLoading(false);
        });
    }, []); // eslint-disable-line

    const saveDelivery = async () => {
        setLoading(true);
        try {
            const payload = {
                ...settings,
                business_hours: settings.business_hours,
                areas: settings.areas || [],
                distance_rates: settings.distance_rates || []
            };
            const res = await axios.put(`${API}/admin/delivery-settings`, payload, { headers });
            if (res.data) {
                const data = res.data;
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    business_hours: parseBusinessHoursClient(data.business_hours) || prev.business_hours,
                    always_open: Boolean(data.always_open),
                    temporarily_closed: Boolean(data.temporarily_closed),
                    accept_online_payment: Boolean(data.accept_online_payment),
                    accept_card_machine: Boolean(data.accept_card_machine),
                    accept_cash: Boolean(data.accept_cash),
                    allow_immediate_orders: Boolean(data.allow_immediate_orders),
                    allow_scheduled_orders: Boolean(data.allow_scheduled_orders),
                    active: Boolean(data.active),
                    allow_pickup: data.allow_pickup !== false,
                }));
            }
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

    const tabs = [
        { id: "delivery", label: "Configuração de Entrega", icon: Truck },
        { id: "hours", label: "Configuração de Horários", icon: Clock },
        { id: "payment", label: "Configuração de Pagamentos", icon: DollarSign },
    ];

    if (initialLoading) {
        return (
            <div className="text-white space-y-6 animate-pulse">
                <div className="h-8 bg-[#141414] rounded-xl w-64 border border-white/10" />
                <div className="h-14 bg-[#141414] rounded-2xl border border-white/10" />
                <div className="h-96 bg-[#141414] rounded-2xl border border-white/10" />
            </div>
        );
    }

    return (
        <div className="text-white space-y-6" data-testid="admin-delivery-page">
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Configurações do Estabelecimento</h1>
                <p className="text-xs text-gray-400 mt-1">Gerencie entregas, horários de funcionamento e dados de pagamento</p>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-[#141414] rounded-2xl border border-white/10 p-1.5 shadow-xl">
                <div className="flex flex-wrap gap-1.5">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all ${
                                    activeTab === tab.id
                                        ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black shadow-lg shadow-[#F4B544]/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/10"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(" ")[2]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === "delivery" && (
                <DeliveryTab 
                    settings={settings}
                    setSettings={setSettings}
                    newArea={newArea}
                    setNewArea={setNewArea}
                    newRate={newRate}
                    setNewRate={setNewRate}
                    loading={loading}
                    saveDelivery={saveDelivery}
                    addArea={addArea}
                    removeArea={removeArea}
                    addRate={addRate}
                    removeRate={removeRate}
                    resetToDefaultRates={resetToDefaultRates}
                />
            )}

            {activeTab === "hours" && (
                <HoursTab 
                    settings={settings}
                    setSettings={setSettings}
                    loading={loading}
                    saveDelivery={saveDelivery}
                    updateHour={updateHour}
                />
            )}

            {activeTab === "payment" && (
                <PaymentTab 
                    settings={settings}
                    setSettings={setSettings}
                    saveDelivery={saveDelivery}
                    loading={loading}
                    pixSettings={pixSettings}
                    setPixSettings={setPixSettings}
                    uploadingQr={uploadingQr}
                    savePix={savePix}
                    handleQrUpload={handleQrUpload}
                />
            )}
        </div>
    );
}

/* ==================== DELIVERY TAB ==================== */
function DeliveryTab({ 
    settings, 
    setSettings, 
    newArea, 
    setNewArea, 
    loading, 
    saveDelivery, 
    addArea, 
    removeArea 
}) {
    return (
        <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <Truck className="h-6 w-6 text-[#F4B544]" />
                    <div>
                        <h2 className="font-extrabold text-white text-xl">Configurações de Entrega & Bairros</h2>
                        <p className="text-xs text-gray-400">Cadastre os bairros atendidos e as respectivas taxas de entrega</p>
                    </div>
                </div>
            </div>

            {/* Modalidades de Pedido Aceitas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-[#1E1E1E] p-4 rounded-xl border border-white/10">
                    <div className="space-y-0.5 pr-2">
                        <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                            <Truck className="h-4 w-4 text-[#F4B544]" /> Entrega em Domicílio
                        </span>
                        <p className="text-xs text-gray-400">
                            {settings.active ? "Ativa (clientes podem pedir delivery)" : "Pausada no momento"}
                        </p>
                    </div>
                    <Switch checked={settings.active} onCheckedChange={v => setSettings(s => ({ ...s, active: v }))} data-testid="delivery-active" />
                </div>

                <div className="flex items-center justify-between bg-[#1E1E1E] p-4 rounded-xl border border-white/10">
                    <div className="space-y-0.5 pr-2">
                        <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                            <Store className="h-4 w-4 text-[#F4B544]" /> Retirada no Balcão
                        </span>
                        <p className="text-xs text-gray-400">
                            {settings.allow_pickup !== false ? "Ativa (clientes podem retirar no local)" : "Pausada no momento"}
                        </p>
                    </div>
                    <Switch checked={settings.allow_pickup !== false} onCheckedChange={v => setSettings(s => ({ ...s, allow_pickup: v }))} data-testid="pickup-active" />
                </div>
            </div>

            {/* Valores Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#1E1E1E] p-4 rounded-xl border border-white/10">
                    <Label className="text-xs font-bold text-gray-300">Taxa Padrão de Entrega (R$)</Label>
                    <div className="relative mt-2">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                        <Input 
                            type="number" 
                            step="0.50" 
                            min="0" 
                            value={settings.delivery_fee}
                            onChange={e => setSettings(s => ({ ...s, delivery_fee: parseFloat(e.target.value) || 0 }))}
                            className="rounded-xl bg-[#141414] text-white border-white/10 pl-10 focus:border-[#F4B544] font-bold" 
                            data-testid="default-fee" 
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Taxa base usada quando o bairro não tiver valor específico.</p>
                </div>

                <div className="bg-[#1E1E1E] p-4 rounded-xl border border-white/10">
                    <Label className="text-xs font-bold text-gray-300">Mínimo para Frete Grátis (R$)</Label>
                    <div className="relative mt-2">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                        <Input 
                            type="number" 
                            step="5.00" 
                            min="0" 
                            value={settings.min_free_delivery}
                            onChange={e => setSettings(s => ({ ...s, min_free_delivery: parseFloat(e.target.value) || 0 }))}
                            className="rounded-xl bg-[#141414] text-white border-white/10 pl-10 focus:border-[#F4B544] font-bold" 
                            data-testid="min-free" 
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Defina 0 se não quiser oferecer frete grátis.</p>
                </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Gerenciamento de Bairros */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#F4B544]" />
                        <div>
                            <p className="text-base font-extrabold text-white">Bairros Atendidos & Taxas</p>
                            <p className="text-xs text-gray-400">Cadastre os bairros para os quais realiza entregas e a taxa cobrada para cada um.</p>
                        </div>
                    </div>
                </div>

                {/* Lista de Bairros Cadastrados */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(settings.areas || []).length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-[#1E1E1E]/50 space-y-2">
                            <MapPin className="h-8 w-8 text-gray-500 mx-auto" />
                            <p className="text-xs text-gray-400 font-semibold">Nenhum bairro cadastrado ainda.</p>
                            <p className="text-[11px] text-gray-500">Cadastre abaixo os bairros atendidos e suas respectivas taxas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(settings.areas || []).map((area, i) => (
                                <div key={i} className="flex items-center justify-between bg-[#1E1E1E] border border-white/10 rounded-xl p-3.5 hover:border-[#F4B544]/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#F4B544]/10 flex items-center justify-center text-[#F4B544]">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="font-extrabold text-sm text-white block">{area.name}</span>
                                            <span className="text-xs font-black text-[#F4B544]">
                                                Taxa: R$ {Number(area.fee || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => removeArea(i)} 
                                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Formulário para Adicionar Bairro */}
                <div className="bg-[#1E1E1E] p-4 rounded-xl border border-white/10 space-y-3">
                    <p className="text-xs font-bold text-gray-300">+ Adicionar Novo Bairro</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Input 
                                type="text" 
                                placeholder="Nome do Bairro (Ex: Centro)"
                                value={newArea.name}
                                onChange={e => setNewArea(a => ({ ...a, name: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }}
                                className="rounded-xl bg-[#141414] text-white border-white/10 focus:border-[#F4B544]" 
                            />
                        </div>
                        <div className="relative sm:w-36">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                            <Input 
                                type="number" 
                                step="0.50" 
                                min="0" 
                                placeholder="Taxa"
                                value={newArea.fee}
                                onChange={e => setNewArea(a => ({ ...a, fee: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }}
                                className="rounded-xl bg-[#141414] text-white border-white/10 pl-9 focus:border-[#F4B544] font-bold" 
                            />
                        </div>
                        <Button 
                            type="button" 
                            onClick={addArea} 
                            className="bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl px-5 h-10 shadow-md shadow-[#F4B544]/20 hover:scale-[1.01] transition-all"
                        >
                            <Plus className="h-4 w-4 mr-1.5" /> Adicionar Bairro
                        </Button>
                    </div>
                </div>
            </div>

            <Button onClick={saveDelivery} disabled={loading} className="w-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl h-12 shadow-lg shadow-[#F4B544]/20 hover:scale-[1.01] transition-all" data-testid="save-delivery-btn">
                <Save className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} /> 
                {loading ? "Salvando Bairros e Taxas..." : "Salvar Bairros e Taxas de Entrega"}
            </Button>
        </div>
    );
}

/* ==================== HOURS TAB ==================== */
function HoursTab({ settings, setSettings, loading, saveDelivery, updateHour }) {
    return (
        <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <Clock className="h-6 w-6 text-[#F4B544]" />
                <div>
                    <h2 className="font-extrabold text-white text-xl">Horário de Funcionamento</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Defina os horários em que o restaurante aceita pedidos</p>
                </div>
            </div>

            {/* Opções especiais de horário */}
            <div className="space-y-4 p-5 bg-[#1E1E1E] border border-white/10 rounded-2xl">
                <p className="text-xs uppercase tracking-wider font-extrabold text-[#F4B544]">Opções especiais</p>
                
                {/* Sempre aberto */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${settings.always_open ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-gray-400"}`}>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-white">Aberto 24 horas</p>
                            <p className="text-xs text-gray-400">Ignorar horários de funcionamento específicos</p>
                        </div>
                    </div>
                    <Switch 
                        checked={settings.always_open} 
                        onCheckedChange={v => setSettings(s => ({ ...s, always_open: v, temporarily_closed: v ? false : s.temporarily_closed }))}
                    />
                </div>

                <Separator className="bg-white/10" />

                {/* Fechamento temporário */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${settings.temporarily_closed ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-gray-400"}`}>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-white">Fechado temporariamente</p>
                            <p className="text-xs text-gray-400">Pausar pedidos imediatamente sem alterar os horários cadastrados</p>
                        </div>
                    </div>
                    <Switch 
                        checked={settings.temporarily_closed} 
                        onCheckedChange={v => setSettings(s => ({ ...s, temporarily_closed: v, always_open: v ? false : s.always_open }))}
                    />
                </div>
            </div>

            {/* Aviso quando uma opção especial está ativa */}
            {(settings.always_open || settings.temporarily_closed) && (
                <div className={`p-4 rounded-xl text-sm font-bold border ${settings.always_open ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-red-500/10 text-red-300 border-red-500/30"}`}>
                    {settings.always_open 
                        ? "A loja está configurada como 'Aberto 24 horas'. Os horários abaixo serão ignorados."
                        : "A loja está 'Fechada temporariamente'. Os horários abaixo não serão aplicados até que você desative esta opção."
                    }
                </div>
            )}

            {/* Configurações de Modos de Pedido e Agendamento */}
            <div className="p-5 bg-[#1E1E1E] border border-[#F4B544]/20 rounded-2xl space-y-5">
                <div>
                    <p className="text-xs uppercase tracking-wider font-extrabold text-[#F4B544]">Modos de Pedido & Agendamento</p>
                    <p className="text-xs text-gray-400 mt-0.5">Defina como os clientes podem solicitar os pedidos no cardápio</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Toggle Pedidos Imediatos */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-white/10">
                        <div className="space-y-0.5 pr-2">
                            <span className="text-sm font-bold text-white block">⚡ Pedidos Imediatos</span>
                            <span className="text-[11px] text-gray-400 block">Opção "O quanto antes" para preparo e envio na sequência.</span>
                        </div>
                        <Switch 
                            checked={settings.allow_immediate_orders !== false} 
                            onCheckedChange={v => setSettings(s => ({ ...s, allow_immediate_orders: v }))} 
                        />
                    </div>

                    {/* Toggle Pedidos Agendados */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-white/10">
                        <div className="space-y-0.5 pr-2">
                            <span className="text-sm font-bold text-white block">📅 Pedidos Agendados</span>
                            <span className="text-[11px] text-gray-400 block">Permite agendar data e horário futuro de entrega/retirada.</span>
                        </div>
                        <Switch 
                            checked={settings.allow_scheduled_orders !== false} 
                            onCheckedChange={v => setSettings(s => ({ ...s, allow_scheduled_orders: v }))} 
                        />
                    </div>
                </div>

                {settings.allow_scheduled_orders !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                        <div>
                            <Label className="text-xs font-bold text-gray-300">Antecedência Mínima para Agendamento</Label>
                            <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {[
                                    { value: 0.5, label: "30 min" },
                                    { value: 1.0, label: "1 hora" },
                                    { value: 2.0, label: "2 horas" },
                                    { value: 4.0, label: "4 horas" },
                                    { value: 8.0, label: "8 horas" },
                                    { value: 24.0, label: "1 dia" }
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setSettings(s => ({ ...s, min_lead_hours: opt.value }))}
                                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                                            Number(settings.min_lead_hours ?? 0.5) === opt.value
                                                ? "bg-[#F4B544] text-black border-[#F4B544] shadow-md font-extrabold"
                                                : "bg-[#141414] text-gray-300 border-white/10 hover:border-white/30"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1.5">Tempo mínimo que a cozinha precisa antes do horário agendado.</p>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-gray-300">Limite de Dias no Futuro</Label>
                            <Input 
                                type="number" 
                                min="1" 
                                max="30" 
                                value={settings.max_schedule_days ?? 7}
                                onChange={e => setSettings(s => ({ ...s, max_schedule_days: parseInt(e.target.value) || 7 }))}
                                className="mt-2 rounded-xl bg-[#141414] text-white border-white/10 focus:border-[#F4B544]"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Até quantos dias pra frente o cliente pode agendar.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {DAYS.map(({ key, label }) => {
                    const h = settings.business_hours?.[key] || { open: true, start: "11:00", end: "22:00" };
                    return (
                        <div key={key} className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${h.open ? "border-[#F4B544]/30 bg-[#1E1E1E]" : "border-white/10 bg-[#141414] opacity-60"}`}>
                            {/* Toggle */}
                            <Switch checked={h.open} onCheckedChange={v => updateHour(key, "open", v)} />
                            {/* Dia */}
                            <span className={`text-sm font-extrabold w-24 ${h.open ? "text-white" : "text-gray-500"}`}>{label}</span>
                            {/* Horários */}
                            {h.open ? (
                                <div className="flex items-center gap-3 flex-1">
                                    <input type="time" value={h.start}
                                        onChange={e => updateHour(key, "start", e.target.value)}
                                        className="rounded-lg border border-white/10 bg-[#10100F] text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F4B544]" />
                                    <span className="text-gray-400 text-sm font-bold">até</span>
                                    <input type="time" value={h.end}
                                        onChange={e => updateHour(key, "end", e.target.value)}
                                        className="rounded-lg border border-white/10 bg-[#10100F] text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F4B544]" />
                                </div>
                            ) : (
                                <span className="text-sm text-gray-500 flex-1 italic font-semibold">Fechado</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <Button onClick={saveDelivery} disabled={loading} className="w-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl h-12 shadow-lg shadow-[#F4B544]/20 hover:scale-[1.01] transition-all">
                <Save className="h-5 w-5 mr-2" /> Salvar Horários e Agendamento
            </Button>
        </div>
    );
}

/* ==================== PAYMENT TAB ==================== */
function PaymentTab({ settings, setSettings, saveDelivery, loading, pixSettings, setPixSettings, uploadingQr, savePix, handleQrUpload }) {
    return (
        <div className="space-y-6">
            {/* Formas de Pagamento Aceitas no Checkout */}
            <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-6 w-6 text-[#F4B544]" />
                        <div>
                            <h2 className="font-extrabold text-white text-xl">Formas de Pagamento Aceitas</h2>
                            <p className="text-xs text-gray-400">Ative ou desative quais opções aparecem para o cliente no Checkout</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Toggle: Pagamento Online Asaas */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#1E1E1E] border border-white/10 hover:border-[#F4B544]/30 transition-all">
                        <div className="space-y-1 pr-4">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">💳 Pagamento Online (Asaas - PIX & Cartão de Crédito)</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Baixa Automática
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                O cliente paga online via PIX dinâmico (QR Code / Copia e Cola) ou Cartão. O pedido é confirmado automaticamente assim que o pagamento for liquidado.
                            </p>
                        </div>
                        <Switch 
                            checked={settings.accept_online_payment !== false} 
                            onCheckedChange={v => setSettings(s => ({ ...s, accept_online_payment: v }))} 
                        />
                    </div>

                    {/* Toggle: Cartão na Maquininha */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#1E1E1E] border border-white/10 hover:border-[#F4B544]/30 transition-all">
                        <div className="space-y-1 pr-4">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">📟 Cartão na Entrega / Retirada (Maquininha)</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Pagamento com cartão de débito ou crédito presencial na maquininha levada pelo entregador ou no balcão.
                            </p>
                        </div>
                        <Switch 
                            checked={settings.accept_card_machine !== false} 
                            onCheckedChange={v => setSettings(s => ({ ...s, accept_card_machine: v }))} 
                        />
                    </div>

                    {/* Toggle: Dinheiro em Espécie */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#1E1E1E] border border-white/10 hover:border-[#F4B544]/30 transition-all">
                        <div className="space-y-1 pr-4">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">💵 Dinheiro em Espécie (com Troco)</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Permite ao cliente pagar em dinheiro físico e solicitar troco para notas específicas durante a finalização.
                            </p>
                        </div>
                        <Switch 
                            checked={settings.accept_cash !== false} 
                            onCheckedChange={v => setSettings(s => ({ ...s, accept_cash: v }))} 
                        />
                    </div>
                </div>

                <Button onClick={saveDelivery} disabled={loading} className="w-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl h-12 shadow-lg shadow-[#F4B544]/20 hover:scale-[1.01] transition-all disabled:opacity-50">
                    <Save className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} /> 
                    {loading ? "Salvando Formas de Pagamento..." : "Salvar Formas de Pagamento"}
                </Button>
            </div>

            {/* Configurações de Chave Pix Manual */}
            <div className="bg-[#141414] text-white rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <QrCode className="h-6 w-6 text-[#F4B544]" />
                    <div>
                        <h2 className="font-extrabold text-white text-xl">Chave Pix Manual (Opcional)</h2>
                        <p className="text-xs text-gray-400">Dados exibidos caso deseje disponibilizar uma chave Pix direta.</p>
                    </div>
                </div>

                {/* Tipo de chave */}
                <div>
                    <Label className="text-sm font-semibold text-gray-300">Tipo de chave Pix</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {PIX_KEY_TYPES.map(t => (
                            <button key={t.value} type="button"
                                onClick={() => setPixSettings(s => ({ ...s, pix_key_type: t.value }))}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                                    pixSettings.pix_key_type === t.value
                                        ? "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black border-[#F4B544] shadow-md"
                                        : "bg-[#1E1E1E] text-gray-300 border-white/10 hover:border-white/30"
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chave */}
                <div>
                    <Label className="text-sm font-semibold text-gray-300">Chave Pix</Label>
                    <Input value={pixSettings.pix_key}
                        onChange={e => setPixSettings(s => ({ ...s, pix_key: e.target.value }))}
                        placeholder={
                            pixSettings.pix_key_type === "cpf" ? "000.000.000-00" :
                            pixSettings.pix_key_type === "cnpj" ? "00.000.000/0000-00" :
                            pixSettings.pix_key_type === "email" ? "seuemail@exemplo.com" :
                            pixSettings.pix_key_type === "telefone" ? "+55 (00) 00000-0000" :
                            "Chave aleatória (UUID)"
                        }
                        className="mt-1.5 rounded-xl bg-[#1E1E1E] text-white border-white/10 focus:border-[#F4B544]" data-testid="pix-key" />
                </div>

                {/* Nome */}
                <div>
                    <Label className="text-sm font-semibold text-gray-300">Nome do titular</Label>
                    <Input value={pixSettings.pix_name}
                        onChange={e => setPixSettings(s => ({ ...s, pix_name: e.target.value }))}
                        placeholder="Nome que aparece no recebedor do Pix" className="mt-1.5 rounded-xl bg-[#1E1E1E] text-white border-white/10 focus:border-[#F4B544]" data-testid="pix-name" />
                </div>

                {/* QR Code */}
                <div>
                    <Label className="text-sm font-semibold text-gray-300">QR Code Pix</Label>
                    {pixSettings.qr_code_url ? (
                        <div className="mt-2 flex items-start gap-4 p-4 bg-[#1E1E1E] border border-white/10 rounded-2xl">
                            <div className="relative inline-block">
                                <img src={pixSettings.qr_code_url} alt="QR Code Pix" className="h-32 w-32 rounded-xl object-contain border p-1 bg-white" />
                                <button type="button" onClick={() => setPixSettings(s => ({ ...s, qr_code_url: "" }))}
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-lg">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 space-y-3">
                                <p className="text-xs text-gray-400 font-semibold">Imagem atual do QR Code</p>
                                <label className="cursor-pointer">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                                    <Button type="button" variant="outline" size="sm" className="rounded-xl w-full border-white/10 bg-white/5 text-white hover:bg-white/10" disabled={uploadingQr} asChild>
                                        <span><Upload className="h-4 w-4 mr-2" />{uploadingQr ? "Enviando..." : "Substituir imagem"}</span>
                                    </Button>
                                </label>
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Ou cole a URL:</p>
                                    <Input value={pixSettings.qr_code_url}
                                        onChange={e => setPixSettings(s => ({ ...s, qr_code_url: e.target.value }))}
                                        placeholder="https://..." className="rounded-xl bg-[#10100F] text-white border-white/10 text-xs" data-testid="pix-qr-url" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 space-y-3">
                            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-2xl p-6 hover:border-[#F4B544] hover:bg-white/5 transition-colors bg-[#1E1E1E]">
                                <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                                {uploadingQr ? (
                                    <><div className="h-8 w-8 rounded-full border-2 border-[#F4B544] border-t-transparent animate-spin" /><span className="text-sm text-gray-400 font-semibold">Enviando...</span></>
                                ) : (
                                    <><QrCode className="h-8 w-8 text-[#F4B544]" /><span className="text-sm font-extrabold text-white">Clique para enviar a imagem do QR Code</span><span className="text-xs text-gray-400">PNG, JPG — máx. 2MB</span></>
                                )}
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-white/10" />
                                <span className="text-xs text-gray-500 font-bold uppercase">ou</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>
                            <Input value={pixSettings.qr_code_url}
                                onChange={e => setPixSettings(s => ({ ...s, qr_code_url: e.target.value }))}
                                placeholder="Cole a URL da imagem do QR Code" className="rounded-xl bg-[#1E1E1E] text-white border-white/10 text-sm focus:border-[#F4B544]" data-testid="pix-qr-url" />
                        </div>
                    )}
                </div>

                <Button onClick={savePix} className="w-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl h-12 shadow-lg shadow-[#F4B544]/20 hover:scale-[1.01] transition-all" data-testid="save-pix-btn">
                    <Save className="h-5 w-5 mr-2" /> Salvar Chave Pix
                </Button>
            </div>
        </div>
    );
}
