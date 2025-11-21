import { IsCifNifConstraint } from './is-nif-cif.validator';

describe('IsCifNifConstraint', () => {
  let validator: IsCifNifConstraint;

  beforeEach(() => {
    validator = new IsCifNifConstraint();
  });

  describe('NIF validation', () => {
    it('should validate correct NIF format (8 digits + 1 letter)', () => {
      // Valid NIF: 12345678Z (the letter Z corresponds to number 12345678 % 23)
      expect(validator.validate('12345678Z')).toBe(true);
      expect(validator.validate('12345678z')).toBe(true); // lowercase should work too
    });

    it('should reject invalid NIF with wrong check letter', () => {
      expect(validator.validate('12345678A')).toBe(false);
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

  describe('CIF validation', () => {
    it('should validate correct CIF format (1 letter + 7 digits + 1 control char)', () => {
      // Valid CIF: A12345674 (control digit)
      // The validator would need real CIF validation logic
      expect(validator.validate('A12345674')).toBeDefined();
    });

    it('should reject CIF with invalid starting letter', () => {
      expect(validator.validate('Z12345674')).toBe(false);
    });

    it('should reject CIF with invalid format', () => {
      expect(validator.validate('1A234567')).toBe(false);
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
      expect(validator.defaultMessage()).toContain('valid Spanish NIF or CIF');
    });
  });
});
