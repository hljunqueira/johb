import React from "react";
import { Utensils, Flame, Cookie, Package, CupSoda, Sparkles, Snowflake, Pizza } from "lucide-react";

const categoryIconMap = {
    "salgados": Utensils,
    "salgados fritos & empadas": Utensils,
    "assados": Flame,
    "assados & folhados": Flame,
    "mini pizzas artesanais": Pizza,
    "cucas tradicionais": Cookie,
    "bolos & sobremesas": Cookie,
    "doces / cucas": Cookie,
    "doces": Cookie,
    "combos": Package,
    "congelados": Snowflake,
    "bebidas": CupSoda,
    "refrigerantes & gelados": CupSoda
};

export function CategoryPills({ categories = [], selectedCategory, onSelectCategory, productCounts = {} }) {
    const allCategories = [{ id: "all", name: "✨ Ver Todos" }, ...categories];

    return (
        <div className="w-full overflow-x-auto py-2 no-scrollbar">
            <div className="flex gap-2.5 min-w-max pb-2 px-2 md:justify-center">
                {allCategories.map((category) => {
                    const catKey = (category.name || "").toLowerCase().trim();
                    const Icon = category.id === "all" ? Sparkles : (categoryIconMap[catKey] || Utensils);
                    const isActive = selectedCategory === category.id;
                    const count = productCounts[category.id] || 0;

                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelectCategory(category.id)}
                            className={`
                                inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                                border transition-all duration-300 whitespace-nowrap text-xs font-bold tracking-wider uppercase
                                ${
                                    isActive
                                        ? "bg-[#F4B544] text-[#050505] border-[#F4B544] shadow-md gold-glow-sm scale-105"
                                        : "bg-[#10100F] border-[#F4B544]/20 text-[#B8B1A3] hover:text-[#FFFAF0] hover:border-[#F4B544]/50 hover:bg-[#171612]"
                                }
                            `}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#050505]" : "text-[#F4B544]"}`} />
                            <span>{category.name}</span>
                            {count > 0 && (
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isActive ? "bg-[#050505] text-[#F4B544]" : "bg-[#171612] text-[#B8B1A3] border border-[#F4B544]/20"
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
