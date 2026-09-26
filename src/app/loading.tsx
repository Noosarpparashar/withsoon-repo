import RecoveryState from "@/components/ui/data-design/RecoveryState";

export default function Loading() {
  return (
    <RecoveryState
      testId="loading-recovery"
      eyebrow="Preparing chapter"
      title="Loading your data design lesson"
      description="The curriculum shell is ready while the requested chapter is being prepared. You can wait here or return to the design library."
      loading
    />
  );
}
