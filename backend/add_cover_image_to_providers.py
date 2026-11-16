from sqlalchemy import inspect, text

from database import engine


def migrate():
    with engine.begin() as db:
        columns = {column["name"] for column in inspect(db).get_columns("providers")}
        if "cover_image" not in columns:
            db.execute(text("ALTER TABLE providers ADD COLUMN cover_image VARCHAR(500) NULL"))

    print("Provider cover image column is ready.")


if __name__ == "__main__":
    migrate()
