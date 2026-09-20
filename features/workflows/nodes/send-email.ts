import { DEFAULT_FROM, resend } from "@/lib/resend"

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  // The SDK returns API failures on `error` rather than throwing, so a send
  // that never left Resend would otherwise mark this step done.
  const { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject,
    text: body,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return { emailId: data!.id }
}
