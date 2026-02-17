import { Salad, Leaf, UtensilsCrossed, Coffee } from "lucide-react";

const categoryIcons = {
    "Monte sua Salada": Salad,
    "Saladas Prontas": Leaf,
    "Lanches Frios": UtensilsCrossed,
    "Bebidas": Coffee
};

export function CategoryPills({ categories, selectedCategory, onSelectCategory, productCounts = {} }) {
    return (
        <div className="flex flex-wrap gap-3 md:gap-4 justify-center py-4">
            {categories.map(category => {
                const Icon = categoryIcons[category.name] || Salad;
                const isActive = selectedCategory === category.id;
                const count = productCounts[category.id] || 0;

                return (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className={`
                            flex flex-col items-center justify-center
                            min-w-[120px] md:min-w-[140px] px-6 py-4 rounded-full
                            border-2 transition-all duration-200
                            ${isActive 
                                ? 'bg-primary border-primary text-white scale-105 shadow-lg' 
                                : 'bg-white border-border text-foreground hover:border-primary/50 hover:shadow-md'
                            }
                        `}
                    >
                        <Icon className={`h-7 w-7 md:h-8 md:w-8 mb-2 ${isActive ? 'text-white' : 'text-primary'}`} />
                        <span className="font-semibold text-sm md:text-base font-heading">
                            {category.name}
                        </span>
                        <span className={`text-xs mt-1 ${isActive ? 'text-white/90' : 'text-muted-foreground'}`}>
                            {count} {count === 1 ? 'opção' : 'opções'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
