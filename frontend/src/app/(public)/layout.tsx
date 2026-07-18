import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { getSession } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
