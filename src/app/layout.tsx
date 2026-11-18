import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Little Explorers | Childminding in Livingston", template: "%s | Little Explorers" },
  description: "Little Explorers: a nurturing childminding service in Livingston, West Lothian, Scotland.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body><SiteHeader/>{children}<SiteFooter/></body></html>;
}
