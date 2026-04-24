import { cn } from "../lib/utils";
import { memo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from "./Accordion";

const ScoreBadge = memo(({ score }: { score: number }) => {
  return (
      <div
          className={cn(
              "flex flex-row gap-1 items-center px-2.5 py-1 rounded-full",
              score > 69
                  ? "bg-badge-green"
                  : score > 39
                      ? "bg-badge-yellow"
                      : "bg-badge-red"
          )}
      >
        <img
            src={score > 69 ? "/icons/check.svg" : "/icons/warning.svg"}
            alt="score"
            className="size-4"
        />
        <p
            className={cn(
                "text-sm font-medium",
                score > 69
                    ? "text-badge-green-text"
                    : score > 39
                        ? "text-badge-yellow-text"
                        : "text-badge-red-text"
            )}
        >
          {score}/100
        </p>
      </div>
  );
});
ScoreBadge.displayName = 'ScoreBadge';

const getPriorityLabel = (score: number) => {
  if (score < 50) return "High Impact";
  if (score < 70) return "Medium";
  return "Low";
};

const getPriorityTone = (score: number) => {
  if (score < 50) return "bg-rose-100 text-rose-700";
  if (score < 70) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

const CategoryHeader = memo(({
                          title,
                          categoryScore,
                        }: {
  title: string;
  categoryScore: number;
}) => {
  return (
      <div className="flex flex-row items-center gap-4 py-1">
        <div>
          <p className="text-lg font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{getPriorityLabel(categoryScore)} priority</p>
        </div>
        <ScoreBadge score={categoryScore} />
      </div>
  );
});
CategoryHeader.displayName = 'CategoryHeader';

const CategoryContent = memo(({
                           tips,
                         }: {
  tips: { type: "good" | "improve"; tip: string; explanation: string }[];
}) => {
  return (
      <div className="flex w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          {tips.slice(0, 4).map((tip, index) => (
              <div
                  key={index}
                  className={cn(
                      "rounded-2xl border p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5",
                      tip.type === "good"
                          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                          : "border-amber-200 bg-amber-50/80 text-amber-800"
                  )}
              >
                <div className="flex items-start gap-3">
                  <img
                      src={
                        tip.type === "good"
                            ? "/icons/check.svg"
                            : "/icons/warning.svg"
                      }
                      alt="score"
                      className="mt-0.5 size-5"
                  />
                  <div>
                    <p className="text-sm font-semibold leading-6">{tip.tip}</p>
                    <p className="mt-1 text-sm leading-6 opacity-90">{tip.explanation}</p>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
  );
});
CategoryContent.displayName = 'CategoryContent';

const Details = memo(({ feedback }: { feedback: Feedback }) => {
  return (
      <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Feedback sections</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Tone, content, structure, and skills</h3>
          <p className="mt-1 text-sm text-slate-600">
            Expand each section to inspect the highest-value suggestions.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
        <Accordion defaultOpen="tone-style">
          <AccordionItem id="tone-style" className="border-0">
            <AccordionHeader itemId="tone-style" className="px-0 py-0">
              <CategoryHeader
                  title="Tone & Style"
                  categoryScore={feedback.toneAndStyle.score}
              />
            </AccordionHeader>
            <AccordionContent itemId="tone-style" className="px-0">
              <CategoryContent tips={feedback.toneAndStyle.tips} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem id="content" className="border-0">
            <AccordionHeader itemId="content" className="px-0 py-0">
              <CategoryHeader
                  title="Content"
                  categoryScore={feedback.content.score}
              />
            </AccordionHeader>
            <AccordionContent itemId="content" className="px-0">
              <CategoryContent tips={feedback.content.tips} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem id="structure" className="border-0">
            <AccordionHeader itemId="structure" className="px-0 py-0">
              <CategoryHeader
                  title="Structure"
                  categoryScore={feedback.structure.score}
              />
            </AccordionHeader>
            <AccordionContent itemId="structure" className="px-0">
              <CategoryContent tips={feedback.structure.tips} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem id="skills" className="border-0">
            <AccordionHeader itemId="skills" className="px-0 py-0">
              <CategoryHeader
                  title="Skills"
                  categoryScore={feedback.skills.score}
              />
            </AccordionHeader>
            <AccordionContent itemId="skills" className="px-0">
              <CategoryContent tips={feedback.skills.tips} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </div>
      </section>
  );
});
Details.displayName = 'Details';

export default Details;
