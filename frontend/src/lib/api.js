/**
 * API Client with consistent error handling
 * Provides standardized error messages and request/response interceptors
 */
const rawBackend = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || '';
const API_BASE_URL = (rawBackend && rawBackend.includes('hljdev.com.br'))
    ? rawBackend
    : 'https://johb-api.hljdev.com.br';

// Create axios instance
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Error message mapping
const ERROR_MESSAGES = {
    // HTTP Status codes
    400: 'Dados inválidos. Por favor, verifique as informações e tente novamente.',
    401: 'Sessão expirada. Por favor, faça login novamente.',
    403: 'Você não tem permissão para realizar esta ação.',
    404: 'Item ou página não encontrada.',
    409: 'Já existe um registro com estes dados.',
    422: 'Preencha todos os campos obrigatórios corretamente.',
    429: 'Muitas tentativas simultâneas. Por favor, aguarde alguns segundos.',
    500: 'O servidor está temporariamente ocupado. Por favor, tente novamente em instantes.',
    502: 'Serviço temporariamente indisponível. Estamos restabelecendo a conexão.',
    503: 'Sistema em manutenção rápida. Por favor, tente em instantes.',
    
    // Network errors
    NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
    TIMEOUT: 'O servidor demorou para responder. Por favor, tente novamente em instantes.',
    UNKNOWN: 'Ocorreu uma instabilidade temporária. Por favor, tente novamente.',
};

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error) {
    if (!error) return ERROR_MESSAGES.UNKNOWN;
    
    // Network error / Timeout (no response or timed out)
    if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
        return ERROR_MESSAGES.TIMEOUT;
    }
    
    if (!error.response) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    const { status, data } = error.response;
    
    // Try to get message from API response
    if (data) {
        if (typeof data === 'string') return data;
        if (data.detail) return data.detail;
        if (data.message) return data.message;
        if (data.error) return data.error;
        
        // Validation errors
        if (data.errors && Array.isArray(data.errors)) {
            return data.errors.map(e => e.msg || e.message).join(', ');
        }
    }
    
    // Use mapped message or default
    return ERROR_MESSAGES[status] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * Request interceptor - adds auth token
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('johb-admin-token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response interceptor - handles errors globally
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = getErrorMessage(error);
        
        // Handle specific cases
        if (error.response?.status === 401) {
            // Clear auth and redirect to login
            localStorage.removeItem('johb-admin-token');
            window.location.href = '/admin/login';
        }
        
        // Log error for debugging
        if (process.env.NODE_ENV === 'development') {
            console.error('API Error:', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                message,
                data: error.response?.data,
            });
        }
        
        return Promise.reject({ ...error, userMessage: message });
    }
);

/**
 * API methods with consistent error handling
 */
export const api = {
    /**
     * GET request with error toast
     */
    async get(url, config = {}) {
        try {
            const response = await apiClient.get(url, config);
            return response.data;
        } catch (error) {
            if (!config.silent) {
                toast.error(error.userMessage || getErrorMessage(error));
            }
            throw error;
        }
    },
    
    /**
     * POST request with error toast
     */
    async post(url, data, config = {}) {
        try {
            const response = await apiClient.post(url, data, config);
            if (!config.silent) {
                toast.success(config.successMessage || 'Operação realizada com sucesso!');
            }
            return response.data;
        } catch (error) {
            if (!config.silent) {
                toast.error(error.userMessage || getErrorMessage(error));
            }
            throw error;
        }
    },
    
    /**
     * PUT request with error toast
     */
    async put(url, data, config = {}) {
        try {
            const response = await apiClient.put(url, data, config);
            if (!config.silent) {
                toast.success(config.successMessage || 'Atualizado com sucesso!');
            }
            return response.data;
        } catch (error) {
            if (!config.silent) {
                toast.error(error.userMessage || getErrorMessage(error));
            }
            throw error;
        }
    },
    
    /**
     * DELETE request with error toast
     */
    async delete(url, config = {}) {
        try {
            const response = await apiClient.delete(url, config);
            if (!config.silent) {
                toast.success(config.successMessage || 'Excluído com sucesso!');
            }
            return response.data;
        } catch (error) {
            if (!config.silent) {
                toast.error(error.userMessage || getErrorMessage(error));
            }
            throw error;
        }
    },
};

/**
 * Public API (no auth required)
 */
export const publicApi = {
    async get(url, config = {}) {
        try {
            const response = await axios.get(`${API_BASE_URL}/api${url}`, {
                ...config,
                timeout: 30000,
            });
            return response.data;
        } catch (error) {
            const message = getErrorMessage(error);
            if (!config.silent) {
                toast.error(message);
            }
            throw { ...error, userMessage: message };
        }
    },
    
    async post(url, data, config = {}) {
        try {
            const response = await axios.post(`${API_BASE_URL}/api${url}`, data, {
                ...config,
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' },
            });
            if (!config.silent) {
                toast.success(config.successMessage || 'Operação realizada com sucesso!');
            }
            return response.data;
        } catch (error) {
            const message = getErrorMessage(error);
            if (!config.silent) {
                toast.error(message);
            }
            throw { ...error, userMessage: message };
        }
    },
};

export default apiClient;
