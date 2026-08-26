import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-[#b75b13]">{eyebrow}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1f2937] sm:text-3xl">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#68615a]">{description}</p></div>{action}</div>;
}
