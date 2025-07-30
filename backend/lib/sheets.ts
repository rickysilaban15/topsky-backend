// backend/lib/sheets.ts
import { google } from 'googleapis';

const RANGE = 'transactions!A:G'; // A:order_id ... G:updated_at

export type TxRow = {
  order_id: string;
  user_id?: string;
  amount: number;
  payment_method?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

export async function appendTransaction(row: TxRow) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        row.order_id,
        row.user_id ?? '',
        row.amount,
        row.payment_method ?? '',
        row.status,
        row.created_at,
        row.updated_at
      ]]
    }
  });
}

export async function getAllRows(): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: RANGE
  });
  return res.data.values ?? [];
}

export async function findRowIndexByOrderId(order_id: string): Promise<number> {
  // Returns 1-based row index in sheet (including header). -1 if not found.
  const rows = await getAllRows();
  // Assuming first row is header: order_id, user_id, amount, ...
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString() === order_id) return i + 1; // +1 because rows[] is 0-based, and +1 for header
  }
  return -1;
}

export async function getTransaction(order_id: string): Promise<TxRow | null> {
  const rows = await getAllRows();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if ((r[0] || '') === order_id) {
      return {
        order_id: r[0],
        user_id: r[1],
        amount: Number(r[2] || 0),
        payment_method: r[3],
        status: r[4],
        created_at: r[5],
        updated_at: r[6]
      };
    }
  }
  return null;
}

export async function updateTransactionStatus(order_id: string, status: string) {
  const rowIndex = await findRowIndexByOrderId(order_id);
  if (rowIndex === -1) return false;

  const sheets = await getSheets();
  // C:amount (3), D:payment_method (4), E:status (5), F:created_at (6), G:updated_at (7)
  // We only update E (status) and G (updated_at)
  const range = `transactions!E${rowIndex}:G${rowIndex}`;
  const nowIso = new Date().toISOString();
  const current = await getTransaction(order_id);
  const createdAt = current?.created_at || nowIso;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status, createdAt, nowIso]]
    }
  });
  return true;
}
