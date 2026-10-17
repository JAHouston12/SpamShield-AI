import { PageHeader } from "@/components/layout/page-header";
import { getNavItem } from "@/lib/nav";

export function PageStub({ href }: { href: string }) {
  const item = getNavItem(href);
  return <PageHeader eyebrow={item?.group} title={item?.title ?? "Page"} description={item?.description} />;
}
