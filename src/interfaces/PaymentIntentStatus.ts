enum PaymentIntentStatus{
    REQUIRES_PAYMENT_METHOD,
    REQUIRES_CONFIRMATION,
    REQUIRES_ACTION,
    PROCESSING,
    REQUIRES_CAPTURE,
    CANCELLED,
    SUCCEEDED,
    UNKNOWN
}

export default PaymentIntentStatus