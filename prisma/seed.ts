import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const FIELDS = [
  { name: "Web Development", slug: "web-development", icon: "💻", description: "Frontend, Backend, Fullstack", sortOrder: 1 },
  { name: "Mobile Development", slug: "mobile-development", icon: "📱", description: "iOS, Android, React Native, Flutter", sortOrder: 2 },
  { name: "Data Science & AI", slug: "data-science-ai", icon: "🔬", description: "Machine Learning, Deep Learning, Python", sortOrder: 3 },
  { name: "UI/UX Design", slug: "ui-ux-design", icon: "🎨", description: "Figma, User Research, Prototyping", sortOrder: 4 },
  { name: "Product Management", slug: "product-management", icon: "🎯", description: "Product Strategy, Roadmap, Agile", sortOrder: 5 },
  { name: "Digital Marketing", slug: "digital-marketing", icon: "📈", description: "SEO, SEM, Social Media, Growth Hacking", sortOrder: 6 },
  { name: "DevOps & Cloud", slug: "devops-cloud", icon: "🏗️", description: "AWS, GCP, Docker, Kubernetes", sortOrder: 7 },
  { name: "Cybersecurity", slug: "cybersecurity", icon: "🔧", description: "Network Security, Penetration Testing", sortOrder: 8 },
  { name: "Business & Startup", slug: "business-startup", icon: "💡", description: "Business Model, Fundraising, Leadership", sortOrder: 9 },
  { name: "Finance & Investment", slug: "finance-investment", icon: "📊", description: "Stock, Crypto, Personal Finance", sortOrder: 10 },
  { name: "English", slug: "english", icon: "🌐", description: "IELTS, TOEIC, Business English", sortOrder: 11 },
  { name: "Soft Skills", slug: "soft-skills", icon: "🤝", description: "Communication, Leadership, Presentation", sortOrder: 12 },
];

const DEFAULT_SYSTEM_CONFIGS = [
  {
    key: "activation_amount",
    value: "10000",
    description: "Số tiền kích hoạt tài khoản (VNĐ). Mentee phải chuyển khoản thiện nguyện số tiền này để kích hoạt tài khoản.",
  },
  {
    key: "charity_account_verification_amount",
    value: "1000",
    description: "Số tiền probe transfer để xác thực tài khoản thiện nguyện (VNĐ). Admin chuyển 1,000đ để xác nhận sở hữu tài khoản.",
  },
  {
    key: "min_booking_advance_hours",
    value: "1",
    description: "Số giờ tối thiểu trước giờ bắt đầu buổi học mà Mentee được phép đặt lịch. Đặt lịch muộn hơn sẽ bị từ chối.",
  },
  {
    key: "late_cancel_threshold_minutes",
    value: "30",
    description: "Ngưỵ thời gian (phút) trước giờ bắt đầu buổi học. Nếu hủy trong khoảng thời gian này sẽ bị đánh dấu hủy muộn.",
  },
  {
    key: "payment_expiry_hours",
    value: "24",
    description: "Thời hạn thanh toán (giờ) kể từ khi tạo yêu cầu. Sau thời hạn này, yêu cầu thanh toán được xem là quá hạn.",
  },
  {
    key: "max_active_bookings",
    value: "3",
    description: "Số buổi học đang hoạt động tối đa mà mỗi Mentee được phép đặt đồng thời. Đặt lịch mới sẽ bị từ chối nếu vượt quá.",
  },
];

async function main() {
  console.log("🌱 Seeding...\n");

  // ─── SystemConfig defaults ────────────────────────────────────────────────
  // Các config này ảnh hưởng trực tiếp đến nghiệp vụ (activation, booking, payment, v.v.)
  // Nếu DB chưa có → tạo mới. Nếu đã có → giữ nguyên (không ghi đè giá trị Admin đã chỉnh).
  for (const config of DEFAULT_SYSTEM_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({ where: { key: config.key } });
    if (!existing) {
      await prisma.systemConfig.create({
        data: {
          id: `config_${config.key}`,
          key: config.key,
          value: config.value,
          description: config.description,
          updatedBy: "seed",
        },
      });
      console.log(`  ✅ SystemConfig: ${config.key} = ${config.value}`);
    } else {
      console.log(`  ⏭️  SystemConfig: ${config.key} (đã tồn tại, giữ nguyên)`);
    }
  }

  // ─── Default CharityAccount ────────────────────────────────────────────────
  // Bắt buộc phải có trước khi hệ thống hoạt động:
  // - Kích hoạt tài khoản Mentee cần tài khoản isDefault = true
  // - Không có → hệ thống throw lỗi rõ ràng, không silent fallback
  //
  // Tài khoản mặc định: Hội Chữ Thập Đỏ Việt Nam qua TN App (accountNo "2000")
  // Admin có thể thay đổi sau qua UI: Cài đặt → Tài khoản thiện nguyện
  const existingDefault = await prisma.charityAccount.findFirst({
    where: { isDefault: true, isDeleted: false },
  });
  if (!existingDefault) {
    await prisma.charityAccount.create({
      data: {
        id: "charity_default_seed",
        name: "Hội Chữ Thập Đỏ Việt Nam",
        accountNo: "2022",
        bankName: "MB Bank",
        campaignKeyword: "HOCTUTHIEN",
        description: "Tài khoản mặc định được tạo tự động khi khởi tạo hệ thống. Admin có thể thay đổi.",
        isActive: true,
        isDefault: true,
        usageCount: 0,
        createdBy: "seed",
        verificationStatus: "UNVERIFIED",
      },
    });
    console.log("✅ Default charity account: Hội Chữ Thập Đỏ VN (2022) — chưa xác thực, Admin cần xác thực qua UI");
  } else {
    console.log(`⏭️  Default charity account đã tồn tại: ${existingDefault.name} (${existingDefault.accountNo})`);
  }

  // ─── Teaching fields
  for (const f of FIELDS) {
    const ex = await prisma.teachingField.findUnique({ where: { slug: f.slug } });
    if (!ex) {
      await prisma.teachingField.create({ data: { id: `tf_${f.slug}`, ...f, isActive: true, isDeleted: false } });
      console.log(`  ✅ ${f.icon} ${f.name}`);
    }
  }

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const ea = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!ea) {
    const u = await prisma.user.create({ data: { id: `admin_seed`, email: adminEmail, name: "Admin", role: "ADMIN", status: "ACTIVE", bio: "Admin hệ thống", createdBy: "seed", updatedBy: "seed", version: 1 } });
    await prisma.menteeProfile.create({ data: { id: `mp_admin_seed`, userId: u.id, version: 1, createdBy: "seed", updatedBy: "seed" } });
    console.log(`\n✅ Admin: ${adminEmail}`);
  } else {
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN", status: "ACTIVE" } });
    console.log(`\n✅ Admin updated: ${adminEmail}`);
  }

  // Demo mentors
  const mentors = [
    { email: "mentor.web@demo.com", name: "Nguyễn Văn Anh", headline: "Senior Engineer tại Google · 8 năm KN", hourlyRate: 200000, tnAccountNo: "2000", fields: ["web-development", "devops-cloud"], slots: [{dayOfWeek:2,startTime:"19:00",endTime:"20:30"},{dayOfWeek:4,startTime:"19:00",endTime:"20:30"},{dayOfWeek:6,startTime:"09:00",endTime:"10:30"}] },
    { email: "mentor.ai@demo.com", name: "Trần Thị Mai", headline: "Data Scientist tại VinAI · PhD CS", hourlyRate: 150000, tnAccountNo: "1234", fields: ["data-science-ai"], slots: [{dayOfWeek:3,startTime:"20:00",endTime:"21:30"},{dayOfWeek:0,startTime:"10:00",endTime:"11:30"}] },
    { email: "mentor.pm@demo.com", name: "Lê Minh Tuấn", headline: "Product Manager tại Grab · 6 năm KN", hourlyRate: 0, tnAccountNo: "9999", fields: ["product-management","business-startup"], slots: [{dayOfWeek:1,startTime:"12:00",endTime:"13:00"},{dayOfWeek:3,startTime:"12:00",endTime:"13:00"},{dayOfWeek:5,startTime:"12:00",endTime:"13:00"}] },
    { email: "mentor.ux@demo.com", name: "Phạm Thu Hương", headline: "Senior UX Designer · 5 năm KN", hourlyRate: 100000, tnAccountNo: "5678", fields: ["ui-ux-design"], slots: [{dayOfWeek:2,startTime:"18:00",endTime:"19:30"},{dayOfWeek:5,startTime:"18:00",endTime:"19:30"}] },
    { email: "mentor.en@demo.com", name: "Nguyễn Thị Lan", headline: "IELTS 8.5 · English Coach", hourlyRate: 120000, tnAccountNo: "7890", fields: ["english","soft-skills"], slots: [{dayOfWeek:2,startTime:"07:00",endTime:"08:30"},{dayOfWeek:4,startTime:"07:00",endTime:"08:30"},{dayOfWeek:6,startTime:"07:00",endTime:"08:30"}] },
    { email: "mentor.devops@demo.com", name: "Võ Thanh Long", headline: "DevOps · AWS Pro Certified", hourlyRate: 180000, tnAccountNo: "3456", fields: ["devops-cloud","cybersecurity"], slots: [{dayOfWeek:1,startTime:"20:00",endTime:"21:30"},{dayOfWeek:4,startTime:"20:00",endTime:"21:30"}] },
  ];

  console.log("\n👨‍🏫 Creating demo mentors...");
  for (const m of mentors) {
    if (await prisma.user.findUnique({ where: { email: m.email } })) { console.log(`  ⏭️  ${m.name}`); continue; }
    const uid = `mentor_${m.email.split("@")[0]}`;
    const user = await prisma.user.create({ data: { id: uid, email: m.email, name: m.name, bio: m.headline, role: "MENTOR", status: "ACTIVE", createdBy: "seed", updatedBy: "seed", version: 1 } });
    const profile = await prisma.mentorProfile.create({ data: { id: `mp_${uid}`, userId: user.id, headline: m.headline, expertise: m.headline, experience: 5, hourlyRate: m.hourlyRate, isAvailable: true, rating: 4.8, ratingCount: 12, totalSessions: 24, tnAccountNo: m.tnAccountNo, tnAccountName: m.name.toUpperCase().replace(/[^A-Z\s]/g, "").trim(), createdBy: "seed", updatedBy: "seed", version: 1 } });
    for (const slug of m.fields) {
      const f = await prisma.teachingField.findUnique({ where: { slug } });
      if (f) await prisma.mentorTeachingField.create({ data: { id: `mtf_${uid}_${f.id}`, mentorProfileId: profile.id, teachingFieldId: f.id } });
    }
    for (let i = 0; i < m.slots.length; i++) {
      const s = m.slots[i];
      await prisma.availabilitySlot.create({ data: { id: `slot_${uid}_${i}`, mentorProfileId: profile.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isRecurring: true } });
    }
    await prisma.menteeProfile.create({ data: { id: `menteepr_${uid}`, userId: user.id, version: 1, createdBy: "seed", updatedBy: "seed" } });
    console.log(`  ✅ ${m.name}`);
  }

  // Demo active mentee
  const menteeEmail = process.env.DEMO_MENTEE_EMAIL ?? "mentee@demo.com";
  if (!await prisma.user.findUnique({ where: { email: menteeEmail } })) {
    const mentee = await prisma.user.create({ data: { id: "mentee_demo", email: menteeEmail, name: "Demo Mentee", role: "MENTEE", status: "ACTIVE", createdBy: "seed", updatedBy: "seed", version: 1 } });
    await prisma.menteeProfile.create({ data: { id: "menteepr_demo", userId: mentee.id, version: 1, createdBy: "seed", updatedBy: "seed" } });
    await prisma.payment.create({ data: { id: "pay_demo_activation", userId: mentee.id, type: "ACTIVATION", status: "VERIFIED", amount: 10000, transactionCode: "HOCTUTHIEN KICHHOAT DEMOACT", shortCode: "DEMOACT", tnAccountNo: "2000", verifiedAt: new Date(), verifiedBy: "seed", expiresAt: new Date(Date.now() + 86400000 * 365), version: 1 } });
    console.log(`\n✅ Demo Mentee (active): ${menteeEmail}`);
  }

  console.log("\n🎉 Seed done! Run: npm run dev\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
