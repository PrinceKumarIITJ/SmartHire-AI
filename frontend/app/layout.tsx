import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "SmartHire AI — Multi-Agent Recruitment Intelligence Platform",
  description: "AI-powered candidate screening platform with 7 specialized agents, Explainable AI scoring, RAG chat, and Bias Auditing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0d14] text-gray-100 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
