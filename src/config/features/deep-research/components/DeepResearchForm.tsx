import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ClientResearchParams } from '@/lib/deep-research';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Available models
const openAIModels = [
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const anthropicModels = [
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
];

// Search providers
const searchProviders = [
  { value: 'firecrawl', label: 'Firecrawl' },
  { value: 'tavily', label: 'Tavily' },
];

// Form schema
const formSchema = z.object({
  query: z.string().min(1, 'Research topic is required'),
  depth: z.number().int().min(1).max(5),
  breadth: z.number().int().min(1).max(10),
  model: z.string().min(1, 'Model is required'),
  searchProvider: z.enum(['firecrawl', 'tavily']).default('firecrawl'),
});

// Default form values
const defaultValues = {
  query: '',
  depth: 2,
  breadth: 3,
  model: 'gpt-4-turbo',
  searchProvider: 'firecrawl',
} as const;

interface DeepResearchFormProps {
  onSubmit: (values: ClientResearchParams) => void;
  formState: {
    isResearching: boolean;
  };
}

export const DeepResearchForm: FC<DeepResearchFormProps> = ({ onSubmit, formState }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Deep Research</CardTitle>
            <CardDescription>
              Enter a topic you want to research. AI will conduct comprehensive research.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research Topic</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What would you like to research?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>OpenAI</SelectLabel>
                          {openAIModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Anthropic</SelectLabel>
                          {anthropicModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="searchProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Provider</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a search provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {searchProviders.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the web search provider to use for research
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="depth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Depth</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many iterations of research to perform (1-5)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="breadth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Breadth</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many search terms to use per iteration (1-10)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex justify-end">
              <Button type="submit" disabled={formState.isResearching}>
                {formState.isResearching ? 'Researching...' : 'Start Research'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}; 