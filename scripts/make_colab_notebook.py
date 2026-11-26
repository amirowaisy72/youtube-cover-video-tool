"""Builds backend/colab/YTGuru_Colab.ipynb (the one notebook) from backend/colab/ytguru_server.py.

Run after changing the server file:  python scripts/make_colab_notebook.py
"""
import json
from pathlib import Path

COLAB = Path(__file__).resolve().parents[1] / "backend" / "colab"

INTRO = """# YT Guru — one notebook for everything on Google's GPU

1. **Runtime → Change runtime type → T4 GPU → Save**
2. **Runtime → Run all** (if Google warns that the notebook is not from Google, press **Run anyway**)
3. Wait 5–10 minutes. At the bottom a line appears: **copy the whole line**
4. In YT Guru press **⚡ Colab**, paste the line, press **Connect**

Keep this tab open while YT Guru is working. When you have finished: **Runtime → Disconnect and delete runtime**.
"""

GPU = """#@title 1) GPU check
import subprocess
found = subprocess.run("nvidia-smi -L", shell=True, capture_output=True, text=True)
if found.returncode:
    raise SystemExit("NO GPU. Menu: Runtime > Change runtime type > T4 GPU > Save, then Runtime > Run all.")
print(found.stdout)"""

INSTALL = """#@title 2) Install (3-6 minutes)
# torchvision must match the torch version Chatterbox installs (2.6), or the model cannot load
!pip -q install chatterbox-tts "torchvision==0.21.0" fastapi uvicorn 2>&1 | tail -2
!wget -q -O /content/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /content/cloudflared
!python -c "import torch, torchvision, transformers; from transformers import LlamaModel; print('READY: torch', torch.__version__, 'torchvision', torchvision.__version__)" """

START = '''#@title 3) Start, and print the line to copy (the first time downloads the model: 3-5 minutes)
import os, re, secrets, subprocess, time, urllib.request
TOKEN = secrets.token_hex(12)
env = dict(os.environ, YTGURU_TOKEN=TOKEN)
subprocess.run(["pkill", "-f", "uvicorn ytguru_server"], check=False)  # an old one from an earlier Run all
subprocess.run(["pkill", "-f", "cloudflared"], check=False)
srv = subprocess.Popen(["python", "-m", "uvicorn", "ytguru_server:app", "--host", "127.0.0.1", "--port", "8000"],
                       cwd="/content", env=env, stdout=open("/content/server.log", "w"), stderr=subprocess.STDOUT)
for _ in range(600):  # load the model
    if srv.poll() is not None:
        print(open("/content/server.log").read()[-3000:]); raise SystemExit("It stopped. Copy the error above and send it to Claude.")
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/health", headers={"X-Token": TOKEN})
        print(urllib.request.urlopen(req, timeout=900).read().decode()); break
    except Exception:
        time.sleep(3)
else:
    print(open("/content/server.log").read()[-3000:]); raise SystemExit("It did not start. Copy the lines above and send them to Claude.")
tun = subprocess.Popen(["/content/cloudflared", "tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8000"],
                       stdout=open("/content/tunnel.log", "w"), stderr=subprocess.STDOUT)
url = None
for _ in range(60):
    time.sleep(2)
    m = re.search(r"https://[a-z0-9-]+\\.trycloudflare\\.com", open("/content/tunnel.log").read())
    if m: url = m.group(0); break
if not url:
    print(open("/content/tunnel.log").read()[-2000:]); raise SystemExit("No link. Press Runtime > Run all again.")
print("\\n\\nCOPY THIS WHOLE LINE into YT Guru (the ⚡ Colab button):\\n")
print(url, TOKEN)'''

WATCH = """#@title 4) Keep this running while YT Guru works (it shows each piece of work done)
import time
seen = 0
while True:
    lines = open("/content/server.log").read().splitlines()
    made = sum(1 for l in lines if ("POST /best" in l or "POST /gen" in l) and " 200" in l)
    if made != seen:
        print(time.strftime("%H:%M:%S"), "voices made:", made); seen = made
    if srv.poll() is not None:
        print("It stopped. Press Runtime > Run all.\\n", "\\n".join(lines[-30:])); break
    time.sleep(20)"""


def cell(kind: str, text: str) -> dict:
    out = {"cell_type": kind, "metadata": {}, "source": text.rstrip().splitlines(keepends=True)}
    if kind == "code":
        out.update(execution_count=None, outputs=[])
    return out


def build() -> dict:
    server = (COLAB / "ytguru_server.py").read_text(encoding="utf-8")
    cells = [cell("markdown", INTRO), cell("code", GPU), cell("code", INSTALL),
             cell("code", "%%writefile /content/ytguru_server.py\n" + server), cell("code", START), cell("code", WATCH)]
    return {"cells": cells, "nbformat": 4, "nbformat_minor": 5,
            "metadata": {"accelerator": "GPU", "colab": {"gpuType": "T4", "name": "YTGuru_Colab.ipynb"},
                         "kernelspec": {"display_name": "Python 3", "name": "python3"}}}


if __name__ == "__main__":
    nb = build()
    for k, c in enumerate(nb["cells"]):
        c["id"] = f"ytguru-{k}"
    (COLAB / "YTGuru_Colab.ipynb").write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("written", COLAB / "YTGuru_Colab.ipynb")
