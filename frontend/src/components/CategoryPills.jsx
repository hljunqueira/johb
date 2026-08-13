import React from "react";
import { Utensils, Flame, Cookie, Package, CupSoda, Sparkles, Snowflake } from "lucide-react";

const categoryIconMap = {
    "salgados": Utensils,
    "assados": Flame,
    "doces / cucas": Cookie,
    "doces": Cookie,
    "combos": Package,
    "congelados": Snowflake,
    "bebidas": CupSoda
};

export function CategoryPills({ categories = [], selectedCategory, onSelectCategory, productCounts = {} }) {
    return (
        <div className="w-full overflow-x-auto py-3 no-scrollbar">
            <div className="flex gap-3 min-w-max pb-2 px-2 md:justify-center">
                {categories.map((category) => {
                    const catKey = (category.name || "").toLowerCase().trim();
                    const Icon = categoryIconMap[catKey] || Utensils;
                    const isActive = selectedCategory === category.id;
                    const count = productCounts[category.id] || 0;

                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelectCategory(category.id)}
                            className={`
                                inline-flex items-center gap-2.5 px-5 py-3 rounded-full
                                border transition-all duration-300 whitespace-nowrap text-xs sm:text-sm font-medium tracking-wider uppercase
                                ${
                                    isActive
                                        ? "bg-[#F4B544] text-[#050505] border-[#F4B544] font-bold shadow-md gold-glow-sm scale-105"
                                        : "bg-[#10100F] border-[#F4B544]/20 text-[#B8B1A3] hover:text-[#FFFAF0] hover:border-[#F4B544]/50 hover:bg-[#171612]"
                                }
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-[#050505]" : "text-[#F4B544]"}`} />
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
