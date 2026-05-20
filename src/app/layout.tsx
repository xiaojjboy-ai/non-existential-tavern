import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "非存在主义酒馆",
  description: "剧情驱动的酒馆游戏原型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
