export enum BucketType {
  DOCUMENTS = 'documents',
  PUBLIC = 'public',
}

export interface IStorageService {
  uploadFile(file: Express.Multer.File, fileName?: string): Promise<string>;
  getFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
}
