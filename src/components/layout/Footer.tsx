"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/data-engineering/")) return null;

  return (
    <footer className="border-t border-[#d6e1eb] bg-[#f4f7fb] py-6 text-center text-xs text-[#59697a]">
      <p>© {new Date().getFullYear()} withsoon · Data engineering interview designs</p>
    </footer>
  );
}
