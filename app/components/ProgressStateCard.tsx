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
    <div className={`${state.bg} border border-gray-200 rounded-xl p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{state.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-lg ${state.color}`}>{state.label}</p>
          {lastError && (
            <p className="text-sm text-red-700 mt-2 break-words">{lastError}</p>
          )}
        </div>
      </div>

      {jobState === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          Retry Analysis {retryCount > 0 && `(Attempt ${retryCount + 1})`}
        </button>
      )}
    </div>
  );
};

export default ProgressStateCard;
