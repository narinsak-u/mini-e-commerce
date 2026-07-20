export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-stone-500">
        &copy; {new Date().getFullYear()} ShopFlow. All rights reserved.
      </div>
    </footer>
  );
}
