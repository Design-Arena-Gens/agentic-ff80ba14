import { MainDashboard } from "@/components/main-dashboard";
import { getBookSummaries } from "@/lib/books";
import { uniqueTags } from "@/data/books";

export default function Home() {
  const summaries = getBookSummaries();
  return <MainDashboard books={summaries} tags={uniqueTags} />;
}
