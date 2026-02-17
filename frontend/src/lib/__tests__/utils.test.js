import { cn, formatPrice, formatPhone, calculateTotal } from '../utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('should handle undefined and null', () => {
      expect(cn('base', undefined, null, 'active')).toBe('base active');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });

  describe('formatPrice', () => {
    it('should format price with 2 decimal places', () => {
      expect(formatPrice(29.9)).toBe('29.90');
      expect(formatPrice(29)).toBe('29.00');
      expect(formatPrice(29.999)).toBe('30.00');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatPrice(-10.5)).toBe('-10.50');
    });
  });

  describe('formatPhone', () => {
    it('should format phone number correctly', () => {
      expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
      expect(formatPhone('1199999999')).toBe('(11) 9999-9999');
    });

    it('should handle phone with non-numeric characters', () => {
      expect(formatPhone('(11) 99999-9999')).toBe('(11) 99999-9999');
      expect(formatPhone('11.99999-9999')).toBe('(11) 99999-9999');
    });

    it('should handle empty string', () => {
      expect(formatPhone('')).toBe('');
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total with items', () => {
      const items = [
        { price: 10, quantity: 2 },
        { price: 20, quantity: 1 },
      ];
      expect(calculateTotal(items)).toBe(40);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('should handle items with additionals', () => {
      const items = [
        { 
          price: 10, 
          quantity: 2,
          additionals: [
            { price: 5 },
            { price: 3 }
          ]
        },
      ];
      // (10 + 5 + 3) * 2 = 36
      expect(calculateTotal(items)).toBe(36);
    });
  });
});
