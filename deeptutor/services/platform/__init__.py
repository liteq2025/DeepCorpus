"""L2 Platform Services — 单一职责的横切能力。

此层禁止 import L3（services/domain）和 L4（features/）。
P2 阶段会把 ../llm、../rag、../embedding 等子模块迁入此目录。
详见 AGENTS.md §2。
"""
