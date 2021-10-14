# Simple-Stripe wrapper module

The Simple-Stripe module is made with simplicity in mind, in order to provide basic Stripe Payments functionalities in the most readable API possible.
## Requirements

Node 14 or higher.

## Installation

Install the package with:

```sh
npm install simple-stripe --save
# or
yarn add simple-stripe
```

## Usage

The package needs to be configured with your account's secret key, which is
available in the [Stripe Dashboard][api-keys]. Import it and create an instance like this :

<!-- prettier-ignore -->
```js
import SimpleStripe, { StripeError } from "simple-stripe"
const simpleStripe = new SimpleStripe('sk_test_...')
```
### Usage with TypeScript

Simple-Stripe provides its own type declarations

it also exposes `StripeError` as an export to ease Error handling

```ts
import SimpleStripe, { StripeError } from "simple-stripe"
```

## Configuration
### Initialize with config object

The package can be initialized with the usual `StripeConfig` parameters:

```js

const simpleStripe = new SimpleStripe('sk_test_...', {
  apiVersion: '2019-08-08',
  maxNetworkRetries: 1,
  timeout: 1000,
  host: 'api.example.com',
  port: 123,
  telemetry: true,
});
```
## More Information

- [Stripe NPM package](https://www.npmjs.com/package/stripe)
- [Stripe Docs](https://stripe.com/docs)

## API

### `paymentIntent`

Exposes several methods used to handle paymentIntents

```ts
generate: async (amount: number, customer?: string, currency = 'eur'): Promise<SimplePaymentIntent>
// creates a new paymentIntent on your Stripe Dashboard and returns it as a `SimplePaymentIntent` object
```
```ts
getClientSecret: async (id: paymentintent_id): Promise<string | null>
// Retreives the client secret of a payment intent
```
```ts
getStatus: async (id: paymentintent_id): Promise<PaymentIntentStatus>
// Retreives the status of the paymentIntent and wraps it in an enum
```
```ts
getDetails: async (id: paymentintent_id): Promise<PaymentIntentDetails>
// Retreives the details of a paymentIntent and provides the most interesting properties in a PaymentIntentDetails
```
```ts
// WIP
payOffSession: async (payment_intent: paymentintent_id, payment_method: paymentmethod_id ): Promise<SimplePaymentIntent>
// WIP
// Complete a payment of an existing paymentIntent server-side. Does not handle errors very well for now
```

### `customer`

Exposes several methods used to handle customers

```ts
create: async (infos?: Stripe.CustomerCreateParams): Promise<SimpleCustomer>
// Creates a customer on your Stripe Dashboard and returns its id
// optional param "infos" are a Stripe.CustomerCreateParams object
```
```ts
getDetails: async (id: customer_id): Promise<CustomerDetails>
// Get a customer's details and wraps them inside a CustomerDetails object
```
```ts
getPaymentMethods: async (id: customer_id): Promise<PaymentMethod[]>
// Returns the details of a customer's PaymentMethod[]
// This could be useful to send a list of saved card to a front-end
```
```ts
flushDuplicatePaymentMethods: async (id: customer_id): Promise<number>
// Go through a customer's payment cards, find duplicates and detach the older ones
// This is good to call before sending payment methods infos to a front-end to prevent duplicates
```
```ts
charge: async (
    customer: customer_id,
    payment_method: paymentmethod_id,
    amount: number,
    currency = 'eur',): Promise<SimplePaymentIntent | void>
// This method can charge an off_session saved payment id, and returns the result in form of a SimplePaymentIntent object
```
### Types
This module is written 100% in TypeScript, you can find the types in the src folder on the GitHub repository

## Roadmap

This module is a work in progress.

  First major milestome will be to wrap everything in structured classes, e.g :

```ts
class Customer{
  public id: string
  public name: string
  public created: Date
  public ...
  ...
  public paymentCards: PaymentCard[] // inherits from PaymentMethod etc..
  public paymentIntents: PaymentIntent[]

  constructor(id: string, options: tbd){
    // fetch the customer, its payment methods and intents etc...
  }

  // Static methods to create or retreive a Customer?

  // methods to charge the customer, retreive information ...
}
```
  Following work will focus on supporting more scenarios :
  - Subscriptions
  - Card holds and captures
  - Support for SEPA transferts
  - Support for Apple Pay transactions (nothing much to do backend)

Let's keep it simple though, I don't plan on supporting everything Stripe does
## Collaboration

If you want to collaborate to the project, you can fork it, create a wip/nameofyourfeature branch and pull request on the develop branch

[api-keys]: https://dashboard.stripe.com/account/apikeys