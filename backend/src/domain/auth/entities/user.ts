/**
 * Represents a registered user in the system.
 *
 * **Properties:**
 * - `id` — UUID primary key
 * - `email` — unique login identifier
 * - `passwordHash` — bcrypt hash, never stored in plaintext
 * - `name` — display name
 * - `role` — `"customer"` or `"admin"`, used by RBAC middleware
 * - `createdAt` / `updatedAt` — timestamps
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "customer" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

/** Creates a new User entity with a random UUID and current timestamps. */
export function createUser(props: { email: string; passwordHash: string; name: string; role?: "customer" | "admin" }): User {
  return {
    id: crypto.randomUUID(),
    email: props.email,
    passwordHash: props.passwordHash,
    name: props.name,
    role: props.role ?? "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
