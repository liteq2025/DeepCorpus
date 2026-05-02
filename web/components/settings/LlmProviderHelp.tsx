/* eslint-disable i18n/no-literal-ui-text */
"use client";

import { useTranslation } from "react-i18next";

import {
  ProviderHelpSheet,
  type ProviderEntry,
} from "./ProviderHelpSheet";

const PROVIDERS: ProviderEntry[] = [
  {
    name: "OpenAI",
    keyRequired: "required",
    registerUrl: "https://platform.openai.com/api-keys",
    pricing: "按 token 计费,gpt-4o-mini 起",
    notes:
      "Base URL 留空 (自动 https://api.openai.com/v1)。Model ID 填 gpt-4o / gpt-4o-mini / o3-mini 等。Key 形如 sk-…。国内需 Proxy。",
  },
  {
    name: "Anthropic Claude",
    keyRequired: "required",
    registerUrl: "https://console.anthropic.com/settings/keys",
    pricing: "按 token 计费,Haiku 起",
    notes:
      "通过 OpenAI-compatible 接口调用,需要 Provider 选 anthropic 并填 Base URL https://api.anthropic.com/v1 或走第三方代理网关。Key 形如 sk-ant-…。",
  },
  {
    name: "Google Gemini",
    keyRequired: "required",
    registerUrl: "https://aistudio.google.com/apikey",
    pricing: "免费配额 + 付费",
    notes:
      "AI Studio 拿 key (AIza…),Base URL 留空使用 OpenAI-compatible 端点。Free tier 速率限制严。国内需 Proxy。",
  },
  {
    name: "DeepSeek",
    keyRequired: "required",
    registerUrl: "https://platform.deepseek.com/api_keys",
    pricing: "按 token 计费,极便宜",
    badge: "国内可直连",
    notes:
      "国内服务,直连无需 proxy。Model ID: deepseek-chat (V3) / deepseek-reasoner (R1)。性价比是目前最好的之一。Key 形如 sk-…。",
  },
  {
    name: "Qwen (DashScope)",
    keyRequired: "required",
    registerUrl:
      "https://dashscope.console.aliyun.com/apiKey",
    pricing: "按 token 计费 + 部分免费",
    badge: "国内可直连",
    notes:
      "阿里云灵积平台。Model ID: qwen-max / qwen-plus / qwen-turbo / qwen3-235b-a22b 等。Base URL 留空走默认 OpenAI-compatible 端点。Key 形如 sk-…。",
  },
  {
    name: "SiliconFlow",
    keyRequired: "required",
    registerUrl: "https://cloud.siliconflow.cn/account/ak",
    pricing: "按 token 计费,部分模型免费",
    badge: "国内可直连",
    notes:
      "聚合 DeepSeek / Qwen / GLM / Llama 等多家开源模型。一把 key 调多个模型。Base URL https://api.siliconflow.cn/v1。Key 形如 sk-…。",
  },
  {
    name: "OpenRouter",
    keyRequired: "required",
    registerUrl: "https://openrouter.ai/keys",
    pricing: "代付费,按 token + 5% margin",
    notes:
      "聚合 OpenAI / Anthropic / Google / Meta / Mistral 等,一把 key 调几乎所有主流模型。Base URL https://openrouter.ai/api/v1。国内需 Proxy。Key 形如 sk-or-…。",
  },
  {
    name: "Ollama",
    keyRequired: "none",
    registerUrl: "https://ollama.com/download",
    pricing: "本地免费",
    notes:
      "本地跑开源模型 (llama3 / qwen2.5 / mistral 等),零延迟、零费用、隐私好。Base URL http://localhost:11434/v1。Model ID 填 ollama 列表里的模型名。无需 Key。",
  },
  {
    name: "Azure OpenAI",
    keyRequired: "required",
    registerUrl: "https://portal.azure.com/",
    pricing: "按 token 计费",
    notes:
      "企业用 Azure 部署的 OpenAI。Provider 选 azure,Base URL 是你的 Azure 资源 endpoint (https://{your-resource}.openai.azure.com/),API Version 必填 (例如 2024-02-15-preview)。Model ID 是你的 deployment name。",
  },
];

export function LlmProviderHelp() {
  const { t } = useTranslation();
  return (
    <ProviderHelpSheet
      triggerTitle={t("How to configure LLM providers")}
      sheetTitle="配置 LLM Provider"
      sheetIntro="LLM 是 chat / 推理 / 生成的核心。一把 Profile = 一个 endpoint + 凭证;Profile 下可挂多个 Model。"
      providers={PROVIDERS}
      body={
        <>
          <section className="mb-6 rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/15">
            <div className="mb-1 text-[13px] font-medium text-emerald-800 dark:text-emerald-300">
              国内用户起步推荐
            </div>
            <p className="text-[12px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
              <strong>DeepSeek</strong> 性价比最高、直连;<strong>SiliconFlow</strong> 一把 key 多模型,适合切换试用;<strong>Qwen</strong> 国内云原厂,多模态完整。OpenAI / Claude / Gemini 都需要 Proxy 字段填代理。
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              Profile 与 Model 的关系
            </h3>
            <p className="mb-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              一个 Profile 描述「在哪儿、用什么 key」(provider + base_url + api_key);
              Profile 下可以挂多个 Model,每个 Model 是一个具体型号 (model ID + context window)。
              同一把 OpenAI key 可以同时挂 gpt-4o-mini (快) 和 gpt-4o (强) 两个 Model,运行时按 active model 决定调哪个。
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              Context Window 字段
            </h3>
            <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              留空时 Run-test 会向 provider 探测后自动回填 (LLM 测试除了验通,也顺便抓 metadata)。
              探测不到的用 fallback 默认值。手填会覆盖自动检测,Source 标签会标记为 manual。
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              配完之后
            </h3>
            <ol className="space-y-1.5 pl-5 text-[12.5px] text-[var(--muted-foreground)] [&>li]:list-decimal">
              <li>字段编辑触发 600 ms 防抖 auto-save。</li>
              <li>
                跑下面的 <strong>Run test</strong> 验证 key + 端点 + model 都通,顺便回填 context_window。
              </li>
              <li>
                底栏 <strong>Apply</strong> 写 .env (LLM_BINDING / LLM_API_KEY / LLM_BASE_URL / LLM_MODEL …),改动才生效。
              </li>
              <li>
                Chat 不需要在 composer 选 LLM —— LLM 是全局默认,所有 capability 共用 active LLM。
              </li>
            </ol>
          </section>

          <section className="rounded-lg bg-[var(--muted)]/40 p-3">
            <div className="mb-1 text-[12.5px] font-medium text-[var(--foreground)]">
              提示
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              想随时切换不同 LLM (例如平时用 DeepSeek 省钱、深度思考切到 Claude),保留多个 Profile 即可,
              在 Profile list 点击切 active,Apply 一下生效。Profile 信息全部留在 model_catalog.json,不会丢。
            </p>
          </section>
        </>
      }
    />
  );
}
