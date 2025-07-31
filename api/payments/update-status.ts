// backend/api/transactions/update.ts
import { Request, Response } from 'express';
import { getSheets } from '../../lib/sheets';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id, status } = req.body;
  if (!order_id || !status) {
    return res.status(400).json({ message: 'order_id & status wajib' });
  }

  try {
    const sheets = await getSheets();

    // Ambil semua transaksi
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'transactions!A:E',
    });

    const rows = result.data.values || [];
    const idx = rows.findIndex(row => row[0] === order_id);

    if (idx === -1) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: `transactions!C${idx + 1}:E${idx + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status, rows[idx][3], new Date().toISOString()]],
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Update error:', err?.message || err);
    return res.status(500).json({ message: 'Gagal update status transaksi' });
  }
}
