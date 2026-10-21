"""Main API router — aggregates all route modules."""

from fastapi import APIRouter

from app.api.routes import (
    activity,
    ai,
    analysis,
    action_plans,
    briefing,
    files,
    health,
    settings as settings_routes,
    tasks,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
# Action plans split into two routers with clean prefixes
api_router.include_router(action_plans.plans_router, prefix="/action-plans", tags=["action-plans"])
api_router.include_router(action_plans.actions_router, prefix="/actions", tags=["actions"])
api_router.include_router(activity.router, prefix="/activity", tags=["activity"])
api_router.include_router(settings_routes.router, prefix="/settings", tags=["settings"])
api_router.include_router(briefing.router, prefix="/briefing", tags=["briefing"])
