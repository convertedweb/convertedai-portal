"use client";

import { ArrowLeft, ArrowRight, ImageOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { OnboardingAccount } from "@/lib/onboarding-accounts";

type Guide = NonNullable<OnboardingAccount["guide"]>;

export function AccountGuideModal({ guide, name, onClose }: { guide: Guide; name: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const step = guide.steps[index];
  const last = guide.steps.length - 1;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((current) => Math.min(current + 1, last));
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(current - 1, 0));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  return (
    <div className="guide-backdrop" onClick={onClose}>
      <div aria-labelledby="guide-title" aria-modal="true" className="guide-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="guide-header">
          <div><span>{name} útmutató</span><h3 id="guide-title">{index + 1}. {step.title}</h3></div>
          <button aria-label="Bezárás" className="icon-button" onClick={onClose} type="button"><X size={16} /></button>
        </div>
        {step.image && (failedImages.includes(step.image)
          ? <div className="guide-image guide-placeholder"><ImageOff size={22} /><span>A képernyőkép még nincs feltöltve</span></div>
          // eslint-disable-next-line @next/next/no-img-element
          : <img alt={`${step.title} – képernyőkép`} className="guide-image" onError={() => setFailedImages((current) => [...current, step.image as string])} src={step.image} />)}
        <p>{step.link && step.text.includes(step.link.label)
          ? <>{step.text.split(step.link.label)[0]}<a href={step.link.href} rel="noopener noreferrer" target="_blank">{step.link.label}</a>{step.text.split(step.link.label).slice(1).join(step.link.label)}</>
          : step.text}</p>
        <div className="guide-footer">
          {index > 0
            ? <button className="secondary-button" onClick={() => setIndex(index - 1)} type="button"><ArrowLeft size={14} /> Előző</button>
            : <span />}
          <div className="guide-dots" aria-hidden="true">{guide.steps.map((item, dot) => <span className={dot === index ? "active" : ""} key={item.title} />)}</div>
          {index < last
            ? <button className="button" onClick={() => setIndex(index + 1)} type="button">Következő <ArrowRight size={14} /></button>
            : <button className="button" onClick={onClose} type="button">Kész, bezárom</button>}
        </div>
      </div>
    </div>
  );
}
