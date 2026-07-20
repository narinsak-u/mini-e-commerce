import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category?: { name: string };
}

export const ProductCard = memo(function ProductCard({ id, name, price, imageUrl, category }: ProductCardProps) {
  return (
    <Link href={`/products/${id}`}>
      <Card className="overflow-hidden border-stone-200 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
        <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
          {imageUrl ? <Image src={imageUrl} alt={name} width={400} height={400} className="object-cover w-full h-full" /> : <span className="text-4xl">📦</span>}
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium truncate">{name}</h3>
          {category && <Badge variant="secondary" className="mt-1">{category.name}</Badge>}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="text-lg font-semibold text-stone-800">${Number(price).toFixed(2)}</p>
        </CardFooter>
      </Card>
    </Link>
  );
});
