import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "@fontsource/ibm-plex-sans-arabic/latin-400.css";
import "@fontsource/ibm-plex-sans-arabic/latin-600.css";
import "@fontsource/reem-kufi/arabic-600.css";
import "@fontsource/reem-kufi/arabic-700.css";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "الشاهين لإدارة الأملاك — عقارات جدة", template: "%s — الشاهين لإدارة الأملاك" },
  description: "عقارات للبيع والإيجار في جدة: شقق وفلل وأراضٍ ومحلات وعمائر. اعرض عقارك علينا واحجز معاينة إلكترونياً.",
  openGraph: { locale: "ar_SA", type: "website", siteName: "الشاهين لإدارة الأملاك" },
};

export const viewport: Viewport = { themeColor: "#fcfbf8" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
