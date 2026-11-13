import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Nunito } from "next/font/google";
import "./globals.css";

const titulo = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--fuente-titulo" });
const texto = Nunito({ subsets: ["latin"], variable: "--fuente-texto" });

export const metadata: Metadata = {
  title: "Santo Burrito · Frená en 15",
  description: "Frená el cronómetro justo en 15,00 segundos y ganate un burrito.",
};

export const viewport: Viewport = {
  themeColor: "#7a4f35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${titulo.variable} ${texto.variable}`}>{children}</body>
    </html>
  );
}
