import RecoveryState from "@/components/ui/data-design/RecoveryState";

export default function NotFound() {
  return (
    <RecoveryState
      testId="not-found-recovery"
      eyebrow="404 · Route not found"
      title="This lesson is not in the curriculum"
      description="The link may be outdated or the chapter name may have changed. Choose a published track below or return to the design library."
    />
  );
}
