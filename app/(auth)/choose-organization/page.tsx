import { TaskChooseOrganization } from "@clerk/nextjs"

export default function ChooseOrganizationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/*
        Must point at the product, not `/` — `/` is the public landing page and
        runs no entitlement check, so completing here would strand the user on
        marketing. `/workflows` sends an unsubscribed org on to `/upgrade`.
      */}
      <TaskChooseOrganization redirectUrlComplete="/workflows" />
    </div>
  )
}
