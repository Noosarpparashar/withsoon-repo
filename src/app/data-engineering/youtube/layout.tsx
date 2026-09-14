export default function YouTubeDataEngineeringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">{children}</div>;
}
