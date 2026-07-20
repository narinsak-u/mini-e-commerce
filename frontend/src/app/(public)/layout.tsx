import { NavBar } from "@/components/nav-bar";
import { SessionSync } from "@/components/session-sync";
import { Footer } from "@/components/footer";
import { getSession, getToken } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [session, token] = await Promise.all([getSession(), getToken()]);
  return (
    <div className="min-h-screen flex flex-col">
      <SessionSync session={session} token={token} />
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
