import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from '../../lib/sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id, status } = req.body;
  if (!order_id || !status) return res.status(400).json({ message: 'order_id & status wajib' });

  const sheets = await getSheets();

  // Ambil semua transaksi
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'transactions!A:E'
  });

  const rows = result.data.values || [];
  const idx = rows.findIndex(row => row[0] === order_id);

  if (idx === -1) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `transactions!C${idx + 1}:E${idx + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status, rows[idx][3], new Date().toISOString()]]
    }
  });

  res.status(200).json({ ok: true });
}
