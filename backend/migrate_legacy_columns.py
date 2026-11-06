from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn

from database import engine
from models import Base


TABLES = ("agencies", "providers")


def migrate():
    added_columns = []

    with engine.begin() as connection:
        inspector = inspect(connection)
        preparer = connection.dialect.identifier_preparer

        for table_name in TABLES:
            if not inspector.has_table(table_name):
                raise RuntimeError(f"Required table '{table_name}' does not exist")

            table = Base.metadata.tables[table_name]
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            quoted_table = preparer.quote(table_name)

            for column in table.columns:
                if column.name in existing_columns:
                    continue

                column_definition = CreateColumn(column).compile(
                    dialect=connection.dialect
                )
                connection.execute(
                    text(
                        f"ALTER TABLE {quoted_table} "
                        f"ADD COLUMN {column_definition}"
                    )
                )
                existing_columns.add(column.name)
                added_columns.append(f"{table_name}.{column.name}")

    if added_columns:
        print("Added columns: " + ", ".join(added_columns))
    else:
        print("Database schema is already up to date.")


if __name__ == "__main__":
    migrate()
