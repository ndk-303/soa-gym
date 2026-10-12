from sqlmodel import Session
from app.database.session import engine, create_db_and_tables
from app.database.seed import seed_database


def main():
    print("Initializing SQLite database tables...")
    create_db_and_tables()
    print("Seeding sample records into SQLite database...")
    with Session(engine) as session:
        seed_database(session)
    print("Database seeding completed successfully!")


if __name__ == "__main__":
    main()
