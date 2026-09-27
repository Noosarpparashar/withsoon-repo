import type { ReactNode, SVGProps } from "react";

export type NetflixIconName =
  | "alert"
  | "archive"
  | "arrow-in"
  | "bolt"
  | "cache"
  | "calendar"
  | "catalog"
  | "chart"
  | "coins"
  | "compass"
  | "compute"
  | "container"
  | "database"
  | "deploy"
  | "device"
  | "distribute"
  | "experiment"
  | "film"
  | "fingerprint"
  | "globe"
  | "grid"
  | "layers"
  | "model"
  | "nodes"
  | "play"
  | "pulse"
  | "receipt"
  | "replay"
  | "schema"
  | "search"
  | "shield"
  | "split"
  | "target"
  | "trend"
  | "user"
  | "workflow"
  | "clock";

export default function NetflixUiIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: NetflixIconName }) {
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
    case "cache":
      shape = <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 10h8M8 14h5M7 3v3M12 3v3M17 3v3" /></>;
      break;
    case "calendar":
      shape = <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2" /></>;
      break;
    case "catalog":
      shape = <><path d="M5 4h6a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 1V4Z" /><path d="M19 4h-5v16h3a3 3 0 0 1 2 1V4Z" /></>;
      break;
    case "chart":
      shape = <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>;
      break;
    case "coins":
      shape = <><ellipse cx="12" cy="6" rx="6" ry="3" /><path d="M6 6v4c0 1.7 2.7 3 6 3s6-1.3 6-3V6M6 10v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4M6 14v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" /></>;
      break;
    case "compass":
      shape = <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></>;
      break;
    case "compute":
      shape = <><rect x="4" y="5" width="16" height="12" rx="2" /><path d="M8 21h8M12 17v4M8 9h3M8 13h6" /></>;
      break;
    case "container":
      shape = <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>;
      break;
    case "database":
      shape = <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>;
      break;
    case "deploy":
      shape = <><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M5 14v6h14v-6" /></>;
      break;
    case "device":
      shape = <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>;
      break;
    case "distribute":
      shape = <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h8M6 8v8M18 8v8M8 18h8" /></>;
      break;
    case "experiment":
      shape = <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M8 15h8" /></>;
      break;
    case "film":
      shape = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4" /></>;
      break;
    case "fingerprint":
      shape = <><path d="M8 9a4 4 0 0 1 8 0v3M6 13V9a6 6 0 0 1 12 0v5M9 13V9a3 3 0 0 1 6 0v6M12 12v7M6 16c.5 2 1.5 3.5 3 4M18 17c-.5 1.5-1 2.5-2 3" /></>;
      break;
    case "globe":
      shape = <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>;
      break;
    case "grid":
      shape = <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>;
      break;
    case "layers":
      shape = <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>;
      break;
    case "model":
      shape = <><circle cx="7" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><circle cx="12" cy="18" r="3" /><path d="m9.5 9.5 1.5 5.5M14.5 9.5 13 15M10 8h4" /></>;
      break;
    case "nodes":
      shape = <><rect x="3" y="4" width="7" height="5" rx="1" /><rect x="14" y="15" width="7" height="5" rx="1" /><path d="M10 6.5h4a3 3 0 0 1 3 3V15M7 9v4a4 4 0 0 0 4 4h3" /></>;
      break;
    case "play":
      shape = <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></>;
      break;
    case "pulse":
      shape = <path d="M3 12h4l2-6 4 12 2-6h6" />;
      break;
    case "receipt":
      shape = <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>;
      break;
    case "replay":
      shape = <><path d="M7 7H3v-4" /><path d="M4 7a9 9 0 1 1-1 8" /></>;
      break;
    case "schema":
      shape = <><rect x="4" y="4" width="6" height="5" rx="1" /><rect x="14" y="15" width="6" height="5" rx="1" /><path d="M7 9v7a2 2 0 0 0 2 2h5M10 6.5h4a3 3 0 0 1 3 3V15" /></>;
      break;
    case "search":
      shape = <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>;
      break;
    case "shield":
      shape = <><path d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></>;
      break;
    case "split":
      shape = <><path d="M12 4v5M12 9 6 15M12 9l6 6" /><path d="M3 15h6v5H3zM15 15h6v5h-6z" /></>;
      break;
    case "target":
      shape = <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>;
      break;
    case "trend":
      shape = <><path d="m4 17 5-5 3 3 7-8" /><path d="M14 7h5v5" /></>;
      break;
    case "user":
      shape = <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>;
      break;
    case "workflow":
      shape = <><rect x="3" y="4" width="6" height="5" rx="1" /><rect x="15" y="4" width="6" height="5" rx="1" /><rect x="9" y="15" width="6" height="5" rx="1" /><path d="M6 9v3h12V9M12 12v3" /></>;
      break;
    case "clock":
    default:
      shape = <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>;
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...shared} {...props}>
      {shape}
    </svg>
  );
}
