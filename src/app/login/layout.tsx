import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in to Cybank",
  description: "Sign in to the Cybank app with Cybeat SSO.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
