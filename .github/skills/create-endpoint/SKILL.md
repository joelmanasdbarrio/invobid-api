---
name: create-endpoint
description: "Use when: Adding a new REST API endpoint to invobid-api. Automates the NestJS pattern: DTO → service method → controller handler. Covers authentication, pagination, file uploads, and response formatting."
argument-hint: "Describe the endpoint (e.g. 'GET /invoices with pagination' or 'POST /documents with file upload')"
---

# Create a New API Endpoint

## Procedure

### 1. Create the DTO

In `src/app/{module}/dto/`:

**Create DTO** (`create-{entity}.dto.ts`):
```typescript
import { IsEmail, IsString } from 'class-validator';

export class CreateDebtorDto {
  @IsEmail()
  email: string;

  @IsString()
  companyName: string;
}
```

**Update DTO** (`update-{entity}.dto.ts`):
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateDebtorDto } from './create-debtor.dto';

export class UpdateDebtorDto extends PartialType(CreateDebtorDto) {
  @IsOptional()
  @IsIn(Object.values(SomeStatusEnum))
  status?: SomeStatusEnum;
}
```

**Query/List DTO** (`get-{entities}.dto.ts`):
```typescript
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetDebtorsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  companyName?: string;
}
```

> `PaginationDto` ([src/dto/pagination.dto.ts](../../../src/dto/pagination.dto.ts)) provides optional `page` and `limit` fields.

### 2. Add Controller Method

In `src/app/{module}/{module}.controller.ts`:

**Single item response**:
```typescript
@Post()
@Auth([InvestorType.COMPANY], [InvestorStatus.VERIFIED])
async create(
  @Body() createDebtorDto: CreateDebtorDto,
  @GetUser() investor: Investor,
) {
  const debtor = await this.debtorService.create(createDebtorDto, investor);
  return { status: 'success', data: debtor };
}
```

**Paginated list response**:
```typescript
@Get()
@Auth([], [InvestorStatus.VERIFIED])
async findAll(@Query() query: GetDebtorsDto, @GetUser() user: User) {
  const { data, total, page, limit } = await this.debtorService.findAll(
    { ...query, page: query.page || 1, limit: query.limit || 10 },
    user,
  );
  return {
    status: 'success',
    data,
    _metadata: { total, length: data.length, page, limit },
  };
}
```

**By ID**:
```typescript
@Get(':id')
@Auth([], [InvestorStatus.VERIFIED])
async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
  const debtor = await this.debtorService.findOne(id, user);
  return { status: 'success', data: debtor };
}
```

**Auth decorator rules**:
- `@Auth([UserType.ADMIN])` — admin only
- `@Auth([InvestorType.COMPANY], [InvestorStatus.VERIFIED])` — verified company investors only
- `@Auth([], [InvestorStatus.VERIFIED])` — any verified user
- `@Auth()` — any authenticated user (all roles/statuses)

### 3. Implement Service Method

In `src/app/{module}/{module}.service.ts`:

```typescript
@Injectable()
export class DebtorService {
  constructor(
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
  ) {}

  async create(dto: CreateDebtorDto, investor: Investor): Promise<Debtor> {
    return this.debtorRepository.save({ ...dto, investor });
  }

  async findAll(query: GetDebtorsDto, user: User) {
    const { page, limit, companyName } = query;
    const qb = this.debtorRepository.createQueryBuilder('debtor');

    if (companyName) qb.andWhere('debtor.companyName ILIKE :name', { name: `%${companyName}%` });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, user: User): Promise<Debtor> {
    const debtor = await this.debtorRepository.findOne({ where: { id } });
    if (!debtor) throw new NotFoundException(`Debtor ${id} not found`);
    return debtor;
  }
}
```

### 4. Register in Module

In `src/app/{module}/{module}.module.ts`:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Debtor])],
  controllers: [DebtorController],
  providers: [DebtorService],
  exports: [DebtorService],
})
export class DebtorModule {}
```

Then import in [src/app.module.ts](../../../src/app.module.ts) if it's a new module.

### 5. File Upload Variant

```typescript
// Controller
@Post('upload')
@Auth([InvestorType.COMPANY], [InvestorStatus.VERIFIED])
@UseInterceptors(FileInterceptor('file'))
async upload(
  @UploadedFile(FileTypePipe) file: Express.Multer.File,
  @GetUser() investor: Investor,
) {
  const doc = await this.documentService.create(file, investor);
  return { status: 'success', data: doc };
}
```

`FileTypePipe` allows: `pdf`, `jpeg`, `jpg`, `png`. See [src/pipes/file-type.pipe.ts](../../../src/pipes/file-type.pipe.ts).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `@Auth()` | Endpoint will be public — add decorator |
| `@Param('id')` without `ParseUUIDPipe` | Add `ParseUUIDPipe` for UUID validation |
| Not using `PartialType` for Update DTO | Inherit from `CreateDto` via `PartialType` |
| Querying soft-deleted records | Add `withDeleted: true` in `findOne` options when needed |
| Circular module dependency | Use `forwardRef(() => OtherModule)` in imports |
