import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from sqlalchemy import create_engine, inspect, text

import add_email_to_providers
import main
import models
import schemas


class ProviderEmailTests(unittest.TestCase):
    def test_migration_preserves_existing_rows_and_is_repeatable(self):
        engine = create_engine("sqlite://")
        with engine.begin() as db:
            db.execute(text("CREATE TABLE providers (id INTEGER PRIMARY KEY, name VARCHAR(255))"))
            db.execute(text("INSERT INTO providers (id, name) VALUES (1, 'Existing provider')"))
        with patch.object(add_email_to_providers, "engine", engine):
            add_email_to_providers.migrate()
            add_email_to_providers.migrate()
        self.assertIn("email", {column["name"] for column in inspect(engine).get_columns("providers")})
        with engine.connect() as db:
            self.assertEqual(
                db.execute(text("SELECT name, email FROM providers WHERE id = 1")).one(),
                ("Existing provider", None),
            )

    def test_existing_email_is_preserved_when_omitted_and_can_be_changed(self):
        values = {
            "name": "Provider",
            "type": "Daycare Center",
            "location": "Calgary",
            "spots_available": 0,
            "max_capacity": 1,
            "ages_served": [],
            "meals_provided": False,
            "snack_provided": False,
            "description": "",
        }
        for admin in (False, True):
            with self.subTest(admin=admin):
                db_provider = models.Provider(email="old@example.test")
                db = Mock()

                def save(email_values):
                    if admin:
                        main._apply_provider_data(db, db_provider, schemas.ProviderAdminSave(**values, **email_values))
                    else:
                        main.create_provider_profile(
                            schemas.ProviderBase(**values, **email_values),
                            db,
                            SimpleNamespace(providers=[db_provider]),
                        )

                save({})
                self.assertEqual(db_provider.email, "old@example.test")
                save({"email": "new@example.test"})
                self.assertEqual(db_provider.email, "new@example.test")
                save({"email": None})
                self.assertIsNone(db_provider.email)


if __name__ == "__main__":
    unittest.main()
