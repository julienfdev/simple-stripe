import PaymentIntentStatus from './PaymentIntentStatus';

export type paymentintent_id = string;
export type setupintent_id = string;
export type customer_id = string;
export type paymentmethod_id = string;
export interface SimplePaymentIntent {
  id: string;
  status: PaymentIntentStatus;
  statusText: string;
}
export interface PaymentIntentDetails extends SimplePaymentIntent {
  client_secret?: string | null;
  created: Date;
  amount: number;
  amount_received: number;
  currency: string;
  customer?: string | null;
  payment_method?: string | null;
}
export interface SimpleCustomer {
  id: string;
}
export interface CustomerDetails extends SimpleCustomer {
  deleted: boolean;
  created?: Date;
  description?: string | null;
}
export interface PaymentMethod {
  id: string;
  brand: string;
  exp: {
    month: number;
    year: number;
  };
  last4: string;
}
