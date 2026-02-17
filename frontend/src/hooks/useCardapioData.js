/**
 * Hook customizado para gerenciar dados do cardápio
 * Centraliza operações CRUD para menus, categorias, produtos, etc.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Hook genérico para operações CRUD
 */
export function useCrud(endpoint, headers) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API}${endpoint}`, { headers });
            setItems(res.data);
        } catch (err) {
            setError(err);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, [endpoint, headers]);

    const create = useCallback(async (data) => {
        try {
            const res = await axios.post(`${API}${endpoint}`, data, { headers });
            toast.success('Item criado com sucesso');
            await fetch();
            return res.data;
        } catch (err) {
            toast.error('Erro ao criar item');
            throw err;
        }
    }, [endpoint, headers, fetch]);

    const update = useCallback(async (id, data) => {
        try {
            const res = await axios.put(`${API}${endpoint}/${id}`, data, { headers });
            toast.success('Item atualizado com sucesso');
            await fetch();
            return res.data;
        } catch (err) {
            toast.error('Erro ao atualizar item');
            throw err;
        }
    }, [endpoint, headers, fetch]);

    const remove = useCallback(async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir?')) return;
        try {
            await axios.delete(`${API}${endpoint}/${id}`, { headers });
            toast.success('Item excluído com sucesso');
            await fetch();
        } catch (err) {
            toast.error('Erro ao excluir item');
            throw err;
        }
    }, [endpoint, headers, fetch]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { items, loading, error, fetch, create, update, remove };
}

/**
 * Hook para gerenciar menus
 */
export function useMenus(headers) {
    return useCrud('/admin/menus', headers);
}

/**
 * Hook para gerenciar categorias
 */
export function useCategories(headers) {
    const [categories, setCategories] = useState([]);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, menuRes] = await Promise.all([
                axios.get(`${API}/admin/categories`, { headers }),
                axios.get(`${API}/menus`, { headers }),
            ]);
            setCategories(catRes.data);
            setMenus(menuRes.data);
        } catch {
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    }, [headers]);

    const saveCategory = useCallback(async (id, data) => {
        try {
            if (id) {
                await axios.put(`${API}/admin/categories/${id}`, data, { headers });
                toast.success('Categoria atualizada');
            } else {
                await axios.post(`${API}/admin/categories`, data, { headers });
                toast.success('Categoria criada');
            }
            await fetchCategories();
        } catch {
            toast.error('Erro ao salvar categoria');
        }
    }, [headers, fetchCategories]);

    const deleteCategory = useCallback(async (id) => {
        if (!window.confirm('Excluir categoria?')) return;
        try {
            await axios.delete(`${API}/admin/categories/${id}`, { headers });
            toast.success('Categoria excluída');
            await fetchCategories();
        } catch {
            toast.error('Erro ao excluir categoria');
        }
    }, [headers, fetchCategories]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return {
        categories,
        menus,
        loading,
        fetchCategories,
        saveCategory,
        deleteCategory,
    };
}

/**
 * Hook para gerenciar produtos
 */
export function useProducts(headers) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                axios.get(`${API}/admin/products`, { headers }),
                axios.get(`${API}/categories`, { headers }),
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
        } catch {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, [headers]);

    const saveProduct = useCallback(async (id, data) => {
        try {
            if (id) {
                await axios.put(`${API}/admin/products/${id}`, data, { headers });
                toast.success('Produto atualizado');
            } else {
                await axios.post(`${API}/admin/products`, data, { headers });
                toast.success('Produto criado');
            }
            await fetchData();
        } catch {
            toast.error('Erro ao salvar produto');
        }
    }, [headers, fetchData]);

    const deleteProduct = useCallback(async (id) => {
        if (!window.confirm('Excluir produto?')) return;
        try {
            await axios.delete(`${API}/admin/products/${id}`, { headers });
            toast.success('Produto excluído');
            await fetchData();
        } catch {
            toast.error('Erro ao excluir produto');
        }
    }, [headers, fetchData]);

    const uploadImage = useCallback(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(`${API}/admin/upload`, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
            });
            return res.data.url;
        } catch {
            toast.error('Erro ao fazer upload');
            throw new Error('Upload failed');
        }
    }, [headers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        products,
        categories,
        loading,
        fetchData,
        saveProduct,
        deleteProduct,
        uploadImage,
    };
}

/**
 * Hook para gerenciar complementos/opcionais
 */
export function useComplements(headers) {
    return useCrud('/admin/complements', headers);
}

/**
 * Hook para gerenciar banners
 */
export function useBanners(headers) {
    return useCrud('/admin/banners', headers);
}

/**
 * Hook para gerenciar combos
 */
export function useCombos(headers) {
    const [combos, setCombos] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [comboRes, catRes] = await Promise.all([
                axios.get(`${API}/admin/combos`, { headers }),
                axios.get(`${API}/categories`, { headers }),
            ]);
            setCombos(comboRes.data);
            setCategories(catRes.data);
        } catch {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, [headers]);

    const saveCombo = useCallback(async (id, data) => {
        try {
            if (id) {
                await axios.put(`${API}/admin/combos/${id}`, data, { headers });
                toast.success('Combo atualizado');
            } else {
                await axios.post(`${API}/admin/combos`, data, { headers });
                toast.success('Combo criado');
            }
            await fetchData();
        } catch {
            toast.error('Erro ao salvar combo');
        }
    }, [headers, fetchData]);

    const deleteCombo = useCallback(async (id) => {
        if (!window.confirm('Excluir combo?')) return;
        try {
            await axios.delete(`${API}/admin/combos/${id}`, { headers });
            toast.success('Combo excluído');
            await fetchData();
        } catch {
            toast.error('Erro ao excluir combo');
        }
    }, [headers, fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        combos,
        categories,
        loading,
        fetchData,
        saveCombo,
        deleteCombo,
    };
}
