export const dynamic = "force-dynamic";

import CodePage from "../appPages/CodePage";

export default function CodePageWrapper({ searchParams }) {
  return <CodePage searchParams={searchParams} />;
}