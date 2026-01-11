import type { Metadata } from "next"
import { Playground } from "@/components/playground/Playground"

export const metadata: Metadata = {
  title: "Playground | Cent",
  description:
    "Interactive TypeScript playground for the cent financial math library",
}

export default function PlaygroundPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Playground</h1>
        <p className="text-fd-muted-foreground">
          Experiment with the cent library in this interactive TypeScript
          editor. Changes run automatically as you type.
        </p>
      </div>
      <Playground />
    </main>
  )
}
