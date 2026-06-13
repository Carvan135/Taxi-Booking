export default function RecoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 to-white">
      {children}
    </div>
  );
}
