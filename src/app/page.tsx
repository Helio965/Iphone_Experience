import { FeatureGrid } from "@/components/bento/FeatureGrid";
import { BuySection } from "@/components/buy/BuySection";
import { Footer } from "@/components/footer/Footer";
import { GlobalNav } from "@/components/nav/GlobalNav";
import { ExperienceProvider } from "@/components/providers/ExperienceProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { SpecsTable } from "@/components/specs/SpecsTable";
import { ProductStage } from "@/components/stage/ProductStage";

export default function Home() {
  return (
    <ExperienceProvider>
      <SmoothScroll />
      <GlobalNav />
      <main>
        <ProductStage />
        <FeatureGrid />
        <SpecsTable />
        <BuySection />
      </main>
      <Footer />
    </ExperienceProvider>
  );
}
