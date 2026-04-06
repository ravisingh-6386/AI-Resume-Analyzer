import { useState } from "react";

const ProjectBulletGenerator = ({ bullets }: { bullets: string[] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  return (
    <section className="bg-white rounded-2xl shadow-md w-full p-5">
      <h3 className="text-2xl font-semibold text-black">Project Bullet Generator</h3>
      <p className="text-gray-600 mt-2">
        Reuse these tailored bullet points in your Projects section.
      </p>

      <div className="mt-4 space-y-3">
        {bullets.map((bullet, index) => (
          <div key={`${bullet}-${index}`} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-gray-800">- {bullet}</p>
            <button
              type="button"
              className="mt-3 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white"
              onClick={() => void handleCopy(bullet, index)}
            >
              {copiedIndex === index ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProjectBulletGenerator;
