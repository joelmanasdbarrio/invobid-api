import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Spanish NIF/NIE/CIF Validator
 * Based on official Spanish regulations:
 * - https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/dni/calculo-del-digito-de-control-del-nif-nie/
 * - Real Decreto 255/2025, de 1 de abril
 *
 * - NIF (Número de Identidad Fiscal): Personal tax identification for Spanish nationals
 *   Format: 8 digits + 1 control letter (e.g., 12345678Z)
 * - NIE (Número de Identidad de Extranjero): Foreigner's identification number
 *   Format: 1 letter (X, Y, Z) + 7 digits + 1 control letter (e.g., X1234567L)
 * - CIF (Código de Identificación Fiscal): Company/entity tax identification
 *   Format: 1 letter + 7 digits + 1 control character (digit or letter) (e.g., A12345674)
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

    // Check if it's a valid NIE (X, Y, Z + 7 digits + 1 letter)
    if (/^[XYZ]\d{7}[A-Z]$/.test(normalized)) {
      return this.isValidNie(normalized);
    }

    // Check if it's a valid CIF (1 letter + 7 digits + 1 control character)
    if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(normalized)) {
      return this.isValidCif(normalized);
    }

    return false;
  }

  /**
   * Validates NIF (Número de Identidad Fiscal) for Spanish nationals
   * Algorithm: number % 23 gives an index into the control letter table
   */
  private isValidNif(nif: string): boolean {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const number = parseInt(nif.substring(0, 8), 10);
    const expectedLetter = letters[number % 23];
    return nif[8] === expectedLetter;
  }

  /**
   * Validates NIE (Número de Identidad de Extranjero) for foreign residents
   * Algorithm: Replace X->0, Y->1, Z->2, then apply same algorithm as NIF
   */
  private isValidNie(nie: string): boolean {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';

    // Replace first letter with corresponding number
    let numberStr = nie.substring(1, 8);
    if (nie[0] === 'X') {
      numberStr = '0' + numberStr;
    } else if (nie[0] === 'Y') {
      numberStr = '1' + numberStr;
    } else if (nie[0] === 'Z') {
      numberStr = '2' + numberStr;
    }

    const number = parseInt(numberStr, 10);
    const expectedLetter = letters[number % 23];
    return nie[8] === expectedLetter;
  }

  private isValidCif(cif: string): boolean {
    const validFirstLetters = 'ABCDEFGHJNPQRSUVW';
    const letter = cif[0];
    const numbers = cif.substring(1, 8);
    const controlChar = cif[8];

    // Validate first letter
    if (!validFirstLetters.includes(letter)) {
      return false;
    }

    // Calculate control digit using CIF algorithm
    let sum = 0;

    // Process each digit
    for (let i = 0; i < numbers.length; i++) {
      const digit = parseInt(numbers[i], 10);

      if (i % 2 === 0) {
        // Even positions (0, 2, 4, 6): multiply by 2 and sum digits
        const doubled = digit * 2;
        sum += Math.floor(doubled / 10) + (doubled % 10);
      } else {
        // Odd positions (1, 3, 5): just add the digit
        sum += digit;
      }
    }

    // Calculate control digit
    const unitDigit = sum % 10;
    const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;

    // Control character can be a digit or its corresponding letter
    const controlLetter = 'JABCDEFGHI'[controlDigit];

    // Some CIF types use only numbers, others use only letters
    // We accept both for flexibility
    return (
      controlChar === controlDigit.toString() || controlChar === controlLetter
    );
  }

  defaultMessage(): string {
    return '$property must be a valid Spanish NIF, NIE, or CIF';
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
