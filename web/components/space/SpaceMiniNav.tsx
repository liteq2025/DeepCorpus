"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Brain,
  ClipboardList,
  NotebookPen,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { ListPane } from "@/components/layout";

interface SpaceNavEntry {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const SPACE_NAV: SpaceNavEntry[] = [
  {
    href: "/space/notebooks",
    label: "Notebooks",
    description:
      "Organize saved outputs from chat, research, Co-Writer, and more.",
    icon: NotebookPen,
  },
  {
    href: "/space/questions",
    label: "Question Bank",
    description: "Review and organize quiz questions across sessions.",
    icon: ClipboardList,
  },
  {
    href: "/space/skills",
    label: "Skills",
    description: "Behavior playbooks that guide chat responses.",
    icon: Wand2,
  },
  {
    href: "/space/memory",
    label: "Memory",
    description: "Long-form memory the assistant carries across sessions.",
    icon: Brain,
  },
];

/**
 * Layer 2 — secondary nav for /space sub-routes.
 *
 * Composes `<ListPane>` so /space matches /knowledge's chrome (bg, width,
 * collapse, persistence) and the canonical Layer 2 typography. The
 * one-off branding header (LayoutGrid badge + "Space" + tagline) was
 * dropped: AppSidebar already brought the user here, and ListPane's
 * title carries the section name on its own.
 */
export default function SpaceMiniNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <ListPane
      id="space-nav"
      title={t("Space")}
      collapsedContent={<SpaceMiniNavCollapsed pathname={pathname} />}
    >
      <nav aria-label={t("Space sub-routes")} className="space-y-0.5 px-1 pt-1">
        {SPACE_NAV.map(({ href, label, description, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group block rounded-lg border px-2.5 py-2 transition-colors ${
                active
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                  : "border-transparent hover:border-[var(--border)] hover:bg-[var(--muted)]/40"
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  size={14}
                  strokeWidth={active ? 2 : 1.6}
                  className={`mt-0.5 shrink-0 ${
                    active
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium leading-tight text-[var(--foreground)]">
                    {t(label)}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted-foreground)]">
                    {t(description)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </ListPane>
  );
}

/**
 * Icon-strip rendering for the collapsed `<ListPane>` state. Mirrors
 * `KnowledgeBaseListCollapsed` in shape so the two Layer 2 consumers
 * feel uniform when the pane is folded.
 */
function SpaceMiniNavCollapsed({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("Space sub-routes")}
      className="flex h-full flex-col items-center gap-1 py-2"
    >
      {SPACE_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={t(label)}
            aria-label={t(label)}
            aria-current={active ? "page" : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              active
                ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={14} strokeWidth={active ? 2 : 1.6} aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}
