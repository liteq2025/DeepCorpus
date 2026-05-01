import DevDashboard from "@/components/dev/DevDashboard";

interface PageProps {
  searchParams?: Promise<{ view?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  return <DevDashboard initialView={params.view} />;
}
