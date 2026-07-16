import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evercrest Work Order Bot",
  description: "Tenant maintenance intake and staff handoff workflow for Evercrest.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
