import { ThienNguyenAppClient } from "@/infrastructure/external/ThienNguyenAppClient";

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockApiResponse(body: object, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

const SAMPLE_TX_RESPONSE = {
  status: 200,
  data: {
    transactions: [
      {
        id: "1994013351562227712",
        refId: "FT25331902803856",
        transactionTime: "2025-11-27T18:59:00",
        type: "CREDIT",
        transactionAmount: 10000,
        otherAccountDisplayName: "NGUYEN VAN A",
        otherAccountName: "NGUYEN VAN A",
        narrative: "HOCTUTHIEN KICHHOAT ABCDEF chuyen tien",
        incognito: false,
      },
      {
        id: "1994013351562227713",
        refId: "FT25331902803857",
        transactionTime: "2025-11-27T19:00:00",
        type: "CREDIT",
        transactionAmount: 200000,
        otherAccountDisplayName: "TRAN THI B",
        otherAccountName: "TRAN THI B",
        narrative: "HOCTUTHIEN HOCPHI XYZABC hoc phi",
        incognito: false,
      },
    ],
    count: 2,
    pageNumber: 1,
    accountNumber: "2000",
    accountName: "QUY THIEN NGUYEN",
    hasNextPage: false,
    totalCredit: 210000,
    totalDebit: 0,
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ThienNguyenAppClient", () => {
  let client: ThienNguyenAppClient;

  beforeEach(() => {
    client = new ThienNguyenAppClient();
    jest.clearAllMocks();
  });

  // ─── getTransactions ──────────────────────────────────────────────────────

  describe("getTransactions()", () => {
    it("calls the correct TN App API URL", async () => {
      mockApiResponse(SAMPLE_TX_RESPONSE);

      const from = new Date("2025-11-01T00:00:00Z");
      const to = new Date("2025-11-30T00:00:00Z");
      await client.getTransactions("2000", from, to);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("apiv2.thiennguyen.app/api/v2/bank-account-transaction/2000"),
        expect.any(Object)
      );
    });

    it("includes date params in URL", async () => {
      mockApiResponse(SAMPLE_TX_RESPONSE);

      const from = new Date("2025-11-01T00:00:00Z");
      const to = new Date("2025-11-30T00:00:00Z");
      await client.getTransactions("2000", from, to);

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("fromDate=");
      expect(calledUrl).toContain("toDate=");
    });

    it("returns null on HTTP error", async () => {
      mockApiResponse({}, 500);
      const result = await client.getTransactions("2000", new Date(), new Date());
      expect(result).toBeNull();
    });

    it("returns null on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await client.getTransactions("2000", new Date(), new Date());
      expect(result).toBeNull();
    });
  });

  // ─── findTransactionByCode ────────────────────────────────────────────────

  describe("findTransactionByCode()", () => {
    it("finds a matching ACTIVATION transaction by shortCode", async () => {
      mockApiResponse(SAMPLE_TX_RESPONSE);

      const from = new Date("2025-11-27T11:00:00Z"); // before the transaction
      const result = await client.findTransactionByCode("2000", "ABCDEF", from, 10000);

      expect(result.found).toBe(true);
      expect(result.transaction).not.toBeNull();
      expect(result.transaction!.refId).toBe("FT25331902803856");
    });

    it("finds a SESSION_FEE transaction by shortCode", async () => {
      mockApiResponse(SAMPLE_TX_RESPONSE);

      const from = new Date("2025-11-27T10:00:00Z");
      const result = await client.findTransactionByCode("2000", "XYZABC", from, 200000);

      expect(result.found).toBe(true);
      expect(result.transaction!.transactionAmount).toBe(200000);
    });

    it("returns found=false when shortCode is not in any transaction", async () => {
      mockApiResponse(SAMPLE_TX_RESPONSE);

      const from = new Date("2025-11-27T10:00:00Z");
      const result = await client.findTransactionByCode("2000", "ZZZZZZ", from, 10000);

      expect(result.found).toBe(false);
      expect(result.transaction).toBeNull();
    });

    it("returns found=false when amount is less than expected", async () => {
      mockApiResponse(SAMPLE_TX_RESPONSE);

      const from = new Date("2025-11-27T10:00:00Z");
      // ABCDEF transaction is 10000, require 20000
      const result = await client.findTransactionByCode("2000", "ABCDEF", from, 20000);

      expect(result.found).toBe(false);
    });

    it("returns error when API fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const result = await client.findTransactionByCode(
        "2000",
        "ABCDEF",
        new Date(),
        10000
      );

      expect(result.found).toBe(false);
      expect(result.error).toContain("Timeout");
    });

    it("handles incognito (anonymous) transactions", async () => {
      const responseWithIncognito = {
        ...SAMPLE_TX_RESPONSE,
        data: {
          ...SAMPLE_TX_RESPONSE.data,
          transactions: [
            {
              id: "999",
              refId: "FT999",
              transactionTime: "2025-11-27T12:00:00",
              type: "CREDIT",
              transactionAmount: 10000,
              otherAccountDisplayName: "NGƯỜI ỦNG HỘ ẨN DANH",
              otherAccountName: "NGƯỜI ỦNG HỘ ẨN DANH",
              narrative: "HOCTUTHIEN KICHHOAT ANONYM chuyen tien",
              incognito: true,
            },
          ],
        },
      };

      mockApiResponse(responseWithIncognito);

      const result = await client.findTransactionByCode(
        "2000",
        "ANONYM",
        new Date("2025-11-27T10:00:00Z"),
        10000
      );

      expect(result.found).toBe(true);
    });
  });
});
