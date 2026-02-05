import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, loginWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    if (user) { navigate("/admin/pedidos", { replace: true }); return null; }

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
                    <img src="https://customer-assets.emergentagent.com/job_soul-delivery/artifacts/3puvg49l_IMG_1929.jpeg" alt="Salada Soul" className="h-20 w-20 rounded-full mx-auto mb-4 shadow-lg" />
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

                    <div className="flex items-center gap-3 my-5"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">ou</span><Separator className="flex-1" /></div>

                    <Button variant="outline" className="w-full rounded-full py-5" onClick={loginWithGoogle} data-testid="google-login-btn">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Entrar com Google
                    </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Voltar ao cardapio</button>
                </p>
            </div>
        </div>
    );
}
