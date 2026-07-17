/** A product category. */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Creates a Category with an auto-generated slug. @param props.name - must be unique */
export function createCategory(props: { name: string; description?: string }): Category {
  return {
    id: crypto.randomUUID(),
    name: props.name,
    slug: props.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    description: props.description ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Updates a Category's mutable fields. */
export function updateCategory(category: Category, props: { name?: string; description?: string }): Category {
  return {
    ...category,
    ...(props.name !== undefined ? { name: props.name } : {}),
    ...(props.description !== undefined ? { description: props.description } : {}),
    ...(props.name !== undefined ? { slug: props.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } : {}),
    updatedAt: new Date(),
  };
}
