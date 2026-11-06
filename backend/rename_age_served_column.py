from sqlalchemy import inspect, text

from database import engine
from models import SpotAvailable


def migrate():
    table_name = SpotAvailable.__tablename__
    preparer = engine.dialect.identifier_preparer
    quoted_table = preparer.quote(table_name)
    old_column = "age_served"
    new_column = "age_available"

    with engine.begin() as connection:
        inspector = inspect(connection)
        if not inspector.has_table(table_name):
            raise RuntimeError(f"Required table '{table_name}' does not exist")

        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if old_column in columns and new_column in columns:
            raise RuntimeError(
                f"Both '{old_column}' and '{new_column}' exist in '{table_name}'"
            )
        if new_column in columns:
            print(f"{table_name}.{new_column} already exists; no migration needed.")
            return
        if old_column not in columns:
            raise RuntimeError(
                f"Neither '{old_column}' nor '{new_column}' exists in '{table_name}'"
            )

        connection.execute(
            text(
                f"ALTER TABLE {quoted_table} RENAME COLUMN "
                f"{preparer.quote(old_column)} TO {preparer.quote(new_column)}"
            )
        )
        print(f"Renamed {table_name}.{old_column} to {new_column}.")


if __name__ == "__main__":
    migrate()
