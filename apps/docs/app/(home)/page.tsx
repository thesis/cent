import Link from "next/link"
import { CopyCodeBlock } from "@/components/ui/CopyCodeBlock"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 font-bold text-4xl">cent</h1>
        <p className="mb-8 text-fd-muted-foreground text-xl">
          Bulletproof financial math for TypeScript.
        </p>

        <div className="mb-8">
          <CopyCodeBlock code="npm install @thesis-co/cent" />
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/docs/getting-started"
            className="rounded-lg bg-fd-primary px-6 py-3 text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="/playground"
            className="rounded-lg border border-fd-border px-6 py-3 transition-colors hover:bg-fd-muted"
          >
            Playground
          </Link>
        </div>
      </div>
    </main>
  )
}
