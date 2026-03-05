import { createContext, useContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

const CustomerContext = createContext();

CustomerProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export function CustomerProvider({ children }) {
    const [customer, setCustomer] = useState(() => {
        try {
            const saved = localStorage.getItem("salada-soul-customer");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [lastOrders, setLastOrders] = useState([]);
    const [reorderSuggestions, setReorderSuggestions] = useState([]);

    // Salvar no localStorage quando customer mudar
    useEffect(() => {
        if (customer) {
            localStorage.setItem("salada-soul-customer", JSON.stringify(customer));
        } else {
            localStorage.removeItem("salada-soul-customer");
        }
    }, [customer]);

    // Carregar últimos pedidos
    const loadLastOrders = useCallback(async (phone) => {
        try {
            const response = await axios.get(`${API}/customers/${phone}/orders?limit=5`);
            setLastOrders(response.data);
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error);
            setLastOrders([]);
        }
    }, []);

    // Carregar sugestões de "pedir novamente"
    const loadReorderSuggestions = useCallback(async (phone) => {
        try {
            const response = await axios.get(`${API}/customers/${phone}/reorder-suggestions`);
            setReorderSuggestions(response.data);
        } catch (error) {
            console.error("Erro ao carregar sugestões:", error);
            setReorderSuggestions([]);
        }
    }, []);

    // Login/Identificação do cliente (apenas telefone, sem senha)
    const login = useCallback(async (phone, name = null) => {
        setLoading(true);
        try {
            const cleanPhone = phone.replace(/\D/g, "");
            const response = await axios.post(`${API}/customers/login`, {
                phone: cleanPhone,
                name: name || undefined
            });
            
            const customerData = response.data;
            setCustomer(customerData);
            
            // Carregar dados adicionais
            await Promise.all([
                loadLastOrders(cleanPhone),
                loadReorderSuggestions(cleanPhone)
            ]);
            
            return { success: true, isNew: customerData.is_new };
        } catch (error) {
            console.error("Erro no login:", error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    }, [loadLastOrders, loadReorderSuggestions]);

    // Atualizar dados do cliente
    const updateCustomer = useCallback(async (data) => {
        if (!customer?.phone) return { success: false };
        
        try {
            const response = await axios.put(`${API}/customers/${customer.phone}`, data);
            setCustomer(prev => ({ ...prev, ...response.data }));
            return { success: true };
        } catch (error) {
            console.error("Erro ao atualizar cliente:", error);
            return { success: false, error: error.message };
        }
    }, [customer?.phone]);

    // Sincronizar favoritos com o banco
    const syncFavorites = useCallback(async (favorites) => {
        if (!customer?.phone) return;
        
        try {
            await axios.put(`${API}/customers/${customer.phone}`, {
                favorites: favorites.map(f => ({
                    id: f.id,
                    name: f.name,
                    price: f.price,
                    image_url: f.image_url
                }))
            });
        } catch (error) {
            console.error("Erro ao sincronizar favoritos:", error);
        }
    }, [customer?.phone]);

    // Logout
    const logout = useCallback(() => {
        setCustomer(null);
        setLastOrders([]);
        setReorderSuggestions([]);
        localStorage.removeItem("salada-soul-customer");
    }, []);

    // Verificar se está logado
    const isLoggedIn = !!customer?.phone;

    // Recarregar dados quando o cliente logar
    useEffect(() => {
        if (customer?.phone && lastOrders.length === 0) {
            loadLastOrders(customer.phone);
            loadReorderSuggestions(customer.phone);
        }
    }, [customer?.phone, loadLastOrders, loadReorderSuggestions, lastOrders.length]);

    const value = {
        customer,
        isLoggedIn,
        loading,
        lastOrders,
        reorderSuggestions,
        login,
        logout,
        updateCustomer,
        syncFavorites,
        refreshOrders: () => customer?.phone && loadLastOrders(customer.phone),
        refreshSuggestions: () => customer?.phone && loadReorderSuggestions(customer.phone)
    };

    return (
        <CustomerContext.Provider value={value}>
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomer() {
    const context = useContext(CustomerContext);
    if (!context) {
        throw new Error("useCustomer deve ser usado dentro de CustomerProvider");
    }
    return context;
}
