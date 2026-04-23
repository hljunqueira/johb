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
        <div className="min-h-screen bg-[#4A148C] flex items-center justify-center px-4 relative overflow-hidden" data-testid="admin-login-page">
            {/* Elementos decorativos de fundo para parecer com o cliente */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-800/20 rounded-full blur-3xl" />
            
            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="h-28 w-28 rounded-full border-4 border-white/20 bg-white shadow-2xl overflow-hidden mx-auto mb-4 transition-transform hover:scale-105 duration-300">
                        <img src="/Logo-saladasoul.jpeg" alt="Logo Salada Soul" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-bold font-heading text-white tracking-tight">Salada Soul</h1>
                    <p className="text-purple-200 mt-1 font-medium text-lg">Painel Administrativo</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-white/20 p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-purple-900 font-semibold ml-1">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                data-testid="admin-email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="admin@saladasoul.com" 
                                className="h-12 rounded-xl border-purple-100 focus:border-primary focus:ring-primary bg-purple-50/50" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" name="password" className="text-purple-900 font-semibold ml-1">Senha</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                data-testid="admin-password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="Sua senha" 
                                className="h-12 rounded-xl border-purple-100 focus:border-primary focus:ring-primary bg-purple-50/50" 
                                required 
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-[#4A148C] hover:bg-[#310d5e] text-white rounded-xl h-12 font-bold text-lg shadow-lg transition-all active:scale-[0.98]" data-testid="admin-login-btn">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Painel"}
                        </Button>
                    </form>
                </div>

                <p className="text-center mt-8">
                    <button onClick={() => navigate("/")} className="text-white/70 hover:text-white transition-colors flex items-center gap-2 mx-auto font-medium">
                        ← Voltar ao cardápio
                    </button>
                </p>
            </div>
        </div>
    );
}
