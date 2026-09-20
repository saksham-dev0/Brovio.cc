const steps = [
  {
    title: "Draw the workflow",
    body: "Drop nodes onto a canvas and connect them. Each node is one step: open a URL, act on the page, observe what is there, or extract structured data.",
  },
  {
    title: "Reference earlier steps",
    body: "Every node publishes named outputs. Write {{ nodeId.title }} in a later node's field and the value flows straight through when the run reaches it.",
  },
  {
    title: "Run it",
    body: "The graph is sorted into execution order and walked in the background on a real cloud browser. The canvas lights up as each node moves from pending to running to done.",
  },
  {
    title: "Watch the replay",
    body: "Every run records its session. Open the replay to see exactly what happened, or read each step's output in the run console underneath the canvas.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-14 border-t bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
