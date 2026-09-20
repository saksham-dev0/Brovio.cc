import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

import { BillingNav } from "@/features/billing/components/billing-nav"
import { createWorkflowAction } from "@/features/workflows/actions"
import { WorkflowNav } from "@/features/workflows/components/workflow-nav"
import { listWorkflows } from "@/features/workflows/data"
import { isSelfHosted } from "@/lib/deployment"
import { getWorkflowLimit } from "@/features/workflows/lib/get-workflow-limit"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { orgId } = await auth()
  const [workflows, workflowLimit] = orgId
    ? await Promise.all([listWorkflows(orgId), getWorkflowLimit(orgId)])
    : [[], null]

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="h-12 flex-row items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/workflows"
            afterSelectOrganizationUrl="/workflows"
            afterLeaveOrganizationUrl="/workflows"
            appearance={{
              elements: {
                rootBox: "min-w-0 w-full group-data-[collapsible=icon]:!hidden",
                organizationSwitcherTrigger:
                  "w-full min-w-0 justify-start gap-1.5 px-1.5",
                organizationPreview: "min-w-0 flex-1",
                organizationPreviewTextContainer: "min-w-0",
                organizationPreviewMainIdentifier: "truncate"
              }
            }}
          />
        </div>
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>
      <SidebarContent>
        {workflowLimit ? (
          <WorkflowNav
            workflows={workflows}
            workflowLimit={workflowLimit}
            createWorkflowAction={createWorkflowAction}
          />
        ) : null}
      </SidebarContent>
      <SidebarFooter className="gap-2 p-2 group-data-[collapsible=icon]:items-center">
        {/* A self-hosted installation has no subscription to manage. */}
        {isSelfHosted ? null : <BillingNav />}
        <UserButton showName={false} />
      </SidebarFooter>
    </Sidebar>
  )
}
