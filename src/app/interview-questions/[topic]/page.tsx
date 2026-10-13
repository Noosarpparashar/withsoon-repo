import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InterviewTopicQuestions from "@/components/ui/interview-question-bank/InterviewTopicQuestions";
import { BIG_DATA_INTERVIEW_ANSWERS, type InterviewAnswer } from "@/lib/interviewAnswers";
import { INTERVIEW_QUESTION_CATEGORIES } from "@/lib/interviewQuestionBank";
import { SPARK_INTERVIEW_ANSWERS } from "@/lib/sparkInterviewAnswers";

const BASE_URL = "https://withsoon.com/interview-questions";

export function generateStaticParams() {
  return INTERVIEW_QUESTION_CATEGORIES.map((category) => ({ topic: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const category = INTERVIEW_QUESTION_CATEGORIES.find((item) => item.slug === topic);
  if (!category) return {};

  const title = `${category.title} Interview Questions | withsoon`;
  const description = `Practise ${category.title} interview questions and follow-up questions for data engineering interviews.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${category.slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${category.slug}`,
      siteName: "withsoon",
      type: "website",
    },
  };
}

export default async function InterviewTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const category = INTERVIEW_QUESTION_CATEGORIES.find((item) => item.slug === topic);
  if (!category) notFound();

  const answers: Record<string, InterviewAnswer> | undefined = category.slug === "big-data"
    ? BIG_DATA_INTERVIEW_ANSWERS
    : category.slug === "spark"
      ? SPARK_INTERVIEW_ANSWERS
      : undefined;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f4f4f4] text-[#171717]">
      <div className="w-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)] lg:gap-8">
          <InterviewTopicQuestions title={category.title} questions={category.questions} answers={answers} />
        </div>
      </div>
    </div>
  );
}
