import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tracking check | NeuroPlay AI",
};

export default function TrackingCheckLayout({
  children,
}: LayoutProps<"/tracking-check">) {
  return children;
}
