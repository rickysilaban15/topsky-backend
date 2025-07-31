// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      midtrans: !!process.env.MIDTRANS_SERVER_KEY,
      sheets: !!process.env.GOOGLE_SHEET_ID
    }
  });
}
