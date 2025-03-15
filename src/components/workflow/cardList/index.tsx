import { useSession } from "next-auth/react";
import WorkflowCard from "../card";
import { useFetchWorkflows } from './hooks';

export interface Workflow {
  id: string;
  title: string;
  description: string;
}



const ExecutionCardList = () => {
  const { data: session, status } = useSession();
  const { workflows, error } = useFetchWorkflows(session, status);

  if (status === 'loading') {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <section className="container mx-auto p-8 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow, index) => (
        <WorkflowCard
          key={workflow.id}
          title={workflow.title}
          description={workflow.description}
          workflowId={workflow.id}
        />
      ))}
    </section>
  );
};

export default ExecutionCardList;