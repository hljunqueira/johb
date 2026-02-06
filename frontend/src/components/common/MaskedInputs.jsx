import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { applyPhoneMask, applyCepMask } from "@/lib/constants";

/**
 * Phone input with Brazilian format mask (11) 99999-9999
 */
export const PhoneInput = forwardRef(({ value, onChange, ...props }, ref) => {
    const handleChange = (e) => {
        const masked = applyPhoneMask(e.target.value);
        onChange?.({ target: { value: masked } });
    };

    return (
        <Input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            placeholder="(11) 99999-9999"
            maxLength={15}
            {...props}
        />
    );
});

PhoneInput.displayName = "PhoneInput";

/**
 * CEP input with Brazilian format mask 00000-000
 */
export const CepInput = forwardRef(({ value, onChange, onCepFound, ...props }, ref) => {
    const handleChange = async (e) => {
        const masked = applyCepMask(e.target.value);
        onChange?.({ target: { value: masked } });
        
        // Auto-fetch address when CEP is complete
        const cleaned = masked.replace(/\D/g, "");
        if (cleaned.length === 8 && onCepFound) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    onCepFound({
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    });
                }
            } catch {
                // Silently fail
            }
        }
    };

    return (
        <Input
            ref={ref}
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="00000-000"
            maxLength={9}
            {...props}
        />
    );
});

CepInput.displayName = "CepInput";

/**
 * Currency input for Brazilian Real
 */
export const CurrencyInput = forwardRef(({ value, onChange, ...props }, ref) => {
    const handleChange = (e) => {
        // Remove non-numeric characters except comma and dot
        let cleaned = e.target.value.replace(/[^\d,]/g, "");
        // Replace comma with dot for parsing
        cleaned = cleaned.replace(",", ".");
        onChange?.({ target: { value: cleaned } });
    };

    const displayValue = value ? `R$ ${parseFloat(value).toFixed(2).replace(".", ",")}` : "";

    return (
        <Input
            ref={ref}
            type="text"
            value={displayValue}
            onChange={handleChange}
            placeholder="R$ 0,00"
            {...props}
        />
    );
});

CurrencyInput.displayName = "CurrencyInput";
