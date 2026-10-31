import type { Metadata } from "next";
import { ListingDetail } from "@/components/ListingDetail";
import { seedListings, typeName, zoneById, type Listing } from "@/lib/data";
import { isLocale, type Locale } from "@/lib/i18n";

const SITE = "https://aqarpro.qa";

function find(id: string) {
  return seedListings.find((l) => l.id === id);
}

export async function generateMetadata({ params }: PageProps<"/[lang]/listing/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const l = find(id);
  const loc: Locale = isLocale(lang) ? lang : "en";
  if (!l) return { title: id };
  const title = l.title[loc];
  const description = l.description[loc].slice(0, 160);
  const image = l.media.find((m) => m.cat === "exterior")?.src ?? l.media[0].src;
  return {
    title,
    description,
    alternates: {
      canonical: `/${loc}/listing/${l.id}`,
      languages: { en: `/en/listing/${l.id}`, ar: `/ar/listing/${l.id}` },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: loc === "ar" ? "ar_QA" : "en_QA",
      images: [{ url: image, width: 900, height: 600 }],
    },
  };
}

const schemaType: Record<Listing["type"], string> = {
  apartment: "Apartment",
  penthouse: "Apartment",
  studio: "Apartment",
  villa: "SingleFamilyResidence",
  townhouse: "House",
  office: "Place",
};

/** schema.org RealEstateListing (FR-WEB-07). */
function jsonLd(l: Listing, lang: Locale) {
  const z = zoneById(l.zoneId);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: l.title[lang],
    description: l.description[lang],
    url: `${SITE}/${lang}/listing/${l.id}`,
    datePosted: l.createdAt,
    inLanguage: lang,
    image: l.media.filter((m) => m.cat !== "floorplan").map((m) => `${SITE}${m.src}`),
    offers: {
      "@type": "Offer",
      price: l.price,
      priceCurrency: "QAR",
      businessFunction: l.purpose === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      availability: "https://schema.org/InStock",
    },
    about: {
      "@type": schemaType[l.type],
      name: `${typeName(l.type)[lang]} — ${z.name[lang]}`,
      numberOfRooms: l.beds || undefined,
      numberOfBathroomsTotal: l.baths,
      floorSize: { "@type": "QuantitativeValue", value: l.area, unitCode: "MTK" },
      address: { "@type": "PostalAddress", addressLocality: z.name[lang], addressCountry: "QA" },
      geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
    },
  };
}

export default async function ListingPage({ params }: PageProps<"/[lang]/listing/[id]">) {
  const { lang, id } = await params;
  const l = find(id);
  const loc: Locale = isLocale(lang) ? lang : "en";
  return (
    <>
      {l && l.status === "live" && (
        <script
          type="application/ld+json"
          // Escape "<" so listing text can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(l, loc)).replace(/</g, "\\u003c") }}
        />
      )}
      <ListingDetail id={id} />
    </>
  );
}
