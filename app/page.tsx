import { PortfolioExperience } from "@/components/portfolio-experience";
import { StandardHome } from "@/components/standard-home";
import { JsonLd } from "@/components/ui";
import { services, site } from "@/data/site";

// Portada servida por el servidor con contenido real; el escritorio es opcional y se carga bajo demanda.
export default function Home() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${site.name} — ${site.role}`,
    url: site.domain,
    email: site.email,
    areaServed: "CO",
    serviceType: services.map((service) => service.title),
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
