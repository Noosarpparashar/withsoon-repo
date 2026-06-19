"use client";

import NetflixArchPage from "./netflix-architecture/NetflixArchPage";

export default function NetflixPage({ initialTab }: { initialTab?: string }) {
  return <NetflixArchPage initialTab={initialTab} />;
}
