// backend/api/midtrans/notifications.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import midtransClient from 'midtrans-client';
import { updateTransactionStatus } from '../../lib/sheets';

// NOTE: Kita baca RAW body untuk verifikasi signature
export const config = {
  api: { bodyParser: false } as any
};

async function readRawBody(req: VercelRequest): Promise<string> {
  return await new Promise<string>((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const raw = await readRawBody(req);
    const body = JSON.parse(raw);

    const { order_id, status_code, gross_amount, signature_key } = body;

    // verify signature: sha512(order_id + status_code + gross_amount + serverKey)
    const serverKey = process.env.MIDTRANS_SERVER_KEY as string;
    const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expected = crypto.createHash('sha512').update(payload).digest('hex');

    if (expected !== signature_key) {
      console.warn('Invalid signature for order:', order_id);
      return res.status(401).json({ message: 'invalid signature' });
    }

    // Ambil status resmi dari Midtrans (opsional tapi lebih aman)
    const core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey,
      clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
    });

    const status = await core.transaction.status(order_id);
    const txStatus = (status as any).transaction_status || body.transaction_status;

    // Update ke Google Sheets
    await updateTransactionStatus(order_id, txStatus);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('webhook error:', e?.message || e);
    return res.status(500).json({ message: 'failed processing notification' });
  }
}
