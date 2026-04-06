const RoleKeywordAnalysisCard = ({ data }: { data: RoleKeywordAnalysis }) => {
  return (
    <section className="bg-white rounded-2xl shadow-md w-full p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-2xl font-semibold text-black">Role Keyword Pack</h3>
        <p className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
          {data.rolePack.toUpperCase()} pack | {data.coverage}% coverage
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">Matched Keywords</p>
          <p className="text-sm text-green-700 mt-2">
            {data.matchedKeywords.length ? data.matchedKeywords.join(", ") : "No matched keywords yet."}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">Missing Keywords</p>
          <p className="text-sm text-amber-700 mt-2">
            {data.missingKeywords.length ? data.missingKeywords.join(", ") : "Great match. No high-priority gaps."}
          </p>
        </div>
      </div>
    </section>
  );
};

export default RoleKeywordAnalysisCard;
