import os
import tempfile
import unittest

from app import app, DB_PATH


class MuftiatAppTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret'
        self.client = app.test_client()

    def test_login_and_admin_page(self):
        response = self.client.post('/login', data={'username': 'admin', 'password': 'admin010203'}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Башкаруу панели', response.get_data(as_text=True))

    def test_article_crud(self):
        create = self.client.post('/api/articles', json={
            'title_ky': 'Тест макала',
            'title_ru': 'Тестовая статья',
            'title_en': 'Test article',
            'summary_ky': 'Кыскача',
            'summary_ru': 'Кратко',
            'summary_en': 'Short summary',
            'content_ky': 'Мазмун',
            'content_ru': 'Контент',
            'content_en': 'Body',
            'author': 'Tester',
            'category_id': 1,
        })
        self.assertEqual(create.status_code, 201)
        article = create.get_json()
        article_id = article['id']

        update = self.client.put(f'/api/articles/{article_id}', json={
            'title_ky': 'Жаңыртылган макала',
            'summary_ky': 'Жаңыртылган',
            'content_ky': 'Жаңыртылган мазмун',
            'author': 'Updater'
        })
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.get_json()['title_ky'], 'Жаңыртылган макала')

        delete = self.client.delete(f'/api/articles/{article_id}')
        self.assertEqual(delete.status_code, 200)
        self.assertTrue(delete.get_json()['success'])

    def test_navigation_items_are_stored_and_rendered(self):
        self.client.post('/login', data={'username': 'admin', 'password': 'admin010203'}, follow_redirects=True)
        create = self.client.post('/api/nav-items', json={
            'label_ky': 'Илим',
            'label_ru': 'Наука',
            'label_en': 'Science',
            'url': '#disciplines',
            'sort_order': 1,
        })
        self.assertEqual(create.status_code, 201)

        items = self.client.get('/api/nav-items')
        self.assertEqual(items.status_code, 200)
        self.assertGreater(len(items.get_json()), 0)

        home = self.client.get('/')
        self.assertIn('Илим', home.get_data(as_text=True))

    def test_admin_sidebar_labels_are_editable(self):
        self.client.post('/login', data={'username': 'admin', 'password': 'admin010203'}, follow_redirects=True)

        create = self.client.post('/api/admin-labels', json={
            'key': 'sidebar_dashboard',
            'value_ky': 'Башкаруу панели (редакция)',
            'value_ru': 'Панель управления (редакция)',
            'value_en': 'Dashboard (edited)',
        })
        self.assertEqual(create.status_code, 201)

        admin = self.client.get('/admin')
        self.assertIn('Башкаруу панели (редакция)', admin.get_data(as_text=True))

        update = self.client.put('/api/admin-labels/sidebar_dashboard', json={
            'value_ky': 'Башкаруу панели (өзгөртүлдү)',
            'value_ru': 'Панель управления (изменено)',
            'value_en': 'Dashboard (updated)',
        })
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.get_json()['item']['value_ky'], 'Башкаруу панели (өзгөртүлдү)')


if __name__ == '__main__':
    unittest.main()
