export interface IStorageService {
  uploadFile(file: Buffer, fileName: string): Promise<string>;
  getFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
}
