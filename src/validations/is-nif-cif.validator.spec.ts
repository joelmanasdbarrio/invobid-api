import { IsCifNifConstraint } from './is-nif-cif.validator';

describe('IsCifNifConstraint', () => {
  let validator: IsCifNifConstraint;

  beforeEach(() => {
    validator = new IsCifNifConstraint();
  });

  describe('NIF validations', () => {
    it('should validate correct NIF format (8 digits + 1 letter)', () => {
      // Valid NIF examples based on official algorithm
      expect(validator.validate('12345678Z')).toBe(true);
      expect(validator.validate('12345678z')).toBe(true); // lowercase should work too
      expect(validator.validate('00000000T')).toBe(true); // 0 % 23 = 0 -> T
      expect(validator.validate('99999999R')).toBe(true); // 99999999 % 23 = 1 -> R
    });

    it('should reject invalid NIF with wrong check letter', () => {
      expect(validator.validate('12345678A')).toBe(false);
      expect(validator.validate('00000000Z')).toBe(false);
    });

    it('should reject NIF with less than 9 characters', () => {
      expect(validator.validate('1234567Z')).toBe(false);
    });

    it('should reject NIF with more than 9 characters', () => {
      expect(validator.validate('123456789Z')).toBe(false);
    });

    it('should reject NIF without letter', () => {
      expect(validator.validate('123456789')).toBe(false);
    });
  });

  describe('NIE validations', () => {
    it('should validate correct NIE format (X/Y/Z + 7 digits + 1 letter)', () => {
      // Valid NIE examples: Replace X->0, Y->1, Z->2, then apply NIF algorithm
      expect(validator.validate('X1234567L')).toBe(true); // 01234567 % 23 = 19 -> L
      expect(validator.validate('Y1234567X')).toBe(true); // 11234567 % 23 = 10 -> X
      expect(validator.validate('Z1234567R')).toBe(true); // 21234567 % 23 = 1 -> R
      expect(validator.validate('x1234567l')).toBe(true); // lowercase should work
      expect(validator.validate('X0000000T')).toBe(true); // 00000000 % 23 = 0 -> T
      expect(validator.validate('Y0000000Z')).toBe(true); // 10000000 % 23 = 14 -> Z
    });

    it('should reject invalid NIE with wrong check letter', () => {
      expect(validator.validate('X1234567A')).toBe(false);
      expect(validator.validate('Y1234567B')).toBe(false);
    });

    it('should reject NIE with invalid starting letter', () => {
      expect(validator.validate('A1234567L')).toBe(false);
      expect(validator.validate('W1234567L')).toBe(false);
    });

    it('should reject NIE with incorrect number of digits', () => {
      expect(validator.validate('X123456L')).toBe(false);
      expect(validator.validate('X12345678L')).toBe(false);
    });
  });

  describe('CIF validations', () => {
    it('should validate correct CIF format (1 letter + 7 digits + 1 control char)', () => {
      // Valid CIF: A12345674 (using official CIF algorithm)
      expect(validator.validate('A12345674')).toBe(true);
      expect(validator.validate('B12345674')).toBe(true); // SL companies
      expect(validator.validate('a12345674')).toBe(true); // lowercase
    });

    it('should accept CIF with letter as control character', () => {
      // Some CIFs can have a letter as control character
      expect(validator.validate('A1234567D')).toBe(true);
    });

    it('should reject CIF with invalid starting letter', () => {
      // Letters I, Ñ, O are not valid for CIF
      expect(validator.validate('I12345674')).toBe(false);
      expect(validator.validate('O12345674')).toBe(false);
      expect(validator.validate('Z12345674')).toBe(false);
    });

    it('should reject CIF with invalid format', () => {
      expect(validator.validate('1A2345674')).toBe(false);
      expect(validator.validate('A123456')).toBe(false);
    });

    it('should reject CIF with invalid control character', () => {
      expect(validator.validate('A12345670')).toBe(false); // wrong control
      expect(validator.validate('A1234567K')).toBe(false); // K not valid for control
    });
  });

  describe('Edge cases', () => {
    it('should reject null', () => {
      expect(validator.validate(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validator.validate(undefined)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validator.validate('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validator.validate(12345678)).toBe(false);
    });

    it('should handle whitespace by trimming', () => {
      expect(validator.validate('  12345678Z  ')).toBe(true);
    });
  });

  describe('Default error message', () => {
    it('should return appropriate error message', () => {
      expect(validator.defaultMessage()).toContain(
        'valid Spanish NIF, NIE, or CIF',
      );
    });
  });
});
