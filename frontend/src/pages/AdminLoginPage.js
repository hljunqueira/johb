import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    if (user) { 
        setTimeout(() => navigate("/admin/pedidos", { replace: true }), 0); 
        return null; 
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try { 
            await login(email, password); 
            toast.success("Login realizado com sucesso!");
            navigate("/admin/pedidos", { replace: true }); 
        }
        catch (err) { 
            const errorMsg = err.response?.data?.detail || err.message || "Email ou senha incorretos";
            toast.error(typeof errorMsg === 'string' ? errorMsg : "Email ou senha incorretos"); 
        }
        finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden font-sans" data-testid="admin-login-page">
            {/* Elementos decorativos em tom Dourado JOHB */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#F4B544]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#C88A24]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-full max-w-md relative z-10 space-y-6">
                
                {/* Logo Sem Fundo Oficial e Título do Painel */}
                <div className="text-center space-y-2">
                    <img 
                        src="/logo-semfundo.png" 
                        alt="JOHB Café & Salgados" 
                        className="h-24 sm:h-28 w-auto mx-auto object-contain transition-transform hover:scale-105 duration-300 drop-shadow-2xl"
                    />
                    <p className="text-[#F4B544] font-semibold text-xs tracking-widest uppercase pt-1">
                        PAINEL ADMINISTRATIVO
                    </p>
                </div>

                {/* Card de Login */}
                <div className="bg-[#10100F] border border-[#F4B544]/25 rounded-2xl p-6 sm:p-8 shadow-2xl gold-glow-sm">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Input de Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs uppercase font-bold tracking-wider text-[#FFFAF0]/80 ml-1">
                                Email
                            </Label>
                            <div className="relative flex items-center">
                                <Mail className="absolute left-3.5 w-5 h-5 text-[#F4B544]/80 pointer-events-none" />
                                <Input 
                                    id="email" 
                                    type="email" 
                                    data-testid="admin-email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="admin@johb.com.br" 
                                    className="h-12 pl-11 pr-4 rounded-xl border-[#F4B544]/30 bg-[#171612] text-[#FFFAF0] placeholder:text-[#B8B1A3]/50 focus:border-[#F4B544] focus:ring-[#F4B544]/30 text-sm transition-all" 
                                    required 
                                />
                            </div>
                        </div>

                        {/* Input de Senha */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs uppercase font-bold tracking-wider text-[#FFFAF0]/80 ml-1">
                                Senha
                            </Label>
                            <div className="relative flex items-center">
                                <Lock className="absolute left-3.5 w-5 h-5 text-[#F4B544]/80 pointer-events-none" />
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    data-testid="admin-password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    placeholder="••••••••" 
                                    className="h-12 pl-11 pr-11 rounded-xl border-[#F4B544]/30 bg-[#171612] text-[#FFFAF0] placeholder:text-[#B8B1A3]/50 focus:border-[#F4B544] focus:ring-[#F4B544]/30 text-sm transition-all" 
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 text-[#B8B1A3] hover:text-[#F4B544] transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Botão de Entrar */}
                        <Button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-[#F4B544] hover:bg-[#FFC85C] text-[#050505] rounded-xl h-12 font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] mt-2" 
                            data-testid="admin-login-btn"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Painel"}
                        </Button>
                    </form>
                </div>

                {/* Botão Voltar ao Cardápio */}
                <p className="text-center pt-2">
                    <button 
                        onClick={() => navigate("/")} 
                        className="text-[#B8B1A3] hover:text-[#F4B544] transition-colors inline-flex items-center gap-2 font-medium text-xs uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-4 h-4 text-[#F4B544]" />
                        <span>Voltar ao cardápio</span>
                    </button>
                </p>
            </div>
        </div>
    );
}
