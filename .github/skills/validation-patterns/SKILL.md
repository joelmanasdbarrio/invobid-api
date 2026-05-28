---
name: validation-patterns
description: "Use when: Adding DTO validation, creating custom validators, or applying class-validator decorators in invobid-api. Covers standard DTO patterns, custom ValidatorConstraint, and the Spanish tax ID validator as a reference implementation."
argument-hint: "What to validate (e.g. 'Spanish phone number' or 'auction date range')"
---

# Validation Patterns for invobid-api

## Standard DTO Validation

DTOs use `class-validator` decorators. The global `ValidationPipe` in [src/main.ts](../../../src/main.ts) automatically validates all request bodies.

### Common Decorators

```typescript
import {
  IsEmail, IsString, IsNumber, IsOptional, IsIn, IsUUID,
  IsPhoneNumber, IsDateString, Min, Max, IsBoolean,
} from 'class-validator';

export class ExampleDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(Object.values(SomeEnum))
  status: SomeEnum;

  @IsOptional()
  @IsString()
  description?: string;

  @IsPhoneNumber('ES')      // Spanish phone validation
  phoneNumber: string;

  @IsDateString()           // ISO 8601 date string
  dueDate: string;
}
```

### Update DTOs — Extend with PartialType

```typescript
import { PartialType } from '@nestjs/mapped-types';

export class UpdateDebtorDto extends PartialType(CreateDebtorDto) {
  // All CreateDebtorDto fields become @IsOptional()
  // Add new fields specific to updates:
  @IsOptional()
  @IsIn(Object.values(DebtorStatus))
  status?: DebtorStatus;
}
```

### Query/Filter DTOs — Extend PaginationDto

```typescript
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetDebtorsDto extends PaginationDto {
  // Inherits: @IsOptional() page?: number, limit?: number

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  includeDeleted?: number;
}
```

## Custom Validator Pattern

Reference implementation: [src/validations/is-nif-cif.validator.ts](../../../src/validations/is-nif-cif.validator.ts)

### Step 1 — Implement the Constraint

```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'myValidator', async: false })
export class MyConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    // Your validation logic here
    return /^[A-Z]{2}\d{6}$/.test(value);
  }

  defaultMessage(): string {
    return 'Value ($value) must match the required format';
  }
}
```

### Step 2 — Create the Decorator Factory

```typescript
export function MyValidator(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: MyConstraint,
    });
  };
}
```

### Step 3 — Use in DTOs

```typescript
import { MyValidator } from 'src/validations/my.validator';

export class CreateThingDto {
  @MyValidator()
  code: string;
}
```

> No module registration needed — `class-validator` discovers constraints automatically. 

### Async Validators (DB Lookups)

```typescript
@ValidatorConstraint({ name: 'isUniqueEmail', async: true })
export class IsUniqueEmailConstraint implements ValidatorConstraintInterface {
  constructor(private readonly userRepository: Repository<User>) {}

  async validate(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    return !user;
  }
}
```

For async validators, register in the module's `providers` array so NestJS can inject dependencies.

## Pipe Validation (File Uploads)

`FileTypePipe` validates single file uploads. See [src/pipes/file-type.pipe.ts](../../../src/pipes/file-type.pipe.ts).

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile(FileTypePipe) file: Express.Multer.File) {
  // file is guaranteed to be pdf, jpeg, jpg, or png
}
```

For multiple files, use `FilesTypePipe` with `FileFieldsInterceptor`.

## ValidationPipe Behavior

The global pipe (set in `main.ts` and `createTestApp`) uses:
- `whitelist: true` — strips properties not in DTO
- `forbidNonWhitelisted: false` — warns but does **not** reject extra fields
- `transform: true` — transforms request data to DTO types
- `enableImplicitConversion: true` — auto-converts query string numbers/booleans

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting `@IsOptional()` on optional fields | Without it, the field is required even if typed `?: string` |
| Using `@IsOptional()` without a type validator | Add the type validator too (e.g. `@IsOptional() @IsString()`) |
| Enum validation with hardcoded values | Use `@IsIn(Object.values(MyEnum))` to stay in sync |
| Async validator not in providers | Register async constraints in the module's `providers` |
| Custom decorator missing `registerDecorator` call | Both constraint class AND decorator factory are needed |
