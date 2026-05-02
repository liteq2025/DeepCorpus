"""Feature 后端 router — 由 plugin loader（P4 实现）自动挂载。

挂载路径来自 manifest.backend，URL 前缀建议为 /api/v1/<feature_name>。
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
