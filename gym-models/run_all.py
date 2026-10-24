import os
import sys
import time
import signal
import socket
import subprocess
from typing import List
from dotenv import load_dotenv

# Ensure utf-8 encoding on console if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Preload .env from gym-models/.env or workspace root
env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SERVICES = [
    {
        "name": "user-service",
        "port": int(os.getenv("USER_SERVICE_PORT", 8001)),
        "dir": os.path.join(BASE_DIR, "services", "user-service"),
    },
    {
        "name": "membership-service",
        "port": int(os.getenv("MEMBERSHIP_SERVICE_PORT", 8002)),
        "dir": os.path.join(BASE_DIR, "services", "membership-service"),
    },
    {
        "name": "class-service",
        "port": int(os.getenv("CLASS_SERVICE_PORT", 8003)),
        "dir": os.path.join(BASE_DIR, "services", "class-service"),
    },
    {
        "name": "booking-service",
        "port": int(os.getenv("BOOKING_SERVICE_PORT", 8004)),
        "dir": os.path.join(BASE_DIR, "services", "booking-service"),
    },
    {
        "name": "billing-service",
        "port": int(os.getenv("BILLING_SERVICE_PORT", 8005)),
        "dir": os.path.join(BASE_DIR, "services", "billing-service"),
    },
    {
        "name": "attendance-service",
        "port": int(os.getenv("ATTENDANCE_SERVICE_PORT", 8006)),
        "dir": os.path.join(BASE_DIR, "services", "attendance-service"),
    },
    {
        "name": "api-gateway",
        "port": int(os.getenv("GATEWAY_PORT", 8000)),
        "dir": os.path.join(BASE_DIR, "api-gateway"),
    },
]

processes: List[subprocess.Popen] = []


def find_python_executable() -> str:
    # 1. If sys.executable has packages like jwt or is in .venv, use it
    if sys.prefix != sys.base_prefix:
        return sys.executable

    # 2. Search common virtualenv paths relative to BASE_DIR
    candidates = [
        os.path.join(BASE_DIR, "..", "..", "..", ".venv", "Scripts", "python.exe"),
        os.path.join(BASE_DIR, "..", "..", ".venv", "Scripts", "python.exe"),
        os.path.join(BASE_DIR, "..", ".venv", "Scripts", "python.exe"),
        os.path.join(BASE_DIR, ".venv", "Scripts", "python.exe"),
        os.path.join(BASE_DIR, "..", "..", "..", "venv", "Scripts", "python.exe"),
    ]
    for cand in candidates:
        abs_cand = os.path.abspath(cand)
        if os.path.exists(abs_cand):
            return abs_cand

    return sys.executable


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def stop_all_processes():
    print("\n[!] Shutting down all services and API Gateway...")
    for proc in processes:
        if proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass

    # Wait for graceful exit
    time.sleep(1)
    for proc in processes:
        if proc.poll() is None:
            try:
                proc.kill()
            except Exception:
                pass
    print("[OK] All processes stopped cleanly.\n")


def signal_handler(sig, frame):
    stop_all_processes()
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("=" * 70)
    print("   GYM MANAGEMENT SYSTEM - SOA MICROSERVICES RUNNER")
    print("=" * 70)

    python_exec = find_python_executable()
    gateway_port = int(os.getenv("GATEWAY_PORT", 8000))
    print(f"[*] Python Runtime: {python_exec}")

    # Check for busy ports before spawning
    busy_ports = [s["port"] for s in SERVICES if is_port_in_use(s["port"])]
    if busy_ports:
        print(f"[!] Canh bao: Cac port sau dang bi chiem dung boi tien trinh khac: {busy_ports}")
        print("    Vui long tat tien trinh cu hoac kiem tra bang Task Manager.\n")

    child_env = os.environ.copy()

    for s in SERVICES:
        name = s["name"]
        port = s["port"]
        cwd = s["dir"]

        cmd = [
            python_exec,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(port),
        ]

        print(f"[*] Starting {name:20} on port {port}...")
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=child_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        processes.append(proc)
        time.sleep(0.3)

    print("-" * 70)
    print(" [OK] All 6 Microservices and API Gateway are running!")
    print(f" [OK] API Gateway Swagger UI: http://127.0.0.1:{gateway_port}/docs")
    print(f" [OK] API Gateway Health Check: http://127.0.0.1:{gateway_port}/health")
    print(" [OK] Frontend App: http://localhost:5173")
    print("-" * 70)
    print(" Press Ctrl + C to stop all services.\n")

    reported_exits = set()

    try:
        while True:
            time.sleep(1)
            for i, proc in enumerate(processes):
                if proc.poll() is not None and i not in reported_exits:
                    reported_exits.add(i)
                    name = SERVICES[i]["name"]
                    port = SERVICES[i]["port"]
                    stderr_err = ""
                    try:
                        if proc.stderr:
                            stderr_err = proc.stderr.read().decode("utf-8", errors="ignore").strip()
                    except Exception:
                        pass

                    print(f"[!] Warning: {name} (port {port}) exited with code {proc.returncode}")
                    if stderr_err:
                        last_line = stderr_err.splitlines()[-1] if stderr_err.splitlines() else stderr_err
                        print(f"    Chi tiet loi: {last_line}")
    except KeyboardInterrupt:
        stop_all_processes()


if __name__ == "__main__":
    main()
