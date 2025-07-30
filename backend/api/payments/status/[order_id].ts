import type { VercelRequest, VercelResponse } from '@vercel/node';
import midtransClient from 'midtrans-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { order_id } = req.query as { order_id: string };
  if (!order_id) return res.status(400).json({ message: 'order_id wajib' });

  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY as string,
    clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
  });

  try {
    const status = await core.transaction.status(order_id);
    return res.status(200).json({
      order_id,
      transaction_status: status.transaction_status,
      fraud_status: status.fraud_status,
      payment_type: status.payment_type
    });
  } catch (e: any) {
    console.error('Status error:', e?.response?.data || e?.message || e);
    return res.status(500).json({ message: 'Gagal cek status' });
  }
}
