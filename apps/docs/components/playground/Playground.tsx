"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  EXAMPLE_LABELS,
  EXAMPLES,
  type ExampleKey,
} from "@/lib/playground/examples"
import { executeCode } from "@/lib/playground/execution"
import { getCodeFromUrl, getShareableUrl } from "@/lib/playground/url-state"

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] animate-pulse items-center justify-center rounded-lg bg-fd-muted">
      <span className="text-fd-muted-foreground">Loading editor...</span>
    </div>
  ),
})

export function Playground() {
  const [code, setCode] = useState<string>(EXAMPLES.basic)
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Load code from URL on mount
  useEffect(() => {
    const urlCode = getCodeFromUrl()
    if (urlCode) {
      setCode(urlCode)
    }
  }, [])

  // Debounced execution
  const runCode = useCallback((newCode: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      const result = executeCode(newCode)
      setOutput(result.output)
      setError(result.error)
    }, 300)
  }, [])

  // Run on code change
  useEffect(() => {
    runCode(code)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [code, runCode])

  const handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as ExampleKey
    setCode(EXAMPLES[key])
  }

  const handleShare = async () => {
    const url = getShareableUrl(code)
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setCode(EXAMPLES.basic)
    window.history.replaceState(null, "", "/playground")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor="example-select"
            className="text-fd-muted-foreground text-sm"
          >
            Examples:
          </label>
          <select
            id="example-select"
            onChange={handleExampleChange}
            className="rounded border border-fd-border bg-fd-background px-3 py-1.5 text-sm"
          >
            {(Object.keys(EXAMPLES) as ExampleKey[]).map((key) => (
              <option key={key} value={key}>
                {EXAMPLE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="rounded bg-fd-primary px-3 py-1.5 text-fd-primary-foreground text-sm transition-opacity hover:opacity-90"
          >
            {copied ? "Copied!" : "Share"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded border border-fd-border px-3 py-1.5 text-sm transition-colors hover:bg-fd-muted"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Editor and Output */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Code Editor */}
        <div className="min-h-[400px] flex-1 overflow-hidden rounded-lg border border-fd-border">
          <Editor
            height="400px"
            defaultLanguage="typescript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              fontFamily: "var(--font-mono), ui-monospace, monospace",
            }}
          />
        </div>

        {/* Output Panel */}
        <div className="min-h-[400px] flex-1 overflow-hidden rounded-lg border border-fd-border lg:max-w-md">
          <div className="border-fd-border border-b bg-fd-muted p-2 font-medium text-sm">
            Output
          </div>
          <div className="h-[360px] overflow-auto whitespace-pre-wrap bg-fd-card p-4 font-mono text-sm">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : output ? (
              output
            ) : (
              <span className="text-fd-muted-foreground">
                Run some code to see output here...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
