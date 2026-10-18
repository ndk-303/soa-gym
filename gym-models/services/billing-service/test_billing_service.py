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
