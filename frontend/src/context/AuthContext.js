import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setTokenState] = useState(() => localStorage.getItem("salada-soul-admin-token"));

    const setToken = (t) => {
        setTokenState(t);
        if (t) localStorage.setItem("salada-soul-admin-token", t);
        else localStorage.removeItem("salada-soul-admin-token");
    };

    useEffect(() => {
        if (token) {
            axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
                .then(res => { setUser(res.data); setLoading(false); })
                .catch(() => { setToken(null); setUser(null); setLoading(false); });
        } else { setLoading(false); }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const login = async (email, password) => {
        const res = await axios.post(`${API}/auth/login`, { email, password });
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const loginWithGoogle = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + "/admin/pedidos";
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    const processGoogleSession = async (sessionId) => {
        const res = await axios.get(`${API}/auth/google-session`, {
            headers: { "X-Session-ID": sessionId }, withCredentials: true
        });
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = async () => {
        try { await axios.post(`${API}/auth/logout`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true }); } catch {}
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, token, login, loginWithGoogle, processGoogleSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() { return useContext(AuthContext); }
