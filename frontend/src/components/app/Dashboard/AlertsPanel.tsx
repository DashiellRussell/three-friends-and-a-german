import { CriticalAlert } from "./types";

interface AlertsPanelProps {
  alerts: CriticalAlert[];
  onClose: () => void;
  onDismiss: (id: string) => void;
  onUndismissAll: () => void;
  goTo: (tab: string, checkinId?: string) => void;
}

export function AlertsPanel({
  alerts,
  onClose,
  onDismiss,
  onUndismissAll,
  goTo,
}: AlertsPanelProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-107.5 rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-xl"
        style={{ animation: "slideUp 0.25s" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-zinc-900">
              Critical Alerts
            </h3>
            <p className="text-[12px] text-zinc-400">{alerts.length} active</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">
            No critical alerts
          </div>
        ) : (
          <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-3.5"
              >
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (alert.check_in_id) {
                      onClose();
                      goTo("log", alert.check_in_id);
                    }
                  }}
                  disabled={!alert.check_in_id}
                >
                  <div className="text-[13px] font-medium text-zinc-900">
                    {alert.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">
                    Severity {alert.severity}/10 ·{" "}
                    {new Date(alert.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {alert.check_in_id && (
                      <span className="ml-1 text-zinc-300">
                        · View check-in →
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="shrink-0 text-[11px] font-medium text-zinc-400 hover:text-zinc-600"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] text-zinc-300">
            Not medical advice. Always consult a healthcare professional.
          </p>
          <button
            onClick={onUndismissAll}
            className="shrink-0 text-[10px] font-medium text-zinc-400 underline hover:text-zinc-600"
          >
            Reset for testing
          </button>
        </div>
      </div>
    </>
  );
}
