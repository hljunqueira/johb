import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Carousel, 
    CarouselContent, 
    CarouselItem, 
    CarouselNext, 
    CarouselPrevious 
} from "@/components/ui/carousel";
import { Flame, Star } from "lucide-react";

const getImageUrl = (url, backendUrl) => {
    if (!url) return "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400";
    if (url.startsWith("http")) return url;
    return `${backendUrl}${url}`;
};

export function FeaturedCarousel({ products = [], onProductClick, backendUrl }) {
    if (products.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <Flame className="h-6 w-6 text-orange-500" />
                    Mais Pedidos da Semana
                </h2>
            </div>

            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-2 md:-ml-4">
                    {products.map((product) => (
                        <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onProductClick(product)}>
                                <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                                    <img 
                                        src={getImageUrl(product.image_url, backendUrl)} 
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-3 left-3">
                                        <Badge className="bg-orange-500 text-white border-none">
                                            <Flame className="h-3 w-3 mr-1" />
                                            Popular
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-base font-heading flex-1">{product.name}</h3>
                                        <span className="font-bold text-lg whitespace-nowrap ml-2">
                                            R$ {product.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {product.description}
                                    </p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge variant="outline" className="text-xs">
                                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                            {product.rating || '4.8'}
                                        </Badge>
                                        {product.reviews && (
                                            <span className="text-xs text-muted-foreground">
                                                ({product.reviews} avaliações)
                                            </span>
                                        )}
                                    </div>
                                    <Button 
                                        className="w-full bg-accent hover:bg-accent/90 text-white rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onProductClick(product);
                                        }}
                                    >
                                        Pedir Agora
                                    </Button>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-4 lg:-left-6" />
                <CarouselNext className="hidden md:flex -right-4 lg:-right-6" />
            </Carousel>
        </div>
    );
}
