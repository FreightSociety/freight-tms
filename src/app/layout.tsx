import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freight Society | TMS & CRM",
  description: "Freight brokerage command center — loads, CRM, carriers, tracking, and financials.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
