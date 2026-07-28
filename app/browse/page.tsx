import { BrowseExperience } from "@/components/BrowseExperience";
import { Section } from "@/components/ui";

export default function BrowsePage() {
  return (
    <Section className="py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Find your solution</h1>
      </div>
      <BrowseExperience variant="sidebar" />
    </Section>
  );
}
