import type { VercelRequest, VercelResponse } from '@vercel/node';
import midtransClient from 'midtrans-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ message: 'order_id wajib' });

  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY as string,
    clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
  });

  try {
    const status = await core.transaction.status(order_id as string);
    return res.status(200).json(status);
  } catch (e: any) {
    return res.status(500).json({ message: 'Gagal cek status' });
  }
}
