import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { BackgroundBeams } from "@/components/ui/background-beams";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BoulderingELO - Track Your Climbing Progress",
  description: "Track and score your bouldering sessions with intelligent weighted scoring inspired by osu!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative min-h-screen">
          <BackgroundBeams />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-64px)]">
              {children}
            </main>
            <footer className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm py-6 mt-12">
              <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
                <p>Built with ❤️ for climbers • Powered by intelligent ELO-style scoring</p>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
