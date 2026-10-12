import sys
import time
import subprocess
import signal

SERVICES = [
    ("gateway", "gateway:app", 8000),
    ("users", "users:app", 8001),
    ("membership_plans", "membership_plans:app", 8002),
    ("members", "members:app", 8003),
    ("gym_classes", "gym_classes:app", 8004),
    ("class_slots", "class_slots:app", 8005),
    ("bookings", "bookings:app", 8006),
    ("invoices", "invoices:app", 8007),
    ("payments", "payments:app", 8008),
    ("attendance", "attendance:app", 8009),
]


def main():
    print("==================================================")
    print("Starting Gym Microservices & Gateway...")
    print("==================================================")

    processes = []
    try:
        for name, app_target, port in SERVICES:
            cmd = [
                sys.executable,
                "-m",
                "uvicorn",
                app_target,
                "--port",
                str(port),
                "--log-level",
                "warning",
            ]
            p = subprocess.Popen(cmd)
            processes.append((name, port, p))
            print(f"  [+] {name.ljust(18)} running on http://127.0.0.1:{port}")

        print("\nAll 10 services started successfully!")
        print("API Gateway entry point: http://127.0.0.1:8000")
        print("Health Check:            http://127.0.0.1:8000/health")
        print("\nPress Ctrl+C to stop all services.\n")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping all services...")
    finally:
        for name, port, p in processes:
            p.terminate()
            try:
                p.wait(timeout=2)
            except subprocess.TimeoutExpired:
                p.kill()
        print("All services stopped.")


if __name__ == "__main__":
    main()
