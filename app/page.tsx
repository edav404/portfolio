import { PortfolioExperience } from "@/components/portfolio-experience";
import { JsonLd } from "@/components/ui";
import { services, site } from "@/data/site";

export default function Home() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Emmanuel Dávila — Desarrollo y diseño web",
    url: site.domain,
    areaServed: "CO",
    serviceType: services.map((service) => service.title),
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <PortfolioExperience />
    </>
  );
}
