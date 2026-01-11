import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Required for Cloudflare Pages
  images: {
    unoptimized: true,
  },
}

export default withMDX(config)
