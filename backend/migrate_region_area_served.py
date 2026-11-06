"""Move region-to-area lookup links onto area_served_lookup.region_served_id."""

from sqlalchemy import inspect, text

from database import engine


def main():
    inspector = inspect(engine)
    if "area_served_lookup" not in inspector.get_table_names():
        raise RuntimeError("area_served_lookup table does not exist")

    tables = set(inspector.get_table_names())
    has_bridge = "region_area_served" in tables
    columns = {column["name"] for column in inspector.get_columns("area_served_lookup")}

    if has_bridge:
        bridge_columns = {column["name"] for column in inspector.get_columns("region_area_served")}
        if not {"region_id", "area_served_id"}.issubset(bridge_columns):
            raise RuntimeError("region_area_served does not have the expected region_id and area_served_id columns")

        with engine.connect() as connection:
            conflicts = connection.execute(text("""
                SELECT area_served_id, GROUP_CONCAT(DISTINCT region_id ORDER BY region_id) AS region_ids
                FROM region_area_served
                GROUP BY area_served_id
                HAVING COUNT(DISTINCT region_id) > 1
            """)).mappings().all()
            if conflicts:
                details = "; ".join(
                    f"area {row['area_served_id']} -> regions {row['region_ids']}"
                    for row in conflicts
                )
                raise RuntimeError(
                    "Cannot migrate areas assigned to multiple regions; resolve these mappings first: "
                    + details
                )

            if "region_served_id" in columns:
                mismatches = connection.execute(text("""
                    SELECT area.id, area.region_served_id AS current_region_id, mapping.region_id AS mapped_region_id
                    FROM area_served_lookup AS area
                    JOIN (
                        SELECT area_served_id, MIN(region_id) AS region_id
                        FROM region_area_served
                        GROUP BY area_served_id
                    ) AS mapping ON mapping.area_served_id = area.id
                    WHERE area.region_served_id IS NOT NULL
                      AND area.region_served_id <> mapping.region_id
                """)).mappings().all()
                if mismatches:
                    details = "; ".join(
                        f"area {row['id']} has region {row['current_region_id']} but bridge maps to {row['mapped_region_id']}"
                        for row in mismatches
                    )
                    raise RuntimeError("Existing direct mappings conflict with the bridge: " + details)

    with engine.begin() as connection:
        if "region_served_id" not in columns:
            connection.execute(text(
                "ALTER TABLE area_served_lookup ADD COLUMN region_served_id INTEGER NULL"
            ))

        if has_bridge:
            connection.execute(text("""
                UPDATE area_served_lookup AS area
                JOIN region_area_served AS mapping ON mapping.area_served_id = area.id
                SET area.region_served_id = mapping.region_id
            """))

        inspector = inspect(connection)
        foreign_keys = inspector.get_foreign_keys("area_served_lookup")
        if not any(
            fk.get("constrained_columns") == ["region_served_id"]
            and fk.get("referred_table") == "region_served_lookup"
            for fk in foreign_keys
        ):
            connection.execute(text("""
                ALTER TABLE area_served_lookup
                ADD CONSTRAINT fk_area_served_region_served
                FOREIGN KEY (region_served_id) REFERENCES region_served_lookup(id)
                ON DELETE SET NULL
            """))

        indexes = inspector.get_indexes("area_served_lookup")
        if not any(index.get("column_names") == ["region_served_id"] for index in indexes):
            connection.execute(text(
                "CREATE INDEX ix_area_served_lookup_region_served_id "
                "ON area_served_lookup (region_served_id)"
            ))

        if has_bridge:
            connection.execute(text("DROP TABLE region_area_served"))

    print("Moved region-to-area lookup relationships to area_served_lookup.region_served_id.")


if __name__ == "__main__":
    main()
