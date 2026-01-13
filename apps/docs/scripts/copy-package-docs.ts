import * as fs from "node:fs"
import * as path from "node:path"

interface PackageConfig {
  name: string
  sourceDir: string
  destDir: string
}

const PACKAGES: PackageConfig[] = [
  {
    name: "Zod Integration",
    sourceDir: "packages/cent-zod/docs",
    destDir: "zod",
  },
  {
    name: "React Hooks",
    sourceDir: "packages/cent-react/docs",
    destDir: "react",
  },
  {
    name: "Supabase Integration",
    sourceDir: "packages/cent-supabase/docs",
    destDir: "supabase",
  },
]

// TypeDoc-generated API docs configuration
const GENERATED_API_CONFIG = {
  sourceDir: "packages/cent/docs/api",
  destDir: "type-docs",
}

const MONOREPO_ROOT = path.resolve(__dirname, "../../..")
const DOCS_CONTENT_DIR = path.resolve(__dirname, "../content/docs")

// Extract title from filename or content
function extractTitle(filename: string, content: string): string {
  // Try to extract from first heading in content
  // TypeDoc adds prefixes like "Class:", "Function:", etc. - strip those
  const headingMatch = content.match(/^#\s+(?:Class:\s*|Function:\s*|Interface:\s*|Enum:\s*|Type Alias:\s*)?(.+)$/m)
  if (headingMatch) {
    // Remove trailing () from function names, trim, and unescape markdown escapes
    return headingMatch[1]
      .trim()
      .replace(/\(\)$/, "")
      .replace(/\\([<>])/g, "$1") // Remove backslash escapes from < and >
  }

  // Fall back to filename
  const baseName = path.basename(filename, ".mdx")
  if (baseName === "README") return "API Reference"
  return baseName
}

// Get description based on the type of API item
function getDescription(filename: string, folderName: string): string {
  const baseName = path.basename(filename).replace(/\.(mdx|md)$/, "")
  if (baseName === "README") return "Complete API reference for @thesis-co/cent"

  switch (folderName) {
    case "classes":
      return `API reference for the ${baseName} class`
    case "functions":
      return `API reference for the ${baseName} function`
    case "interfaces":
      return `API reference for the ${baseName} interface`
    case "enumerations":
      return `API reference for the ${baseName} enum`
    case "type-aliases":
      return `API reference for the ${baseName} type`
    default:
      return `API reference for ${baseName}`
  }
}

// Escape title for YAML frontmatter (quote if contains special chars)
function escapeYamlValue(value: string): string {
  // YAML special chars that require quoting
  const needsQuoting = /[:#'"@\[\]{}&*!|>%]/.test(value) || value.startsWith("-") || value.startsWith("?")
  if (needsQuoting) {
    // Use double quotes and escape any internal double quotes
    return `"${value.replace(/"/g, '\\"')}"`
  }
  return value
}

// Add frontmatter and remove the first heading (which becomes redundant)
function addFrontmatter(content: string, title: string, description: string): string {
  // Check if file already has frontmatter
  if (content.startsWith("---")) {
    return content
  }

  // Remove the first heading line since Fumadocs renders the title from frontmatter
  const contentWithoutFirstHeading = content.replace(
    /^#\s+(?:Class:|Function:|Interface:|Enum:|Type Alias:)?\s*.+\n+/m,
    ""
  )

  const frontmatter = `---
title: ${escapeYamlValue(title)}
description: ${escapeYamlValue(description)}
---

`
  return frontmatter + contentWithoutFirstHeading
}

// Escape < and > in text (outside of code blocks) to prevent MDX JSX parsing
function escapeJsxInMarkdown(content: string): string {
  // Split by code blocks to only process non-code sections
  const parts: string[] = []
  let lastIndex = 0
  // Match fenced code blocks (``` ... ```) and inline code (` ... `)
  const codeBlockRegex = /(```[\s\S]*?```|`[^`]+`)/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Process text before this code block
    const textBefore = content.slice(lastIndex, match.index)
    // Escape < and > that look like operators (<=, >=, <, >) not JSX
    const escaped = textBefore
      .replace(/<=(?!\s*[A-Za-z_$])/g, "\\<=") // Escape <= not followed by component name
      .replace(/>=(?!\s*[A-Za-z_$])/g, "\\>=") // Escape >= not followed by component name
      .replace(/<(?=[^A-Za-z/!]|$)/g, "\\<") // Escape < not followed by letter or /
      .replace(/(?<=[^\\])>(?=[^A-Za-z]|$)/g, "\\>") // Escape > carefully
    parts.push(escaped)
    parts.push(match[0]) // Keep code blocks unchanged
    lastIndex = match.index + match[0].length
  }

  // Process remaining text after last code block
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex)
    const escaped = remaining
      .replace(/<=(?!\s*[A-Za-z_$])/g, "\\<=")
      .replace(/>=(?!\s*[A-Za-z_$])/g, "\\>=")
      .replace(/<(?=[^A-Za-z/!]|$)/g, "\\<")
      .replace(/(?<=[^\\])>(?=[^A-Za-z]|$)/g, "\\>")
    parts.push(escaped)
  }

  return parts.join("")
}

// Copy TypeDoc-generated API docs with frontmatter processing
function copyGeneratedApiDocs(sourceDir: string, destDir: string): number {
  if (!fs.existsSync(sourceDir)) {
    console.log(`  Source not found: ${sourceDir}`)
    return 0
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
  if (entries.length === 0) {
    return 0
  }

  fs.mkdirSync(destDir, { recursive: true })
  let count = 0

  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      count += copyGeneratedApiDocs(srcPath, destPath)
    } else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
      let content = fs.readFileSync(srcPath, "utf-8")
      const folderName = path.basename(sourceDir)
      const title = extractTitle(entry.name, content)
      const description = getDescription(entry.name, folderName)
      content = addFrontmatter(content, title, description)
      // Write as .md file (Fumadocs handles .md files, and they avoid MDX JSX parsing issues)
      // Rename README to index for Fumadocs
      let outputPath = destPath.replace(/\.mdx$/, ".md")
      if (entry.name === "README.md" || entry.name === "README.mdx") {
        outputPath = path.join(path.dirname(outputPath), "index.md")
      }
      fs.writeFileSync(outputPath, content)
      count++
    }
  }

  return count
}

function cleanDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`  Cleaned: ${dir}`)
  }
}

function copyDirectoryRecursive(src: string, dest: string): number {
  if (!fs.existsSync(src)) {
    return 0
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  if (entries.length === 0) {
    return 0
  }

  fs.mkdirSync(dest, { recursive: true })
  let count = 0

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      count += copyDirectoryRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      count++
    }
  }

  return count
}

function generateMetaJsonIfMissing(destDir: string, title: string): void {
  const metaPath = path.join(destDir, "meta.json")

  if (fs.existsSync(metaPath)) {
    console.log(`  Found existing meta.json`)
    return
  }

  if (!fs.existsSync(destDir)) {
    return
  }

  const entries = fs.readdirSync(destDir, { withFileTypes: true })
  // Support both .md and .mdx files
  const mdFiles = entries
    .filter((e) => e.isFile() && (e.name.endsWith(".mdx") || e.name.endsWith(".md")))
    .map((e) => e.name.replace(/\.(mdx|md)$/, ""))

  const subdirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => `...${e.name}`)

  if (mdFiles.length === 0 && subdirs.length === 0) {
    return
  }

  const sortedPages = [
    ...mdFiles.filter((p) => p === "index"),
    ...mdFiles.filter((p) => p !== "index").sort(),
    ...subdirs.sort(),
  ]

  const meta = { title, pages: sortedPages }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n")
  console.log(`  Generated meta.json with ${sortedPages.length} entries`)
}

// Custom meta.json configurations for TypeDoc-generated API sections
const TYPEDOC_META_CONFIGS: Record<string, { title: string; pages: string[] }> = {
  "type-docs": {
    title: "@thesis-co/cent",
    pages: [
      "classes",
      "functions",
      "interfaces",
      "type-aliases",
      "enumerations",
    ],
  },
  "type-docs/classes": {
    title: "Classes",
    pages: [
      "---Core Types---",
      "MoneyClass",
      "Price",
      "PriceRangeClass",
      "ExchangeRate",
      "---Math---",
      "FixedPointNumber",
      "RationalNumber",
      "---Results---",
      "Ok",
      "Err",
      "---Errors---",
      "CentError",
      "CurrencyMismatchError",
      "DivisionError",
      "EmptyArrayError",
      "ExchangeRateError",
      "InvalidInputError",
      "ParseError",
      "PrecisionLossError",
      "ValidationError",
    ],
  },
  "type-docs/functions": {
    title: "Functions",
    pages: [
      "---Factories---",
      "Money",
      "FixedPoint",
      "Rational",
      "PriceRangeFactory",
      "---Configuration---",
      "configure",
      "getConfig",
      "getDefaultConfig",
      "resetConfig",
      "withConfig",
      "---Result Helpers---",
      "ok",
      "err",
      "---Type Guards---",
      "isDecimalString",
      "isFixedPointNumber",
      "isFractionalUnitSymbol",
      "isFractionString",
      "isMoneyAmountNegative",
      "isMoneyAmountPositive",
      "isMoneyAmountZero",
      "isPrimarySymbol",
      "isRateStale",
      "isRationalNumber",
      "isRationalString",
      "---Utilities---",
      "compareSources",
      "filterByReliability",
      "getComparableValue",
      "getCurrencyFromCode",
      "getFractionalUnitInfo",
      "getPrimaryCurrency",
      "getRationalStringType",
      "parseFraction",
      "sortSources",
      "toDecimalString",
      "toFixedPointNumber",
      "toRationalString",
    ],
  },
  "type-docs/interfaces": {
    title: "Interfaces",
    pages: [
      "---Configuration---",
      "CentConfig",
      "CentErrorOptions",
      "RateStalenessConfig",
      "---Exchange Rates---",
      "ExchangeRateProvider",
      "ExchangeRateSource",
      "---Currency---",
      "FractionalUnitSymbol",
    ],
  },
  "type-docs/type-aliases": {
    title: "Type Aliases",
    pages: [
      "---Core Types---",
      "Currency",
      "MoneyAmount",
      "AssetAmount",
      "Asset",
      "AnyAsset",
      "FungibleAsset",
      "---Math---",
      "DecimalString",
      "RationalString",
      "FixedPointType",
      "Ratio",
      "---Results & Errors---",
      "Result",
      "Round",
      "ErrorCode",
      "---Exchange Rates---",
      "ExchangeRateData",
      "PricePoint",
      "---Currency Symbols---",
      "PrimarySymbol",
      "FractionalUnitSymbolKey",
      "---Time---",
      "UNIXTime",
      "UTCTime",
    ],
  },
  "type-docs/enumerations": {
    title: "Enumerations",
    pages: ["RoundingMode"],
  },
}

function generateTypeDocMetaFiles(baseDir: string): void {
  for (const [relativePath, config] of Object.entries(TYPEDOC_META_CONFIGS)) {
    const metaPath = path.join(baseDir, relativePath, "meta.json")
    const dirPath = path.dirname(metaPath)

    if (!fs.existsSync(dirPath)) {
      continue
    }

    fs.writeFileSync(metaPath, JSON.stringify(config, null, 2) + "\n")
  }
  console.log(`  Created ${Object.keys(TYPEDOC_META_CONFIGS).length} custom meta.json files`)
}

function main(): void {
  console.log("Copying package documentation...\n")

  let totalCopied = 0

  for (const pkg of PACKAGES) {
    console.log(`Processing: ${pkg.name}`)

    const sourceDir = path.join(MONOREPO_ROOT, pkg.sourceDir)
    const destDir = path.join(DOCS_CONTENT_DIR, pkg.destDir)

    cleanDirectory(destDir)

    if (!fs.existsSync(sourceDir)) {
      console.log(`  Source not found: ${sourceDir}`)
      continue
    }

    const copied = copyDirectoryRecursive(sourceDir, destDir)

    if (copied === 0) {
      console.log(`  No files to copy (empty source)`)
      continue
    }

    console.log(`  Copied ${copied} files`)
    totalCopied += copied

    generateMetaJsonIfMissing(destDir, pkg.name)
  }

  // Copy TypeDoc-generated API docs
  console.log(`\nProcessing: TypeDocs`)
  const apiSourceDir = path.join(MONOREPO_ROOT, GENERATED_API_CONFIG.sourceDir)
  const apiDestDir = path.join(DOCS_CONTENT_DIR, GENERATED_API_CONFIG.destDir)

  cleanDirectory(apiDestDir)

  const apiCopied = copyGeneratedApiDocs(apiSourceDir, apiDestDir)
  if (apiCopied > 0) {
    console.log(`  Copied and processed ${apiCopied} files`)
    totalCopied += apiCopied
    generateTypeDocMetaFiles(DOCS_CONTENT_DIR)
  } else {
    console.log(`  No API docs found (run 'pnpm docs:api' in packages/cent first)`)
  }

  console.log(`\nTotal: ${totalCopied} files copied`)
}

main()
