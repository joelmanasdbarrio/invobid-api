import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];

@Injectable()
export class FileTypePipe implements PipeTransform {
  transform(value: Express.Multer.File) {
    if (value) {
      const fileExtension = value.originalname.split('.').pop()?.toLowerCase();

      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`,
        );
      }
    }

    return value;
  }
}

@Injectable()
export class FilesTypePipe implements PipeTransform {
  transform(value: { [fieldname: string]: Express.Multer.File[] }) {
    if (value) {
      for (const files of Object.values(value)) {
        for (const file of files) {
          const fileExtension = file.originalname
            .split('.')
            .pop()
            ?.toLowerCase();
          if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            throw new BadRequestException(
              `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`,
            );
          }
        }
      }
    }
    return value;
  }
}
