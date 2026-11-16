from sqlalchemy import inspect, text

from database import engine


def migrate():
    with engine.begin() as db:
        columns = {column["name"] for column in inspect(db).get_columns("providers")}
        if "email" not in columns:
            db.execute(text("ALTER TABLE providers ADD COLUMN email VARCHAR(255) NULL"))

    print("Provider email column is ready.")


if __name__ == "__main__":
    migrate()
