export function Footer() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} ShopFlow. All rights reserved.
      </div>
    </footer>
  );
}
