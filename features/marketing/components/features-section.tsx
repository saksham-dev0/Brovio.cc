import { nodeRegistry } from "@/features/workflows/nodes/node-registry"

const features = [
  {
    title: "A real canvas",
    body: "Pan, zoom, and rearrange. The graph is the program, and it runs in the order the edges describe.",
  },
  {
    title: "Collaborative by default",
    body: "Workflows are multiplayer. Teammates see each other's cursors and edits on the same canvas in real time.",
  },
  {
    title: "Live run progress",
    body: "Steps stream their status and output while the run is still going, so a long workflow is never a black box.",
  },
  {
    title: "Session replays",
    body: "Each run is recorded. Play it back to see precisely what happened, step by step.",
  },
  {
    title: "Runs in the background",
    body: "Close the tab. Runs execute on durable background infrastructure and keep going without you.",
  },
  {
    title: "Yours to host",
    body: "The whole application is open source. Run it on your own machines with your own keys whenever you want to.",
  },
]

// Driven off the registry so the marketing copy cannot drift from the nodes
// that actually ship.
const nodes = Object.values(nodeRegistry)

export function FeaturesSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <h2 className="text-3xl font-semibold tracking-tight">
        Everything the run needs
      </h2>

      <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-2">
            <h3 className="text-lg font-medium">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 flex flex-col gap-6">
        <h3 className="text-lg font-medium">The nodes you build with</h3>
        <ul className="flex flex-wrap gap-3">
          {nodes.map((node) => {
            const Icon = node.icon

            return (
              <li
                key={node.type}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-md ${node.accent}`}
                >
                  <Icon className="size-3.5" />
                </span>
                {node.label}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
