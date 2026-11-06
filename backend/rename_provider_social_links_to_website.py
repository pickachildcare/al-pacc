import json

from sqlalchemy import inspect, text

from database import engine


def _extract_website(value, provider_id):
    if value is None:
        return None

    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"Provider {provider_id} has invalid social_links JSON."
            ) from error

    if value is None:
        return None
    if isinstance(value, dict):
        other_links = {
            key: link
            for key, link in value.items()
            if key != "website" and link
        }
        if other_links:
            raise ValueError(
                f"Provider {provider_id} has non-website social links; "
                "migrate those links before renaming the column."
            )
        value = value.get("website")
    elif not isinstance(value, str):
        raise ValueError(
            f"Provider {provider_id} has an unsupported social_links value."
        )

    if value is not None and not isinstance(value, str):
        raise ValueError(f"Provider {provider_id} has a non-string website URL.")
    if value and len(value) > 500:
        raise ValueError(f"Provider {provider_id} has a website URL over 500 characters.")
    return value or None


def migrate():
    with engine.begin() as db:
        columns = {column["name"] for column in inspect(db).get_columns("providers")}
        if "social_links" not in columns:
            if "website" in columns:
                print("Provider website column is already ready.")
                return
            raise RuntimeError("Neither social_links nor website exists on providers.")

        website_column_exists = "website" in columns
        select_columns = "id, social_links"
        if website_column_exists:
            select_columns += ", website"
        rows = db.execute(
            text(f"SELECT {select_columns} FROM providers ORDER BY id")
        ).all()

        website_values = []
        for row in rows:
            existing_website = row[2] if website_column_exists else None
            extracted_website = _extract_website(row[1], row[0])
            if (
                existing_website
                and extracted_website
                and existing_website != extracted_website
            ):
                raise ValueError(
                    f"Provider {row[0]} has conflicting website values."
                )
            website_values.append(
                (row[0], existing_website or extracted_website)
            )

        if not website_column_exists:
            db.execute(
                text("ALTER TABLE providers ADD COLUMN website VARCHAR(500) NULL")
            )

        for provider_id, website in website_values:
            if website:
                db.execute(
                    text(
                        "UPDATE providers SET website = :website "
                        "WHERE id = :provider_id AND website IS NULL"
                    ),
                    {"website": website, "provider_id": provider_id},
                )

        db.execute(text("ALTER TABLE providers DROP COLUMN social_links"))

    print("Renamed provider social_links to website.")


if __name__ == "__main__":
    migrate()
