import os
import shutil
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

STORAGE_MODE = os.getenv("STORAGE_MODE", "local") # local | supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

supabase: Client = None
if STORAGE_MODE == "supabase" and SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def save_file(trial_id: int, filename: str, file_obj):
    """Saves file to local disk or Supabase Storage."""
    if STORAGE_MODE == "supabase" and supabase:
        # Upload to 'rbqm-uploads' bucket
        file_content = file_obj.read()
        path = f"{trial_id}/{filename}"
        supabase.storage.from_("rbqm-uploads").upload(
            path=path,
            file=file_content,
            file_options={"content-type": "text/csv"}
        )
        return f"supabase://{path}"
    else:
        # Local storage
        os.makedirs(f"uploads/{trial_id}", exist_ok=True)
        file_path = f"uploads/{trial_id}/{filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return file_path

def get_file_path(trial_id: int, filename: str):
    """Returns local path to file. If on supabase, downloads it first."""
    local_dir = f"uploads/{trial_id}"
    local_path = f"{local_dir}/{filename}"
    
    if STORAGE_MODE == "supabase" and supabase:
        if not os.path.exists(local_path):
            os.makedirs(local_dir, exist_ok=True)
            path = f"{trial_id}/{filename}"
            with open(local_path, "wb") as f:
                res = supabase.storage.from_("rbqm-uploads").download(path)
                f.write(res)
    
    return local_path
