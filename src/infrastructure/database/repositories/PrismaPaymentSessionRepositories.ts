// Barrel file — re-exports để integration tests và các file khác có thể import
// cả PrismaPaymentRepository và PrismaSessionRepository từ một path duy nhất.
export { PrismaPaymentRepository } from "./payment/PrismaPaymentRepository";
export { PrismaSessionRepository } from "./session/PrismaSessionRepository";
