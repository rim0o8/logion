export interface InputSchema {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'textfile' | 'list[text]' | 'list[textarea]' | 'choice' | 'list[choice]';
  description?: string;
  options?: string[];
}

export type InputValues = {
  [key: string]: string | string[] | File;
};