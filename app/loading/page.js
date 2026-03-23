export const dynamic = "force-dynamic";

import LoadingPage from "../appPages/LoadingPage";

export default function LoadingWrapper({ searchParams }) {
  return <LoadingPage searchParams={searchParams} />;
}
