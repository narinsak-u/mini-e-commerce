import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Category { id: string; name: string; slug: string; description: string | null }

export default async function CategoriesPage() {
  let categories: Category[] = [];
  try { const res = await api<{ data: Category[] }>("/categories"); categories = res.data; } catch (e) { console.error("Failed to load categories", e); }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Categories</h1>
      {categories.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No categories yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/products?categoryId=${cat.id}`}>
              <Card className="transition-shadow hover:shadow-md h-full">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-1">{cat.name}</h2>
                  {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                  <Badge variant="outline" className="mt-3">Browse →</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
