from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path
import json

load_dotenv(Path(__file__).parent / '.env')

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_ANON_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Valida o token JWT do usuário.
    Se o token for inválido, retorna erro 401 >:D.
    """
    try:
        token = credentials.credentials
        # Use o método correto com a chave de admin
        from logging import getLogger
        logger = getLogger(__name__)
        
        try:
            # Tentar com o método correto do Supabase
            user = supabase.auth.get_user(token)
            if hasattr(user, 'user') and user.user:
                return user.user
            elif hasattr(user, 'id'):
                # Se for um objeto de usuário direto
                return user
            else:
                logger.error(f"Unexpected user response: {user}")
                raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        except Exception as e:
            logger.error(f"Supabase get_user error: {str(e)}")
            raise
            
    except Exception as e:
        # Verifica se é erro de token expirado
        error_str = str(e).lower()
        if "expired" in error_str or "invalid" in error_str:
            raise HTTPException(status_code=401, detail="Token expired or invalid. Please refresh your token.")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_current_user_email(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    user = await get_current_user(credentials)
    return user.email

def is_admin(email: str) -> bool:
    admin_email = os.environ.get('ADMIN_EMAIL')
    return email == admin_email

async def refresh_access_token(refresh_token: str):
    """
    Usa o refresh_token para obter um novo access_token.
    
    Args:
        refresh_token: O refresh token do usuário
        
    Returns:
        Dict com novo access_token, refresh_token e user info
        
    Raises:
        HTTPException se o refresh falhar
    """
    try:
        response = supabase.auth.refresh_session(refresh_token)
        if response.session:
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Failed to refresh token")
    except Exception as e:
        error_msg = str(e).lower()
        if "invalid" in error_msg or "expired" in error_msg:
            raise HTTPException(status_code=401, detail="Refresh token expired or invalid. Please login again.")
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {str(e)}")