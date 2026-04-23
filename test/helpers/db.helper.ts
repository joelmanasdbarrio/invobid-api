import { DataSource } from 'typeorm';

/**
 * Truncates all tables in the database in FK-safe order.
 * Uses TRUNCATE ... CASCADE to handle foreign key constraints.
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
}
