import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const CartContext = createContext();

CartProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

// Função para obter a chave do carrinho baseada no telefone do cliente
const getCartKey = () => {
    const phone = localStorage.getItem("salada-soul-phone");
    return phone ? `salada-soul-cart-${phone}` : "salada-soul-cart-guest";
};

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try { const s = sessionStorage.getItem(getCartKey()); return s ? JSON.parse(s) : []; }
        catch { return []; }
    });

    // Atualiza o carrinho quando a chave muda (cliente loga/desloga)
    useEffect(() => {
        const handleStorageChange = () => {
            try { 
                const s = sessionStorage.getItem(getCartKey()); 
                setItems(s ? JSON.parse(s) : []); 
            }
            catch { setItems([]); }
        };
        
        // Escuta mudanças no localStorage (quando cliente loga)
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    useEffect(() => { sessionStorage.setItem(getCartKey(), JSON.stringify(items)); }, [items]);

    const addItem = (product, quantity = 1, selectedAdditionals = [], observation = "") => {
        const addNames = selectedAdditionals.map(a => a.name).sort().join(",");
        const cartId = `${product.id}_${addNames}`;
        const addPrice = selectedAdditionals.reduce((s, a) => s + a.price, 0);
        const unitPrice = product.price + addPrice;

        setItems(prev => {
            const existing = prev.find(i => i.cart_id === cartId);
            if (existing) return prev.map(i => i.cart_id === cartId ? { ...i, quantity: i.quantity + quantity } : i);
            return [...prev, {
                cart_id: cartId,
                product_id: product.id,
                product_name: product.name,
                base_price: product.price,
                price: unitPrice,
                image_url: product.image_url,
                quantity,
                additionals: selectedAdditionals,
                observation
            }];
        });
    };

    const removeItem = (cartId) => setItems(prev => prev.filter(i => i.cart_id !== cartId));

    const updateQuantity = (cartId, quantity) => {
        if (quantity <= 0) { removeItem(cartId); return; }
        setItems(prev => prev.map(i => i.cart_id === cartId ? { ...i, quantity } : i));
    };

    const updateObservation = (cartId, observation) => {
        setItems(prev => prev.map(i => i.cart_id === cartId ? { ...i, observation } : i));
    };

    const clearCart = () => setItems([]);
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemCount = items.reduce((s, i) => s + i.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, updateObservation, clearCart, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() { return useContext(CartContext); }
