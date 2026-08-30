"use client";

import { useState } from "react";
import Link from "next/link";
import { services } from "@/data/site";

export function ServicesWizard() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string>(services[0].slug);
  const service = services.find((item) => item.slug === selected) ?? services[0];
  return <div className="os-wizard">
    <aside><div className="os-wizard-disc"><span>ED</span></div><p>Project Setup Wizard</p><small>EDAV Desktop 98</small></aside>
    <div className="os-wizard-main">
      <div className="os-wizard-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }}/></div>
      {step === 0 && <section><p className="os-kicker">Paso 1 de 3</p><h2>¿Qué quieres construir?</h2><p>Selecciona el tipo de proyecto que más se acerca a tu idea.</p><div className="os-radio-list">{services.map((item) => <label key={item.slug}><input type="radio" name="service" checked={selected === item.slug} onChange={() => setSelected(item.slug)}/><span><strong>{item.title}</strong><small>{item.kicker}</small></span></label>)}</div></section>}
      {step === 1 && <section><p className="os-kicker">Paso 2 de 3</p><h2>{service.title}</h2><p>{service.description}</p><div className="os-inset-panel"><strong>Este paquete puede incluir:</strong><ul>{service.includes.map((item) => <li key={item}>{item}</li>)}</ul></div><p><strong>Stack recomendado:</strong> {service.stack}</p></section>}
      {step === 2 && <section className="os-wizard-finish"><div className="os-finish-check">✓</div><p className="os-kicker">Configuración completa</p><h2>Tu idea está lista para conversar.</h2><p>Cuéntame el contexto, los objetivos y las fechas. Prepararé una ruta clara para tu proyecto de {service.title.toLowerCase()}.</p><Link href={`/contacto?servicio=${selected}`} className="os-98-button is-primary">Abrir formulario de contacto</Link></section>}
      <footer><button className="os-98-button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Atrás</button>{step < 2 && <button className="os-98-button is-primary" onClick={() => setStep((value) => Math.min(2, value + 1))}>Siguiente</button>}</footer>
    </div>
  </div>;
}
