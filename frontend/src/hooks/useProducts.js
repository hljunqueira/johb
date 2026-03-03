import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = `${(process.env.REACT_APP_BACKEND_URL || '')}/api`;

/**
 * Hook for managing products with categories
 */
export function useProducts(token = null) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [complements, setComplements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const isAdmin = !!token;

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const endpoints = isAdmin 
                ? [`${API}/admin/products`, `${API}/admin/categories`, `${API}/admin/complements`]
                : [`${API}/products`, `${API}/categories`, `${API}/complements`];
            
            const [prodRes, catRes, compRes] = await Promise.all(
                endpoints.map(url => axios.get(url, { headers }))
            );
            
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setComplements(compRes.data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Group products by category
    const productsByCategory = categories.reduce((acc, cat) => {
        acc[cat.id] = products.filter(p => p.category_id === cat.id);
        return acc;
    }, {});

    // Admin operations
    const createProduct = useCallback(async (data) => {
        if (!isAdmin) return null;
        try {
            const res = await axios.post(`${API}/admin/products`, data, { headers });
            fetchAll();
            return res.data;
        } catch {
            return null;
        }
    }, [isAdmin, headers, fetchAll]);

    const updateProduct = useCallback(async (id, data) => {
        if (!isAdmin) return false;
        try {
            await axios.put(`${API}/admin/products/${id}`, data, { headers });
            fetchAll();
            return true;
        } catch {
            return false;
        }
    }, [isAdmin, headers, fetchAll]);

    const deleteProduct = useCallback(async (id) => {
        if (!isAdmin) return false;
        try {
            await axios.delete(`${API}/admin/products/${id}`, { headers });
            fetchAll();
            return true;
        } catch {
            return false;
        }
    }, [isAdmin, headers, fetchAll]);

    const cloneProduct = useCallback(async (id) => {
        if (!isAdmin) return null;
        try {
            const res = await axios.post(`${API}/admin/products/${id}/clone`, {}, { headers });
            fetchAll();
            return res.data;
        } catch {
            return null;
        }
    }, [isAdmin, headers, fetchAll]);

    return {
        products,
        categories,
        complements,
        productsByCategory,
        loading,
        error,
        refresh: fetchAll,
        createProduct,
        updateProduct,
        deleteProduct,
        cloneProduct
    };
}

/**
 * Hook for categories management
 */
export function useCategories(token = null) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const isAdmin = !!token;

    const fetchCategories = useCallback(async () => {
        try {
            const url = isAdmin ? `${API}/admin/categories` : `${API}/categories`;
            const res = await axios.get(url, { headers });
            setCategories(res.data);
        } catch {
            // Error handling
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const createCategory = useCallback(async (data) => {
        if (!isAdmin) return null;
        try {
            const res = await axios.post(`${API}/admin/categories`, data, { headers });
            fetchCategories();
            return res.data;
        } catch {
            return null;
        }
    }, [isAdmin, headers, fetchCategories]);

    const updateCategory = useCallback(async (id, data) => {
        if (!isAdmin) return false;
        try {
            await axios.put(`${API}/admin/categories/${id}`, data, { headers });
            fetchCategories();
            return true;
        } catch {
            return false;
        }
    }, [isAdmin, headers, fetchCategories]);

    const deleteCategory = useCallback(async (id) => {
        if (!isAdmin) return false;
        try {
            await axios.delete(`${API}/admin/categories/${id}`, { headers });
            fetchCategories();
            return true;
        } catch {
            return false;
        }
    }, [isAdmin, headers, fetchCategories]);

    return {
        categories,
        loading,
        refresh: fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory
    };
}
