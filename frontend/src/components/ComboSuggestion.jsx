import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Utensils, Tag } from "lucide-react";
import { getImageUrl } from "@/lib/constants";

export function ComboSuggestion({ combos = [], onSelectCombo }) {
    if (!combos || combos.length === 0) return null;

    return (
        <div className="bg-[#141414] rounded-2xl border border-[#D4AF37]/30 p-5 md:p-7 mb-8 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-[#F4B544]" />
                <h2 className="text-xl md:text-2xl font-black font-heading text-white tracking-tight">
                    Combos Especiais & Ofertas
                </h2>
            </div>
            <p className="text-xs md:text-sm text-gray-400 mb-5">
                Aproveite nossas combinações artesanais exclusivas com descontos especiais
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {combos.map(combo => {
                    const discountPercent = combo.discount_percent || 0;
                    const basePrice = Number(combo.base_price || 0);
                    const finalPrice = discountPercent > 0 
                        ? basePrice * (1 - discountPercent / 100) 
                        : basePrice;
                    const parsedItems = Array.isArray(combo.items) 
                        ? combo.items 
                        : (typeof combo.items === "string" ? JSON.parse(combo.items || "[]") : []);

                    return (
                        <Card key={combo.id} className="bg-[#1E1E1E] border border-white/10 hover:border-[#F4B544]/40 transition-all rounded-xl overflow-hidden flex flex-col justify-between group shadow-md">
                            {combo.image_url && (
                                <div className="h-36 w-full overflow-hidden relative">
                                    <img 
                                        src={getImageUrl(combo.image_url)} 
                                        alt={combo.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {discountPercent > 0 && (
                                        <span className="absolute top-2 right-2 text-xs font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
                                            -{discountPercent}% OFF
                                        </span>
                                    )}
                                </div>
                            )}
                            <div>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base font-bold text-white leading-tight">
                                            {combo.name}
                                        </CardTitle>
                                        {!combo.image_url && discountPercent > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                -{discountPercent}% OFF
                                            </span>
                                        )}
                                    </div>
                                    {combo.description && (
                                        <CardDescription className="text-xs text-gray-400 mt-1 line-clamp-2">
                                            {combo.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    {parsedItems.length > 0 && (
                                        <ul className="text-xs text-gray-400 mb-3 space-y-1 mt-1">
                                            {parsedItems.map((item, idx) => (
                                                <li key={idx} className="flex items-center gap-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#F4B544]"></span>
                                                    <span>{item.quantity}x {item.category_name || "Item selecionável"}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </div>

                            <div className="p-4 pt-0 mt-auto">
                                <div className="flex items-baseline gap-2 mb-3">
                                    {discountPercent > 0 && (
                                        <span className="text-xs text-gray-500 line-through">
                                            R$ {basePrice.toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-lg font-black text-[#F4B544]">
                                        R$ {finalPrice.toFixed(2)}
                                    </span>
                                </div>
                                <Button 
                                    className="w-full bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black font-extrabold rounded-xl shadow-lg shadow-[#F4B544]/20 hover:scale-[1.02] transition-all text-xs py-2 h-9"
                                    onClick={() => onSelectCombo && onSelectCombo({ ...combo, final_price: finalPrice })}
                                >
                                    Pedir Combo
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
