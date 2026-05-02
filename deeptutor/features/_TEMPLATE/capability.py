"""Capability — 注入 ChatOrchestrator 的"编排剧本"。

仅在特性需要作为 chat mode 出现时实现。
详见 AGENTS.md §3。
"""
from deeptutor.core.capability_protocol import BaseCapability, CapabilityManifest
from deeptutor.core.context import UnifiedContext
from deeptutor.core.stream_bus import StreamBus


class MyFeatureCapability(BaseCapability):
    manifest = CapabilityManifest(
        name="my_feature",
        description="One-line description",
        stages=["responding"],
    )

    async def run(self, context: UnifiedContext, stream: StreamBus) -> None:
        async with stream.stage("responding", source=self.name):
            await stream.content("Hello from my_feature.", source=self.name)
        await stream.result({"response": "Done."}, source=self.name)
