import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

const DOCS_DIR = path.join(process.cwd(), "content", "docs")

export type DocMeta = {
  slug: string
  title: string
  order: number
}

export type DocPage = DocMeta & {
  body: string
}

/**
 * Front matter is deliberately tiny — a title and a sort order, delimited by
 * `---` lines. Anything richer would mean a YAML parser for two fields.
 */
function parse(slug: string, raw: string): DocPage {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)

  if (!match) {
    return { slug, title: slug, order: 999, body: raw }
  }

  const fields = new Map(
    match[1]
      .split("\n")
      .map((line) => line.split(/:\s(.+)/))
      .filter((parts): parts is string[] => parts.length >= 2)
      .map(([key, value]) => [key.trim(), value.trim()] as const)
  )

  return {
    slug,
    title: fields.get("title") ?? slug,
    order: Number(fields.get("order") ?? 999),
    body: raw.slice(match[0].length),
  }
}

/** Every page, in sidebar order. */
export async function listDocs(): Promise<DocMeta[]> {
  const entries = await readdir(DOCS_DIR)
  const pages = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".md"))
      .map(async (entry) => {
        const slug = entry.replace(/\.md$/, "")
        return parse(slug, await readFile(path.join(DOCS_DIR, entry), "utf8"))
      })
  )

  return pages
    .sort((a, b) => a.order - b.order)
    .map(({ slug, title, order }) => ({ slug, title, order }))
}

/**
 * One page, or null when the slug matches no file. The slug is joined onto a
 * fixed directory and any path separator in it is rejected, so a crafted slug
 * cannot escape `content/docs`.
 */
export async function getDoc(slug: string): Promise<DocPage | null> {
  if (slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
    return null
  }

  try {
    const raw = await readFile(path.join(DOCS_DIR, `${slug}.md`), "utf8")
    return parse(slug, raw)
  } catch {
    return null
  }
}
