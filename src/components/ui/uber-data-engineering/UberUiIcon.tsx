import type { ReactNode, SVGProps } from "react";

export type UberIconName =
  | "alert"
  | "archive"
  | "arrow-in"
  | "bolt"
  | "car"
  | "chart"
  | "clean"
  | "compass"
  | "database"
  | "experiment"
  | "info"
  | "link"
  | "map"
  | "payment"
  | "phone"
  | "pin"
  | "shield"
  | "support"
  | "users"
  | "workflow";

export default function UberUiIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: UberIconName }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  let shape: ReactNode;
  switch (name) {
    case "alert":
      shape = <><path d="M12 3.5 3.8 18h16.4L12 3.5Z" /><path d="M12 8v4.5M12 16h.01" /></>;
      break;
    case "archive":
      shape = <><path d="M4 7h16v13H4zM3 4h18v3H3z" /><path d="M9 11h6" /></>;
      break;
    case "arrow-in":
      shape = <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19h14" /></>;
      break;
    case "bolt":
      shape = <path d="m13.5 2-8 12h6l-1 8 8-12h-6l1-8Z" />;
      break;
    case "car":
      shape = <><path d="m5 10 1.5-4h11l1.5 4M4 10h16v7H4z" /><path d="M7 17v2M17 17v2M7.5 13h.01M16.5 13h.01" /></>;
      break;
    case "chart":
      shape = <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>;
      break;
    case "clean":
      shape = <><path d="m14 4 6 6-9 9H5v-6l9-9Z" /><path d="m11 7 6 6M4 21h16" /></>;
      break;
    case "compass":
      shape = <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></>;
      break;
    case "database":
      shape = <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>;
      break;
    case "experiment":
      shape = <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M8 15h8" /></>;
      break;
    case "info":
      shape = <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>;
      break;
    case "link":
      shape = <><path d="m10 13 4-4" /><path d="M7.5 15.5 5 18a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M16.5 8.5 19 6a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" transform="translate(-1 -1)" /></>;
      break;
    case "map":
      shape = <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>;
      break;
    case "payment":
      shape = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 15h4" /></>;
      break;
    case "phone":
      shape = <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 5h4M11.5 18.5h1" /></>;
      break;
    case "pin":
      shape = <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>;
      break;
    case "shield":
      shape = <><path d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></>;
      break;
    case "support":
      shape = <><circle cx="12" cy="12" r="9" /><path d="M8 15v-3a4 4 0 0 1 8 0v3M8 13H5M19 13h-3M9 19h6" /></>;
      break;
    case "users":
      shape = <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 4" /></>;
      break;
    case "workflow":
    default:
      shape = <><rect x="3" y="4" width="6" height="5" rx="1" /><rect x="15" y="4" width="6" height="5" rx="1" /><rect x="9" y="15" width="6" height="5" rx="1" /><path d="M6 9v3h12V9M12 12v3" /></>;
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...shared} {...props}>
      {shape}
    </svg>
  );
}
