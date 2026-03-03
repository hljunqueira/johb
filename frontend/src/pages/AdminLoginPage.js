import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    if (user) { setTimeout(() => navigate("/admin/pedidos", { replace: true }), 0); return null; }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try { await login(email, password); navigate("/admin/pedidos", { replace: true }); }
        catch { toast.error("Email ou senha incorretos"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="admin-login-page">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">SS</div>
                    <h1 className="text-3xl font-bold font-heading text-foreground">Salada Soul</h1>
                    <p className="text-muted-foreground mt-1">Painel Administrativo</p>
                </div>

                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" data-testid="admin-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@saladasoul.com" className="mt-1 rounded-lg" required /></div>
                        <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" data-testid="admin-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" className="mt-1 rounded-lg" required /></div>
                        <Button type="submit" disabled={loading} className="w-full bg-primary text-white rounded-full py-5 font-semibold" data-testid="admin-login-btn">
                            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Entrar
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Voltar ao cardapio</button>
                </p>
            </div>
        </div>
    );
}
