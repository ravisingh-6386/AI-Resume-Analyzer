const StudentFeedbackCard = ({ data }: { data: StudentFeedback }) => {
  return (
    <section className="bg-white rounded-2xl shadow-md w-full p-5">
      <h3 className="text-2xl font-semibold text-black">Student-Friendly Feedback</h3>
      <p className="text-gray-700 mt-3">{data.rewrittenSummary}</p>

      <div className="mt-5">
        <p className="text-lg font-semibold text-black">Action Checklist</p>
        <ul className="mt-2 space-y-2">
          {data.actionChecklist.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2 text-gray-700">
              <span className="text-green-600 mt-0.5">OK</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default StudentFeedbackCard;
