from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Company, CV
from app.api.deps import get_current_user
from typing import Dict, Optional
from datetime import datetime, timezone
import asyncio
from jose import jwt, JWTError
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/sync", tags=["Sync"])

# Active WebSocket connections for sync updates
sync_connections: Dict[str, WebSocket] = {}

async def authenticate_sync_websocket(websocket: WebSocket) -> Optional[User]:
    """Authenticate WebSocket connection for sync updates"""
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return None
    
    db_gen = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            await websocket.close(code=1008, reason="Invalid token")
            return None
        
        db_gen = get_db()
        db = next(db_gen)
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return None
            
            return user
        finally:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
    except JWTError:
        await websocket.close(code=1008, reason="Invalid token")
        return None
    except Exception as e:
        await websocket.close(code=1011, reason=f"Authentication error: {str(e)}")
        return None
    finally:
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass

@router.websocket("/ws/sync")
async def websocket_sync(websocket: WebSocket):
    """
    WebSocket endpoint for real-time sync updates.
    Pushes updates when:
    - Company data version changes (last_data_update)
    - CV processing status changes
    - App version changes
    
    Connect with: ws://host/api/sync/ws/sync?token=YOUR_JWT_TOKEN
    """
    await websocket.accept()
    
    user = await authenticate_sync_websocket(websocket)
    if not user:
        return
    
    connection_id = f"{user.id}_{datetime.now(timezone.utc).timestamp()}"
    sync_connections[connection_id] = websocket
    
    # Track last known state
    last_version = None
    last_processing_ids = set()
    last_app_version = None
    
    try:
        # Send initial state
        db_gen = None
        try:
            db_gen = get_db()
            db = next(db_gen)
            try:
                # Get initial version
                if user.company:
                    db.refresh(user.company)
                    last_version = user.company.last_data_update.isoformat() if user.company.last_data_update else None
                else:
                    last_version = f"no_company_{user.id}"
                
                # Get initial processing IDs
                if user.company_id:
                    processing_cvs = db.query(CV.id).filter(
                        CV.is_parsed.is_(False),
                        CV.company_id == user.company_id
                    ).all()
                    last_processing_ids = {cv.id for cv in processing_cvs}
                
                # Get app version
                from app.main import APP_VERSION
                last_app_version = APP_VERSION
                
                await websocket.send_json({
                    "type": "initial_state",
                    "data_version": last_version,
                    "processing_ids": list(last_processing_ids),
                    "app_version": last_app_version
                })
            finally:
                try:
                    next(db_gen, None)
                except StopIteration:
                    pass
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        
        # Monitor for changes (check every 2 seconds)
        while True:
            try:
                await asyncio.sleep(2)  # Check every 2 seconds
                
                db_gen = None
                try:
                    db_gen = get_db()
                    db = next(db_gen)
                    try:
                        updates = {}
                        
                        # Check data version
                        if user.company:
                            db.refresh(user.company)
                            current_version = user.company.last_data_update.isoformat() if user.company.last_data_update else None
                            if current_version != last_version:
                                updates["data_version"] = current_version
                                last_version = current_version
                        else:
                            current_version = f"no_company_{user.id}"
                            if current_version != last_version:
                                updates["data_version"] = current_version
                                last_version = current_version
                        
                        # Check CV processing status
                        if user.company_id:
                            processing_cvs = db.query(CV.id).filter(
                                CV.is_parsed.is_(False),
                                CV.company_id == user.company_id
                            ).all()
                            current_processing_ids = {cv.id for cv in processing_cvs}
                            
                            # Check if any CVs finished processing
                            if current_processing_ids != last_processing_ids:
                                finished_ids = last_processing_ids - current_processing_ids
                                if finished_ids:
                                    updates["cv_finished"] = list(finished_ids)
                                updates["processing_ids"] = list(current_processing_ids)
                                last_processing_ids = current_processing_ids
                        
                        # Check app version
                        from app.main import APP_VERSION
                        if APP_VERSION != last_app_version:
                            updates["app_version"] = APP_VERSION
                            last_app_version = APP_VERSION
                        
                        # Send updates if any changes detected
                        if updates:
                            await websocket.send_json({
                                "type": "update",
                                **updates
                            })
                    finally:
                        try:
                            next(db_gen, None)
                        except StopIteration:
                            pass
                except Exception as e:
                    # Log error but continue monitoring
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": str(e)
                        })
                    except:
                        pass  # Connection might be closed
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        if connection_id in sync_connections:
            del sync_connections[connection_id]

@router.get("/version", response_model=Dict[str, str])
def get_data_version(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the current data version (timestamp) for the user's company.
    DEPRECATED: Use WebSocket /ws/sync instead for real-time updates.
    Kept for backward compatibility.
    """
    if not current_user.company:
        return {"version": f"no_company_{current_user.id}"}
        
    db.refresh(current_user.company)
    
    version = current_user.company.last_data_update
    if not version:
        version = current_user.company.created_at
        
    return {"version": version.isoformat() if version else datetime.now(timezone.utc).isoformat()}

