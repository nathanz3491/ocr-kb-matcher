import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cheat Sheet",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
