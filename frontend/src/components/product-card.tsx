"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/add-to-cart-button";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  category?: { name: string };
}

export const ProductCard = memo(function ProductCard({ id, name, price, imageUrl, stock, category }: ProductCardProps) {
  return (
    <Card className="p-0 gap-0 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <Link
        href={`/products/${id}`}
        className="block aspect-square bg-muted flex items-center justify-center text-muted-foreground overflow-hidden"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            width={400}
            height={400}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-4xl">📦</span>
        )}
      </Link>
      <div className="p-4 space-y-2">
        {category && (
          <Badge variant="secondary">{category.name}</Badge>
        )}
        <Link href={`/products/${id}`}>
          <h3 className="font-medium truncate hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        <p className="text-lg font-semibold text-primary">
          ${Number(price).toFixed(2)}
        </p>
      </div>
      <div className="px-4 pb-4">
        <AddToCartButton productId={id} disabled={stock === 0} />
      </div>
    </Card>
  );
});
