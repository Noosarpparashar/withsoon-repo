import type { InterviewAnswer } from "@/lib/interviewAnswers";
import { INTERVIEW_QUESTION_CATEGORIES } from "@/lib/interviewQuestionBank";
import { SPARK_INTERVIEW_ANSWERS_1_TO_3 } from "@/lib/sparkInterviewAnswers1To3";
import { SPARK_INTERVIEW_ANSWERS_4_TO_14 } from "@/lib/sparkInterviewAnswers4To14";
import { SPARK_INTERVIEW_ANSWERS_15_TO_24 } from "@/lib/sparkInterviewAnswers15To24";
import { SPARK_INTERVIEW_ANSWERS_25_TO_34 } from "@/lib/sparkInterviewAnswers25To34";
import { SPARK_INTERVIEW_ANSWERS_35_TO_44 } from "@/lib/sparkInterviewAnswers35To44";
import { SPARK_INTERVIEW_ANSWERS_45_TO_54 } from "@/lib/sparkInterviewAnswers45To54";
import { SPARK_INTERVIEW_ANSWERS_55_TO_73 } from "@/lib/sparkInterviewAnswers55To73";

type AnswerModule = {
  name: string;
  answers: Record<string, InterviewAnswer>;
};

const ANSWER_MODULES: AnswerModule[] = [
  { name: "1To3", answers: SPARK_INTERVIEW_ANSWERS_1_TO_3 },
  { name: "4To14", answers: SPARK_INTERVIEW_ANSWERS_4_TO_14 },
  { name: "15To24", answers: SPARK_INTERVIEW_ANSWERS_15_TO_24 },
  { name: "25To34", answers: SPARK_INTERVIEW_ANSWERS_25_TO_34 },
  { name: "35To44", answers: SPARK_INTERVIEW_ANSWERS_35_TO_44 },
  { name: "45To54", answers: SPARK_INTERVIEW_ANSWERS_45_TO_54 },
  { name: "55To73", answers: SPARK_INTERVIEW_ANSWERS_55_TO_73 },
];

function mergeAnswerModules(modules: AnswerModule[]): Record<string, InterviewAnswer> {
  const merged: Record<string, InterviewAnswer> = {};
  const owners = new Map<string, string>();

  for (const answerModule of modules) {
    for (const [question, answer] of Object.entries(answerModule.answers)) {
      const existingOwner = owners.get(question);

      if (existingOwner) {
        throw new Error(
          `Duplicate Spark answer for "${question}" in ${existingOwner} and ${answerModule.name}.`,
        );
      }

      owners.set(question, answerModule.name);
      merged[question] = answer;
    }
  }

  return merged;
}

function validateSparkAnswerCoverage(answers: Record<string, InterviewAnswer>): void {
  const sparkCategory = INTERVIEW_QUESTION_CATEGORIES.find(
    (category) => category.slug === "spark",
  );

  if (!sparkCategory) {
    throw new Error("The Spark interview-question category is missing.");
  }

  const questionCounts = new Map<string, number>();
  for (const { question } of sparkCategory.questions) {
    questionCounts.set(question, (questionCounts.get(question) ?? 0) + 1);
  }

  const duplicateQuestions = [...questionCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([question]) => question);
  const questionSet = new Set(questionCounts.keys());
  const missingAnswers = [...questionSet].filter(
    (question) => !Object.hasOwn(answers, question),
  );
  const answersWithoutQuestions = Object.keys(answers).filter(
    (question) => !questionSet.has(question),
  );

  if (
    duplicateQuestions.length > 0
    || missingAnswers.length > 0
    || answersWithoutQuestions.length > 0
  ) {
    throw new Error([
      duplicateQuestions.length > 0
        ? `Duplicate Spark questions: ${duplicateQuestions.join(" | ")}`
        : undefined,
      missingAnswers.length > 0
        ? `Spark questions without answers: ${missingAnswers.join(" | ")}`
        : undefined,
      answersWithoutQuestions.length > 0
        ? `Spark answers without questions: ${answersWithoutQuestions.join(" | ")}`
        : undefined,
    ].filter(Boolean).join("\n"));
  }
}

export const SPARK_INTERVIEW_ANSWERS = mergeAnswerModules(ANSWER_MODULES);

validateSparkAnswerCoverage(SPARK_INTERVIEW_ANSWERS);
