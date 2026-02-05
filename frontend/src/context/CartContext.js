import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try { const s = localStorage.getItem("salada-soul-cart"); return s ? JSON.parse(s) : []; }
        catch { return []; }
    });

    useEffect(() => { localStorage.setItem("salada-soul-cart", JSON.stringify(items)); }, [items]);

    const addItem = (product, quantity = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.product_id === product.id);
            if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
            return [...prev, { product_id: product.id, product_name: product.name, price: product.price, image_url: product.image_url, quantity, observation: "" }];
        });
    };

    const removeItem = (productId) => setItems(prev => prev.filter(i => i.product_id !== productId));

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) { removeItem(productId); return; }
        setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity } : i));
    };

    const updateObservation = (productId, observation) => {
        setItems(prev => prev.map(i => i.product_id === productId ? { ...i, observation } : i));
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
