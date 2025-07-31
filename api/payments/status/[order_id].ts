// backend/api/payments/status.ts
import { Request, Response } from 'express';
import midtransClient from 'midtrans-client';
import { getTransaction, updateTransactionStatus } from '../../../lib/sheets';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { order_id } = req.query;
  if (!order_id || typeof order_id !== 'string') {
    return res.status(400).json({ message: 'order_id wajib' });
  }

  try {
    // 1) coba dari Google Sheets
    const tx = await getTransaction(order_id);
    if (tx) {
      return res.status(200).json({
        order_id: tx.order_id,
        amount: tx.amount,
        status: tx.status,
        transaction_status: tx.status
      });
    }

    // 2) fallback ke Midtrans
    const core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.MIDTRANS_CLIENT_KEY!,
    });

    const status = await core.transaction.status(order_id);
    const st = (status as any).transaction_status || 'pending';

    // Simpan ke Google Sheets jika belum ada
    await updateTransactionStatus(order_id, st);

    return res.status(200).json(status);
  } catch (e: any) {
    console.error('status error:', e?.response?.data || e?.message || e);
    return res.status(500).json({ message: 'Gagal cek status' });
  }
}
