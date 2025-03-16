'use client';

import { ContactForm } from '@/components/ContactForm';
import { Markdown } from '@/components/ui/Markdown';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState<{ name: string; email: string; message: string } | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (data: { name: string; email: string; message: string }) => {
    try {
      setFormData(data);
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('お問い合わせの送信に失敗しました:', error);
      setStatus('error');
    }
  };

  const getMarkdownContent = () => {
    if (!formData) return '';

    return `
# お問い合わせ内容

## 送信者情報
**お名前**: ${formData.name}
**メールアドレス**: ${formData.email}

## メッセージ
${formData.message}

---
${status === 'success' 
  ? '✅ お問い合わせを受け付けました。ありがとうございます。' 
  : status === 'error' 
    ? '❌ お問い合わせの送信に失敗しました。時間をおいて再度お試しください。' 
    : ''}
`;
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">お問い合わせ</h1>

      {status !== 'idle' && (
        <Card className="p-6 mb-6">
          <Markdown content={getMarkdownContent()} />
        </Card>
      )}

      <ContactForm onSubmit={handleSubmit} />
    </div>
  );
} 