/**
 * Adaptador temporal: vista en español de `content/` con la forma que consume
 * la UI actual. Se elimina cuando la UI lea `content/` directamente (Fases 3–5).
 */
import { profile, skills } from "@/content/profile";
import { services as allServices, testimonials as allTestimonials } from "@/content/services";

export const site = {
  name: profile.name,
  role: profile.headline.es,
  domain: (process.env.NEXT_PUBLIC_SITE_URL || "https://edav.com.co").replace(/\/+$/, ""),
  description: profile.seoDescription.es,
  lastfm: profile.contact.lastfm,
  whatsapp: profile.contact.whatsapp,
};

export const services = allServices.map((service) => ({
  slug: service.slug,
  title: service.title.es,
  kicker: service.kicker.es,
  description: service.description.es,
  includes: service.includes.es,
  stack: service.stack.es,
}));

export const testimonials = allTestimonials.map((testimonial) => ({
  name: testimonial.name,
  project: testimonial.project.es,
  logo: testimonial.logo,
  quote: testimonial.quote.es,
}));

export const technologies = [...skills.web, ...skills.cms, ...skills.automation.slice(0, 4), ...skills.data.slice(0, 2), "Git", "Figma"];
