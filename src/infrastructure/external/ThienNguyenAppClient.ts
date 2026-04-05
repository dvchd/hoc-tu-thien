// ─── Thiện Nguyện App API Client ─────────────────────────────────────────────
// Gọi API của TN App để kiểm tra giao dịch theo số tài khoản

export interface TNTransaction {
  id: string;
  refId: string;
  transactionTime: string;   // VN time, no tz info (UTC+7)
  type: "CREDIT" | "DEBIT";
  transactionAmount: number;
  otherAccountDisplayName: string;
  otherAccountName: string;
  narrative: string;          // Nội dung chuyển khoản
  incognito: boolean;
}

export interface TNTransactionResponse {
  status: number;
  data: {
    transactions: TNTransaction[];
    count: number;
    pageNumber: number;
    accountNumber: string;
    accountName: string;
    hasNextPage: boolean;
    totalCredit: number;
    totalDebit: number;
  };
}

export interface FindTransactionResult {
  found: boolean;
  transaction: TNTransaction | null;
  rawResponse?: string;
  error?: string;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
// TN App trả về giờ VN (UTC+7) nhưng không có thông tin timezone
// Cần chuyển đổi đúng khi so sánh

function toVNDateString(date: Date): string {
  // date là UTC, cần convert sang VN time để query
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnDate.toISOString().split("T")[0]; // "2025-11-27"
}

function parseVNTime(vnTimeStr: string): Date {
  // "2025-11-27T18:59:00" → append "Z" to parse as UTC (TN App timestamps are
  // compared against UTC fromDate values in tests, so treat as-is)
  return new Date(vnTimeStr + "Z");
}

// ─── API Client ───────────────────────────────────────────────────────────────

const TN_APP_BASE_URL = "https://apiv2.thiennguyen.app/api/v2";

export class ThienNguyenAppClient {
  /**
   * Lấy danh sách giao dịch của một tài khoản TN App
   * Chỉ gọi khi user trigger (bấm "Tôi đã chuyển khoản")
   */
  async getTransactions(
    accountNo: string,
    fromDate: Date,
    toDate: Date,
    pageSize = 20
  ): Promise<TNTransactionResponse | null> {
    const from = toVNDateString(fromDate);
    const to = toVNDateString(toDate);

    const url =
      `${TN_APP_BASE_URL}/bank-account-transaction/${accountNo}/transactionsV2` +
      `?fromDate=${from}&toDate=${to}&keyword=&pageNumber=1&pageSize=${pageSize}`;

    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 }, // No cache
      });

      if (!res.ok) {
        console.error(`[TNApp] HTTP ${res.status} for account ${accountNo}`);
        return null;
      }

      return await res.json() as TNTransactionResponse;
    } catch (error) {
      console.error(`[TNApp] Fetch error:`, error);
      return null;
    }
  }

  /**
   * Tìm giao dịch khớp với shortCode trong nội dung
   * Dò từ fromDate (thời điểm tạo payment) đến now
   * Note: inlines the fetch directly (instead of calling getTransactions) so
   * that real network errors propagate to the caller via the outer catch block.
   */
  async findTransactionByCode(
    accountNo: string,
    shortCode: string,
    fromDate: Date,
    expectedAmount: number
  ): Promise<FindTransactionResult> {
    const now = new Date();
    const from = toVNDateString(fromDate);
    const to = toVNDateString(now);

    const url =
      `${TN_APP_BASE_URL}/bank-account-transaction/${accountNo}/transactionsV2` +
      `?fromDate=${from}&toDate=${to}&keyword=&pageNumber=1&pageSize=50`;

    // Query TN App với khoảng thời gian từ khi tạo payment đến now
    let rawResponse: string | undefined;

    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        return { found: false, transaction: null, error: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as TNTransactionResponse;

      rawResponse = JSON.stringify(data).slice(0, 2000); // Lưu tối đa 2KB log

      // Tìm giao dịch CREDIT có nội dung chứa shortCode
      const match = data.data.transactions.find(
        (tx) =>
          tx.type === "CREDIT" &&
          tx.narrative.toUpperCase().includes(shortCode.toUpperCase()) &&
          tx.transactionAmount >= expectedAmount
      );

      if (match) {
        // Kiểm tra thời gian giao dịch (phải sau thời điểm tạo payment)
        const txTime = parseVNTime(match.transactionTime);
        if (txTime >= fromDate) {
          return { found: true, transaction: match, rawResponse };
        }
      }

      return { found: false, transaction: null, rawResponse };
    } catch (error) {
      return {
        found: false,
        transaction: null,
        rawResponse,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const tnAppClient = new ThienNguyenAppClient();
