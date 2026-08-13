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
        try { 
            await login(email, password); 
            toast.success("Login realizado com sucesso!");
            navigate("/admin/pedidos", { replace: true }); 
        }
        catch { 
            toast.error("Email ou senha incorretos"); 
        }
        finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4 relative overflow-hidden" data-testid="admin-login-page">
            {/* Elementos decorativos em tom Dourado/Gold da marca JOHB */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
            
            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="h-20 w-20 rounded-full border-2 border-[#D4AF37] bg-[#1E1E1E] shadow-2xl flex items-center justify-center mx-auto mb-4 transition-transform hover:scale-105 duration-300">
                        <span className="text-3xl font-extrabold text-[#D4AF37] tracking-wider">JOHB</span>
                    </div>
                    <h1 className="text-3xl font-bold font-heading text-white tracking-tight">JOHB</h1>
                    <p className="text-[#D4AF37] font-semibold text-xs tracking-widest uppercase mt-1">CAFÉ & SALGADOS — PAINEL ADMIN</p>
                </div>

                <div className="bg-[#1E1E1E] border border-[#D4AF37]/20 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300 font-semibold ml-1">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                data-testid="admin-email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="admin@johb.com.br" 
                                className="h-12 rounded-xl border-[#333333] bg-[#121212] text-white focus:border-[#D4AF37] focus:ring-[#D4AF37]" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" name="password" className="text-gray-300 font-semibold ml-1">Senha</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                data-testid="admin-password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className="h-12 rounded-xl border-[#333333] bg-[#121212] text-white focus:border-[#D4AF37] focus:ring-[#D4AF37]" 
                                required 
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#b8962e] text-black rounded-xl h-12 font-bold text-lg shadow-lg transition-all active:scale-[0.98]" data-testid="admin-login-btn">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Painel"}
                        </Button>
                    </form>
                </div>

                <p className="text-center mt-8">
                    <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto font-medium text-sm">
                        ← Voltar ao cardápio
                    </button>
                </p>
            </div>
        </div>
    );
}
