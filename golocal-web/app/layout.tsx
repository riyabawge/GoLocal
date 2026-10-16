import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const familjenGrotesk = localFont({
  src: "../public/fonts/FamiljenGrotesk[wght].ttf",
  variable: "--font-familjen",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoLocal — Feel at home, wherever you go",
  description: "Learn the local language for the moments that make a trip yours.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${familjenGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
