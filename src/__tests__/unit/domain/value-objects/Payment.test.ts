import {
  PaymentType,
  PaymentStatus,
  SessionStatus,
  generateShortCode,
  buildTransactionContent,
  parseTransactionContent,
  buildVietQRUrl,
  ACTIVATION_AMOUNT,
  MB_BANK_BIN,
} from "@/domain/value-objects/Payment";

// ─── generateShortCode ────────────────────────────────────────────────────────

describe("generateShortCode()", () => {
  it("generates a code of default length 6", () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
  });

  it("generates a code of specified length", () => {
    expect(generateShortCode(4)).toHaveLength(4);
    expect(generateShortCode(8)).toHaveLength(8);
  });

  it("contains only uppercase letters (no digits)", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateShortCode(10);
      expect(code).toMatch(/^[A-Z]+$/);
    }
  });

  it("does not contain I or O (ambiguous chars)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode(10);
      expect(code).not.toMatch(/[IO]/);
    }
  });

  it("produces unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateShortCode(6)));
    // With 22^6 = ~1B combinations, 100 codes should be unique
    expect(codes.size).toBe(100);
  });
});

// ─── buildTransactionContent ──────────────────────────────────────────────────

describe("buildTransactionContent()", () => {
  it("builds ACTIVATION content correctly", () => {
    const content = buildTransactionContent(PaymentType.ACTIVATION, "ABCDEF");
    expect(content).toBe("HOCTUTHIEN KICHHOAT ABCDEF");
  });

  it("builds SESSION_FEE content correctly", () => {
    const content = buildTransactionContent(PaymentType.SESSION_FEE, "XYZABC");
    expect(content).toBe("HOCTUTHIEN HOCPHI XYZABC");
  });

  it("contains no consecutive digit sequences (TN App masking safe)", () => {
    const content = buildTransactionContent(PaymentType.ACTIVATION, "ABCDEF");
    // Should not have 3 consecutive digits anywhere
    expect(content).not.toMatch(/\d{3}/);
  });

  it("is uppercase only", () => {
    const content = buildTransactionContent(PaymentType.SESSION_FEE, "QRSTUVWX");
    expect(content).toBe(content.toUpperCase());
  });
});

// ─── parseTransactionContent ──────────────────────────────────────────────────

describe("parseTransactionContent()", () => {
  describe("ACTIVATION type", () => {
    it("parses a valid ACTIVATION narrative", () => {
      const result = parseTransactionContent(
        "NGUYEN VAN A chuyen tien HOCTUTHIEN KICHHOAT ABCDEF"
      );
      expect(result.isHocTuThien).toBe(true);
      expect(result.type).toBe(PaymentType.ACTIVATION);
      expect(result.shortCode).toBe("ABCDEF");
    });

    it("is case-insensitive", () => {
      const result = parseTransactionContent("hoctuthien kichhoat abcdef");
      expect(result.isHocTuThien).toBe(true);
      expect(result.shortCode).toBe("ABCDEF");
    });
  });

  describe("SESSION_FEE type", () => {
    it("parses a valid HOCPHI narrative", () => {
      const result = parseTransactionContent("HOCTUTHIEN HOCPHI XYZABC thanh toan hoc phi");
      expect(result.isHocTuThien).toBe(true);
      expect(result.type).toBe(PaymentType.SESSION_FEE);
      expect(result.shortCode).toBe("XYZABC");
    });
  });

  describe("non-HocTuThien narrative", () => {
    it("returns isHocTuThien false for unrelated transfer", () => {
      const result = parseTransactionContent("TRAN VAN A chuyen tien thang 12");
      expect(result.isHocTuThien).toBe(false);
      expect(result.type).toBeNull();
      expect(result.shortCode).toBeNull();
    });

    it("handles empty string", () => {
      const result = parseTransactionContent("");
      expect(result.isHocTuThien).toBe(false);
    });
  });

  describe("round-trip consistency", () => {
    it("build → parse round-trip works for ACTIVATION", () => {
      const code = generateShortCode(6);
      const content = buildTransactionContent(PaymentType.ACTIVATION, code);
      const parsed = parseTransactionContent(content);
      expect(parsed.shortCode).toBe(code);
      expect(parsed.type).toBe(PaymentType.ACTIVATION);
    });

    it("build → parse round-trip works for SESSION_FEE", () => {
      const code = generateShortCode(6);
      const content = buildTransactionContent(PaymentType.SESSION_FEE, code);
      const parsed = parseTransactionContent(content);
      expect(parsed.shortCode).toBe(code);
      expect(parsed.type).toBe(PaymentType.SESSION_FEE);
    });
  });
});

// ─── buildVietQRUrl ───────────────────────────────────────────────────────────

describe("buildVietQRUrl()", () => {
  const baseParams = {
    accountNo: "2000",
    accountName: "QUY THIEN NGUYEN",
    amount: 10000,
    addInfo: "HOCTUTHIEN KICHHOAT ABCDEF",
  };

  it("builds a URL containing the MB Bank BIN", () => {
    const url = buildVietQRUrl(baseParams);
    expect(url).toContain(MB_BANK_BIN);
  });

  it("builds a URL containing the account number", () => {
    const url = buildVietQRUrl(baseParams);
    expect(url).toContain("2000");
  });

  it("builds a URL containing the amount", () => {
    const url = buildVietQRUrl(baseParams);
    expect(url).toContain("10000");
  });

  it("includes addInfo (transaction content) as query param", () => {
    const url = buildVietQRUrl(baseParams);
    expect(url).toContain("addInfo=");
    expect(decodeURIComponent(url)).toContain("HOCTUTHIEN KICHHOAT ABCDEF");
  });

  it("uses compact2 template by default", () => {
    const url = buildVietQRUrl(baseParams);
    expect(url).toContain("compact2");
  });

  it("allows custom template", () => {
    const url = buildVietQRUrl({ ...baseParams, template: "qr_only" });
    expect(url).toContain("qr_only");
  });

  it("returns a valid URL string", () => {
    const url = buildVietQRUrl(baseParams);
    expect(() => new URL(url)).not.toThrow();
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("Payment constants", () => {
  it("ACTIVATION_AMOUNT is 10,000 VND", () => {
    expect(ACTIVATION_AMOUNT).toBe(10000);
  });

  it("MB_BANK_BIN is 970422", () => {
    expect(MB_BANK_BIN).toBe("970422");
  });
});

// ─── Enums completeness ───────────────────────────────────────────────────────

describe("PaymentType enum", () => {
  it("has ACTIVATION and SESSION_FEE", () => {
    expect(PaymentType.ACTIVATION).toBe("ACTIVATION");
    expect(PaymentType.SESSION_FEE).toBe("SESSION_FEE");
  });
});

describe("PaymentStatus enum", () => {
  it("has all expected statuses", () => {
    expect(PaymentStatus.PENDING).toBe("PENDING");
    expect(PaymentStatus.VERIFIED).toBe("VERIFIED");
    expect(PaymentStatus.FAILED).toBe("FAILED");
    expect(PaymentStatus.REFUNDED).toBe("REFUNDED");
  });
});

describe("SessionStatus enum", () => {
  it("has all workflow statuses", () => {
    const statuses = Object.values(SessionStatus);
    expect(statuses).toContain("PENDING");
    expect(statuses).toContain("CONFIRMED");
    expect(statuses).toContain("COMPLETED");
    expect(statuses).toContain("CANCELLED");
    expect(statuses).toContain("PAYMENT_PENDING");
  });
});
