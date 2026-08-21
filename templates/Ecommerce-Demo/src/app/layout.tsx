import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXVORA 3D ECOMMERCE | Immersive Spatial Luxury Prototype Showroom",
  description: "Experience the future of high-fashion computational footwear. Procure serialized prototype iterations crafted with generative design metrics and self-optimizing cushioning.",
  keywords: ["Nexvora", "3D Ecommerce", "R3F", "Threejs", "Luxury shoe", "Digital Couture", "Strata One"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth bg-background">
      <body className="antialiased min-h-screen bg-background text-primary-text flex flex-col">
        {children}
      </body>
    </html>
  );
}
