import React from "react";

const cleanLabel = (text) => {
    if (!text) return "";
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[✨⭐🏆🔥🥐🍰🥤🍽️🍴🍕🌱🥧]/gu, "").trim();
};

export function CategoryPills({
    categories = [],
    selected,
    selectedCategory,
    onSelect,
    onSelectCategory,
    productCounts = {}
}) {
    const activeCategory = selected || selectedCategory || "all";
    const handleSelect = onSelect || onSelectCategory || (() => {});
    const allCategories = [{ id: "all", name: "Ver Todos" }, ...categories];

    return (
        <div className="w-full overflow-x-auto py-2 no-scrollbar">
            <div className="flex gap-2.5 min-w-max pb-2 px-2 md:justify-center">
                {allCategories.map((category) => {
                    const isActive = activeCategory === category.id;
                    const count = productCounts[category.id] || 0;
                    const displayName = cleanLabel(category.name);

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => handleSelect(category.id)}
                            className={`
                                inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                                border transition-all duration-300 whitespace-nowrap text-xs font-bold tracking-wider uppercase cursor-pointer
                                ${
                                    isActive
                                        ? "bg-[#F4B544] text-[#050505] border-[#F4B544] shadow-md gold-glow-sm scale-105 font-extrabold"
                                        : "bg-[#10100F] border-[#F4B544]/20 text-[#B8B1A3] hover:text-[#FFFAF0] hover:border-[#F4B544]/50 hover:bg-[#171612]"
                                }
                            `}
                        >
                            <span>{displayName}</span>
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
