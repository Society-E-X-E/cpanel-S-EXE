export const dynamic = "force-dynamic";

import LoadingPage from "../appPages/LoadingPage";

import { redirect } from "next/navigation";

export default function LoadingWrapper({ searchParams }) {
  // mantener compatibilidad con path antiguo, redirige a /code
  const next = searchParams?.next || "waiting";
  if (next === "flow") {
    redirect(`/code?user=${encodeURIComponent(searchParams?.user || "")}`);
  }
  return <LoadingPage searchParams={searchParams} />;
}
