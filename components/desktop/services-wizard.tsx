"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "@/content/format";
import { contactHrefForService, services } from "@/content/services";
import { useLocale } from "@/lib/i18n/locale-context";

/** Textos del asistente (`ui.os.wizard`), resueltos por el servidor. */
export type WizardCopy = {
  sidebar: string; step: string; chooseTitle: string; chooseCopy: string; includes: string; stack: string;
  doneKicker: string; doneTitle: string; doneCopy: string; openForm: string; back: string; next: string;
};

export function ServicesWizard({ copy }: { copy: WizardCopy }) {
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string>(services[0].slug);
  const service = services.find((item) => item.slug === selected) ?? services[0];
  return <div className="os-wizard">
    <aside><div className="os-wizard-disc"><span>ED</span></div><p>{copy.sidebar}</p><small>EDAV Desktop 98</small></aside>
    <div className="os-wizard-main">
      <div className="os-wizard-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }}/></div>
      {step === 0 && <section><p className="os-kicker">{format(copy.step, { n: 1, total: 3 })}</p><h2>{copy.chooseTitle}</h2><p>{copy.chooseCopy}</p><div className="os-radio-list">{services.map((item) => <label key={item.slug}><input type="radio" name="service" checked={selected === item.slug} onChange={() => setSelected(item.slug)}/><span><strong>{item.title[locale]}</strong><small>{item.kicker[locale]}</small></span></label>)}</div></section>}
      {step === 1 && <section><p className="os-kicker">{format(copy.step, { n: 2, total: 3 })}</p><h2>{service.title[locale]}</h2><p>{service.description[locale]}</p><div className="os-inset-panel"><strong>{copy.includes}</strong><ul>{service.includes[locale].map((item) => <li key={item}>{item}</li>)}</ul></div><p><strong>{copy.stack}</strong> {service.stack[locale]}</p></section>}
      {step === 2 && <section className="os-wizard-finish"><div className="os-finish-check">✓</div><p className="os-kicker">{copy.doneKicker}</p><h2>{copy.doneTitle}</h2><p>{format(copy.doneCopy, { service: service.title[locale].toLowerCase() })}</p><Link href={contactHrefForService(service.slug, locale)} className="os-98-button is-primary">{copy.openForm}</Link></section>}
      <footer><button className="os-98-button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>{copy.back}</button>{step < 2 && <button className="os-98-button is-primary" onClick={() => setStep((value) => Math.min(2, value + 1))}>{copy.next}</button>}</footer>
    </div>
  </div>;
}
