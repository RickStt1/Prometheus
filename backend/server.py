from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, text
from database import get_db
from models import User, Roadmap, CompletedItem
from auth import get_current_user_email, is_admin, security, supabase, refresh_access_token
from gemini_service import generate_roadmap

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging FIRST
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

class SignUpRequest(BaseModel):
    email: str
    password: str

class SignInRequest(BaseModel):
    email: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RoadmapGenerateRequest(BaseModel):
    goal: str
    time_available: str
    current_level: str

class RoadmapCreateRequest(BaseModel):
    title: str
    description: str
    goal: str
    time_available: str
    current_level: str
    structure: dict
    total_items: int

class ToggleItemRequest(BaseModel):
    item_id: str
    completed: bool

class UpdateNotificationRequest(BaseModel):
    notification_time: Optional[str] = None
    notification_enabled: bool

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

def _sum_roadmap_hours(structure: dict) -> int:
    if not structure or not isinstance(structure, dict):
        return 0

    total_hours = 0
    modules = structure.get("modules", [])

    if not isinstance(modules, list):
        return 0

    for module in modules:
        topics = module.get("topics", []) if isinstance(module, dict) else []
        if not isinstance(topics, list):
            continue

        for topic in topics:
            if not isinstance(topic, dict):
                continue

            estimated_hours = topic.get("estimatedHours", 0)
            try:
                total_hours += int(float(estimated_hours))
            except (TypeError, ValueError):
                continue

    return max(0, total_hours)

def _xp_required_for_level(level: int) -> int:
    return int(100 * (1.35 ** max(0, level - 1)))

def _calculate_level_data(total_xp: int) -> dict:
    level = 1
    current_xp_pool = max(0, total_xp)
    xp_to_next = _xp_required_for_level(level)

    while current_xp_pool >= xp_to_next:
        current_xp_pool -= xp_to_next
        level += 1
        xp_to_next = _xp_required_for_level(level)

    progress_pct = int((current_xp_pool / xp_to_next) * 100) if xp_to_next > 0 else 0

    return {
        "level": level,
        "total_xp": max(0, total_xp),
        "current_level_xp": current_xp_pool,
        "next_level_xp": xp_to_next,
        "progress_percent": min(100, max(0, progress_pct))
    }

def _build_profile_payload(user: User, roadmaps: List[Roadmap], email: str) -> dict:
    total_hours = sum(_sum_roadmap_hours(r.structure) for r in roadmaps)
    total_xp = total_hours * 10
    level_data = _calculate_level_data(total_xp)

    return {
        "id": user.id,
        "email": email,
        "display_name": user.display_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "is_admin": is_admin(email),
        "stats": {
            "roadmaps_count": len(roadmaps),
            "total_hours": total_hours,
            **level_data
        }
    }

@app.get("/health")
async def healthcheck(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "reachable"
    }

@api_router.post("/auth/signup")
async def signup(data: SignUpRequest, db: AsyncSession = Depends(get_db)):
    try:
        logger.info(f"Sign up attempt for email: {data.email}")
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password
        })
        
        if response.user:
            user_id = response.user.id
            user_email = data.email
            # Verificar se usuário já existe por email (que é unique)
            result = await db.execute(select(User).where(User.email == user_email))
            existing_user = result.scalar_one_or_none()
            if not existing_user:
                # Criar novo usuário
                user = User(id=user_id, email=user_email)
                db.add(user)
                await db.commit()
                logger.info(f"User created in DB: {user_id}")
            else:
                logger.info(f"User already exists in DB with email: {user_email}")
                # Nunca atualize o ID! Use o ID existente para manter integridade
                user_id = existing_user.id
            # Check if session exists (it won't if email confirmation is required)
            if response.session:
                logger.info(f"Session created for user: {user_id}")
                return {
                    "user": {"id": user_id, "email": user_email},
                    "session": {"access_token": response.session.access_token}
                }
            else:
                logger.info(f"No session (email confirmation may be required)")
                return {
                    "user": {"id": user_id, "email": user_email},
                    "session": None,
                    "message": "Check your email to confirm your account"
                }
        else:
            logger.error("No user in signup response")
            raise Exception("User creation failed")
    except Exception as e:
        logger.error(f"Sign up error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/signin")
async def signin(data: SignInRequest, db: AsyncSession = Depends(get_db)):
    try:
        logger.info(f"Sign in attempt for email: {data.email}")
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        logger.info(f"Supabase response received. Has user: {hasattr(response, 'user') and response.user is not None}")
        
        # Garantir que o usuário existe no banco de dados local
        if response.user:
            user_id = response.user.id
            user_email = response.user.email or data.email
            # Verificar se o usuário já existe por email (que é unique)
            result = await db.execute(select(User).where(User.email == user_email))
            existing_user = result.scalar_one_or_none()
            if not existing_user:
                # Criar novo usuário
                user = User(id=user_id, email=user_email)
                db.add(user)
                await db.commit()
                logger.info(f"New user created in DB: {user_id}")
            else:
                logger.info(f"User already exists in DB with email: {user_email}")
                # Nunca atualize o ID! Use o ID existente para manter integridade
                user_id = existing_user.id
            return {
                "user": {"id": user_id, "email": user_email},
                "session": {"access_token": response.session.access_token}
            }
        else:
            logger.error("No user in response from Supabase")
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sign in error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/auth/refresh")
async def refresh(data: RefreshTokenRequest):
    """
    Endpoint para fazer refresh do access_token usando refresh_token.
    
    Quando o access_token expira, o cliente envia o refresh_token
    para obter um novo access_token sem precisar fazer login novamente.
    """
    token_data = await refresh_access_token(data.refresh_token)
    return {
        "user": token_data["user"],
        "session": {
            "access_token": token_data["access_token"],
            "refresh_token": token_data["refresh_token"]
        }
    }

@api_router.get("/auth/me")
async def get_me(
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": email,
        "display_name": user.display_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "is_admin": is_admin(email)
    }

@api_router.get("/profile")
async def get_profile(
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user.id)
        .order_by(Roadmap.created_at.desc())
    )
    roadmaps = result.scalars().all()

    return _build_profile_payload(user, roadmaps, email)

@api_router.put("/profile")
async def update_profile(
    data: ProfileUpdateRequest,
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    display_name = data.display_name.strip() if data.display_name else None
    bio = data.bio.strip() if data.bio else None
    avatar_url = data.avatar_url.strip() if data.avatar_url else None

    if display_name and len(display_name) > 40:
        raise HTTPException(status_code=400, detail="Display name must have at most 40 characters")

    if bio and len(bio) > 280:
        raise HTTPException(status_code=400, detail="Bio must have at most 280 characters")

    user.display_name = display_name
    user.bio = bio
    user.avatar_url = avatar_url

    await db.commit()

    result = await db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user.id)
        .order_by(Roadmap.created_at.desc())
    )
    roadmaps = result.scalars().all()

    return _build_profile_payload(user, roadmaps, email)

@api_router.post("/roadmaps/generate")
async def generate_roadmap_endpoint(
    data: RoadmapGenerateRequest,
    email: str = Depends(get_current_user_email)
):
    try:
        roadmap_structure = await generate_roadmap(
            data.goal,
            data.time_available,
            data.current_level
        )
        return roadmap_structure
    except Exception as e:
        logger.error(f"Error generating roadmap: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")

@api_router.post("/roadmaps")
async def create_roadmap(
    data: RoadmapCreateRequest,
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    # Tentar obter o usuário
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    # Se o usuário não existe (signem anterior ou erro), criar um novo
    if not user:
        try:
            # Tentar obter o ID do usuário do Supabase
            supabase_user = supabase.auth.get_user(from_context=True)
            user_id = supabase_user.id if hasattr(supabase_user, 'id') else str(supabase_user)
        except:
            # Se falhar, gerar um UUID
            import uuid
            user_id = str(uuid.uuid4())
        
        user = User(id=user_id, email=email)
        db.add(user)
        await db.commit()
    
    roadmap = Roadmap(
        user_id=user.id,
        title=data.title,
        description=data.description,
        goal=data.goal,
        time_available=data.time_available,
        current_level=data.current_level,
        structure=data.structure,
        total_items=data.total_items,
        progress=0
    )
    
    db.add(roadmap)
    await db.commit()
    
    return {
        "id": str(roadmap.id),
        "title": roadmap.title,
        "description": roadmap.description,
        "progress": roadmap.progress,
        "total_items": roadmap.total_items,
        "created_at": roadmap.created_at.isoformat() if roadmap.created_at else None
    }

@api_router.get("/roadmaps")
async def get_roadmaps(
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        return []
    
    result = await db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user.id)
        .order_by(Roadmap.created_at.desc())
    )
    roadmaps = result.scalars().all()
    
    return [{
        "id": r.id,
        "title": r.title,
        "description": r.description,
        "goal": r.goal,
        "progress": r.progress,
        "total_items": r.total_items,
        "created_at": r.created_at.isoformat()
    } for r in roadmaps]

@api_router.get("/roadmaps/{roadmap_id}")
async def get_roadmap(
    roadmap_id: str,
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(
        select(Roadmap).where(
            Roadmap.id == roadmap_id,
            Roadmap.user_id == user.id
        )
    )
    roadmap = result.scalar_one_or_none()
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    result = await db.execute(
        select(CompletedItem).where(CompletedItem.roadmap_id == roadmap_id)
    )
    completed = result.scalars().all()
    completed_ids = [item.item_id for item in completed]
    
    return {
        "id": roadmap.id,
        "title": roadmap.title,
        "description": roadmap.description,
        "goal": roadmap.goal,
        "time_available": roadmap.time_available,
        "current_level": roadmap.current_level,
        "structure": roadmap.structure,
        "progress": roadmap.progress,
        "total_items": roadmap.total_items,
        "notification_time": roadmap.notification_time,
        "notification_enabled": roadmap.notification_enabled,
        "completed_items": completed_ids,
        "created_at": roadmap.created_at.isoformat()
    }

@api_router.post("/roadmaps/{roadmap_id}/toggle-item")
async def toggle_item(
    roadmap_id: str,
    data: ToggleItemRequest,
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(
        select(Roadmap).where(
            Roadmap.id == roadmap_id,
            Roadmap.user_id == user.id
        )
    )
    roadmap = result.scalar_one_or_none()
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    if data.completed:
        # Verificar se já existe
        result = await db.execute(
            select(CompletedItem).where(
                CompletedItem.roadmap_id == roadmap_id,
                CompletedItem.item_id == data.item_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            completed_item = CompletedItem(
                roadmap_id=roadmap_id,
                item_id=data.item_id
            )
            db.add(completed_item)
    else:
        # Deletar usando execute e delete statement
        await db.execute(
            delete(CompletedItem).where(
                CompletedItem.roadmap_id == roadmap_id,
                CompletedItem.item_id == data.item_id
            )
        )
    
    # Fazer commit para persistir as mudanças
    await db.commit()
    
    # Depois de commit, contar os itens
    result = await db.execute(
        select(func.count(CompletedItem.id)).where(
            CompletedItem.roadmap_id == roadmap_id
        )
    )
    completed_count = result.scalar() or 0
    
    # Atualizar o roadmap com a contagem correta
    roadmap.progress = completed_count
    await db.commit()
    
    return {"progress": roadmap.progress, "total_items": roadmap.total_items}

@api_router.put("/roadmaps/{roadmap_id}/notifications")
async def update_notifications(
    roadmap_id: str,
    data: UpdateNotificationRequest,
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(
        select(Roadmap).where(
            Roadmap.id == roadmap_id,
            Roadmap.user_id == user.id
        )
    )
    roadmap = result.scalar_one_or_none()
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    roadmap.notification_enabled = data.notification_enabled
    if data.notification_time:
        roadmap.notification_time = data.notification_time
    
    await db.commit()
    
    return {"notification_enabled": roadmap.notification_enabled, "notification_time": roadmap.notification_time}

@api_router.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap(
    roadmap_id: str,
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(
        select(Roadmap).where(
            Roadmap.id == roadmap_id,
            Roadmap.user_id == user.id
        )
    )
    roadmap = result.scalar_one_or_none()
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Deletar todos os itens completados associados já vão ser deletados por cascata
    # Mas vamos ser explícito
    await db.execute(
        delete(CompletedItem).where(CompletedItem.roadmap_id == roadmap_id)
    )
    
    # Deletar o roadmap
    await db.execute(
        delete(Roadmap).where(Roadmap.id == roadmap_id)
    )
    await db.commit()
    
    return {"message": "Roadmap deleted successfully"}

@api_router.get("/admin/users")
async def get_all_users(
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db)
):
    if not is_admin(email):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    
    return [{
        "id": u.id,
        "email": u.email,
        "created_at": u.created_at.isoformat()
    } for u in users]

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)