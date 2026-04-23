import { CreateAdminDto } from 'src/app/user/admin/dto/create-admin.dto';
import { CreateInvestorDto } from 'src/app/user/investor/dto/create-investor.dto';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';

let adminCounter = 0;
let investorCounter = 0;

export function makeAdminDto(
  overrides: Partial<CreateAdminDto> = {},
): CreateAdminDto {
  adminCounter++;
  return {
    email: `test-admin-${adminCounter}-${Date.now()}@invobid.com`,
    password: 'Admin123!',
    passwordRepeat: 'Admin123!',
    name: `Test Admin ${adminCounter}`,
    ...overrides,
  } as CreateAdminDto;
}

export function makeCompanyInvestorDto(
  overrides: Partial<CreateInvestorDto> = {},
): CreateInvestorDto {
  investorCounter++;
  const suffix = `${investorCounter}-${Date.now()}`;
  return {
    investorType: InvestorType.COMPANY,
    name: `Test Company ${suffix}`,
    companyName: `Test Company SL ${suffix}`,
    email: `test-investor-${suffix}@invobid.com`,
    phoneNumber: `+346${String(investorCounter).padStart(8, '0')}`,
    taxId: generateCif(),
    password: 'Investor123!',
    passwordRepeat: 'Investor123!',
    ...overrides,
  } as CreateInvestorDto;
}

export function makeIndividualInvestorDto(
  overrides: Partial<CreateInvestorDto> = {},
): CreateInvestorDto {
  investorCounter++;
  const suffix = `${investorCounter}-${Date.now()}`;
  return {
    investorType: InvestorType.INDIVIDUAL,
    name: `Test Individual ${suffix}`,
    companyName: `Test Individual ${suffix}`, // auto-filled as name for individuals
    email: `test-individual-${suffix}@invobid.com`,
    phoneNumber: `+347${String(investorCounter).padStart(8, '0')}`,
    taxId: generateNif(),
    password: 'Investor123!',
    passwordRepeat: 'Investor123!',
    ...overrides,
  } as CreateInvestorDto;
}

// Generate valid Spanish CIF (e.g., B12345674)
function generateCif(): string {
  const letters = 'ABCDEFGHJNPQRSUVW';
  const letter = letters[investorCounter % letters.length];
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

// Generate valid Spanish NIF (e.g., 12345678Z)
function generateNif(): string {
  const num = Math.floor(10000000 + Math.random() * 89999999);
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letter = letters[num % 23];
  return `${num}${letter}`;
}

export function resetFixtureCounters(): void {
  adminCounter = 0;
  investorCounter = 0;
}
