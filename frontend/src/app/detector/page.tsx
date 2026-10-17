import type { Metadata } from "next";

import { DetectorPanel } from "@/components/detector/detector-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getManifest, getModels } from "@/lib/api";

export const metadata: Metadata = { title: "Live Detector" };

export default async function DetectorPage() {
  const [{ data: m }, { data: manifest }] = await Promise.all([getModels(), getManifest()]);

  return (
    <>
      <PageHeader
        eyebrow="Tools · Live Detector"
        title="Live Spam Detector"
        description="Classify any SMS message in real time. The message is scored by the selected trained model, checked for threat signals, and explained word by word."
      />
      <DetectorPanel
        models={m.models.map((x) => ({ key: x.key, name: x.name, role: x.role }))}
        defaultModel={manifest.default_model}
      />
    </>
  );
}
