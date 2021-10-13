import Stripe from "stripe"
import PaymentIntentStatus from "./interfaces/PaymentIntentStatus"
import { PaymentIntentDetails, paymentintent_id, SimplePaymentIntent, SimpleCustomer, customer_id, CustomerDetails, PaymentMethod, paymentmethod_id } from "./interfaces/SimpleTypes"
export import StripeError = Stripe.StripeError


export default class SimpleStripe {
    private stripe: Stripe

    constructor(secretKey: string) {
        this.stripe = new Stripe(secretKey, { apiVersion: "2020-08-27" })
    }
    public paymentIntent = {
        /**
         * This generates a payment intent on Stripe and wraps the response in a simplified PaymentIntent summary
         * 
         * @param amount the amount to charge, in cents
         * @param customer optional: the customer id to attach the intent to
         * @param currency optional: the currency if different than eur
         * @returns a SimplePaymentIntent
         * 
         */
        generate: async (amount: number, customer?: string, currency = "eur"): Promise<SimplePaymentIntent> => {
            const paymentIntent = await this.stripe.paymentIntents.create(
                {
                    amount,
                    currency,
                    customer
                }
            )
            return { id: paymentIntent.id, status: this.#parsePaymentIntentStatus(paymentIntent.status), statusText: paymentIntent.status }
        },
        /**
         * Retreives the client secret of a payment intent
         * 
         * @param id the paymentIntent id
         * @returns the client_secret to send to the front end
         */
        getClientSecret: async (id: paymentintent_id): Promise<string | null> => {
            return (await this.#getPaymentIntent(id)).client_secret
        },
        /**
         * Retreives the status of the paymentIntent and wraps it in an enum
         * 
         * @param id the paymentIntent id
         * @returns the status of the paymentIntent
         * @see PaymentIntentStatus
         */
        getStatus: async (id: paymentintent_id): Promise<PaymentIntentStatus> => {
            const intent = await this.#getPaymentIntent(id)
            return this.#parsePaymentIntentStatus(intent.status)
        },
        /**
         * 
         * @param id the paymentIntent id
         * @returns a PaymentIntentDetails object
         * @see PaymentIntentDetails
         */
        getDetails: async (id: paymentintent_id): Promise<PaymentIntentDetails> => {
            const intent = await this.#getPaymentIntent(id)
            return {
                id: intent.id,
                customer: intent.customer as string | null,
                created: new Date(intent.created * 1000),
                client_secret: intent.client_secret,
                amount: intent.amount,
                amount_received: intent.amount_received,
                currency: intent.currency,
                payment_method: intent.payment_method as string | null,
                status: this.#parsePaymentIntentStatus(intent.status),
                statusText: intent.status
            }
        },
        /**
         * 
         * WIP
         * 
         */
        payOffSession: async (payment_intent: paymentintent_id, payment_method: paymentmethod_id): Promise<SimplePaymentIntent> => {
            await this.stripe.paymentIntents.update(payment_intent, { payment_method })
            const response = await this.stripe.paymentIntents.confirm(payment_intent, {
                payment_method
            })
            return {
                id: response.id,
                status: this.#parsePaymentIntentStatus(response.status),
                statusText: response.status
            }
        }
    }
    public customer = {
        /**
         * Create a customer
         * @see CustomerCreateParams for creation options
         * @returns the id of the customer freshly created
         */
        create: async (infos?: Stripe.CustomerCreateParams): Promise<SimpleCustomer> => {
            const customer = await this.stripe.customers.create(infos)
            return { id: customer.id }
        },
        /**
         * Get a customer's details
         */
        getDetails: async (id: customer_id): Promise<CustomerDetails> => {
            const customer = await this.#getCustomer(id)
            if (!customer.deleted) {
                return {
                    id: customer.id,
                    deleted: false,
                    created: new Date(customer.created * 1000),
                    description: customer.description,
                }
            } else {
                return { id: customer.id, deleted: true }
            }
        },
        /**
         * Returns the details of a customer's PaymentMethod[]
         * 
         * This could be useful to send a list of saved card to a front-end
         */
        getPaymentMethods: async (id: customer_id): Promise<PaymentMethod[]> => {
            const paymentMethods: PaymentMethod[] = []
            const methods = await this.#getCards(id);
            methods.forEach((method) => {
                paymentMethods.push(
                    {
                        id: method.id,
                        brand: method.card!.brand,
                        exp: {
                            month: method.card!.exp_month,
                            year: method.card!.exp_year
                        },
                        last4: method.card!.last4
                    }
                )
            })
            return paymentMethods
        },
        /**
         * Go through a customer's payment cards, find duplicates and detach the older ones
         *
         * This is good to call before sending payment methods infos to a front-end to prevent duplicates
         */
        flushDuplicatePaymentMethods: async (id: customer_id): Promise<number> => {
            const methods = await this.#getCards(id);
            // okay this is a little tricky
            const methodsToDetach = methods.filter((method, index) => {
                if (!index && methods.length > 1) {
                    // If this is the first item, we compare it with the following one
                    // Method has made the cut if its fingerprint is the same than the following and is older
                    return (method.card!.fingerprint === methods[index + 1].card!.fingerprint) && (method.created < methods[index + 1].created)
                } else {
                    // Else we compare it with the previous one
                    return (method.card!.fingerprint === methods[index - 1].card!.fingerprint) && (method.created < methods[index - 1].created)
                }
            })
            // we detach each method flagged by the algorithm from the customer
            methodsToDetach.forEach(async (method) => {
                await this.stripe.paymentMethods.detach(method.id)
            })
            return methodsToDetach.length
        },
        /**
         * This method can charge an off_session saved payment id
         * @param customer the customer unique id
         * @param payment_method a payment_method id attached to the customer
         * @param amount the amount in cents
         * @param currency the currency if different from euros
         * @returns a simple payment intent with the result of the transaction
         */
        charge: async (customer: customer_id, payment_method: paymentmethod_id, amount: number, currency = "eur"): Promise<SimplePaymentIntent | void> => {
            try {
                const paymentIntent = await this.stripe.paymentIntents.create({
                    amount,
                    currency,
                    customer,
                    payment_method,
                    off_session: true,
                    confirm: true
                })
                return {
                    id: paymentIntent.id,
                    status: this.#parsePaymentIntentStatus(paymentIntent.status),
                    statusText: paymentIntent.status
                }
            } catch (error: any) {
                if (error.type && error.type === "StripeCardError") {
                    // typecasting
                    const err = error as Stripe.StripeCardError
                    return {
                        id: err.payment_intent!.id,
                        status: this.#parsePaymentIntentStatus(err.payment_intent!.status),
                        statusText: err.payment_intent!.status
                    }
                }
                else {
                    throw error
                }
            }
        },
    }
    // public setupIntent {
    //  TBD
    // }


    // Private functions
    async  #getPaymentIntent(id: paymentintent_id): Promise<Stripe.PaymentIntent> {
        return await this.stripe.paymentIntents.retrieve(id)
    }
    async  #getSetupIntent(id: paymentintent_id): Promise<Stripe.SetupIntent> {
        return await this.stripe.setupIntents.retrieve(id)
    }
    async #getCustomer(id: customer_id): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
        return await this.stripe.customers.retrieve(id, { expand: [""] })
    }
    async #getCards(id: customer_id): Promise<Stripe.PaymentMethod[]> {
        const methods: Stripe.PaymentMethod[] = []
        const data = await this.stripe.paymentMethods.list({
            customer: id,
            type: "card"
        })
        if (data.data && data.data.length) {
            data.data.forEach(method => {
                methods.push(method)
            })
        }
        return methods
    }
    #parsePaymentIntentStatus(status: string): PaymentIntentStatus {
        switch (status) {
            case "requires_payment_method":
                return PaymentIntentStatus.REQUIRES_PAYMENT_METHOD;
            case "requires_confirmation":
                return PaymentIntentStatus.REQUIRES_CONFIRMATION
            case "requires_action":
                return PaymentIntentStatus.REQUIRES_ACTION
            case "processing":
                return PaymentIntentStatus.PROCESSING
            case "requires_capture":
                return PaymentIntentStatus.REQUIRES_CAPTURE
            case "canceled":
                return PaymentIntentStatus.CANCELLED
            case "succeeded":
                return PaymentIntentStatus.SUCCEEDED
            default:
                return PaymentIntentStatus.UNKNOWN
        }
    }

}



