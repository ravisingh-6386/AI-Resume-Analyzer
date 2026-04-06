import { useState } from "react";

const ActionableRewriteCard = ({ rewrites }: { rewrites: ActionableRewrite[] }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  return (
    <section className="bg-white rounded-2xl shadow-md w-full p-4 md:p-6">
      <div className="mb-4">
        <h3 className="text-2xl font-semibold text-black">Actionable Rewrites</h3>
        <p className="text-sm text-gray-600 mt-1">
          Click each card to see a concrete example and expected impact.
        </p>
      </div>

      <div className="space-y-3">
        {rewrites.map((rewrite, index) => (
          <div
            key={`${rewrite.section}-${index}`}
            className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="font-semibold text-indigo-600 text-sm py-1 px-2 bg-indigo-50 rounded whitespace-nowrap">
                  {rewrite.section}
                </span>
                <p className="text-gray-800 font-medium break-words">{rewrite.issue}</p>
              </div>
              <span className="ml-2 text-gray-500 text-xl">
                {expandedIndex === index ? "-" : "+"}
              </span>
            </div>

            {expandedIndex === index && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Before (Weak):</p>
                  <p className="text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded mt-1 break-words">
                    {rewrite.example}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">After (Strong):</p>
                  <p className="text-sm bg-green-50 border border-green-200 text-green-800 p-3 rounded mt-1 break-words">
                    {rewrite.rewrite}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">OK</span>
                  <p className="text-sm text-gray-700">
                    <strong>Expected impact:</strong> {rewrite.impact}
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCopy(rewrite.rewrite, index);
                  }}
                >
                  {copiedIndex === index ? "Copied to clipboard" : "Copy rewrite"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ActionableRewriteCard;
