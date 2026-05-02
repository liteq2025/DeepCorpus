/* eslint-disable i18n/no-literal-ui-text */
"use client";

import { useTranslation } from "react-i18next";

import {
  ProviderHelpSheet,
  type ProviderEntry,
} from "./ProviderHelpSheet";

const PROVIDERS: ProviderEntry[] = [
  {
    name: "Brave",
    keyRequired: "required",
    registerUrl: "https://api.search.brave.com/app/keys",
    pricing: "免费 2000 次/月起",
    badge: "推荐",
    notes:
      "推荐起步选项。注册时选 Free 计划即可,复制 subscription token (BSA…) 到 API Key 字段。",
  },
  {
    name: "Tavily",
    keyRequired: "required",
    registerUrl: "https://app.tavily.com/",
    pricing: "免费 1000 次/月",
    notes:
      "研究型搜索,自带摘要 + citation。Deep Research capability 用它效果最好。Key 形如 tvly-…。",
  },
  {
    name: "Jina",
    keyRequired: "optional",
    registerUrl: "https://jina.ai/?sui=apikey",
    pricing: "免费配额 / 按调用付费",
    notes:
      "返回每条结果的全文 (reader)。token 消耗大,适合内容抓取场景,普通问答会浪费 context。Key 可选 (jina_…)。",
  },
  {
    name: "SearXNG",
    keyRequired: "none",
    registerUrl: "https://docs.searxng.org/admin/installation.html",
    pricing: "自托管免费",
    notes:
      "聚合多搜索引擎,无 vendor lock。Base URL 必填 (你的实例地址,例如 https://searx.example.com)。公共实例见 searx.space。",
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

export function SearchProviderHelp() {
  const { t } = useTranslation();
  return (
    <ProviderHelpSheet
      triggerTitle={t("How to configure search providers")}
      sheetTitle="配置 Search Provider"
      sheetIntro="DuckDuckGo 已默认开箱可用,无需配置。想要更高质量的搜索结果再选 Brave / Tavily / Jina 等。"
      providers={PROVIDERS}
      body={
        <>
          <section className="mb-6 rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/15">
            <div className="mb-1 text-[13px] font-medium text-emerald-800 dark:text-emerald-300">
              开箱即用:DuckDuckGo 零配置已启用
            </div>
            <p className="text-[12px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
              新装 deeptutor 默认就预置了一个 DuckDuckGo profile,chat 里启用 web_search 工具立刻能用,完全不需要先来 Settings 配置。
              DuckDuckGo 国内大部分时段可直连、零费用,代价是质量比 Brave / Tavily 差一截、速率受限。
              满足不了再来配 Brave / Tavily — 注册个 key 替换 active profile,Apply 就升级了。
            </p>
          </section>

          <section className="mb-6 rounded-lg border border-amber-200/60 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/15">
            <div className="mb-1 text-[13px] font-medium text-amber-800 dark:text-amber-300">
              国内用户:Proxy 大概率必填
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
        </>
      }
    />
  );
}
