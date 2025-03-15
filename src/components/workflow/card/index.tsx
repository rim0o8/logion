import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";


interface workflowCardProps {
    title: string;
    description: string;
    workflowId: string;
}
const workflowCard: React.FC<workflowCardProps> = ({ title, description, workflowId }) => {
    return (
        <Card key={workflowId} className="shadow-lg rounded-lg overflow-hidden flex flex-col h-full border transition-colors">
            <CardHeader className="h-56 bg-gradient-to-r from-primary/80 via-primary to-primary/80 dark:from-primary/60 dark:via-primary/80 dark:to-primary/60 text-primary-foreground flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                    <CardDescription className="italic text-primary-foreground/80">{workflowId}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-6 flex-grow">
                <p className="mb-4">
                    {description}
                </p>
            </CardContent>
            <div className="mt-auto">
                <div className="px-6 pb-6">
                    <Button
                        variant="outline"
                        className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => window.open(`/workflow/${workflowId}`, '_blank', 'noopener,noreferrer')}
                    >
                        今すぐ使ってみる
                    </Button>
                </div>
                <CardFooter className="bg-muted text-center p-4">
                    <p className="text-sm text-muted-foreground">by Yuri Kurashima</p>
                </CardFooter>
            </div>
        </Card >
    )
}

export default workflowCard;