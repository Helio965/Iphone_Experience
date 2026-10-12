import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iPhone 18 Pro Max & iPhone Duo: Inside the object",
  description:
    "A scroll-driven study of iPhone 18 Pro Max and iPhone Duo: the unibody lifts away, the logic board, battery and vapor chamber separate, and the 48MP camera and A20 Pro come apart layer by layer.",
  openGraph: {
    title: "iPhone 18 Pro Max & iPhone Duo: Inside the object",
    description: "Pro Max Power. Duo Innovation. A scroll-driven study in separation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body id="top" className="grain min-h-full bg-black">
        {children}
      </body>
    </html>
  );
}
