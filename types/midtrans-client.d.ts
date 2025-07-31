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
      cancel(order_id: string): Promise<any>;
      refund(order_id: string, params: any): Promise<any>;
    };
  }

  export class Snap {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    createTransaction(payload: any): Promise<any>;
    getTransactionStatus(order_id: string): Promise<any>;
  }
}
