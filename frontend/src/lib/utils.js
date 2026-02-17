import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Merge class names with tailwind support
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format price to Brazilian currency format
 */
export function formatPrice(price) {
  return price.toFixed(2);
}

/**
 * Format phone number to Brazilian format
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Calculate total price from items
 */
export function calculateTotal(items) {
  if (!items || items.length === 0) return 0;
  
  return items.reduce((total, item) => {
    const additionalsPrice = item.additionals?.reduce((sum, add) => sum + (add.price || 0), 0) || 0;
    const itemTotal = (item.price + additionalsPrice) * item.quantity;
    return total + itemTotal;
  }, 0);
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format date to Brazilian format
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
