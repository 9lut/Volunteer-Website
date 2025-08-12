import NavBar from '@/components/NavBar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />                      
      <main className="p-0">{children}</main>
    </>
  );
}
