"""Domain Capabilities — orchestrator 可选择的 mode（持有"编排剧本"）。

P2 目标结构：每个 mode 一个子目录
  capability/<name>/capability.py + manifest.yaml + prompts/
P5 阶段：把编排逻辑从原 agents/<mode>/pipeline.py 上提到此处。
"""
