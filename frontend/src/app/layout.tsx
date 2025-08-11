import "./globals.css";
import { Kanit } from "next/font/google";

export const metadata = {
  title: "Volunteer",
  description: "Volunteer management",
};

const kanit = Kanit({
  subsets: ["latin", "thai"], 
  weight: ["300", "400", "500", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${kanit.className} text-gray-900`}>{children}</body>
    </html>
  );
}
