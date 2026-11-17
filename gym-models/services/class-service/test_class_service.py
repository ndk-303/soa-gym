import pytest
from fastapi.testclient import TestClient

from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_startup_seeds_classes(client):
    res_classes = client.get("/gym-classes")
    assert res_classes.status_code == 200
    classes = res_classes.json()
    assert len(classes) >= 2
    names = [c["name"] for c in classes]
    assert "Yoga Binh Minh" in names

    res_slots = client.get("/class-slots")
    assert res_slots.status_code == 200
    slots = res_slots.json()
    assert len(slots) >= 1
    assert slots[0]["max_capacity"] == 15

def test_class_crud(client):
    new_class = {
        "name": "Pilates Sang Tao",
        "category": "Pilates",
        "trainer_id": 2,
        "is_active": True
    }
    # Create
    create_res = client.post("/gym-classes", json=new_class)
    assert create_res.status_code == 201
    class_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/gym-classes/{class_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Pilates Sang Tao"

    # Update
    update_res = client.put(f"/gym-classes/{class_id}", json={
        "name": "Pilates Nang Cao",
        "category": "Pilates Pro",
        "trainer_id": 2,
        "is_active": True
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Pilates Nang Cao"

    # Delete
    del_res = client.delete(f"/gym-classes/{class_id}")
    assert del_res.status_code == 200
    assert client.get(f"/gym-classes/{class_id}").status_code == 404

def test_slot_crud(client):
    new_slot = {
        "class_id": 1,
        "start_time": "2026-10-20 07:00:00",
        "max_capacity": 20,
        "current_bookings": 0,
        "is_cancelled": False
    }
    # Create
    create_res = client.post("/class-slots", json=new_slot)
    assert create_res.status_code == 201
    slot_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/class-slots/{slot_id}")
    assert get_res.status_code == 200
    assert get_res.json()["start_time"] == "2026-10-20 07:00:00"

    # Update
    update_res = client.put(f"/class-slots/{slot_id}", json={
        "class_id": 1,
        "start_time": "2026-10-20 07:00:00",
        "max_capacity": 25,
        "current_bookings": 2,
        "is_cancelled": True
    })
    assert update_res.status_code == 200
    assert update_res.json()["max_capacity"] == 25
    assert update_res.json()["is_cancelled"] is True

    # Delete
    del_res = client.delete(f"/class-slots/{slot_id}")
    assert del_res.status_code == 200
    assert client.get(f"/class-slots/{slot_id}").status_code == 404


def test_slot_increment_decrement_and_concurrency_limit(client):
    from concurrent.futures import ThreadPoolExecutor

    # Create a slot with max_capacity=2
    slot_res = client.post("/class-slots", json={
        "class_id": 1,
        "start_time": "2026-12-25 18:00:00",
        "max_capacity": 2,
        "current_bookings": 0,
        "is_cancelled": False,
    })
    assert slot_res.status_code == 201
    slot_id = slot_res.json()["id"]

    try:
        # 1. Trainer conflict: same trainer (class 2 shares trainer_id=2 with class 1) at same time -> 409
        conflict_res = client.post("/class-slots", json={
            "class_id": 2,
            "start_time": "2026-12-25 18:00:00",
            "max_capacity": 10,
            "current_bookings": 0,
            "is_cancelled": False,
        })
        assert conflict_res.status_code == 409

        # 2. Concurrent increment-bookings: 5 parallel requests for capacity=2 -> exactly 2 succeed, 3 fail with 409
        def do_inc(_):
            return client.patch(f"/class-slots/{slot_id}/increment-bookings").status_code

        with ThreadPoolExecutor(max_workers=5) as pool:
            codes = list(pool.map(do_inc, range(5)))

        assert codes.count(200) == 2
        assert codes.count(409) == 3

        slot_now = client.get(f"/class-slots/{slot_id}").json()
        assert slot_now["current_bookings"] == 2

        # 3. Shrinking max_capacity below current_bookings -> 400 Bad Request
        shrink_res = client.put(f"/class-slots/{slot_id}", json={
            "class_id": 1,
            "start_time": "2026-12-25 18:00:00",
            "max_capacity": 1,
            "current_bookings": 2,
            "is_cancelled": False,
        })
        assert shrink_res.status_code == 400

        # 4. Decrement twice -> 0, and third decrement stays at 0 (no negative)
        assert client.patch(f"/class-slots/{slot_id}/decrement-bookings").json()["current_bookings"] == 1
        assert client.patch(f"/class-slots/{slot_id}/decrement-bookings").json()["current_bookings"] == 0
        assert client.patch(f"/class-slots/{slot_id}/decrement-bookings").json()["current_bookings"] == 0
    finally:
        client.delete(f"/class-slots/{slot_id}")
