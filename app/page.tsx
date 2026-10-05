import Dashboard from "@/components/Dashboard";

// Server component: no data is fetched here, so the page is built as a static page.
// The Dashboard component reads the JSON files under public/data in the browser.
export default function Home() {
  return (
    <>
      <Dashboard />
      <footer className="mx-auto max-w-[1150px] px-4 pb-10 text-sm text-ink-2 sm:px-6">
        Data: Yahoo Finance · Course homework · Not investment advice
      </footer>
    </>
  );
}
