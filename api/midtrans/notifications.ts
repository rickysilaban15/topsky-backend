// backend/api/midtrans/notifications.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import midtransClient from 'midtrans-client';
import { updateTransactionStatus } from '../../lib/sheets';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Read raw body (manual karena Express by default sudah parse JSON)
    const raw = req.body && typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const { order_id, status_code, gross_amount, signature_key } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY as string;
    const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expected = crypto.createHash('sha512').update(payload).digest('hex');

    if (expected !== signature_key) {
      console.warn('Invalid signature for order:', order_id);
      return res.status(401).json({ message: 'invalid signature' });
    }

    const core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey,
      clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
    });

    const status = await core.transaction.status(order_id);
    const txStatus = (status as any).transaction_status || body.transaction_status;

    await updateTransactionStatus(order_id, txStatus);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Webhook error:', e?.message || e);
    return res.status(500).json({ message: 'failed processing notification' });
  }
}
