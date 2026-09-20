const faqs = [
  {
    question: "Is it really the same product when I self-host?",
    answer:
      "Yes. There is one codebase and no feature gates. Self-hosted installations get everything the hosted plan gets.",
  },
  {
    question: "What do I still need accounts for?",
    answer:
      "Self-hosting needs your own accounts for Clerk, Liveblocks, Browserbase, Trigger.dev, and a model provider. Those services cannot be self-hosted, though each has a free tier. Postgres runs in the Docker Compose stack.",
  },
  {
    question: "Is there a free tier on the hosted app?",
    answer:
      "No. The hosted app is subscription-only. If you do not want to pay, self-hosting is free and complete.",
  },
  {
    question: "How long does self-hosting take to set up?",
    answer:
      "Copy the environment file, fill in your keys, and run docker compose up. One extra step is required: Trigger.dev has to be configured and the task code deployed before workflow runs will work. The setup guide walks through it.",
  },
  {
    question: "What license is it under?",
    answer:
      "AGPL-3.0. You can run, modify, and self-host it freely. If you offer it to others as a network service, you have to publish your modifications.",
  },
  {
    question: "Can I move from hosted to self-hosted later?",
    answer:
      "Yes. It is the same schema and the same application, so a database dump moves with you.",
  },
]

export function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24">
      <h2 className="text-3xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <dl className="mt-12 flex flex-col gap-8">
        {faqs.map((faq) => (
          <div key={faq.question} className="flex flex-col gap-2">
            <dt className="font-medium">{faq.question}</dt>
            <dd className="text-muted-foreground">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
