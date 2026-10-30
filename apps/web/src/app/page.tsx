import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-semibold">NeuroPlay AI</h1>
      <Link
        href="/camera-check"
        className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Camera check
      </Link>
    </main>
  );
}
