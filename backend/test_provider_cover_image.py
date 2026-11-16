import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import add_cover_image_to_providers
import main
import models
import schemas


class ProviderCoverImageTests(unittest.TestCase):
    def test_migration_preserves_logos_and_leaves_covers_empty(self):
        engine = create_engine("sqlite://")
        with engine.begin() as db:
            db.execute(text("CREATE TABLE providers (id INTEGER PRIMARY KEY, image VARCHAR(500))"))
            db.execute(text("INSERT INTO providers (id, image) VALUES (1, 'logo.png')"))
        with patch.object(add_cover_image_to_providers, "engine", engine):
            add_cover_image_to_providers.migrate()
            add_cover_image_to_providers.migrate()
        self.assertIn("cover_image", {column["name"] for column in inspect(engine).get_columns("providers")})
        with engine.connect() as db:
            self.assertEqual(
                db.execute(text("SELECT image, cover_image FROM providers WHERE id = 1")).one(),
                ("logo.png", None),
            )

    def test_cover_is_independent_and_preserved_when_omitted(self):
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
            "image": "logo.png",
        }
        for admin in (False, True):
            with self.subTest(admin=admin):
                db_provider = models.Provider(image="old-logo.png", cover_image="old-cover.png")
                db = Mock()

                def save(cover_values):
                    if admin:
                        main._apply_provider_data(db, db_provider, schemas.ProviderAdminSave(**values, **cover_values))
                    else:
                        main.create_provider_profile(
                            schemas.ProviderBase(**values, **cover_values),
                            db,
                            SimpleNamespace(providers=[db_provider]),
                        )

                save({})
                self.assertEqual(db_provider.image, "logo.png")
                self.assertEqual(db_provider.cover_image, "old-cover.png")
                save({"cover_image": "new-cover.png"})
                self.assertEqual(db_provider.image, "logo.png")
                self.assertEqual(db_provider.cover_image, "new-cover.png")
                save({"cover_image": None})
                self.assertEqual(db_provider.image, "logo.png")
                self.assertIsNone(db_provider.cover_image)

    def test_api_round_trip_preserves_separate_images(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        models.Base.metadata.create_all(engine)
        sessions = sessionmaker(bind=engine)

        def get_test_db():
            with sessions() as db:
                yield db

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
            "image": "logo.png",
            "cover_image": "cover.png",
        }
        with patch.dict(main.app.dependency_overrides, {
            main.get_db: get_test_db,
            main.require_admin: lambda: None,
        }):
            with TestClient(main.app) as client:
                created = client.post("/admin/providers", json=values)
                self.assertEqual(created.status_code, 200, created.text)
                provider_id = created.json()["id"]
                provider = client.get(f"/providers/{provider_id}").json()
                self.assertEqual((provider["image"], provider["cover_image"]), ("logo.png", "cover.png"))

                values["image"] = "new-logo.png"
                del values["cover_image"]
                updated = client.put(f"/admin/providers/{provider_id}", json=values)
                self.assertEqual(updated.status_code, 200, updated.text)
                self.assertEqual((updated.json()["image"], updated.json()["cover_image"]), ("new-logo.png", "cover.png"))

                values["cover_image"] = None
                updated = client.put(f"/admin/providers/{provider_id}", json=values)
                self.assertEqual(updated.status_code, 200, updated.text)
                self.assertIsNone(updated.json()["cover_image"])


if __name__ == "__main__":
    unittest.main()
