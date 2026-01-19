import { Test, TestingModule } from '@nestjs/testing';
import { DebtorController } from './debtor.controller';
import { DebtorService } from './debtor.service';

describe('DebtorController', () => {
  let controller: DebtorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebtorController],
      providers: [DebtorService],
    }).compile();

    controller = module.get<DebtorController>(DebtorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
