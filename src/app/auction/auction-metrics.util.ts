export function computeDiscount(invoiceAmount: number, price: number): number {
  return ((invoiceAmount - price) / invoiceAmount) * 100;
}

export function computeProfitability(
  invoiceAmount: number,
  buyerPercentage: number,
  price: number,
): number {
  return ((invoiceAmount * (1 - buyerPercentage / 100) - price) / price) * 100;
}
