import { Config } from '@/utils/config';
import { IncomingWebhook } from '@slack/webhook';
import type { NextApiRequest, NextApiResponse } from 'next';

const SLACK_WEBHOOK_URL = Config.SLACK_WEBHOOK_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, email, message } = req.body;

    if (!SLACK_WEBHOOK_URL) {
      return res.status(500).json({ message: 'Slack Webhook URLが設定されていません' });
    }

    const webhook = new IncomingWebhook(SLACK_WEBHOOK_URL);

    try {
      await webhook.send({
        text: `新しいお問い合わせがありました\n\nお名前: ${name}\nメールアドレス: ${email}\nお問い合わせ内容:\n${message}`,
      });

      return res.status(200).json({ message: 'お問い合わせを受け付けました' });
    } catch (error) {
      console.error('Slack通知の送信に失敗しました:', error);
      return res.status(500).json({ message: 'お問い合わせの送信に失敗しました' });
    }
  }

  return res.status(405).json({ message: 'メソッドが許可されていません' });
} 