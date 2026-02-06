import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try { const s = localStorage.getItem("salada-soul-cart"); return s ? JSON.parse(s) : []; }
        catch { return []; }
    });

    useEffect(() => { localStorage.setItem("salada-soul-cart", JSON.stringify(items)); }, [items]);

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
