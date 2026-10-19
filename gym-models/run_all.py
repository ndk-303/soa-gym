import os
import sys
import time
import signal
import subprocess
from typing import List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SERVICES = [
    {
        "name": "user-service",
        "port": 8001,
        "dir": os.path.join(BASE_DIR, "services", "user-service"),
    },
    {
        "name": "membership-service",
        "port": 8002,
        "dir": os.path.join(BASE_DIR, "services", "membership-service"),
    },
    {
        "name": "class-service",
        "port": 8003,
        "dir": os.path.join(BASE_DIR, "services", "class-service"),
    },
    {
        "name": "booking-service",
        "port": 8004,
        "dir": os.path.join(BASE_DIR, "services", "booking-service"),
    },
    {
        "name": "billing-service",
        "port": 8005,
        "dir": os.path.join(BASE_DIR, "services", "billing-service"),
    },
    {
        "name": "attendance-service",
        "port": 8006,
        "dir": os.path.join(BASE_DIR, "services", "attendance-service"),
    },
    {
        "name": "api-gateway",
        "port": 8000,
        "dir": os.path.join(BASE_DIR, "api-gateway"),
    },
]

processes: List[subprocess.Popen] = []


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
    print("[✓] All processes stopped cleanly.\n")


def signal_handler(sig, frame):
    stop_all_processes()
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("=" * 70)
    print("   GYM MANAGEMENT SYSTEM — SOA MICROSERVICES RUNNER")
    print("=" * 70)

    python_exec = sys.executable

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
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        processes.append(proc)
        time.sleep(0.3)

    print("-" * 70)
    print(" [✓] All 6 Microservices and API Gateway are running!")
    print(" [✓] API Gateway Swagger UI: http://127.0.0.1:8000/docs")
    print(" [✓] API Gateway Health Check: http://127.0.0.1:8000/health")
    print(" [✓] Frontend App: http://localhost:5173")
    print("-" * 70)
    print(" Press Ctrl + C to stop all services.\n")

    try:
        while True:
            time.sleep(1)
            # Check if any process exited unexpectedly
            for i, proc in enumerate(processes):
                if proc.poll() is not None:
                    name = SERVICES[i]["name"]
                    print(f"[!] Warning: {name} exited with code {proc.returncode}")
    except KeyboardInterrupt:
        stop_all_processes()


if __name__ == "__main__":
    main()
