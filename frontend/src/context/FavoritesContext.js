import { createContext, useContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;
const FavoritesContext = createContext();

FavoritesProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export function FavoritesProvider({ children }) {
    // Armazena objetos completos dos produtos favoritos
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem("salada-soul-favorites-v2");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [customerPhone, setCustomerPhone] = useState(() => {
        try {
            const saved = localStorage.getItem("salada-soul-customer");
            return saved ? JSON.parse(saved)?.phone : null;
        } catch {
            return null;
        }
    });

    // Salvar no localStorage quando favorites mudar
    useEffect(() => {
        localStorage.setItem("salada-soul-favorites-v2", JSON.stringify(favorites));
    }, [favorites]);

    // Sincronizar com banco quando houver cliente logado
    const syncWithBackend = useCallback(async (phone, newFavorites) => {
        if (!phone) return;
        try {
            await axios.put(`${API}/customers/${phone}`, {
                favorites: newFavorites.map(f => ({
                    id: f.id,
                    name: f.name,
                    price: f.price,
                    image_url: f.image_url,
                    description: f.description,
                    tags: f.tags
                }))
            });
        } catch (error) {
            console.error("Erro ao sincronizar favoritos:", error);
        }
    }, []);

    // Carregar favoritos do banco quando cliente logar
    const loadFromBackend = useCallback(async (phone) => {
        if (!phone) return;
        try {
            const response = await axios.get(`${API}/customers/${phone}`);
            const backendFavorites = response.data.favorites || [];
            if (backendFavorites.length > 0) {
                // Mesclar com favoritos locais (evitar duplicatas)
                setFavorites(prev => {
                    const merged = [...prev];
                    backendFavorites.forEach(bf => {
                        if (!merged.find(p => p.id === bf.id)) {
                            merged.push({
                                ...bf,
                                added_at: new Date().toISOString()
                            });
                        }
                    });
                    return merged;
                });
            }
        } catch (error) {
            console.error("Erro ao carregar favoritos:", error);
        }
    }, []);

    // Atualizar phone quando localStorage mudar
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const saved = localStorage.getItem("salada-soul-customer");
                const phone = saved ? JSON.parse(saved)?.phone : null;
                if (phone !== customerPhone) {
                    setCustomerPhone(phone);
                    if (phone) {
                        loadFromBackend(phone);
                    }
                }
            } catch {
                setCustomerPhone(null);
            }
        };

        window.addEventListener("storage", handleStorageChange);
        // Verificar a cada 2 segundos (para mudanças no mesmo tab)
        const interval = setInterval(handleStorageChange, 2000);
        
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(interval);
        };
    }, [customerPhone, loadFromBackend]);

    // Adiciona ou remove produto dos favoritos
    const toggleFavorite = (product) => {
        setFavorites(prev => {
            const exists = prev.find(p => p.id === product.id);
            let newFavorites;
            if (exists) {
                newFavorites = prev.filter(p => p.id !== product.id);
            } else {
                // Armazena apenas dados essenciais do produto
                const productData = {
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    image_url: product.image_url,
                    category_id: product.category_id,
                    tags: product.tags,
                    added_at: new Date().toISOString()
                };
                newFavorites = [...prev, productData];
            }
            // Sincronizar com backend se houver cliente logado
            syncWithBackend(customerPhone, newFavorites);
            return newFavorites;
        });
    };

    const isFavorite = (productId) => favorites.some(p => p.id === productId);

    const removeFavorite = (productId) => {
        setFavorites(prev => {
            const newFavorites = prev.filter(p => p.id !== productId);
            syncWithBackend(customerPhone, newFavorites);
            return newFavorites;
        });
    };

    const clearFavorites = () => {
        setFavorites([]);
        syncWithBackend(customerPhone, []);
    };

    const favoritesCount = favorites.length;

    return (
        <FavoritesContext.Provider value={{ 
            favorites, 
            toggleFavorite, 
            isFavorite, 
            removeFavorite,
            clearFavorites,
            favoritesCount,
            syncWithBackend,
            loadFromBackend
        }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    return useContext(FavoritesContext);
}
