"use client";
import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { replayAction } from "@/app/actions/replays";
export function ReplayForm({
  children,
  label,
  teamId,
  operation,
}: {
  children?: ReactNode;
  label: string;
  teamId: string;
  operation: string;
}) {
  const [state, action, pending] = useActionState(replayAction, {
    message: "",
  });
  return (
    <form action={action} className="replay-form">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="operation" value={operation} />
      {children}
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      <p role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
export function ReplayRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(timer);
  }, [active, router]);
  return (
    <button
      type="button"
      className="secondary"
      onClick={() => router.refresh()}
    >
      Refresh status
    </button>
  );
}
