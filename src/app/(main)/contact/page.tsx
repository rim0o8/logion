'use client';

import { ContactForm } from '@/components/ContactForm';

export default function ContactPage() {
  const handleSubmit = async (data: { name: string; email: string; message: string }) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        alert('お問い合わせを受け付けました。ありがとうございます。');
      } else {
        alert('お問い合わせの送信に失敗しました。時間をおいて再度お試しください。');
      }
    } catch (error) {
      console.error('お問い合わせの送信に失敗しました:', error);
      alert('お問い合わせの送信に失敗しました。時間をおいて再度お試しください。');
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">お問い合わせ</h1>
      <ContactForm onSubmit={handleSubmit} />
    </div>
  );
} 