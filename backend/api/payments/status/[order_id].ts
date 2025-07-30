// backend/api/payments/status/[order_id].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import midtransClient from 'midtrans-client';
import { getTransaction, updateTransactionStatus } from '../../../lib/sheets';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ message: 'order_id wajib' });

  try {
    // 1) coba dari Google Sheets
    const tx = await getTransaction(String(order_id));
    if (tx) {
      return res.status(200).json({
        order_id: tx.order_id,
        amount: tx.amount,
        status: tx.status,                  // untuk frontend fallback "status"
        transaction_status: tx.status       // untuk frontend yg baca "transaction_status"
      });
    }

    // 2) fallback ke Midtrans (kalau baris belum ada)
    const core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY as string,
      clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
    });

    const status = await core.transaction.status(String(order_id));
    const st = (status as any).transaction_status || 'pending';

    // Optional: sinkronkan ke Sheet
    await updateTransactionStatus(String(order_id), st);

    return res.status(200).json(status);
  } catch (e: any) {
    console.error('status error:', e?.response?.data || e?.message || e);
    return res.status(500).json({ message: 'Gagal cek status' });
  }
}
