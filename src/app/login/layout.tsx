import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk ke Cybank",
  description: "Masuk ke aplikasi Cybank dengan SSO Cybeat.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
