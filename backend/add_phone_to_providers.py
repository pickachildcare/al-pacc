from sqlalchemy import inspect, text

from database import engine


def migrate():
    with engine.begin() as db:
        columns = {column["name"] for column in inspect(db).get_columns("providers")}
        if "phone" not in columns:
            db.execute(text("ALTER TABLE providers ADD COLUMN phone VARCHAR(50) NULL"))

    print("Provider phone column is ready.")


if __name__ == "__main__":
    migrate()
