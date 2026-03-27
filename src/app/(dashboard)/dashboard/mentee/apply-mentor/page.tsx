import { MentorApplicationForm } from "@/presentation/components/mentor/MentorApplicationForm";

export default function ApplyMentorPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Trở thành Mentor</h1>
      <MentorApplicationForm />
    </div>
  );
}
