const rawBackend = process.env.REACT_APP_BACKEND_URL || '';
export const API_URL = (rawBackend && rawBackend.includes('hljdev.com.br'))
    ? rawBackend
    : 'https://johb-api.hljdev.com.br';
export const API = `${API_URL}/api`;

// Helper to get full image URL
export const getImageUrl = (url) => {
    if (!url) return "/logo-semfundo.png";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
};

// Product tag configuration
export const TAG_CONFIG = {
    mais_pedido: { label: "Mais Pedido", color: "bg-amber-500/20 text-amber-300 border border-amber-500/30", icon: "🔥" },
    recomendado: { label: "Recomendado", color: "bg-amber-500/20 text-amber-300 border border-amber-500/30", icon: "⭐" },
    assado: { label: "Assado", color: "bg-amber-500/20 text-amber-300 border border-amber-500/30", icon: "🥖" },
    frito: { label: "Frito", color: "bg-amber-500/20 text-amber-300 border border-amber-500/30", icon: "🥟" },
    doce: { label: "Doce", color: "bg-pink-500/20 text-pink-300 border border-pink-500/30", icon: "🍰" },
    artesanal: { label: "Artesanal", color: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30", icon: "✨" },
    vegano: { label: "Vegano", color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", icon: "🌱" },
    leve: { label: "Leve", color: "bg-sky-500/20 text-sky-300 border border-sky-500/30", icon: "🍃" },
    personalizavel: { label: "Personalizável", color: "bg-purple-500/20 text-purple-300 border border-purple-500/30", icon: "⚙️" },
    novo: { label: "Novo", color: "bg-pink-500/20 text-pink-300 border border-pink-500/30", icon: "✨" },
    sem_gluten: { label: "Sem Glúten", color: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30", icon: "🌾" },
    sem_lactose: { label: "Sem Lactose", color: "bg-blue-500/20 text-blue-300 border border-blue-500/30", icon: "🥛" }
};

export const getTagStyle = (tag) => TAG_CONFIG[tag] || { label: tag, color: "bg-gray-100 text-gray-700", icon: "🏷️" };

// Complement categories for "Monte sua Salada"
export const COMPLEMENT_CATEGORIES = {
    base_folhas: { label: "Base de Folhas", order: 0, icon: "🥬" },
    proteina: { label: "Proteina", order: 1, icon: "🍗" },
    legumes: { label: "Legumes & Verduras", order: 2, icon: "🥕" },
    frutas: { label: "Frutas", order: 3, icon: "🍓" },
    extras: { label: "Extras & Crocancia", order: 4, icon: "🥜" },
    molhos: { label: "Molhos & Cremes", order: 5, icon: "🥣" },
    temperos: { label: "Temperos", order: 6, icon: "🧂" }
};

// Order status configuration
export const ORDER_STATUS = {
    aguardando: { 
        label: "Aguardando", 
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        next: "preparando",
        nextLabel: "Preparar"
    },
    preparando: { 
        label: "Preparando", 
        color: "bg-blue-100 text-blue-800 border-blue-200",
        next: "entregue",
        nextLabel: "Marcar Entregue"
    },
    entregue: { 
        label: "Entregue", 
        color: "bg-green-100 text-green-800 border-green-200",
        next: null,
        nextLabel: null
    }
};

// Payment status
export const PAYMENT_STATUS = {
    pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
    pago: { label: "Pago", color: "bg-green-100 text-green-700" }
};

// Customer tags
export const CUSTOMER_TAGS = {
    novo: { label: "Novo", color: "bg-blue-100 text-blue-700" },
    frequente: { label: "Frequente", color: "bg-purple-100 text-purple-700" },
    vip: { label: "VIP", color: "bg-amber-100 text-amber-700" }
};

// Delivery types
export const DELIVERY_TYPES = {
    retirada: { label: "Retirada", description: "No local" },
    entrega: { label: "Entrega", description: "No seu endereco" }
};

// Format helpers
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export const formatPhone = (phone) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
};

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatDateTime = (dateString) => {
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
};

// Phone mask helper
export const applyPhoneMask = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
};

// CEP helpers
export const applyCepMask = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
};

export const fetchAddressByCep = async (cep) => {
    const cleanedCep = cep.replace(/\D/g, "");
    if (cleanedCep.length !== 8) return null;
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (data.erro) return null;
        return {
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
        };
    } catch {
        return null;
    }
};
