import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const rawBackend = process.env.REACT_APP_BACKEND_URL || '';
const BACKEND_URL = (rawBackend && rawBackend.includes('hljdev.com.br'))
    ? rawBackend
    : 'https://johb-api.hljdev.com.br';
const API = `${BACKEND_URL}/api`;
const AuthContext = createContext();

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setTokenState] = useState(() => localStorage.getItem("johb-admin-token"));

    const setToken = (t) => {
        setTokenState(t);
        if (t) localStorage.setItem("johb-admin-token", t);
        else localStorage.removeItem("johb-admin-token");
    };

    useEffect(() => {
        if (token) {
            axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 })
                .then(res => { setUser(res.data); setLoading(false); })
                .catch(err => {
                    if (err.response && err.response.status === 401) {
                        setToken(null);
                        setUser(null);
                    }
                    setLoading(false);
                });
        } else { setLoading(false); }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const login = async (email, password) => {
        const res = await axios.post(`${API}/auth/login`, { email, password }, { timeout: 20000 });
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const loginWithGoogle = () => {
        // Login com Google desabilitado temporariamente
        console.warn("Login com Google nao disponivel");
    };

    const processGoogleSession = async (sessionId) => {
        const res = await axios.get(`${API}/auth/google-session`, {
            headers: { "X-Session-ID": sessionId }
        });
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = async () => {
        try { await axios.post(`${API}/auth/logout`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); } catch {}
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
