import type { VercelRequest, VercelResponse } from '@vercel/node';
import midtransClient from 'midtrans-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS untuk bisa diakses frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Ambil data dari body
  const { order_id, amount, items } = req.body || {};
  if (!order_id || !amount) {
    return res.status(400).json({ message: 'order_id & amount wajib' });
  }

  // Setup Midtrans
  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY as string,
    clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
  });

  try {
    // Parameter untuk QRIS
    const parameter: any = {
      payment_type: 'qris',
      transaction_details: {
        order_id,
        gross_amount: Number(amount),
      },
      item_details: items?.length
        ? items
        : [
            {
              id: 'topup',
              price: Number(amount),
              quantity: 1,
              name: 'TopUp',
            },
          ],
    };

    // Buat transaksi QRIS ke Midtrans
    const charge = await core.charge(parameter);

    // Cari link QR code
    const actions = Array.isArray(charge.actions) ? charge.actions : [];
    const qrAction =
      actions.find((a: any) => (a.name || '').toLowerCase().includes('qr')) ||
      actions[0];

    // Kirim response ke frontend
    return res.status(200).json({
      order_id,
      transaction_status: charge.transaction_status,
      qr_url: qrAction?.url || null,
      qr_string: (charge as any).qr_string || null,
    });
  } catch (e: any) {
    console.error('QRIS error:', e?.response?.data || e?.message || e);
    return res.status(500).json({ message: 'Gagal membuat transaksi QRIS' });
  }
}
