import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Salad, Coffee } from "lucide-react";

const combos = [
    {
        id: "combo-fitness",
        name: "Combo Fitness",
        icon: Salad,
        description: "Salada + Suco Verde",
        originalPrice: 35.80,
        price: 31.90,
        items: ["Salada Caesar ou Green Power", "Suco Verde Detox"]
    },
    {
        id: "combo-executivo",
        name: "Combo Executivo",
        icon: Coffee,
        description: "Salada + Lanche + Bebida",
        originalPrice: 42.70,
        price: 37.90,
        items: ["Salada de sua escolha", "Wrap ou Sanduíche", "Bebida natural"]
    }
];

export function ComboSuggestion({ onSelectCombo }) {
    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-6 w-6 text-amber-600" />
                <h2 className="text-2xl font-bold font-heading text-foreground">
                    Que tal um combo?
                </h2>
            </div>
            <p className="text-muted-foreground mb-6">
                Economize escolhendo uma de nossas sugestões de combo
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combos.map(combo => {
                    const Icon = combo.icon;
                    const discount = Math.round((1 - combo.price / combo.originalPrice) * 100);

                    return (
                        <Card key={combo.id} className="bg-white border-2 hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">{combo.name}</CardTitle>
                                    <span className="ml-auto text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                        -{discount}%
                                    </span>
                                </div>
                                <CardDescription>{combo.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-xs text-muted-foreground mb-4 space-y-1">
                                    {combo.items.map((item, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <span className="h-1 w-1 rounded-full bg-primary"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-sm text-muted-foreground line-through">
                                        R$ {combo.originalPrice.toFixed(2)}
                                    </span>
                                    <span className="text-2xl font-bold text-foreground">
                                        R$ {combo.price.toFixed(2)}
                                    </span>
                                </div>
                                <Button 
                                    className="w-full bg-accent hover:bg-accent/90 text-white rounded-full"
                                    onClick={() => onSelectCombo(combo)}
                                >
                                    Escolher Combo
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
