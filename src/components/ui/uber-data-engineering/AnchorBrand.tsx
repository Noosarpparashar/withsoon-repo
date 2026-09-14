import Image from "next/image";

export default function AnchorBrand() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Image
        src="/logo-uber.png"
        alt="Uber"
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg object-contain"
      />
      <p className="text-base font-bold">Uber</p>
    </div>
  );
}
