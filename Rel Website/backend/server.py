from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "Admin"
    RELIABILITY_ENGINEER = "Reliability Engineer"
    FAILURE_ANALYSIS = "Failure Analysis"
    OPERATOR = "Operator"
    REQUESTOR = "Requestor"

class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ProcessStep(BaseModel):
    step_number: int
    step_name: str
    status: StepStatus = StepStatus.PENDING
    completed_at: Optional[datetime] = None
    machine_no: Optional[str] = None
    operator_id: Optional[str] = None
    tray_no: Optional[str] = None
    notes: Optional[str] = None
    attachments: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)

class Request(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_number: str
    classification: Optional[str] = ""
    originator: Optional[str] = ""
    plant: Optional[str] = ""
    device_name: Optional[str] = ""
    lot_no: Optional[str] = ""
    customer: Optional[str] = ""
    pkg_info: Optional[str] = ""
    automotive: bool = False
    date_ltc: Optional[str] = None
    product_hierarchy: Optional[str] = None
    pdl: Optional[str] = None
    body_size_x: Optional[float] = None
    body_size_y: Optional[float] = None
    package_thickness: Optional[float] = None
    ball_pitch: Optional[float] = None
    ball_count: Optional[int] = None
    lead_pitch: Optional[float] = None
    lead_count: Optional[int] = None
    total_ss: Optional[str] = None
    purpose: Optional[str] = ""
    engineer_special_instruction: Optional[str] = None
    deadline: Optional[str] = None
    created_by: str
    created_by_username: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"
    current_step: int = 1
    steps: List[ProcessStep]

class RequestCreate(BaseModel):
    request_number: Optional[str] = None
    status: Optional[str] = None
    classification: Optional[str] = None
    originator: Optional[str] = None
    plant: Optional[str] = None
    device_name: Optional[str] = None
    lot_no: Optional[str] = None
    customer: Optional[str] = None
    pkg_info: Optional[str] = None
    automotive: Optional[bool] = False
    date_ltc: Optional[str] = None
    product_hierarchy: Optional[str] = None
    pdl: Optional[str] = None
    body_size_x: Optional[float] = None
    body_size_y: Optional[float] = None
    package_thickness: Optional[float] = None
    ball_pitch: Optional[float] = None
    ball_count: Optional[int] = None
    lead_pitch: Optional[float] = None
    lead_count: Optional[int] = None
    total_ss: Optional[str] = None
    purpose: Optional[str] = None
    engineer_special_instruction: Optional[str] = None
    deadline: Optional[str] = None

class StepUpdate(BaseModel):
    status: Optional[StepStatus] = None
    machine_no: Optional[str] = None
    operator_id: Optional[str] = None
    tray_no: Optional[str] = None
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class DashboardStats(BaseModel):
    total_requests: int
    active_requests: int
    completed_requests: int
    pending_requests: int
    ongoing_requests: int
    delayed_requests: int
    upcoming_deadline_requests: int
    recent_activity: List[Dict[str, Any]]
    delayed_requests_list: List[Dict[str, Any]]

class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    app_name: str = "Rel Request Process Flow"
    app_logo: Optional[str] = None
    company_name: Optional[str] = None
    contact_email: Optional[str] = None
    process_steps: List[str] = Field(default_factory=lambda: [step["step_name"] for step in DEFAULT_STEPS])
    custom_fields: Dict[str, Any] = {}
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    app_name: Optional[str] = None
    app_logo: Optional[str] = None
    company_name: Optional[str] = None
    contact_email: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if user_data is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    return User(**user_data)

def require_role(allowed_roles: List[UserRole]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# Initialize default steps
DEFAULT_STEPS = [
    {"step_number": 1, "step_name": "Incoming Inspection", "status": StepStatus.PENDING},
    {"step_number": 2, "step_name": "Visual", "status": StepStatus.PENDING},
    {"step_number": 3, "step_name": "Serialize Samples", "status": StepStatus.PENDING},
    {"step_number": 4, "step_name": "O/S", "status": StepStatus.PENDING},
    {"step_number": 5, "step_name": "Sat", "status": StepStatus.PENDING},
    {"step_number": 6, "step_name": "Bake", "status": StepStatus.PENDING},
    {"step_number": 7, "step_name": "Reflow", "status": StepStatus.PENDING},
    {"step_number": 8, "step_name": "SAT", "status": StepStatus.PENDING},
    {"step_number": 9, "step_name": "O/S", "status": StepStatus.PENDING},
    {"step_number": 10, "step_name": "Visual", "status": StepStatus.PENDING},
    {"step_number": 11, "step_name": "HTS", "status": StepStatus.PENDING},
    {"step_number": 12, "step_name": "SAT", "status": StepStatus.PENDING},
    {"step_number": 13, "step_name": "O/S", "status": StepStatus.PENDING},
    {"step_number": 14, "step_name": "Visual", "status": StepStatus.PENDING},
]

# Auth Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_create: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_create.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_create.password)
    
    # Create user
    user_data = user_create.model_dump(exclude={"password"})
    user = User(**user_data)
    
    doc = user.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user_data = await db.users.find_one({"email": user_login.email}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_login.password, user_data['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data['id']})
    
    # Remove password from response
    user_data.pop('password')
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    user = User(**user_data)
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# User Management Routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER]))):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Request Routes
@api_router.post("/requests", response_model=Request)
async def create_request(
    request_create: RequestCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER]))
):
    # Generate request number if not provided
    request_number = request_create.request_number
    if not request_number:
        count = await db.requests.count_documents({})
        request_number = f"REL-{count + 1:06d}"
    
    # Create request with default steps
    steps = [ProcessStep(**step) for step in DEFAULT_STEPS]
    
    request_data = request_create.model_dump(exclude_none=True)
    request_data['request_number'] = request_number
    request_data['status'] = request_data.get('status') or 'pending'
    
    request = Request(
        **request_data,
        created_by=current_user.id,
        created_by_username=current_user.username,
        steps=steps
    )
    
    doc = request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['steps'] = [{
        **step,
        'completed_at': step['completed_at'].isoformat() if step['completed_at'] else None
    } for step in doc['steps']]
    
    await db.requests.insert_one(doc)
    return request

@api_router.get("/requests", response_model=List[Request])
async def get_requests(
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    # Requestors can only see their own requests
    if current_user.role == UserRole.REQUESTOR:
        query["created_by"] = current_user.id
    
    if search:
        query["$or"] = [
            {"request_number": {"$regex": search, "$options": "i"}},
            {"device_name": {"$regex": search, "$options": "i"}},
            {"customer": {"$regex": search, "$options": "i"}},
            {"lot_no": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    requests = await db.requests.find(query, {"_id": 0}).to_list(1000)
    
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if isinstance(req.get('updated_at'), str):
            req['updated_at'] = datetime.fromisoformat(req['updated_at'])
        for step in req['steps']:
            if isinstance(step.get('completed_at'), str):
                step['completed_at'] = datetime.fromisoformat(step['completed_at'])
    
    return requests

@api_router.get("/requests/{request_id}", response_model=Request)
async def get_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Requestors can only see their own requests
    if current_user.role == UserRole.REQUESTOR and request['created_by'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if isinstance(request.get('created_at'), str):
        request['created_at'] = datetime.fromisoformat(request['created_at'])
    if isinstance(request.get('updated_at'), str):
        request['updated_at'] = datetime.fromisoformat(request['updated_at'])
    for step in request['steps']:
        if isinstance(step.get('completed_at'), str):
            step['completed_at'] = datetime.fromisoformat(step['completed_at'])
    
    return request

@api_router.patch("/requests/{request_id}/steps/{step_number}")
async def update_step(
    request_id: str,
    step_number: int,
    step_update: StepUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER, UserRole.FAILURE_ANALYSIS, UserRole.OPERATOR]))
):
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Find and update the step
    step_index = step_number - 1
    if step_index < 0 or step_index >= len(request['steps']):
        raise HTTPException(status_code=400, detail="Invalid step number")
    
    update_data = step_update.model_dump(exclude_unset=True)
    
    # Set completed_at if status is completed
    if update_data.get('status') == StepStatus.COMPLETED:
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    
    # Update the step
    for key, value in update_data.items():
        request['steps'][step_index][key] = value
    
    # Update current_step and overall status
    completed_steps = sum(1 for step in request['steps'] if step['status'] == StepStatus.COMPLETED)
    request['current_step'] = completed_steps + 1
    
    if completed_steps == len(request['steps']):
        request['status'] = 'completed'
    elif completed_steps > 0:
        request['status'] = 'in_progress'
    
    request['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {"steps": request['steps'], "current_step": request['current_step'], "status": request['status'], "updated_at": request['updated_at']}}
    )
    
    return {"message": "Step updated successfully", "request": request}

@api_router.patch("/requests/{request_id}")
async def update_request(
    request_id: str,
    request_update: RequestCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER]))
):
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = request_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Also update the status if provided
    if 'status' in update_data:
        update_data['status'] = update_data['status']
    
    await db.requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    return {"message": "Request updated successfully", "request_id": request_id}

@api_router.delete("/requests/{request_id}")
async def delete_request(
    request_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER]))
):
    result = await db.requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted successfully"}

# Dashboard Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == UserRole.REQUESTOR:
        query["created_by"] = current_user.id
    
    total_requests = await db.requests.count_documents(query)
    active_requests = await db.requests.count_documents({**query, "status": "in_progress"})
    completed_requests = await db.requests.count_documents({**query, "status": "completed"})
    pending_requests = await db.requests.count_documents({**query, "status": "pending"})
    ongoing_requests = active_requests  # Same as active
    
    # Calculate delayed requests (past deadline and not completed)
    today = datetime.now(timezone.utc).isoformat()
    all_requests = await db.requests.find(query, {"_id": 0}).to_list(1000)
    delayed_requests = 0
    upcoming_deadline_requests = 0
    delayed_requests_list = []
    
    for req in all_requests:
        if req.get('deadline') and req['status'] != 'completed':
            deadline = req['deadline']
            if deadline < today:
                delayed_requests += 1
                delayed_requests_list.append({
                    "id": req['id'],
                    "request_number": req['request_number'],
                    "device_name": req.get('device_name', ''),
                    "customer": req.get('customer', ''),
                    "deadline": req['deadline'],
                    "created_at": req['created_at'],
                    "status": req['status']
                })
            elif deadline <= (datetime.now(timezone.utc) + timedelta(days=3)).isoformat():
                upcoming_deadline_requests += 1
    
    # Sort delayed requests by created_at (submission date)
    delayed_requests_list.sort(key=lambda x: x['created_at'])
    
    # Get recent activity
    recent = await db.requests.find(query, {"_id": 0}).sort("updated_at", -1).limit(10).to_list(10)
    recent_activity = []
    for req in recent:
        recent_activity.append({
            "id": req['id'],
            "request_number": req['request_number'],
            "device_name": req.get('device_name', ''),
            "customer": req.get('customer', ''),
            "status": req['status'],
            "current_step": req['current_step'],
            "updated_at": req['updated_at'],
            "deadline": req.get('deadline')
        })
    
    return DashboardStats(
        total_requests=total_requests,
        active_requests=active_requests,
        completed_requests=completed_requests,
        pending_requests=pending_requests,
        ongoing_requests=ongoing_requests,
        delayed_requests=delayed_requests,
        upcoming_deadline_requests=upcoming_deadline_requests,
        recent_activity=recent_activity,
        delayed_requests_list=delayed_requests_list
    )

@api_router.get("/")
async def root():
    return {"message": "Rel Request Process Flow API"}

# Settings Routes
@api_router.get("/settings", response_model=AppSettings)
async def get_settings(current_user: User = Depends(get_current_user)):
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default settings
        default_settings = AppSettings()
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return AppSettings(**settings)

@api_router.patch("/settings")
async def update_settings(
    settings_update: SettingsUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.RELIABILITY_ENGINEER]))
):
    update_data = settings_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Upsert settings
    await db.settings.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

# File Upload Route
@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("/app/uploads")
        upload_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return file URL/path
        return {
            "filename": unique_filename,
            "original_filename": file.filename,
            "url": f"/uploads/{unique_filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

app.include_router(api_router)

# Create uploads directory and mount static files
upload_dir = Path("/app/uploads")
upload_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
