"""L4 Feature Plugins — 用户故事的载体。

每个特性 = 一个 manifest.yaml + 后端 router + 前端 route。
同层互不依赖。允许 import L1 (core)、L2 (services/platform)、L3 (services/domain)。
详见 AGENTS.md §4-§5。
"""
