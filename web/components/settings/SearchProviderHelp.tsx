/* eslint-disable i18n/no-literal-ui-text */
"use client";

import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ProviderEntry {
  name: string;
  keyRequired: "required" | "optional" | "none";
  registerUrl?: string;
  pricing: string;
  notes: string;
}

const PROVIDERS: ProviderEntry[] = [
  {
    name: "Brave",
    keyRequired: "required",
    registerUrl: "https://api.search.brave.com/app/keys",
    pricing: "免费 2000 次/月起",
    notes:
      "推荐起步选项。注册时选 Free 计划即可，复制 subscription token (BSA…) 到 API Key 字段。",
  },
  {
    name: "Tavily",
    keyRequired: "required",
    registerUrl: "https://app.tavily.com/",
    pricing: "免费 1000 次/月",
    notes:
      "研究型搜索，自带摘要 + citation。Deep Research capability 用它效果最好。Key 形如 tvly-…。",
  },
  {
    name: "Jina",
    keyRequired: "optional",
    registerUrl: "https://jina.ai/?sui=apikey",
    pricing: "免费配额 / 按调用付费",
    notes:
      "返回每条结果的全文（reader）。token 消耗大,适合内容抓取场景,普通问答会浪费 context。Key 可选 (jina_…)。",
  },
  {
    name: "SearXNG",
    keyRequired: "none",
    registerUrl: "https://docs.searxng.org/admin/installation.html",
    pricing: "自托管免费",
    notes:
      "聚合多搜索引擎,无 vendor lock。Base URL 必填(你的实例地址,例如 https://searx.example.com)。公共实例见 searx.space。",
  },
  {
    name: "DuckDuckGo",
    keyRequired: "none",
    pricing: "免费",
    notes:
      "零配置。质量比 Brave/Tavily 差一截、速率受限。当 brave/tavily/jina 没填 key 时后端会自动 fallback 到此。",
  },
  {
    name: "Perplexity",
    keyRequired: "required",
    registerUrl: "https://www.perplexity.ai/settings/api",
    pricing: "$5 起步 + token 计费",
    notes:
      "返回 LLM 已合成好的 answer + citations。意味着搜索这一步已被 Perplexity 自己的 LLM 承包,跟你后面 LLM 会形成两层串联。Key 形如 pplx-…。",
  },
];

function KeyChip({ status }: { status: ProviderEntry["keyRequired"] }) {
  if (status === "required") {
    return (
      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        必填
      </span>
    );
  }
  if (status === "optional") {
    return (
      <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
        可选
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
      不需
    </span>
  );
}

/**
 * "?" entry next to the Search section header. Opens a side sheet with
 * step-by-step config notes for each supported provider.
 *
 * Content kept inline (Chinese, since the project's primary user is
 * Chinese-speaking) — no markdown / external file. Lift to its own
 * source when LLM / Embedding pick up matching helpers.
 */
export function SearchProviderHelp() {
  const { t } = useTranslation();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title={t("How to configure search providers")}
          aria-label={t("How to configure search providers")}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent side="right" size="third" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>配置 Search Provider</SheetTitle>
          <SheetDescription>
            选一个 provider、申请 API key、填好字段即可。Brave 是最简单的起步选项。
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 text-[13px] leading-relaxed">
          {/* ── 速查表 ── */}
          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              速查
            </h3>
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--muted)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Provider</th>
                    <th className="px-3 py-2 font-medium">Key</th>
                    <th className="px-3 py-2 font-medium">价格起点</th>
                  </tr>
                </thead>
                <tbody>
                  {PROVIDERS.map((p) => (
                    <tr
                      key={p.name}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                        {p.name}
                      </td>
                      <td className="px-3 py-2">
                        <KeyChip status={p.keyRequired} />
                      </td>
                      <td className="px-3 py-2 text-[var(--muted-foreground)]">
                        {p.pricing}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 详解 ── */}
          <section className="mb-6 space-y-4">
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              逐项说明
            </h3>
            {PROVIDERS.map((p) => (
              <div
                key={p.name}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {p.name}
                  </span>
                  <KeyChip status={p.keyRequired} />
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    · {p.pricing}
                  </span>
                </div>
                <p className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                  {p.notes}
                </p>
                {p.registerUrl && (
                  <a
                    href={p.registerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[var(--primary)] hover:underline"
                  >
                    {p.keyRequired === "none" ? "部署文档 →" : "申请 API key →"}
                  </a>
                )}
              </div>
            ))}
          </section>

          {/* ── Proxy ── */}
          <section className="mb-6 rounded-lg border border-amber-200/60 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/15">
            <div className="mb-1 text-[13px] font-medium text-amber-800 dark:text-amber-300">
              国内用户：Proxy 大概率必填
            </div>
            <p className="text-[12px] leading-relaxed text-amber-800/80 dark:text-amber-200/80">
              Brave / Tavily / Jina / Perplexity 直连国内不可用,需要在 Proxy 字段填 HTTP/SOCKS 代理。常用形式:
              <code className="mx-1 rounded bg-[var(--card)] px-1 py-0.5 font-mono text-[11px]">
                http://127.0.0.1:7890
              </code>
              (Clash 默认端口),或
              <code className="mx-1 rounded bg-[var(--card)] px-1 py-0.5 font-mono text-[11px]">
                socks5h://127.0.0.1:1080
              </code>
              。SearXNG 自托管 / DuckDuckGo 在国内大部分时段可直连。
            </p>
          </section>

          {/* ── 验证流程 ── */}
          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              配完之后
            </h3>
            <ol className="space-y-1.5 pl-5 text-[12.5px] text-[var(--muted-foreground)] [&>li]:list-decimal">
              <li>
                字段编辑触发 600 ms 防抖 auto-save,落盘到{" "}
                <code className="rounded bg-[var(--muted)]/60 px-1 py-0.5 font-mono text-[11px]">
                  model_catalog.json
                </code>
                。
              </li>
              <li>
                滚到下方 <strong>Run test</strong> 卡,点 Run。状态条变绿且摘要显示{" "}
                <code className="font-mono text-[11px]">profile · provider</code>{" "}
                即通过。
              </li>
              <li>
                底栏点 <strong>Apply</strong> 写入 .env。
                <strong className="text-[var(--foreground)]"> 不 Apply 改动不生效</strong>—— chat 那边的 web_search 工具是从 .env 读。
              </li>
              <li>
                Chat 默认 capability 不开启 web_search,需要 composer 工具栏点 Globe 图标,或切到 Deep Solve / Deep Research。
              </li>
            </ol>
          </section>

          {/* ── 为什么需要 search 服务 ── */}
          <section className="rounded-lg bg-[var(--muted)]/40 p-3">
            <div className="mb-1 text-[12.5px] font-medium text-[var(--foreground)]">
              为什么 LLM 自己不联网,要单独配 Search?
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              通过 API 调用任何 LLM,绝大多数情况下默认不联网。
              ChatGPT.com / Claude.ai 这些产品的「联网」是后端自己挂了 SERP 再喂给 LLM——API 层没这一步。
              deeptutor 兼容任意 LLM provider (OpenAI / Claude / DeepSeek / Qwen / Ollama / …),
              最低公约数就是「LLM 自己不联网」,所以在应用层统一接 SERP,所有 LLM 共用。
              不打算让 chat 联网的话,可以不配 Search,RAG (知识库) 已经能覆盖大部分场景。
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
