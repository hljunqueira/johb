import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

/**
 * Hook for managing orders with auto-refresh and notifications
 */
export function useOrders({ token, filter = "", refreshInterval = 10000, enableSound = true }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newOrderCount, setNewOrderCount] = useState(0);
    const previousOrdersRef = useRef([]);
    const audioRef = useRef(null);

    // Initialize audio for notifications
    useEffect(() => {
        if (enableSound && typeof window !== "undefined") {
            audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleR8NW7TW1qV0IQlAnNPcp3UbCEec1NijcBcGSKHT2aByGghLn9TYoG4WBkui1NijbhYGS6TW2aNtFgZLpdbbpGwVBU2n2NsAAAAAAPz8/Pz4+Pj4+Pj4+Pj4+Pj09PT09PT09PDw8PDw8PDw8PDw8Ozs7Ozs7Ozs7Ozs6Ojo6Ojo6Ojo6Ojm5ubm5ubm5uTk5OTk5OTk5OTk5OPj4+Pj4+Pj4+Pj4+Li4uLi4uLi4uLi4uHh4eHh4eHh4eHh4eDg4ODg4ODg4ODg4N/f39/f39/f39/f39/e3t7e3t7e3t7e3t7d3d3d3d3d3d3d3d3c3Nzc3Nzc3Nzc3Nzb29vb29vb29vb29va2tra2tra2tra2trZ2dnZ2dnZ2dnZ2dnY2NjY2NjY2NjY2NjX19fX19fX19fX19fW1tbW1tbW1tbW1tbV1dXV1dXV1dXV1dXU1NTU1NTU1NTU1NTT09PT09PT09PT09PS0tLS0tLS0tLS0tLR0dHR0dHR0dHR0dHQ0NDQ0NDQ0NDQ0NDPz8/Pz8/Pz8/Pz8/Ozs7Ozs7Ozs7Ozs7Nzc3Nzc3Nzc3Nzc3MzMzMzMzMzMzMzMzLy8vLy8vLy8vLy8vKysrKysrKysrKysnJycnJycnJycnJycjIyMjIyMjIyMjIyMfHx8fHx8fHx8fHx8bGxsbGxsbGxsbGxsXFxcXFxcXFxcXFxcTExMTExMTExMTExMPDw8PDw8PDw8PDw8LCwsLCwsLCwsLCwsHBwcHBwcHBwcHBwcDAwMDAwMDAwMDAwL+/v7+/v7+/v7+/v76+vr6+vr6+vr6+vr29vb29vb29vb29vby8vLy8vLy8vLy8vLu7u7u7u7u7u7u7u7q6urq6urq6urq6urm5ubm5ubm5ubm5ubm4uLi4uLi4uLi4uLi3t7e3t7e3t7e3t7e2tra2tra2tra2tra1tbW1tbW1tbW1tbW0tLS0tLS0tLS0tLSzs7Ozs7Ozs7Ozs7OysrKysrKysrKysrKxsbGxsbGxsbGxsbGwsLCwsLCwsLCwsLCvr6+vr6+vr6+vr6+urq6urq6urq6urq6ubm5ubm5ubm5ubm5uLi4uLi4uLi4uLi4t7e3t7e3t7e3t7e3tra2tra2tra2tra2tbW1tbW1tbW1tbW1tLS0tLS0tLS0tLS0s7Ozs7Ozs7Ozs7OzsrKysrKysrKysrKysbGxsbGxsbGxsbGxsLCwsLCwsLCwsLCwr6+vr6+vr6+vr6+vrq6urq6urq6urq6ura2tra2tra2tra2trKysrKysrKysrKysq6urq6urq6urq6urqqqqqqqqqqqqqqqqaWlpaWlpaWlpaWlpKSkpKSkpKSkpKSkpKCgoKCgoKCgoKCgoKCYmJiYmJiYmJiYmJiYkJCQkJCQkJCQkJCQkIiIiIiIiIiIiIiIiIiAgICAgICAgICAgIB4eHh4eHh4eHh4eHhwcHBwcHBwcHBwcHBoaGhoaGhoaGhoaGhgYGBgYGBgYGBgYGBYWFhYWFhYWFhYWFhQUFBQUFBQUFBQUFBISEhISEhISEhISEhAQEBAQEBAQEBAQEA4ODg4ODg4ODg4ODgwMDAwMDAwMDAwMDAoKCgoKCgoKCgoKCggICAgICAgICAgICAYGBgYGBgYGBgYGBgQEBAQEBAQEBAQEBAICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAA==");
        }
    }, [enableSound]);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current && enableSound) {
            audioRef.current.play().catch(() => {});
        }
    }, [enableSound]);

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        
        try {
            const params = filter ? `?status=${filter}` : "";
            const res = await axios.get(`${API}/admin/orders${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const newOrders = res.data;
            
            // Check for new orders (only if we have previous data)
            if (previousOrdersRef.current.length > 0) {
                const previousIds = new Set(previousOrdersRef.current.map(o => o.id));
                const brandNewOrders = newOrders.filter(o => !previousIds.has(o.id));
                
                if (brandNewOrders.length > 0) {
                    setNewOrderCount(prev => prev + brandNewOrders.length);
                    playNotificationSound();
                }
            }
            
            previousOrdersRef.current = newOrders;
            setOrders(newOrders);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, filter, playNotificationSound]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchOrders, refreshInterval]);

    const clearNewOrderCount = useCallback(() => {
        setNewOrderCount(0);
    }, []);

    const updateOrderStatus = useCallback(async (orderId, status) => {
        try {
            await axios.put(`${API}/admin/orders/${orderId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchOrders();
            return true;
        } catch {
            return false;
        }
    }, [token, fetchOrders]);

    const markOrderPaid = useCallback(async (orderId) => {
        try {
            await axios.put(`${API}/admin/orders/${orderId}/payment`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchOrders();
            return true;
        } catch {
            return false;
        }
    }, [token, fetchOrders]);

    return {
        orders,
        loading,
        error,
        newOrderCount,
        clearNewOrderCount,
        refresh: fetchOrders,
        updateOrderStatus,
        markOrderPaid
    };
}

/**
 * Hook for tracking a single order status
 */
export function useOrderTracking(orderId, refreshInterval = 15000) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const previousStatusRef = useRef(null);

    const fetchOrder = useCallback(async () => {
        if (!orderId) return;
        
        try {
            const res = await axios.get(`${API}/orders/${orderId}`);
            const newOrder = res.data;
            
            // Check if status changed
            if (previousStatusRef.current && previousStatusRef.current !== newOrder.status) {
                // Status changed - could trigger notification here
            }
            
            previousStatusRef.current = newOrder.status;
            setOrder(newOrder);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchOrder, refreshInterval]);

    return { order, loading, error, refresh: fetchOrder };
}
