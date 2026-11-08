import "@fontsource/readex-pro/arabic-400.css";
import "@fontsource/readex-pro/arabic-500.css";
import "@fontsource/readex-pro/arabic-600.css";
import "@fontsource/readex-pro/arabic-700.css";
import "@fontsource/readex-pro/latin-400.css";
import "@fontsource/readex-pro/latin-500.css";
import "@fontsource/readex-pro/latin-600.css";
import "@fontsource/readex-pro/latin-700.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/** الموقع العام بهوية DESIGN.md (.theme-public). لوحة المكتب خارج هذا التخطيط وتبقى بهويتها. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-public flex flex-1 flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        انتقل إلى المحتوى
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
