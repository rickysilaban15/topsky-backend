// backend/types/midtrans-client.d.ts
declare module 'midtrans-client' {
  export class CoreApi {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    charge(payload: any): Promise<any>;
    transaction: {
      status(order_id: string): Promise<any>;
    };
  }
}
