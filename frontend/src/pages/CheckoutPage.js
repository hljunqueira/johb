import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Truck, Store, Copy, Check, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const getImageUrl = (url) => { if (!url) return ""; if (url.startsWith("http")) return url; return `${BACKEND_URL}${url}`; };

export default function CheckoutPage() {
    const { items, total, clearCart } = useCart();
    const navigate = useNavigate();
    const [name, setName] = useState(() => localStorage.getItem("salada-soul-name") || "");
    const [phone, setPhone] = useState(() => localStorage.getItem("salada-soul-phone") || "");
    const [deliveryType, setDeliveryType] = useState("retirada");
    const [address, setAddress] = useState("");
    const [neighborhood, setNeighborhood] = useState("");
    const [deliverySettings, setDeliverySettings] = useState(null);
    const [pixSettings, setPixSettings] = useState(null);
    const [showPix, setShowPix] = useState(false);
    const [pixCopied, setPixCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        if (items.length === 0) navigate("/");
        axios.get(`${API}/delivery-settings`).then(r => setDeliverySettings(r.data));
        axios.get(`${API}/pix-settings`).then(r => setPixSettings(r.data));
    }, []); // eslint-disable-line

    const deliveryFee = (() => {
        if (deliveryType !== "entrega" || !deliverySettings) return 0;
        if (total >= (deliverySettings.min_free_delivery || 60)) return 0;
        const area = deliverySettings.areas?.find(a => a.name === neighborhood);
        return area ? area.fee : deliverySettings.delivery_fee || 5;
    })();
    const grandTotal = total + deliveryFee;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !phone) { toast.error("Preencha nome e telefone"); return; }
        if (deliveryType === "entrega" && (!address || !neighborhood)) { toast.error("Preencha endereco e bairro"); return; }
        setLoading(true);
        try {
            const res = await axios.post(`${API}/orders`, {
                customer_name: name, customer_phone: phone, delivery_type: deliveryType,
                address, neighborhood,
                items: items.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, price: i.price, observation: i.observation || "" }))
            });
            localStorage.setItem("salada-soul-phone", phone);
            localStorage.setItem("salada-soul-name", name);
            setOrderId(res.data.id);
            if (pixSettings?.pix_key) { setShowPix(true); }
            else { clearCart(); navigate(`/pedido/${res.data.id}`); }
        } catch { toast.error("Erro ao criar pedido"); }
        finally { setLoading(false); }
    };

    const handlePixDone = () => { setShowPix(false); clearCart(); navigate(`/pedido/${orderId}`); };
    const copyPixKey = () => {
        navigator.clipboard.writeText(pixSettings?.pix_key || "");
        setPixCopied(true); toast.success("Chave Pix copiada!");
        setTimeout(() => setPixCopied(false), 3000);
    };

    return (
        <div className="min-h-screen bg-background" data-testid="checkout-page">
            <header className="bg-white border-b border-border">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></Button>
                    <h1 className="text-xl font-bold font-heading">Finalizar Pedido</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Summary */}
                    <div className="bg-white rounded-2xl border border-border p-5">
                        <h2 className="font-semibold font-heading mb-3">Resumo do Pedido</h2>
                        <div className="space-y-2.5">
                            {items.map(item => (
                                <div key={item.product_id} className="flex items-center gap-3">
                                    <img src={getImageUrl(item.image_url)} alt="" className="h-11 w-11 rounded-lg object-cover" />
                                    <div className="flex-1"><p className="text-sm font-medium">{item.quantity}x {item.product_name}</p></div>
                                    <span className="text-sm font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
                        <h2 className="font-semibold font-heading">Seus Dados</h2>
                        <div><Label htmlFor="name">Nome</Label><Input id="name" data-testid="checkout-name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className="mt-1 rounded-lg" required /></div>
                        <div><Label htmlFor="phone">Telefone</Label><Input id="phone" data-testid="checkout-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1 rounded-lg" required /></div>
                    </div>

                    {/* Delivery */}
                    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
                        <h2 className="font-semibold font-heading">Tipo de Entrega</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setDeliveryType("retirada")} data-testid="delivery-pickup"
                                className={`p-4 rounded-xl border-2 text-center transition-all ${deliveryType === "retirada" ? "border-primary bg-primary/5" : "border-border"}`}>
                                <Store className="h-6 w-6 mx-auto mb-2 text-primary" /><p className="font-medium text-sm">Retirada</p><p className="text-xs text-muted-foreground">No local</p>
                            </button>
                            <button type="button" onClick={() => setDeliveryType("entrega")} data-testid="delivery-delivery"
                                className={`p-4 rounded-xl border-2 text-center transition-all ${deliveryType === "entrega" ? "border-primary bg-primary/5" : "border-border"}`}>
                                <Truck className="h-6 w-6 mx-auto mb-2 text-primary" /><p className="font-medium text-sm">Entrega</p><p className="text-xs text-muted-foreground">No seu endereco</p>
                            </button>
                        </div>
                        {deliveryType === "entrega" && (
                            <div className="space-y-3 pt-2">
                                <div>
                                    <Label>Bairro</Label>
                                    <select data-testid="checkout-neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                                        className="w-full mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm" required>
                                        <option value="">Selecione o bairro</option>
                                        {deliverySettings?.areas?.map(a => <option key={a.name} value={a.name}>{a.name} {a.fee > 0 ? `(R$ ${a.fee.toFixed(2)})` : "(Gratis)"}</option>)}
                                    </select>
                                </div>
                                <div><Label>Endereco completo</Label><Textarea data-testid="checkout-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, numero, complemento..." className="mt-1 rounded-lg" required /></div>
                                {deliverySettings?.min_free_delivery && <p className="text-xs text-muted-foreground">Frete gratis para pedidos acima de R$ {deliverySettings.min_free_delivery.toFixed(2)}</p>}
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="bg-white rounded-2xl border border-border p-5 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
                        {deliveryType === "entrega" && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de entrega</span><span>{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : "Gratis"}</span></div>}
                        <Separator />
                        <div className="flex justify-between text-xl font-bold font-heading"><span>Total</span><span className="text-primary">R$ {grandTotal.toFixed(2)}</span></div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-white rounded-full py-5 text-lg font-semibold" data-testid="submit-order-btn">
                        {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}Confirmar Pedido - R$ {grandTotal.toFixed(2)}
                    </Button>
                </form>
            </div>

            {/* Pix Modal */}
            <Dialog open={showPix} onOpenChange={setShowPix}>
                <DialogContent className="rounded-2xl" data-testid="pix-modal">
                    <DialogHeader><DialogTitle className="font-heading text-xl">Pagamento via Pix</DialogTitle></DialogHeader>
                    <div className="text-center space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Copie a chave Pix abaixo e realize o pagamento no app do seu banco</p>
                        {pixSettings?.qr_code_url && <img src={getImageUrl(pixSettings.qr_code_url)} alt="QR Code Pix" className="mx-auto h-48 w-48 rounded-xl" />}
                        <div className="bg-muted rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Chave Pix</p>
                            <p className="font-mono text-sm font-medium break-all">{pixSettings?.pix_key || "Chave Pix sera configurada em breve"}</p>
                        </div>
                        <Button onClick={copyPixKey} variant="outline" className="rounded-full" data-testid="copy-pix-btn">
                            {pixCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}{pixCopied ? "Copiado!" : "Copiar Chave"}
                        </Button>
                        <Separator />
                        <Button onClick={handlePixDone} className="w-full bg-primary text-white rounded-full py-5" data-testid="pix-done-btn">Ja realizei o pagamento</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
