import type { Role } from "../../../shared/types";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export function createUser(props: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role?: Role;
}): User {
  return {
    id: props.id,
    email: props.email,
    passwordHash: props.passwordHash,
    name: props.name,
    role: props.role ?? "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
