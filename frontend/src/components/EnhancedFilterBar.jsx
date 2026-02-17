import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, List, Leaf, Sparkles, Palette } from "lucide-react";

const filterOptions = [
    { id: "all", label: "Todos", icon: null },
    { id: "vegano", label: "Vegano", icon: Leaf },
    { id: "leve", label: "Leve", icon: Sparkles },
    { id: "personalizavel", label: "Personalizável", icon: Palette }
];

export function EnhancedFilterBar({ 
    activeFilters = [], 
    onFilterToggle, 
    sortBy = "popular",
    onSortChange,
    viewMode = "grid",
    onViewModeChange,
    filterCounts = {}
}) {
    return (
        <div className="bg-white rounded-2xl border border-border p-4 md:p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-sm text-muted-foreground hidden md:inline">
                    Filtrar:
                </span>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2 flex-1">
                    {filterOptions.map(filter => {
                        const isActive = filter.id === "all" 
                            ? activeFilters.length === 0 
                            : activeFilters.includes(filter.id);
                        const count = filterCounts[filter.id] || 0;
                        const Icon = filter.icon;

                        return (
                            <Button
                                key={filter.id}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => onFilterToggle(filter.id)}
                                className={`rounded-full ${isActive ? 'bg-primary text-white' : ''}`}
                            >
                                {Icon && <Icon className="h-4 w-4 mr-1" />}
                                {filter.label}
                                {count > 0 && ` (${count})`}
                            </Button>
                        );
                    })}
                </div>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={onSortChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="popular">Mais Populares</SelectItem>
                        <SelectItem value="price_asc">Menor Preço</SelectItem>
                        <SelectItem value="price_desc">Maior Preço</SelectItem>
                        <SelectItem value="rating">Melhor Avaliado</SelectItem>
                        <SelectItem value="sales">Mais Vendidos</SelectItem>
                    </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="hidden md:flex gap-1 border border-border rounded-lg p-1">
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewModeChange("grid")}
                    >
                        <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewModeChange("list")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
