const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const accounts = await p.account.deleteMany({});
  console.log('Deleted accounts:', accounts.count);
  const sessions = await p.session.deleteMany({});
  console.log('Deleted sessions:', sessions.count);
  const users = await p.user.deleteMany({});
  console.log('Deleted users:', users.count);
  await p.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
