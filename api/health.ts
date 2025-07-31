import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      midtrans: !!process.env.MIDTRANS_SERVER_KEY,
      sheets: !!process.env.GOOGLE_SHEET_ID
    }
  });
}
