import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/system-design/netflix-data-engineering/:path*", destination: "/data-engineering/netflix/:path*", permanent: true },
      { source: "/system-design/uber/:path*", destination: "/data-engineering/uber/:path*", permanent: true },
      { source: "/system-design/youtube/:path*", destination: "/data-engineering/youtube/:path*", permanent: true },
      { source: "/system-design/netflix/:path*", destination: "/data-engineering/netflix/start-here", permanent: true },
      { source: "/system-design/:path*", destination: "/", permanent: true },
      { source: "/about/:path*", destination: "/", permanent: true },
      { source: "/ai/:path*", destination: "/", permanent: true },
      { source: "/big-data/:path*", destination: "/", permanent: true },
      { source: "/changelog/:path*", destination: "/", permanent: true },
      { source: "/cheatsheets/:path*", destination: "/", permanent: true },
      { source: "/interview/:path*", destination: "/", permanent: true },
      { source: "/radar/:path*", destination: "/", permanent: true },
      { source: "/reference/:path*", destination: "/", permanent: true },
      { source: "/roadmap/:path*", destination: "/", permanent: true },
      { source: "/tech-news/:path*", destination: "/", permanent: true },
      { source: "/tools/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
