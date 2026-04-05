// ─── Email Value Object ────────────────────────────────────────────────────────

export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): Email {
    const trimmed = value.trim().toLowerCase();
    if (!Email.isValid(trimmed)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    return new Email(trimmed);
  }

  static isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
