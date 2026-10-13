import Link from "next/link";

type InterviewQuestionCategory = {
  slug: string;
  title: string;
};

export default function InterviewQuestionBank({
  categories,
}: {
  categories: InterviewQuestionCategory[];
}) {
  return (
    <section
      id="interview-question-bank"
      data-testid="interview-question-bank"
      className="scroll-mt-24 pb-12"
      aria-labelledby="interview-question-bank-heading"
    >
      <div className="overflow-hidden rounded-[28px] border border-[#cbd8e4] bg-white shadow-[0_24px_70px_rgba(72,91,108,.11)]">
        <div className="border-b border-[#d9e2ea] px-5 py-6 sm:px-8 sm:py-7">
          <h2 id="interview-question-bank-heading" className="text-2xl font-black tracking-[-.04em] text-[#17202b] sm:text-3xl">
            Interview Question Bank
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-7 lg:p-8">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/interview-questions/${category.slug}`}
              className="group flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border border-[#d4dee7] bg-[#f8fafc] px-4 py-3.5 text-[#263646] outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[#8da1b3] hover:bg-white hover:shadow-[0_8px_20px_rgba(72,91,108,.10)] focus-visible:ring-2 focus-visible:ring-[#526f88] focus-visible:ring-offset-2 sm:px-5"
            >
              <span className="text-sm font-extrabold leading-5">{category.title}</span>
              <span className="text-lg text-[#718293] transition-transform group-hover:translate-x-1 group-hover:text-[#17202b]" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
