import pytest
from fastapi.testclient import TestClient

from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_startup_seeds_billing(client):
    res_invoices = client.get("/invoices")
    assert res_invoices.status_code == 200
    invoices = res_invoices.json()
    assert len(invoices) >= 2

    res_payments = client.get("/payments")
    assert res_payments.status_code == 200
    payments = res_payments.json()
    assert len(payments) >= 1
    assert payments[0]["payment_method"] == "bank_transfer"

def test_invoice_crud(client):
    new_invoice = {
        "member_id": 2,
        "amount": 750000.0,
        "amount_paid": 0.0,
        "status": "pending"
    }
    # Create
    create_res = client.post("/invoices", json=new_invoice)
    assert create_res.status_code == 201
    invoice_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/invoices/{invoice_id}")
    assert get_res.status_code == 200
    assert get_res.json()["amount"] == 750000.0

    # Update
    update_res = client.put(f"/invoices/{invoice_id}", json={
        "member_id": 2,
        "amount": 750000.0,
        "amount_paid": 750000.0,
        "status": "paid"
    })
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "paid"
    assert update_res.json()["amount_paid"] == 750000.0

    # Delete
    del_res = client.delete(f"/invoices/{invoice_id}")
    assert del_res.status_code == 200
    assert client.get(f"/invoices/{invoice_id}").status_code == 404

def test_payment_crud(client):
    new_payment = {
        "invoice_id": 1,
        "amount": 250000.0,
        "payment_method": "credit_card",
        "notes": "Thanh toan qua POS"
    }
    # Create
    create_res = client.post("/payments", json=new_payment)
    assert create_res.status_code == 201
    payment_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/payments/{payment_id}")
    assert get_res.status_code == 200
    assert get_res.json()["payment_method"] == "credit_card"

    # Update
    update_res = client.put(f"/payments/{payment_id}", json={
        "invoice_id": 1,
        "amount": 250000.0,
        "payment_method": "cash",
        "notes": "Doi sang tien mat"
    })
    assert update_res.status_code == 200
    assert update_res.json()["payment_method"] == "cash"

    # Delete
    del_res = client.delete(f"/payments/{payment_id}")
    assert del_res.status_code == 200
    assert client.get(f"/payments/{payment_id}").status_code == 404


def test_payment_atomic_transaction_updates_invoice(client):
    # 1. Non-existent invoice_id returns 404
    res_missing = client.post("/payments", json={
        "invoice_id": 999999,
        "amount": 100000.0,
        "payment_method": "cash",
        "notes": "Should fail",
    })
    assert res_missing.status_code == 404

    # 2. Create pending invoice (1,000,000 VND)
    inv_res = client.post("/invoices", json={
        "member_id": 88,
        "amount": 1000000.0,
        "amount_paid": 0.0,
        "status": "pending",
    })
    assert inv_res.status_code == 201
    invoice_id = inv_res.json()["id"]

    pay1_id = None
    pay2_id = None
    try:
        # 3. Record partial payment 400,000 -> Invoice becomes partially_paid
        p1_res = client.post("/payments", json={
            "invoice_id": invoice_id,
            "amount": 400000.0,
            "payment_method": "cash",
            "notes": "Dot 1",
        })
        assert p1_res.status_code == 201
        pay1_id = p1_res.json()["id"]

        inv1 = client.get(f"/invoices/{invoice_id}").json()
        assert inv1["amount_paid"] == 400000.0
        assert inv1["status"] == "partially_paid"

        # 4. Record remaining payment 600,000 -> Invoice becomes paid
        p2_res = client.post("/payments", json={
            "invoice_id": invoice_id,
            "amount": 600000.0,
            "payment_method": "bank_transfer",
            "notes": "Dot 2",
        })
        assert p2_res.status_code == 201
        pay2_id = p2_res.json()["id"]

        inv2 = client.get(f"/invoices/{invoice_id}").json()
        assert inv2["amount_paid"] == 1000000.0
        assert inv2["status"] == "paid"

        # 5. Delete payment 2 -> Invoice atomically rolls back to 400,000 partially_paid
        assert client.delete(f"/payments/{pay2_id}").status_code == 200
        pay2_id = None
        inv3 = client.get(f"/invoices/{invoice_id}").json()
        assert inv3["amount_paid"] == 400000.0
        assert inv3["status"] == "partially_paid"

        # 6. Delete payment 1 -> Invoice atomically reverts to 0.0 pending
        assert client.delete(f"/payments/{pay1_id}").status_code == 200
        pay1_id = None
        inv4 = client.get(f"/invoices/{invoice_id}").json()
        assert inv4["amount_paid"] == 0.0
        assert inv4["status"] == "pending"
    finally:
        if pay2_id:
            client.delete(f"/payments/{pay2_id}")
        if pay1_id:
            client.delete(f"/payments/{pay1_id}")
        client.delete(f"/invoices/{invoice_id}")
