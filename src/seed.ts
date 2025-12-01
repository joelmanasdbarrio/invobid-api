import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed/seed.module';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(SeedModule);
  const seedService = app.get(SeedService);
  const clearOnly = process.argv.includes('--clear-only');

  if (clearOnly) {
    await seedService.clearDatabase();
    console.log('\u2705 Database cleared successfully!');
  } else {
    await seedService.run();
  }

  await app.close();
}

void bootstrap();
