import * as fs from "node:fs";
import * as path from "node:path";

interface PackageConfig {
  name: string;
  sourceDir: string;
  destDir: string;
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
];

const MONOREPO_ROOT = path.resolve(__dirname, "../../..");
const DOCS_CONTENT_DIR = path.resolve(__dirname, "../content/docs");

function cleanDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  Cleaned: ${dir}`);
  }
}

function copyDirectoryRecursive(src: string, dest: string): number {
  if (!fs.existsSync(src)) {
    return 0;
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  if (entries.length === 0) {
    return 0;
  }

  fs.mkdirSync(dest, { recursive: true });
  let count = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return count;
}

function generateMetaJsonIfMissing(destDir: string, title: string): void {
  const metaPath = path.join(destDir, "meta.json");

  if (fs.existsSync(metaPath)) {
    console.log(`  Found existing meta.json`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    return;
  }

  const entries = fs.readdirSync(destDir, { withFileTypes: true });
  const mdxFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name.replace(".mdx", ""));

  const subdirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => `...${e.name}`);

  if (mdxFiles.length === 0 && subdirs.length === 0) {
    return;
  }

  const sortedPages = [
    ...mdxFiles.filter((p) => p === "index"),
    ...mdxFiles.filter((p) => p !== "index").sort(),
    ...subdirs.sort(),
  ];

  const meta = { title, pages: sortedPages };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log(`  Generated meta.json with ${sortedPages.length} entries`);
}

function main(): void {
  console.log("Copying package documentation...\n");

  let totalCopied = 0;

  for (const pkg of PACKAGES) {
    console.log(`Processing: ${pkg.name}`);

    const sourceDir = path.join(MONOREPO_ROOT, pkg.sourceDir);
    const destDir = path.join(DOCS_CONTENT_DIR, pkg.destDir);

    cleanDirectory(destDir);

    if (!fs.existsSync(sourceDir)) {
      console.log(`  Source not found: ${sourceDir}`);
      continue;
    }

    const copied = copyDirectoryRecursive(sourceDir, destDir);

    if (copied === 0) {
      console.log(`  No files to copy (empty source)`);
      continue;
    }

    console.log(`  Copied ${copied} files`);
    totalCopied += copied;

    generateMetaJsonIfMissing(destDir, pkg.name);
  }

  console.log(`\nTotal: ${totalCopied} files copied`);
}

main();
