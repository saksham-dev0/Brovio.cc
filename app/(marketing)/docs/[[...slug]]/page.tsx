import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { getDoc, listDocs } from "@/features/docs/lib/docs"

type Props = { params: Promise<{ slug?: string[] }> }

export async function generateStaticParams() {
  const docs = await listDocs()

  return docs.map((doc) => ({
    slug: doc.slug === "index" ? [] : [doc.slug],
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = await getDoc(slug?.[0] ?? "index")

  return { title: doc ? `${doc.title} — Docs` : "Docs" }
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params
  const [doc, docs] = await Promise.all([
    getDoc(slug?.[0] ?? "index"),
    listDocs(),
  ])

  if (!doc) notFound()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-12 px-6 py-12">
      <nav className="hidden w-56 shrink-0 md:block">
        <ul className="sticky top-20 flex flex-col gap-1 text-sm">
          {docs.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={entry.slug === "index" ? "/docs" : `/docs/${entry.slug}`}
                className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose prose-neutral min-w-0 max-w-none flex-1 dark:prose-invert">
        <Markdown remarkPlugins={[remarkGfm]}>{doc.body}</Markdown>
      </article>
    </div>
  )
}
