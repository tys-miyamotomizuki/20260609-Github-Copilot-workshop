import unittest

from app import create_app


class AppRouteTestCase(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.config.update(TESTING=True)
        self.client = app.test_client()

    def test_index_returns_success(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("ポモドーロタイマー", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
