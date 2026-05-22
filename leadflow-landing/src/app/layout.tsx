import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WPAIFlow — Turn Google Maps Businesses Into WhatsApp Customers",
  description:
    "Scrape leads from Google Maps, personalize with AI, and automate WhatsApp outreach. All-in-one lead generation and messaging platform.",
  openGraph: {
    title: "WPAIFlow - Google Maps to WhatsApp Automation",
    description:
      "Scrape, personalize, automate. Turn Google Maps businesses into paying customers.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}