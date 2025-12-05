import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Spanish NIF/CIF Validator
 * - NIF (Número de Identidad Fiscal): Personal tax identification
 *   Format: 8 digits + 1 letter (e.g., 12345678Z)
 * - CIF (Código de Identificación Fiscal): Investor tax identification
 *   Format: 1 letter + 7 digits + 1 character (digit or letter) (e.g., A12345678)
 */
@ValidatorConstraint({ name: 'isCifNif', async: false })
export class IsCifNifConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const normalized = value.toUpperCase().trim();

    // Check if it's a valid NIF (8 digits + 1 letter)
    if (/^\d{8}[A-Z]$/.test(normalized)) {
      return this.isValidNif(normalized);
    }

    // Check if it's a valid CIF (1 letter + 7 digits + 1 character)
    if (/^[A-J][0-9]{7}[0-9A-J]$/.test(normalized)) {
      return this.isValidCif(normalized);
    }

    return false;
  }

  private isValidNif(nif: string): boolean {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const number = parseInt(nif.substring(0, 8), 10);
    const expectedLetter = letters[number % 23];
    return nif[8] === expectedLetter;
  }

  private isValidCif(cif: string): boolean {
    const letterOrganizations: { [key: string]: number } = {
      A: 10,
      B: 11,
      C: 12,
      D: 13,
      E: 14,
      F: 15,
      G: 16,
      H: 17,
      J: 19,
      U: 20,
      V: 21,
      W: 22,
    };

    const letter = cif[0];
    const numbers = cif.substring(1, 8);
    const controlChar = cif[8];

    // Validate letter is recognized
    if (!letterOrganizations[letter]) {
      return false;
    }

    const fullNumber = letterOrganizations[letter] + parseInt(numbers, 10);
    const controlValue = 97 - (fullNumber % 97);

    // Control character can be either a digit or a letter depending on CIF type
    const validControls = [
      controlValue.toString(),
      String.fromCharCode(64 + controlValue),
    ];

    return validControls.includes(controlChar);
  }

  defaultMessage(): string {
    return 'The $property must be a valid Spanish NIF or CIF';
  }
}

export function IsCifNif(
  validationOptions?: ValidationOptions,
): (object: object, propertyName: string) => void {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCifNifConstraint,
    });
  };
}
