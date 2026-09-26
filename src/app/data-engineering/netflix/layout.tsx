export default function NetflixDataEngineeringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col overflow-x-clip">{children}</div>;
}
