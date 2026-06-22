import { CreateAuctionDto } from 'src/app/auction/dto/create-auction.dto';
import { CreateBidDto } from 'src/app/bid/dto/create-bid.dto';
import { CreateDebtorDto } from 'src/app/debtor/dto/create-debtor.dto';
import { CreateInvoiceDto } from 'src/app/invoice/dto/create-invoice.dto';

let debtorCounter = 0;
let invoiceCounter = 0;

export function makeDebtorDto(
  overrides: Partial<CreateDebtorDto> = {},
): CreateDebtorDto {
  debtorCounter++;
  const suffix = `${debtorCounter}-${Date.now()}`;
  return {
    email: `debtor-${suffix}@test.com`,
    phoneNumber: `+348${String(debtorCounter).padStart(8, '0')}`,
    companyName: `Debtor Company ${suffix}`,
    taxId: generateDebtorCif(),
    ...overrides,
  } as CreateDebtorDto;
}

export function makeInvoiceDto(
  debtorId: string,
  overrides: Partial<CreateInvoiceDto> = {},
): CreateInvoiceDto {
  invoiceCounter++;
  const issueDate = new Date();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  return {
    debtorId,
    amount: 5000 + invoiceCounter * 100,
    dueDate: futureDate.toISOString().split('T')[0],
    issueDate: issueDate.toISOString().split('T')[0],
    svc: `B12345678-F001-${String(invoiceCounter).padStart(8, '0')}-${formatDate(new Date())}-A9K3`,
    ...overrides,
  } as CreateInvoiceDto;
}

export function makeAuctionDto(
  invoiceSvc: string,
  overrides: Partial<CreateAuctionDto> = {},
): CreateAuctionDto {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 10); // 10 days from now
  return {
    svc: invoiceSvc,
    startingPrice: 4500,
    auctionDateEnd: endDate.toISOString(),
    ...overrides,
  } as CreateAuctionDto;
}

export function makeBidDto(auctionId: string, amount: number): CreateBidDto {
  return {
    auctionId,
    amount,
  } as CreateBidDto;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function generateDebtorCif(): string {
  const letters = 'ABCDEFGHJNPQRSUVW';
  const letter = letters[debtorCounter % letters.length];
  const digits = String(Date.now()).slice(-7);

  const evenSum = Number(digits[1]) + Number(digits[3]) + Number(digits[5]);

  let oddSum = 0;
  for (const i of [0, 2, 4, 6]) {
    const doubled = Number(digits[i]) * 2;
    oddSum += Math.floor(doubled / 10) + (doubled % 10);
  }

  const total = evenSum + oddSum;
  const control = (10 - (total % 10)) % 10;

  return `${letter}${digits}${control}`;
}

export function resetEntityCounters(): void {
  debtorCounter = 0;
  invoiceCounter = 0;
}
