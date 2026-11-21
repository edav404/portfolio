import { PortfolioExperience } from "@/components/portfolio-experience";
import { StandardHome } from "@/components/standard-home";
import { JsonLd } from "@/components/ui";
import { profile } from "@/content/profile";
import { services } from "@/content/services";
import { siteUrl } from "@/content/site";

// Portada servida por el servidor con contenido real; el escritorio es opcional y se carga bajo demanda.
export default function Home() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${profile.name} — ${profile.headline.es}`,
    url: siteUrl,
    email: profile.contact.email,
    areaServed: "CO",
    serviceType: services.map((service) => service.title.es),
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <PortfolioExperience>
        <StandardHome />
      </PortfolioExperience>
    </>
  );
}
