// backend/api/payments/qris.ts
import { Request, Response } from 'express';
import midtransClient from 'midtrans-client';
import { appendTransaction, getTransaction } from '../../lib/sheets';

// Middleware CORS manual
function setCors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: Request, res: Response) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { order_id, amount, user_id } = req.body || {};

  if (!order_id || !amount) {
    return res.status(400).json({ message: 'order_id & amount wajib' });
  }

  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY as string,
    clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
  });

  try {
    const charge = await core.charge({
      payment_type: 'qris',
      transaction_details: {
        order_id,
        gross_amount: Number(amount)
      }
    });

    const actions: any[] = (charge as any).actions || [];
    const qrAction = actions.find(a => a.name?.includes('qr')) || actions[0];

    const exists = await getTransaction(order_id);
    const now = new Date().toISOString();

    if (!exists) {
      await appendTransaction({
        order_id,
        user_id: user_id ?? '',
        amount: Number(amount),
        payment_method: 'QRIS',
        status: (charge as any).transaction_status || 'pending',
        created_at: now,
        updated_at: now
      });
    }

    return res.status(200).json({
      order_id,
      transaction_status: (charge as any).transaction_status || 'pending',
      qr_url: qrAction?.url || null,
      qr_string: (charge as any).qr_string || null,
    });
  } catch (e: any) {
    console.error('QRIS error:', e?.response?.data || e?.message || e);
    return res.status(500).json({ message: 'Gagal membuat QRIS' });
  }
}
