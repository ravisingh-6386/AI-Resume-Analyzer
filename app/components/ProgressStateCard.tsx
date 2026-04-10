import { getProgressState } from '../lib/utils';

interface ProgressStateProps {
  jobState?: string;
  lastError?: string;
  retryCount?: number;
  onRetry?: () => void;
}

const ProgressStateCard = ({ jobState, lastError, retryCount = 0, onRetry }: ProgressStateProps) => {
  const state = getProgressState(jobState);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${state.bg} text-lg`}>
          {state.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-lg font-semibold ${state.color}`}>{state.label}</p>
          <p className="mt-1 text-sm text-slate-600">Your analysis is moving through the pipeline.</p>
          {lastError && <p className="mt-2 break-words text-sm text-red-700">{lastError}</p>}
        </div>
      </div>

      {jobState === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
        >
          Retry Analysis {retryCount > 0 && `(Attempt ${retryCount + 1})`}
        </button>
      )}
    </div>
  );
};

export default ProgressStateCard;
