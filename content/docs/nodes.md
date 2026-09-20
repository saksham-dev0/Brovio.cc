---
title: Nodes
order: 5
---

# Nodes

A workflow is a graph of nodes. Each node takes inputs, does one thing, and
publishes named outputs that later nodes can reference.

Only connected nodes run. Anything left unattached on the canvas is skipped.
The graph is sorted into execution order before the run starts, so a cycle is
rejected rather than run forever.

## Referencing earlier outputs

Any text field can pull in an earlier node's output with a `{{ }}` placeholder.
The placeholder body is a path whose first segment is the **node id**:

```text
{{ nodeId.title }}
{{ nodeId.matches[0].selector }}
```

Rules worth knowing:

- A missing node, a missing key, or a `null` value becomes an empty string.
  Nothing throws.
- Objects and arrays are inserted as JSON.
- The same function powers the editor's preview and the runner, so what you see
  while editing is what the run substitutes.

## Node reference

### Start

The entry point. A trigger node with no inputs and no outputs — it marks where
the run begins.

### Open URL

Navigates the session to a page.

| Input | Required | Notes |
| --- | --- | --- |
| URL | Yes | For example `https://youtube.com` |
| Description | No | Free text describing the page |

| Output | Meaning |
| --- | --- |
| `url` | The URL that was opened |
| `title` | The page title |

### Act

Performs one action on the current page, described in natural language.

| Input | Required | Notes |
| --- | --- | --- |
| Instruction | Yes | For example `Click the sign in button` |

| Output | Meaning |
| --- | --- |
| `success` | Whether the action was performed |
| `message` | What happened |
| `url` | The URL after the action |

Keep instructions atomic. `Click the sign in button` works;
`Sign in and then go to settings` is two nodes.

### Extract

Pulls structured data off the current page.

| Input | Required | Notes |
| --- | --- | --- |
| Instruction | Yes | For example `Extract the price of the first listing` |

| Output | Meaning |
| --- | --- |
| `result` | The extracted value |

### Observe

Finds candidate elements on the page without acting on them. Useful when you
want to inspect what is available before deciding what to do.

| Input | Required | Notes |
| --- | --- | --- |
| Instruction | Yes | For example `Find the pagination links` |

| Output | Meaning |
| --- | --- |
| `matches` | Every candidate that was found |
| `matches[0].selector` | The first match's selector |
| `matches[0].description` | The first match's description |

### Agent

Runs a multi-step goal autonomously instead of one action at a time.

| Input | Required | Notes |
| --- | --- | --- |
| Instruction | Yes | For example `Log in with username admin and password 123, then go to the profile page` |

| Output | Meaning |
| --- | --- |
| `success` | Whether the goal was reached |
| `message` | What the agent did |
| `completed` | Whether the agent finished its plan |

This node is marked as requiring a paid plan. On the hosted deployment that
means an active subscription; self-hosted installations are unrestricted.

### Send Email

Sends an email through Resend. Requires `RESEND_API_KEY`.

| Input | Required | Notes |
| --- | --- | --- |
| To | Yes | Recipient address |
| Subject | Yes | Email subject |
| Body | Yes | Email body |

| Output | Meaning |
| --- | --- |
| `emailId` | The id Resend assigned to the message |

All three fields interpolate, so a run can email its own results:

```text
Subject: Run finished for {{ n1.title }}
Body: Extracted {{ n3.result }}
```

## Adding your own node

See the [architecture overview](/docs/architecture) for the three files a new
node type touches.
