import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConvertedAI Portal",
  description: "ConvertedAI ügyfélportál",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
