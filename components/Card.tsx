import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  aside?: ReactNode; // optional control at the right of the title (tabs, a checkbox)
  children: ReactNode;
};

// Frame of one section of a view: title, short description and the content.
export default function Card({ title, description, aside, children }: Props) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="max-w-3xl min-w-0 flex-1 basis-72">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
