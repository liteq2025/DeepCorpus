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
    pricing: "$0.02 / 1M tokens (3-small)",
    notes:
      "Base URL 留空。Model ID: text-embedding-3-small (1536d) / text-embedding-3-large (3072d)。质量高、速度快、价格最便宜。国内需 Proxy。",
  },
  {
    name: "Qwen (DashScope)",
    keyRequired: "required",
    registerUrl:
      "https://dashscope.console.aliyun.com/apiKey",
    pricing: "按 token 计费 + 免费额度",
    badge: "国内可直连",
    notes:
      "阿里云的 text-embedding-v3 / v4。Endpoint URL 填 https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings。注意 v4 系列不支持 dimensions 参数,要关掉 Send dimensions 开关。",
  },
  {
    name: "SiliconFlow",
    keyRequired: "required",
    registerUrl: "https://cloud.siliconflow.cn/account/ak",
    pricing: "按 token 计费,部分免费",
    badge: "国内可直连",
    notes:
      "聚合多家 embedding (BAAI/bge / netease / GTE / E5 等)。Endpoint URL https://api.siliconflow.cn/v1/embeddings。Model ID 选 BAAI/bge-large-zh-v1.5 / BAAI/bge-m3 等。",
  },
  {
    name: "Jina Embeddings",
    keyRequired: "required",
    registerUrl: "https://jina.ai/embeddings/",
    pricing: "免费配额 + 付费",
    notes:
      "多语种支持好,jina-embeddings-v3 默认 1024d。Endpoint https://api.jina.ai/v1/embeddings。Key 形如 jina_…。",
  },
  {
    name: "Cohere",
    keyRequired: "required",
    registerUrl: "https://dashboard.cohere.com/api-keys",
    pricing: "免费配额 + 付费",
    notes:
      "embed-multilingual-v3.0 多语种质量很好。需要 OpenAI-compatible 网关或自己接 Cohere 原生 API (binding=cohere)。国内需 Proxy。",
  },
  {
    name: "Ollama",
    keyRequired: "none",
    registerUrl: "https://ollama.com/library?type=embedding",
    pricing: "本地免费",
    notes:
      "本地跑 nomic-embed-text / mxbai-embed-large 等。Endpoint URL http://localhost:11434/v1/embeddings。零费用 + 隐私好,但质量比 OpenAI 差一截。",
  },
  {
    name: "Azure OpenAI",
    keyRequired: "required",
    registerUrl: "https://portal.azure.com/",
    pricing: "按 token 计费",
    notes:
      "用法跟 LLM Azure 一致 — Provider 选 azure,Endpoint URL 是 https://{your-resource}.openai.azure.com/openai/deployments/{your-embedding-deployment}/embeddings,API Version 必填。",
  },
];

export function EmbeddingProviderHelp() {
  const { t } = useTranslation();
  return (
    <ProviderHelpSheet
      triggerTitle={t("How to configure embedding providers")}
      sheetTitle="配置 Embedding Provider"
      sheetIntro="Embedding 把文本转成向量,是 RAG (知识库检索) 的底层。一旦切换会需要重建索引。"
      providers={PROVIDERS}
      body={
        <>
          <section className="mb-6 rounded-lg border border-red-200/60 bg-red-50/40 p-3 dark:border-red-900/40 dark:bg-red-950/15">
            <div className="mb-1 text-[13px] font-medium text-red-800 dark:text-red-300">
              ⚠ 切换 Embedding 后必须重建知识库索引
            </div>
            <p className="text-[12px] leading-relaxed text-red-800/80 dark:text-red-200/80">
              不同 provider / 不同维度的向量空间不通用。切换 active embedding 后,
              已经入库的文档需要在 Knowledge 页面对每个 KB 点 <strong>Reindex</strong> 重新编码,
              否则检索会拿到错位的结果或直接拿不到。新建的 KB 没历史包袱,直接用新 embedding 编码即可。
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              Endpoint URL 字段
            </h3>
            <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              不像 LLM 的 Base URL 是 endpoint 父路径,
              Embedding 的 <strong>Endpoint URL 直接是完整请求路径</strong>(例如 https://api.openai.com/v1/embeddings),
              deeptutor 不会自动补 /embeddings。选完 provider 会自动填默认值,自定义网关需手填完整 URL。
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              Dimension 与 Send dimensions
            </h3>
            <ul className="space-y-1 pl-5 text-[12.5px] text-[var(--muted-foreground)] [&>li]:list-disc">
              <li>
                <strong>Dimension</strong>: 向量维度。Run-test 会从 provider 自动探测后回填,
                也可以手填覆盖 (例如 text-embedding-3-large 默认 3072d 但 OpenAI 支持
                降维到 1024d 省存储)。
              </li>
              <li>
                <strong>Send dimensions</strong>: 是否在请求 body 里传 dimensions 参数。
                Qwen v4 系列、部分本地模型不接受这个参数,
                返回 HTTP 400 时关掉这个开关再试。
              </li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              配完之后
            </h3>
            <ol className="space-y-1.5 pl-5 text-[12.5px] text-[var(--muted-foreground)] [&>li]:list-decimal">
              <li>auto-save 触发后自动落盘。</li>
              <li>
                <strong>Run test</strong> 验证 + 自动检测 dimension,日志里能看到「detected_dim=…」事件。
              </li>
              <li>
                <strong>Apply</strong> 写 .env (EMBEDDING_BINDING / EMBEDDING_API_KEY / EMBEDDING_BASE_URL /
                EMBEDDING_MODEL / EMBEDDING_DIMENSION)。
              </li>
              <li>
                若已有 KB:去 Knowledge 页面对每个 KB 点 <strong>Reindex</strong>。
              </li>
            </ol>
          </section>

          <section className="rounded-lg bg-[var(--muted)]/40 p-3">
            <div className="mb-1 text-[12.5px] font-medium text-[var(--foreground)]">
              选哪个?
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              中文为主、需要直连 → <strong>Qwen text-embedding-v3</strong> 或 <strong>SiliconFlow BAAI/bge-m3</strong>;
              英文为主、有代理 → <strong>OpenAI text-embedding-3-small</strong> (性价比 + 质量平衡);
              本地无网 → <strong>Ollama mxbai-embed-large</strong>。
              dimension 越高检索精度略好但存储和计算开销线性增加,1024-1536 是常见甜区。
            </p>
          </section>
        </>
      }
    />
  );
}
