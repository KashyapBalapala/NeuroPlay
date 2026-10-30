import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Camera check | NeuroPlay AI",
};

export default function CameraCheckLayout({
  children,
}: LayoutProps<"/camera-check">) {
  return children;
}
