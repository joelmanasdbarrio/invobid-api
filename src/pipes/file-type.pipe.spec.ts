import { BadRequestException } from '@nestjs/common';
import { FileTypePipe, FilesTypePipe } from './file-type.pipe';

const makeFile = (originalname: string): Express.Multer.File =>
  ({ originalname }) as Express.Multer.File;

describe('FileTypePipe', () => {
  let pipe: FileTypePipe;

  beforeEach(() => {
    pipe = new FileTypePipe();
  });

  it('should return value unchanged when no file is provided', () => {
    const result = pipe.transform(undefined as unknown as Express.Multer.File);
    expect(result).toBeUndefined();
  });

  it('should return the file when extension is allowed (pdf)', () => {
    const file = makeFile('document.pdf');
    expect(pipe.transform(file)).toBe(file);
  });

  it('should return the file when extension is allowed (jpg)', () => {
    const file = makeFile('photo.jpg');
    expect(pipe.transform(file)).toBe(file);
  });

  it('should return the file when extension is allowed (png)', () => {
    const file = makeFile('image.png');
    expect(pipe.transform(file)).toBe(file);
  });

  it('should throw BadRequestException for a disallowed extension', () => {
    expect(() => pipe.transform(makeFile('virus.exe'))).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when filename has no extension', () => {
    expect(() => pipe.transform(makeFile('nodotfile'))).toThrow(
      BadRequestException,
    );
  });
});

describe('FilesTypePipe', () => {
  let pipe: FilesTypePipe;

  beforeEach(() => {
    pipe = new FilesTypePipe();
  });

  it('should return value unchanged when no files object is provided', () => {
    const result = pipe.transform(
      undefined as unknown as { [fieldname: string]: Express.Multer.File[] },
    );
    expect(result).toBeUndefined();
  });

  it('should return the files object when all files have allowed extensions', () => {
    const files = {
      modelo111: [makeFile('modelo111.pdf')],
      modelo303: [makeFile('modelo303.pdf')],
    };
    expect(pipe.transform(files)).toBe(files);
  });

  it('should throw BadRequestException when any file has a disallowed extension', () => {
    const files = {
      modelo111: [makeFile('modelo111.pdf')],
      modelo303: [makeFile('modelo303.exe')],
    };
    expect(() => pipe.transform(files)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when any file has no extension', () => {
    const files = {
      field: [makeFile('nodotfile')],
    };
    expect(() => pipe.transform(files)).toThrow(BadRequestException);
  });
});
