import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

// Sayfadaki her bölümün çerçevesi: başlık, tek satırlık açıklama ve içerik.
export default function Card({ title, description, children }: Props) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
