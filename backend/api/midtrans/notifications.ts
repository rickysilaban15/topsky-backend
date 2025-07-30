import type { VercelRequest, VercelResponse } from '@vercel/node';
import midtransClient from 'midtrans-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY as string,
    clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
  });

  try {
    const notif = await core.transaction.notification(req.body);
    // TODO: update status di DB kalau kamu pakai DB
    // const { order_id, transaction_status } = notif;
    return res.status(200).json({ received: true });
  } catch (e: any) {
    console.error('Webhook error:', e?.response?.data || e?.message || e);
    return res.status(500).json({ message: 'Gagal memproses notifikasi' });
  }
}
