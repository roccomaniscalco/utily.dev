import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Text Diff Viewer",
  description: "Compare two texts and see the differences highlighted",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#404040,transparent_1px)] [background-size:16px_16px]"></div>
          <main className="min-h-screen relative">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

import "./globals.css";
