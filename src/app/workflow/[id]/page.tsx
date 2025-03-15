'use client';

import Completion from "@/components/workflow/execution/completion";
import { SessionProvider } from "next-auth/react";

export default function WorkflowExecutionPage({ params }: { params: { id: string } }) {
  return (
    <SessionProvider>
      <div className="container mx-auto py-8">
        <Completion
          workflowId={params.id}
        />
      </div>
    </SessionProvider>
  );
}
