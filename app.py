from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_cors import CORS
import os
from datetime import date, datetime
import psycopg
from psycopg.rows import dict_row
from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent


def load_env_file():
    env_path = BASE_DIR / '.env'
    if not env_path.exists():
        return

    with env_path.open('r', encoding='utf-8') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip("'\"")
            os.environ.setdefault(key, value)


load_env_file()
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/muftiat')
# PostgreSQL is the only supported database for this project.
DB_PATH = DATABASE_URL

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
app.secret_key = 'muftiat-admin-secret-key'
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin010203'
LANGS = ('ky', 'ru', 'en')


def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError('DATABASE_URL is not configured. Set a PostgreSQL connection string.')
    connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    return connection


def normalize_datetime_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def normalize_row(row):
    if row is None:
        return None
    if isinstance(row, dict):
        return {key: normalize_datetime_value(value) for key, value in row.items()}
    return row


def get_language():
    lang = (request.args.get('lang') or session.get('lang') or 'ky').strip().lower()
    if lang not in LANGS:
        lang = 'ky'
    session['lang'] = lang
    return lang


def get_translated_value(row, field_name, lang):
    if row is None:
        return ''
    key = f'{field_name}_{lang}'
    value = row.get(key)
    if value:
        return value
    for fallback_lang in LANGS:
        fallback_key = f'{field_name}_{fallback_lang}'
        candidate = row.get(fallback_key)
        if candidate:
            return candidate
    return ''


def get_admin_labels(lang='ky'):
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM admin_labels ORDER BY id ASC').fetchall()
    conn.close()
    result = {}
    for row in rows:
        key = row['key']
        value = row[f'value_{lang}'] or row['value_ky'] or row['value_ru'] or row['value_en'] or key
        result[key] = value
    return result


def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name_ky TEXT,
            name_ru TEXT,
            name_en TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id SERIAL PRIMARY KEY,
            title_ky TEXT,
            title_ru TEXT,
            title_en TEXT,
            summary_ky TEXT,
            summary_ru TEXT,
            summary_en TEXT,
            content_ky TEXT,
            content_ru TEXT,
            content_en TEXT,
            author TEXT,
            category_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS resources (
            id SERIAL PRIMARY KEY,
            title TEXT,
            type TEXT,
            url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id SERIAL PRIMARY KEY,
            question_ky TEXT,
            question_ru TEXT,
            question_en TEXT,
            option_a TEXT,
            option_b TEXT,
            option_c TEXT,
            option_d TEXT,
            correct_answer TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS nav_items (
            id SERIAL PRIMARY KEY,
            label_ky TEXT,
            label_ru TEXT,
            label_en TEXT,
            url TEXT,
            sort_order INTEGER DEFAULT 0
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS admin_labels (
            id SERIAL PRIMARY KEY,
            key TEXT UNIQUE,
            value_ky TEXT,
            value_ru TEXT,
            value_en TEXT
        )
    ''')
    conn.execute('SELECT COUNT(*) AS total FROM categories')
    if conn.execute('SELECT COUNT(*) AS total FROM categories').fetchone()['total'] == 0:
        default_categories = [
            ('Математика', 'Математика', 'Mathematics'),
            ('Физика', 'Физика', 'Physics'),
            ('Биология', 'Биология', 'Biology'),
            ('Информатика', 'Информатика', 'Informatics'),
        ]
        with conn.cursor() as cursor:
            cursor.executemany(
            'INSERT INTO categories (name_ky, name_ru, name_en) VALUES (%s, %s, %s)',
            default_categories,
        )
    if conn.execute('SELECT COUNT(*) AS total FROM nav_items').fetchone()['total'] == 0:
        default_nav = [
            ('Башкы бет', 'Главная', 'Home', '/', 1),
            ('Илим', 'Наука', 'Science', '#disciplines', 2),
            ('Билим беруу', 'Обучение', 'Education', '#teachers', 3),
            ('Макалалар', 'Статьи', 'Articles', '#articles', 4),
            ('Байланыш', 'Контакты', 'Contact', '#contact', 5),
            ('Admin', 'Admin', 'Admin', '/admin', 6),
        ]
        with conn.cursor() as cursor:
            cursor.executemany(
            'INSERT INTO nav_items (label_ky, label_ru, label_en, url, sort_order) VALUES (%s, %s, %s, %s, %s)',
            default_nav,
        )
    if conn.execute('SELECT COUNT(*) AS total FROM admin_labels').fetchone()['total'] == 0:
        default_labels = [
            ('sidebar_dashboard', 'Башкаруу панели', 'Панель управления', 'Dashboard'),
            ('sidebar_articles', 'Макалалар', 'Статьи', 'Articles'),
            ('sidebar_categories', 'Категориялар', 'Категории', 'Categories'),
            ('sidebar_quiz', 'Викторина', 'Викторина', 'Quiz'),
            ('sidebar_users', 'Колдонуучулар', 'Пользователи', 'Users'),
            ('sidebar_settings', 'Параметрлер', 'Настройки', 'Settings'),
            ('header_dashboard', 'Башкаруу панели', 'Панель управления', 'Dashboard'),
            ('article_form_title', 'Макала кошуу / жаңыртуу', 'Добавить / обновить статью', 'Add / update article'),
            ('articles_list_title', 'Макалалардын тизмеси', 'Список статей', 'Article list'),
            ('nav_section_title', 'Главный меню башкаруу', 'Управление главным меню', 'Main menu management'),
            ('stats_articles', 'Макалалар', 'Статьи', 'Articles'),
            ('stats_students', 'Окуучулар', 'Студенты', 'Students'),
            ('stats_quiz', 'Викторина', 'Викторина', 'Quiz'),
            ('stats_resources', 'Ресурстар', 'Ресурсы', 'Resources'),
        ]
        with conn.cursor() as cursor:
            cursor.executemany(
            'INSERT INTO admin_labels (key, value_ky, value_ru, value_en) VALUES (%s, %s, %s, %s)',
            default_labels,
        )
    conn.commit()
    conn.close()


@app.route('/')
def index():
    lang = get_language()
    conn = get_db_connection()
    articles = [normalize_row(row) for row in conn.execute('SELECT * FROM articles ORDER BY created_at DESC LIMIT 6').fetchall()]
    nav_items = [normalize_row(row) for row in conn.execute('SELECT * FROM nav_items ORDER BY sort_order ASC, id ASC').fetchall()]
    conn.close()
    return render_template('index.html', articles=articles, nav_items=nav_items, current_lang=lang)


@app.route('/article/<int:article_id>')
def article_detail(article_id):
    lang = get_language()
    conn = get_db_connection()
    article = normalize_row(conn.execute('SELECT * FROM articles WHERE id = %s', (article_id,)).fetchone())
    conn.close()
    if not article:
        return redirect(url_for('index'))
    return render_template('article.html', article=article, current_lang=lang)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            session['username'] = username
            return redirect(url_for('admin'))

        return render_template('login.html', error='Неверный логин или пароль')

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/admin')
def admin():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    lang = get_language()
    return render_template('admin.html', username=session.get('username', 'admin'), admin_labels=get_admin_labels(lang), current_lang=lang)


@app.route('/api/articles', methods=['GET'])
def list_articles():
    """
    List articles
    ---
    responses:
        200:
            description: A list of articles
            content:
                application/json:
                    schema:
                        type: array
                        items:
                            type: object
    """
    conn = get_db_connection()
    rows = [normalize_row(row) for row in conn.execute('SELECT * FROM articles ORDER BY created_at DESC').fetchall()]
    conn.close()
    return jsonify(rows)


@app.route('/api/articles/<int:article_id>', methods=['GET'])
def get_article(article_id):
    """
    Get article by ID
    ---
    parameters:
        - name: article_id
          in: path
          type: integer
          required: true
    responses:
        200:
            description: Article object
        404:
            description: Not found
    """
    conn = get_db_connection()
    row = normalize_row(conn.execute('SELECT * FROM articles WHERE id = %s', (article_id,)).fetchone())
    conn.close()
    if not row:
        return jsonify({'error': 'Макала табылган жок.'}), 404
    return jsonify(row)


@app.route('/api/articles', methods=['POST'])
def create_article():
    """
    Create a new article
    ---
    requestBody:
        required: true
        content:
            application/json:
                schema:
                    type: object
    responses:
        201:
            description: Article created
        401:
            description: Unauthorized
    """
    payload = request.get_json(silent=True) or {}
    sql = '''
        INSERT INTO articles (
            title_ky, title_ru, title_en,
            summary_ky, summary_ru, summary_en,
            content_ky, content_ru, content_en,
            author, category_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    '''
    vals = (
        payload.get('title_ky') or '', payload.get('title_ru') or '', payload.get('title_en') or '',
        payload.get('summary_ky') or '', payload.get('summary_ru') or '', payload.get('summary_en') or '',
        payload.get('content_ky') or '', payload.get('content_ru') or '', payload.get('content_en') or '',
        payload.get('author') or 'Admin', payload.get('category_id') or 1,
    )

    conn = get_db_connection()
    row = conn.execute(sql, vals).fetchone()
    conn.commit()
    article_id = row['id'] if row else None
    conn.close()

    return jsonify({'success': True, 'message': 'Макала базага сакталды.', 'id': article_id}), 201


@app.route('/api/articles/<int:article_id>', methods=['PUT'])
def update_article(article_id):
    """
    Update an article
    ---
    parameters:
        - name: article_id
          in: path
          type: integer
          required: true
    requestBody:
        required: true
        content:
            application/json:
                schema:
                    type: object
    responses:
        200:
            description: Article updated
        401:
            description: Unauthorized
        404:
            description: Not found
    """
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No JSON body'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM articles WHERE id = %s', (article_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Макала табылган жок.'}), 404

    set_clauses = []
    values = []
    for field in ['title', 'summary', 'content']:
        for lang in LANGS:
            key = f'{field}_{lang}'
            if key in payload and payload[key] is not None:
                set_clauses.append(f'{key} = %s')
                values.append(payload[key])
    if 'author' in payload:
        set_clauses.append('author = %s')
        values.append(payload['author'])
    if 'category_id' in payload:
        set_clauses.append('category_id = %s')
        values.append(payload['category_id'])

    if not set_clauses:
        conn.close()
        return jsonify({'error': 'Жаңыртуу үчүн маалымат бериңиз.'}), 400

    sql = 'UPDATE articles SET ' + ', '.join(set_clauses) + ' WHERE id = %s'
    values.append(article_id)
    conn.execute(sql, tuple(values))
    conn.commit()
    updated = conn.execute('SELECT * FROM articles WHERE id = %s', (article_id,)).fetchone()
    conn.close()
    payload = dict(updated)
    payload['success'] = True
    payload['message'] = 'Макала жаңыртылды.'
    return jsonify(payload)


@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    """
    Delete an article
    ---
    parameters:
        - name: article_id
          in: path
          type: integer
          required: true
    responses:
        200:
            description: Deleted
        401:
            description: Unauthorized
        404:
            description: Not found
    """
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM articles WHERE id = %s', (article_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Макала табылган жок.'}), 404
    conn.execute('DELETE FROM articles WHERE id = %s', (article_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Макала өчүрүлдү.'})


@app.route('/api/categories', methods=['GET'])
def categories():
    """
    List categories
    ---
    responses:
        200:
            description: A list of categories
    """
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM categories ORDER BY id ASC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route('/api/categories', methods=['POST'])
def create_category():
    """
    Create category
    ---
    requestBody:
        required: true
        content:
            application/json:
                schema:
                    type: object
    responses:
        201:
            description: Created
        401:
            description: Unauthorized
    """
    if not session.get('logged_in'):
        return jsonify({'error': 'Авторизация талап кылынат.'}), 401

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No JSON body'}), 400

    conn = get_db_connection()
    row = conn.execute(
        'INSERT INTO categories (name_ky, name_ru, name_en) VALUES (%s, %s, %s) RETURNING id',
        (payload.get('name_ky') or '', payload.get('name_ru') or '', payload.get('name_en') or '')
    ).fetchone()
    conn.commit()
    category_id = row['id'] if row else None
    conn.close()
    return jsonify({'success': True, 'id': category_id, 'message': 'Категория кошулду.'}), 201


@app.route('/api/nav-items', methods=['GET'])
def get_nav_items():
    """
    List navigation items
    ---
    responses:
        200:
            description: List of nav items
    """
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM nav_items ORDER BY sort_order ASC, id ASC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route('/api/nav-items', methods=['POST'])
def create_nav_item():
    """
    Create navigation item
    ---
    requestBody:
        required: true
        content:
            application/json:
                schema:
                    type: object
    responses:
        201:
            description: Created
        401:
            description: Unauthorized
    """
    if not session.get('logged_in'):
        return jsonify({'error': 'Авторизация талап кылынат.'}), 401

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No JSON body'}), 400

    conn = get_db_connection()
    row = conn.execute(
        'INSERT INTO nav_items (label_ky, label_ru, label_en, url, sort_order) VALUES (%s, %s, %s, %s, %s) RETURNING id',
        (
            payload.get('label_ky') or '',
            payload.get('label_ru') or '',
            payload.get('label_en') or '',
            payload.get('url') or '#',
            payload.get('sort_order') or 0,
        )
    ).fetchone()
    conn.commit()
    item_id = row['id'] if row else None
    conn.close()
    return jsonify({'success': True, 'id': item_id, 'message': 'Меню элементи кошулду.'}), 201


@app.route('/api/nav-items/<int:item_id>', methods=['PUT'])
def update_nav_item(item_id):
    if not session.get('logged_in'):
        return jsonify({'error': 'Авторизация талап кылынат.'}), 401

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No JSON body'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM nav_items WHERE id = %s', (item_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Элемент табылган жок.'}), 404

    set_clauses = []
    values = []
    for field in ['label_ky', 'label_ru', 'label_en', 'url', 'sort_order']:
        if field in payload:
            set_clauses.append(f'{field} = %s')
            values.append(payload[field])

    if not set_clauses:
        conn.close()
        return jsonify({'error': 'Өзгөртүү үчүн маалымат бериңиз.'}), 400

    values.append(item_id)
    conn.execute('UPDATE nav_items SET ' + ', '.join(set_clauses) + ' WHERE id = %s', tuple(values))
    conn.commit()
    updated = conn.execute('SELECT * FROM nav_items WHERE id = %s', (item_id,)).fetchone()
    conn.close()
    return jsonify({'success': True, 'message': 'Меню элементи жаңыртылды.', 'item': dict(updated)})


@app.route('/api/nav-items/<int:item_id>', methods=['DELETE'])
def delete_nav_item(item_id):
    if not session.get('logged_in'):
        return jsonify({'error': 'Авторизация талап кылынат.'}), 401

    conn = get_db_connection()
    row = conn.execute('SELECT * FROM nav_items WHERE id = %s', (item_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Элемент табылган жок.'}), 404
    conn.execute('DELETE FROM nav_items WHERE id = %s', (item_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Меню элементи өчүрүлдү.'})


@app.route('/api/admin-labels', methods=['GET'])
def list_admin_labels():
    lang = get_language()
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM admin_labels ORDER BY id ASC').fetchall()
    conn.close()
    payload = []
    for row in rows:
        payload.append({
            'id': row['id'],
            'key': row['key'],
            'value_ky': row['value_ky'],
            'value_ru': row['value_ru'],
            'value_en': row['value_en'],
            'value': row[f'value_{lang}'] or row['value_ky'] or row['value_ru'] or row['value_en'],
        })
    return jsonify(payload)


@app.route('/api/admin-labels', methods=['POST'])
def create_admin_label():
    if not session.get('logged_in'):
        return jsonify({'error': 'Авторизация талап кылынат.'}), 401

    payload = request.get_json(silent=True) or {}
    key = (payload.get('key') or '').strip()
    if not key:
        return jsonify({'error': 'Ключ жазылууга тийиш.'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM admin_labels WHERE key = %s', (key,)).fetchone()
    if existing:
        values = []
        for field in ['value_ky', 'value_ru', 'value_en']:
            if field in payload:
                values.append(f'{field} = %s')
        if not values:
            conn.close()
            return jsonify({'error': 'Өзгөртүү үчүн маалымат бериңиз.'}), 400

        update_values = [payload[field] for field in ['value_ky', 'value_ru', 'value_en'] if field in payload]
        update_values.append(key)
        conn.execute('UPDATE admin_labels SET ' + ', '.join(values) + ' WHERE key = %s', tuple(update_values))
        conn.commit()
        row = conn.execute('SELECT * FROM admin_labels WHERE key = %s', (key,)).fetchone()
        conn.close()
        return jsonify({'success': True, 'message': 'Заголовок жаңыртылды.', 'item': dict(row)}), 201

    row = conn.execute(
        'INSERT INTO admin_labels (key, value_ky, value_ru, value_en) VALUES (%s, %s, %s, %s) RETURNING id',
        (key, payload.get('value_ky') or '', payload.get('value_ru') or '', payload.get('value_en') or '')
    ).fetchone()
    conn.commit()
    item_id = row['id'] if row else None
    row = conn.execute('SELECT * FROM admin_labels WHERE id = %s', (item_id,)).fetchone()
    conn.close()
    return jsonify({'success': True, 'message': 'Заголовок кошулду.', 'item': dict(row)}), 201


@app.route('/api/admin-labels/<string:key>', methods=['PUT'])
def update_admin_label(key):
    if not session.get('logged_in'):
        return jsonify({'error': 'Авторизация талап кылынат.'}), 401

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No JSON body'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM admin_labels WHERE key = %s', (key,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Заголовок табылган жок.'}), 404

    set_clauses = []
    values = []
    for field in ['value_ky', 'value_ru', 'value_en']:
        if field in payload:
            set_clauses.append(f'{field} = %s')
            values.append(payload[field])

    if not set_clauses:
        conn.close()
        return jsonify({'error': 'Өзгөртүү үчүн маалымат бериңиз.'}), 400

    values.append(key)
    conn.execute('UPDATE admin_labels SET ' + ', '.join(set_clauses) + ' WHERE key = %s', tuple(values))
    conn.commit()
    updated = conn.execute('SELECT * FROM admin_labels WHERE key = %s', (key,)).fetchone()
    conn.close()
    return jsonify({'success': True, 'message': 'Заголовок жаңыртылды.', 'item': dict(updated)})


@app.route('/api/contact', methods=['POST'])
def contact_form():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No payload'}), 400

    name = payload.get('name') or 'Unknown'
    email = payload.get('email') or ''
    message = payload.get('message') or ''

    conn = get_db_connection()
    conn.execute('INSERT INTO contact_messages (name, email, message) VALUES (%s, %s, %s)', (name, email, message))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Байланыш билдирүү ийгиликтүү жөнөтүлдү.'})


@app.route('/openapi.json')
def openapi_json():
    spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "Muftiat API",
            "version": "1.0.0",
            "description": "Simple OpenAPI spec for the Muftiat Flask API"
        },
        "servers": [{"url": "http://localhost:5000"}],
        "paths": {
            "/api/articles": {
                "get": {
                    "summary": "List articles",
                    "responses": {"200": {"description": "A list of articles", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Article"}}}}}}
                },
                "post": {
                    "summary": "Create article",
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ArticleCreate"}}}},
                    "responses": {"201": {"description": "Article created"}}
                }
            },
            "/api/articles/{article_id}": {
                "get": {
                    "summary": "Get article by ID",
                    "parameters": [{"name": "article_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                    "responses": {"200": {"description": "Article", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Article"}}}}, "404": {"description": "Not found"}}
                },
                "put": {
                    "summary": "Update article",
                    "parameters": [{"name": "article_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ArticleCreate"}}}},
                    "responses": {"200": {"description": "Article updated"}}
                },
                "delete": {
                    "summary": "Delete article",
                    "parameters": [{"name": "article_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                    "responses": {"200": {"description": "Deleted"}, "404": {"description": "Not found"}}
                }
            },
            "/api/categories": {
                "get": {"summary": "List categories", "responses": {"200": {"description": "A list of categories"}}},
                "post": {"summary": "Create category", "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CategoryCreate"}}}}, "responses": {"201": {"description": "Created"}}}
            },
            "/api/nav-items": {"get": {"summary": "List nav items", "responses": {"200": {"description": "List"}}}, "post": {"summary": "Create nav item", "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/NavItemCreate"}}}}, "responses": {"201": {"description": "Created"}}}}
        },
        "components": {
            "schemas": {
                "Article": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "title_ky": {"type": "string"},
                        "title_ru": {"type": "string"},
                        "title_en": {"type": "string"},
                        "summary_ky": {"type": "string"},
                        "content_ky": {"type": "string"},
                        "author": {"type": "string"},
                        "category_id": {"type": "integer"}
                    }
                },
                "ArticleCreate": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "title_ky": {"type": "string"},
                        "title_ru": {"type": "string"},
                        "title_en": {"type": "string"},
                        "summary_ky": {"type": "string"},
                        "summary_ru": {"type": "string"},
                        "summary_en": {"type": "string"},
                        "content_ky": {"type": "string"},
                        "content_ru": {"type": "string"},
                        "content_en": {"type": "string"},
                        "author": {"type": "string"},
                        "category_id": {"type": "integer"}
                    },
                    "required": []
                },
                "CategoryCreate": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {"name_ky": {"type": "string"}, "name_ru": {"type": "string"}, "name_en": {"type": "string"}},
                    "required": []
                },
                "NavItemCreate": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {"label_ky": {"type": "string"}, "label_ru": {"type": "string"}, "label_en": {"type": "string"}, "url": {"type": "string"}, "sort_order": {"type": "integer"}},
                    "required": []
                }
            }
        }
    }
    return jsonify(spec)


@app.route('/apidocs')
def api_docs():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Muftiat API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css" />
      <style>body { margin:0; padding:0; }</style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
      <script>
        const ui = SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui',
        });
      </script>
    </body>
    </html>
    """
    return html


init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
