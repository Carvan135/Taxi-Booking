import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site/contact";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: "Book airport transfers and private hire across the UK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
