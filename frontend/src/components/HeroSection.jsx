import { Button } from "@/components/ui/button";
import { Salad, Gift } from "lucide-react";

export function HeroSection({ onMonteSalada, onVerPromocoes }) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border p-8 md:p-12 lg:p-16 text-center">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 opacity-10">
                <Salad className="h-16 w-16 md:h-24 md:w-24 text-primary" />
            </div>
            <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 opacity-5">
                <Salad className="h-20 w-20 md:h-32 md:w-32 text-accent" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-foreground mb-3 md:mb-4">
                    Sabor e Saúde em Cada Garfada
                </h1>
                <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8">
                    Monte sua salada ideal ou escolha entre nossas opções especiais
                </p>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                    <Button 
                        size="lg" 
                        className="bg-primary hover:bg-primary/90 text-white rounded-full"
                        onClick={onMonteSalada}
                    >
                        <Salad className="h-5 w-5 mr-2" />
                        Monte sua Salada
                    </Button>
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="rounded-full"
                        onClick={onVerPromocoes}
                    >
                        <Gift className="h-5 w-5 mr-2" />
                        Ver Promoções
                    </Button>
                </div>
            </div>
        </div>
    );
}
