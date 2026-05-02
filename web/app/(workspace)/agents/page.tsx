"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, FileText, Heart, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import { PageBody } from "@/components/layout";
import {
  type BotInfo,
  type SoulTemplate,
  type Tab,
} from "@/lib/agents-helpers";
import { BotsTab } from "@/components/agents/tabs/BotsTab";
import { ChannelsTab } from "@/components/agents/tabs/ChannelsTab";
import { ProfilesTab } from "@/components/agents/tabs/ProfilesTab";
import { SoulsTab } from "@/components/agents/tabs/SoulsTab";

export default function AgentsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [bots, setBots] = useState<BotInfo[]>([]);
  const [souls, setSouls] = useState<SoulTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("bots");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/tutorbot"));
      setBots(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSouls = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/tutorbot/souls"));
      if (res.ok) setSouls(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadBots();
    void loadSouls();
  }, [loadBots, loadSouls]);

  return (
    <section
      aria-label={t("Agents content")}
      className="h-full overflow-y-auto [scrollbar-gutter:stable]"
    >
      <PageBody size="default">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {t("TutorBot Agents")}
          </h1>
          {toast ? (
            <p className="mt-1 text-sm text-[var(--primary)] animate-fade-in">
              {toast}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t("Manage your in-process TutorBot instances")}
            </p>
          )}
        </header>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 border-b border-[var(--border)]/50 pb-3">
          {[
            { key: "bots" as Tab, label: t("Bots"), icon: Bot },
            { key: "profiles" as Tab, label: t("Profiles"), icon: FileText },
            { key: "channels" as Tab, label: t("Channels"), icon: Settings2 },
            { key: "souls" as Tab, label: t("Soul Templates"), icon: Heart },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "bots" ? (
          <BotsTab
            bots={bots}
            souls={souls}
            loading={loading}
            onReload={loadBots}
            onToast={setToast}
            router={router}
          />
        ) : activeTab === "profiles" ? (
          <ProfilesTab
            bots={bots}
            souls={souls}
            loading={loading}
            onToast={setToast}
            onReloadSouls={loadSouls}
          />
        ) : activeTab === "channels" ? (
          <ChannelsTab
            bots={bots}
            loading={loading}
            onToast={setToast}
            onReload={loadBots}
          />
        ) : (
          <SoulsTab souls={souls} onReload={loadSouls} onToast={setToast} />
        )}
      </PageBody>
    </section>
  );
}
