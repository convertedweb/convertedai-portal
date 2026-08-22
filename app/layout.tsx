import type { Metadata } from "next";
import { RoutePreloader } from "./route-preloader";
import "./globals.css";

export const metadata: Metadata = {
  title: "norpheus AI Portal",
  description: "norpheus AI ügyfélportál",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{document.documentElement.dataset.theme=localStorage.getItem('theme')==='light'?'light':'dark'}catch(e){}",
          }}
        />
        <RoutePreloader />
        {children}
      </body>
    </html>
  );
}
