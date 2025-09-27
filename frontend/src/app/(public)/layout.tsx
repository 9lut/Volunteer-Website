import Providers from '@/components/Providers';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <NavBar />                      
      <main className="p-0">{children}</main>
      <Footer />
    </Providers>
  );
}
