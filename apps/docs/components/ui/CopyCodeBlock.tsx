"use client"

import { useState } from "react"

interface CopyCodeBlockProps {
  code: string
  language?: string
}

export function CopyCodeBlock({ code, language = "bash" }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-fd-border bg-fd-secondary p-4 font-mono text-sm">
        <code data-language={language}>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 rounded border border-fd-border bg-fd-background px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  )
}
