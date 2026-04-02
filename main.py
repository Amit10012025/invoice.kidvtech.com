# ============================================================
#  KIDV Invoice — FastAPI Backend
#  Install: pip install -r requirements.txt
#  Run:     uvicorn main:app --reload
# ============================================================

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ── Supabase client ───────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # service_role key (backend only)
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── App ───────────────────────────────────────────────────
app = FastAPI(
    title="KIDV Invoice API",
    description="Backend API for KIDV Invoice — GST Invoicing Software",
    version="2.0.0"
)

# CORS — frontend domains allow karo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://invoice.kidvtech.com",
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "*",  # Development time — production ma specific domains rakho
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Dependency ───────────────────────────────────────
async def get_current_user(authorization: str = Header(None)):
    """
    Frontend thi 'Authorization: Bearer <supabase_access_token>' aave
    Aa token verify karine user_id kadhe
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    
    token = authorization.split(" ")[1]
    
    try:
        # Supabase JWT verify karo
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")


# ── Pydantic Models ───────────────────────────────────────

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None

class CompanySettings(BaseModel):
    name: Optional[str] = ""
    gstin: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    bank_name: Optional[str] = ""
    bank_account: Optional[str] = ""
    bank_ifsc: Optional[str] = ""
    bank_branch: Optional[str] = ""
    invoice_prefix: Optional[str] = "INV-"
    invoice_next_no: Optional[int] = 1
    invoice_footer: Optional[str] = ""
    gst_type: Optional[str] = "regular"

class ClientModel(BaseModel):
    name: str
    gstin: Optional[str] = ""
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""
    notes: Optional[str] = ""

class ProductModel(BaseModel):
    name: str
    hsn_sac: Optional[str] = ""
    unit: Optional[str] = "Nos"
    price: Optional[float] = 0
    gst_rate: Optional[float] = 18
    type: Optional[str] = "product"
    description: Optional[str] = ""

class InvoiceItemModel(BaseModel):
    product_id: Optional[str] = None
    name: str
    hsn_sac: Optional[str] = ""
    quantity: Optional[float] = 1
    unit: Optional[str] = "Nos"
    price: Optional[float] = 0
    discount_pct: Optional[float] = 0
    gst_rate: Optional[float] = 18
    taxable_amount: Optional[float] = 0
    cgst_amount: Optional[float] = 0
    sgst_amount: Optional[float] = 0
    igst_amount: Optional[float] = 0
    total: Optional[float] = 0
    sort_order: Optional[int] = 0

class InvoiceModel(BaseModel):
    invoice_no: str
    client_id: Optional[str] = None
    client_name: str
    client_gstin: Optional[str] = ""
    client_address: Optional[str] = ""
    date: date
    due_date: Optional[date] = None
    status: Optional[str] = "pending"
    subtotal: Optional[float] = 0
    cgst: Optional[float] = 0
    sgst: Optional[float] = 0
    igst: Optional[float] = 0
    total_tax: Optional[float] = 0
    discount: Optional[float] = 0
    total: Optional[float] = 0
    amount_paid: Optional[float] = 0
    amount_due: Optional[float] = 0
    notes: Optional[str] = ""
    terms: Optional[str] = ""
    items: List[InvoiceItemModel] = []

class PaymentModel(BaseModel):
    invoice_id: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    invoice_no: Optional[str] = ""
    amount: float
    mode: Optional[str] = "cash"
    date: date
    reference: Optional[str] = ""
    notes: Optional[str] = ""


# ════════════════════════════════════════════════════════════
# HEALTH CHECK
# ════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"message": "KIDV Invoice API v2.0 — Running ✅", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ════════════════════════════════════════════════════════════
# USER PROFILE
# ════════════════════════════════════════════════════════════
@app.get("/api/profile")
async def get_profile(user=Depends(get_current_user)):
    result = supabase.table("user_profiles").select("*").eq("id", user.id).single().execute()
    return result.data or {}

@app.put("/api/profile")
async def update_profile(data: UserProfileUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    result = supabase.table("user_profiles").update(update_data).eq("id", user.id).execute()
    return {"success": True, "data": result.data}


# ════════════════════════════════════════════════════════════
# COMPANY SETTINGS
# ════════════════════════════════════════════════════════════
@app.get("/api/company")
async def get_company(user=Depends(get_current_user)):
    result = supabase.table("company_settings").select("*").eq("user_id", user.id).execute()
    return result.data[0] if result.data else {}

@app.post("/api/company")
async def save_company(data: CompanySettings, user=Depends(get_current_user)):
    payload = {**data.dict(), "user_id": user.id}
    # Upsert — nahi hoy to create, hoy to update
    result = supabase.table("company_settings").upsert(
        payload, on_conflict="user_id"
    ).execute()
    return {"success": True, "data": result.data}


# ════════════════════════════════════════════════════════════
# CLIENTS
# ════════════════════════════════════════════════════════════
@app.get("/api/clients")
async def list_clients(user=Depends(get_current_user)):
    result = supabase.table("clients").select("*").eq("user_id", user.id).order("name").execute()
    return result.data

@app.post("/api/clients")
async def create_client(data: ClientModel, user=Depends(get_current_user)):
    payload = {**data.dict(), "user_id": user.id}
    result = supabase.table("clients").insert(payload).execute()
    return {"success": True, "data": result.data[0]}

@app.put("/api/clients/{client_id}")
async def update_client(client_id: str, data: ClientModel, user=Depends(get_current_user)):
    result = supabase.table("clients").update(data.dict()).eq("id", client_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True, "data": result.data[0]}

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str, user=Depends(get_current_user)):
    supabase.table("clients").delete().eq("id", client_id).eq("user_id", user.id).execute()
    return {"success": True}


# ════════════════════════════════════════════════════════════
# PRODUCTS
# ════════════════════════════════════════════════════════════
@app.get("/api/products")
async def list_products(user=Depends(get_current_user)):
    result = supabase.table("products").select("*").eq("user_id", user.id).order("name").execute()
    return result.data

@app.post("/api/products")
async def create_product(data: ProductModel, user=Depends(get_current_user)):
    payload = {**data.dict(), "user_id": user.id}
    result = supabase.table("products").insert(payload).execute()
    return {"success": True, "data": result.data[0]}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, data: ProductModel, user=Depends(get_current_user)):
    result = supabase.table("products").update(data.dict()).eq("id", product_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "data": result.data[0]}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, user=Depends(get_current_user)):
    supabase.table("products").delete().eq("id", product_id).eq("user_id", user.id).execute()
    return {"success": True}


# ════════════════════════════════════════════════════════════
# INVOICES
# ════════════════════════════════════════════════════════════
@app.get("/api/invoices")
async def list_invoices(
    status: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = supabase.table("invoices").select(
        "*, invoice_items(*)"
    ).eq("user_id", user.id).order("date", desc=True)
    
    if status:
        query = query.eq("status", status)
    
    result = query.execute()
    return result.data

@app.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user=Depends(get_current_user)):
    result = supabase.table("invoices").select(
        "*, invoice_items(*)"
    ).eq("id", invoice_id).eq("user_id", user.id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result.data

@app.post("/api/invoices")
async def create_invoice(data: InvoiceModel, user=Depends(get_current_user)):
    # Invoice header insert
    items = data.items
    invoice_data = {k: v for k, v in data.dict().items() if k != "items"}
    invoice_data["user_id"] = user.id
    invoice_data["date"] = str(invoice_data["date"])
    if invoice_data.get("due_date"):
        invoice_data["due_date"] = str(invoice_data["due_date"])
    
    inv_result = supabase.table("invoices").insert(invoice_data).execute()
    invoice = inv_result.data[0]
    invoice_id = invoice["id"]
    
    # Invoice items insert
    if items:
        items_data = [
            {**item.dict(), "invoice_id": invoice_id, "user_id": user.id}
            for item in items
        ]
        supabase.table("invoice_items").insert(items_data).execute()
    
    # Next invoice number update
    supabase.table("company_settings").update({
        "invoice_next_no": supabase.table("company_settings")
            .select("invoice_next_no").eq("user_id", user.id).execute().data[0].get("invoice_next_no", 1) + 1
    }).eq("user_id", user.id).execute()
    
    return {"success": True, "data": invoice}

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceModel, user=Depends(get_current_user)):
    items = data.items
    invoice_data = {k: v for k, v in data.dict().items() if k != "items"}
    invoice_data["date"] = str(invoice_data["date"])
    if invoice_data.get("due_date"):
        invoice_data["due_date"] = str(invoice_data["due_date"])
    
    # Update header
    supabase.table("invoices").update(invoice_data).eq("id", invoice_id).eq("user_id", user.id).execute()
    
    # Replace items
    supabase.table("invoice_items").delete().eq("invoice_id", invoice_id).execute()
    if items:
        items_data = [
            {**item.dict(), "invoice_id": invoice_id, "user_id": user.id}
            for item in items
        ]
        supabase.table("invoice_items").insert(items_data).execute()
    
    return {"success": True}

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user=Depends(get_current_user)):
    # Items auto-delete due to CASCADE
    supabase.table("invoices").delete().eq("id", invoice_id).eq("user_id", user.id).execute()
    return {"success": True}

@app.patch("/api/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, user=Depends(get_current_user)):
    valid = ["pending", "paid", "partial", "overdue", "cancelled"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be: {valid}")
    supabase.table("invoices").update({"status": status}).eq("id", invoice_id).eq("user_id", user.id).execute()
    return {"success": True}


# ════════════════════════════════════════════════════════════
# PAYMENTS
# ════════════════════════════════════════════════════════════
@app.get("/api/payments")
async def list_payments(user=Depends(get_current_user)):
    result = supabase.table("payments").select("*").eq("user_id", user.id).order("date", desc=True).execute()
    return result.data

@app.post("/api/payments")
async def create_payment(data: PaymentModel, user=Depends(get_current_user)):
    payload = {**data.dict(), "user_id": user.id, "date": str(data.date)}
    result = supabase.table("payments").insert(payload).execute()
    payment = result.data[0]
    
    # Invoice amount_paid update karo
    if data.invoice_id:
        inv = supabase.table("invoices").select("total, amount_paid").eq("id", data.invoice_id).single().execute().data
        if inv:
            new_paid = float(inv.get("amount_paid", 0)) + data.amount
            new_due = float(inv.get("total", 0)) - new_paid
            new_status = "paid" if new_due <= 0 else "partial"
            supabase.table("invoices").update({
                "amount_paid": round(new_paid, 2),
                "amount_due": round(max(new_due, 0), 2),
                "status": new_status
            }).eq("id", data.invoice_id).execute()
    
    return {"success": True, "data": payment}

@app.delete("/api/payments/{payment_id}")
async def delete_payment(payment_id: str, user=Depends(get_current_user)):
    supabase.table("payments").delete().eq("id", payment_id).eq("user_id", user.id).execute()
    return {"success": True}


# ════════════════════════════════════════════════════════════
# DASHBOARD STATS
# ════════════════════════════════════════════════════════════
@app.get("/api/stats/dashboard")
async def dashboard_stats(user=Depends(get_current_user)):
    uid = user.id
    
    invoices = supabase.table("invoices").select("status, total, amount_paid, amount_due, date").eq("user_id", uid).execute().data
    payments = supabase.table("payments").select("amount, date").eq("user_id", uid).execute().data
    clients_count = len(supabase.table("clients").select("id").eq("user_id", uid).execute().data)
    
    total_invoiced = sum(float(i.get("total", 0)) for i in invoices)
    total_received = sum(float(p.get("amount", 0)) for p in payments)
    total_pending  = sum(float(i.get("amount_due", 0)) for i in invoices if i.get("status") in ["pending", "partial", "overdue"])
    total_paid_inv = sum(1 for i in invoices if i.get("status") == "paid")
    
    # Current month
    from datetime import date
    today = date.today()
    this_month = f"{today.year}-{today.month:02d}"
    month_invoices = [i for i in invoices if (i.get("date") or "").startswith(this_month)]
    month_total = sum(float(i.get("total", 0)) for i in month_invoices)
    
    return {
        "total_invoiced": round(total_invoiced, 2),
        "total_received": round(total_received, 2),
        "total_pending": round(total_pending, 2),
        "total_clients": clients_count,
        "total_invoices": len(invoices),
        "paid_invoices": total_paid_inv,
        "month_total": round(month_total, 2),
        "month_invoices": len(month_invoices),
    }


# ════════════════════════════════════════════════════════════
# NEXT INVOICE NUMBER
# ════════════════════════════════════════════════════════════
@app.get("/api/invoices/next-number")
async def next_invoice_number(user=Depends(get_current_user)):
    result = supabase.table("company_settings").select(
        "invoice_prefix, invoice_next_no"
    ).eq("user_id", user.id).execute()
    
    if result.data:
        prefix = result.data[0].get("invoice_prefix", "INV-")
        next_no = result.data[0].get("invoice_next_no", 1)
    else:
        prefix = "INV-"
        next_no = 1
    
    return {"invoice_no": f"{prefix}{str(next_no).zfill(3)}"}


# ════════════════════════════════════════════════════════════
# ADMIN — Sarva users ni list (admin only)
# ════════════════════════════════════════════════════════════
@app.get("/api/admin/users")
async def admin_list_users(user=Depends(get_current_user)):
    # Check admin
    profile = supabase.table("user_profiles").select("is_admin").eq("id", user.id).single().execute().data
    if not profile or not profile.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = supabase.table("user_profiles").select("*").order("created_at", desc=True).execute()
    return result.data

@app.patch("/api/admin/users/{user_id}/status")
async def admin_update_user_status(
    user_id: str, status: str, plan: Optional[str] = None,
    user=Depends(get_current_user)
):
    profile = supabase.table("user_profiles").select("is_admin").eq("id", user.id).single().execute().data
    if not profile or not profile.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update = {"status": status}
    if plan:
        update["plan"] = plan
    
    supabase.table("user_profiles").update(update).eq("id", user_id).execute()
    return {"success": True}
