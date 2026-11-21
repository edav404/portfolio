import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm, ContactFormFromQuery } from "@/components/contact-form";
import { Window } from "@/components/ui";
import { profile } from "@/content/profile";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({ route: "contact", locale: "es", title: "Contacto — Inicia un proyecto web", description: "Contacta a Emmanuel Dávila para conversar sobre desarrollo web, WordPress, WooCommerce, Shopify o diseño web." });

export default function ContactPage() {
  return <><section className="page-hero section-shell"><p className="eyebrow">C:\EDAV\CONTACT.EXE</p><h1>Cuéntame qué quieres construir.</h1><p>Describe tu idea, el problema que quieres resolver y cualquier fecha importante. Te responderé con preguntas concretas y el siguiente paso.</p><a className="button" href="#formulario">Abrir formulario</a></section><section className="section-shell contact-layout" id="formulario"><div><p className="eyebrow">TL;DR · Para avanzar rápido</p><h2>Un buen brief no tiene que ser largo.</h2><p>Con objetivo, público, alcance aproximado y referencias ya podemos tener una primera conversación útil.</p><ul className="contact-points"><li>Respuesta clara y sin compromiso.</li><li>Alcance, tiempos y entregables por escrito.</li><li>Comunicación directa durante el proyecto.</li></ul><a className="text-link" href={profile.contact.whatsapp} target="_blank" rel="noreferrer">¿Prefieres WhatsApp? Abrir conversación →</a></div><Window title="new_project.msg">{/* La página sigue siendo estática: `?servicio=` se lee en el cliente; el HTML inicial ya trae el formulario (fallback) sin preselección. */}<Suspense fallback={<ContactForm/>}><ContactFormFromQuery/></Suspense></Window></section></>;
}
