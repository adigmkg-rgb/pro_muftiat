document.addEventListener('DOMContentLoaded', () => {
  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealItems.forEach((item) => observer.observe(item));

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: document.getElementById('name')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim() || '',
        message: document.getElementById('message')?.value?.trim() || ''
      };

      const status = document.getElementById('form-status');
      if (!payload.name || !payload.email || !payload.message) {
        status.textContent = 'Атыңыз, email жана билдирүү бөгөтү толтурулушу керек.';
        status.style.color = '#b42318';
        return;
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      status.textContent = response.ok ? 'Бизге билдирүүңиз başarı менен жетти.' : (result.error || 'Ошибка при отправке');
      status.style.color = response.ok ? '#1ea76f' : '#b42318';
      if (response.ok) contactForm.reset();
    });
  }

  const articleList = document.getElementById('article-list');
  const countArticles = document.getElementById('countArticles');
  const adminForm = document.getElementById('article-form');
  const adminStatus = document.getElementById('admin-status');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const navForm = document.getElementById('nav-form');
  const navStatus = document.getElementById('nav-status');
  const navList = document.getElementById('nav-list');
  const cancelNavEditBtn = document.getElementById('cancel-nav-edit');
  const adminLabelForm = document.getElementById('admin-label-form');
  const adminLabelStatus = document.getElementById('admin-label-status');
  const adminLabelList = document.getElementById('admin-label-list');
  const labelKeySelect = document.getElementById('label_key_select');
  const cancelLabelEditBtn = document.getElementById('cancel-label-edit');

  async function loadArticles() {
    const response = await fetch('/api/articles');
    const articles = await response.json();
    if (articleList) {
      articleList.innerHTML = articles.map((article) => `
        <tr>
          <td>${article.id}</td>
          <td>${article.title_ky || article.title_en || '—'}</td>
          <td>${article.author || 'Admin'}</td>
          <td>${article.created_at ? article.created_at.slice(0, 10) : '—'}</td>
          <td>
            <button class="mini-btn edit-btn" data-id="${article.id}">Түзөтүү</button>
            <button class="mini-btn delete-btn" data-id="${article.id}">Өчүрүү</button>
          </td>
        </tr>
      `).join('');
    }
    if (countArticles) countArticles.textContent = String(articles.length || 0);
  }

  async function loadNavItems() {
    if (!navList) return;
    const response = await fetch('/api/nav-items');
    const items = await response.json();
    navList.innerHTML = items.map((item) => `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:0.8rem 1rem; border:1px solid rgba(17,35,61,0.08); border-radius:12px; margin-top:0.5rem;">
        <div>
          <strong>${item.label_ky || item.label_en || 'Menu'}</strong>
          <div style="color:#53657f; font-size:0.85rem;">${item.url || '#'}</div>
        </div>
        <div>
          <button class="mini-btn edit-nav-btn" data-id="${item.id}">Түзөтүү</button>
          <button class="mini-btn delete-nav-btn" data-id="${item.id}">Өчүрүү</button>
        </div>
      </div>
    `).join('');
  }

  async function loadAdminLabels() {
    if (!adminLabelList || !labelKeySelect) return;
    const response = await fetch('/api/admin-labels');
    const labels = await response.json();
    labelKeySelect.innerHTML = labels.map((label) => `<option value="${label.key}">${label.key}</option>`).join('');
    adminLabelList.innerHTML = labels.map((label) => `
      <div style="padding:0.8rem 1rem; border:1px solid rgba(17,35,61,0.08); border-radius:12px; margin-top:0.5rem;">
        <strong>${label.key}</strong>
        <div style="color:#53657f; font-size:0.85rem;">${label.value_ky || label.value_en || '—'}</div>
      </div>
    `).join('');
    if (labels.length) {
      const first = labels[0];
      document.getElementById('admin_label_key').value = first.key;
      document.getElementById('label_value_ky').value = first.value_ky || '';
      document.getElementById('label_value_ru').value = first.value_ru || '';
      document.getElementById('label_value_en').value = first.value_en || '';
    }
  }

  function resetForm() {
    adminForm.reset();
    document.getElementById('article_id').value = '';
    cancelEditBtn.style.display = 'none';
    adminStatus.textContent = '';
  }

  function resetNavForm() {
    if (!navForm) return;
    navForm.reset();
    document.getElementById('nav_id').value = '';
    document.getElementById('nav_url').value = '#';
    document.getElementById('sort_order').value = 1;
    cancelNavEditBtn.style.display = 'none';
    navStatus.textContent = '';
  }

  function fillForm(article) {
    document.getElementById('article_id').value = article.id;
    document.getElementById('title_ky').value = article.title_ky || '';
    document.getElementById('title_ru').value = article.title_ru || '';
    document.getElementById('title_en').value = article.title_en || '';
    document.getElementById('summary_ky').value = article.summary_ky || '';
    document.getElementById('summary_ru').value = article.summary_ru || '';
    document.getElementById('summary_en').value = article.summary_en || '';
    document.getElementById('content_ky').value = article.content_ky || '';
    document.getElementById('content_ru').value = article.content_ru || '';
    document.getElementById('content_en').value = article.content_en || '';
    document.getElementById('author').value = article.author || '';
    document.getElementById('category_id').value = article.category_id || 1;
    cancelEditBtn.style.display = 'inline-flex';
  }

  if (adminForm) {
    adminForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        title_ky: document.getElementById('title_ky')?.value?.trim() || '',
        title_ru: document.getElementById('title_ru')?.value?.trim() || '',
        title_en: document.getElementById('title_en')?.value?.trim() || '',
        summary_ky: document.getElementById('summary_ky')?.value?.trim() || '',
        summary_ru: document.getElementById('summary_ru')?.value?.trim() || '',
        summary_en: document.getElementById('summary_en')?.value?.trim() || '',
        content_ky: document.getElementById('content_ky')?.value?.trim() || '',
        content_ru: document.getElementById('content_ru')?.value?.trim() || '',
        content_en: document.getElementById('content_en')?.value?.trim() || '',
        author: document.getElementById('author')?.value?.trim() || 'Admin',
        category_id: Number(document.getElementById('category_id')?.value || 1)
      };

      const articleId = document.getElementById('article_id')?.value;
      if (!payload.title_ky && !payload.title_ru && !payload.title_en) {
        adminStatus.textContent = 'Макаланын аталышын толтуруңуз.';
        adminStatus.style.color = '#b42318';
        return;
      }

      const method = articleId ? 'PUT' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const ok = response.ok;
      adminStatus.textContent = ok ? (articleId ? 'Макала жаңыртылды.' : 'Макала сакталды.') : (result.error || 'Өнүгүш катасы');
      adminStatus.style.color = ok ? '#1ea76f' : '#b42318';
      if (ok) {
        resetForm();
        loadArticles();
      }
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetForm);
  }

  if (cancelNavEditBtn) {
    cancelNavEditBtn.addEventListener('click', resetNavForm);
  }

  if (cancelLabelEditBtn) {
    cancelLabelEditBtn.addEventListener('click', () => {
      if (!labelKeySelect) return;
      labelKeySelect.value = labelKeySelect.options[0]?.value || '';
      document.getElementById('admin_label_key').value = labelKeySelect.value;
      const selected = Array.from(labelKeySelect.options).find((option) => option.value === labelKeySelect.value);
      if (selected) {
        const key = selected.value;
        fetch('/api/admin-labels')
          .then((response) => response.json())
          .then((labels) => {
            const label = labels.find((item) => item.key === key);
            if (!label) return;
            document.getElementById('label_value_ky').value = label.value_ky || '';
            document.getElementById('label_value_ru').value = label.value_ru || '';
            document.getElementById('label_value_en').value = label.value_en || '';
          });
      }
      cancelLabelEditBtn.style.display = 'none';
      adminLabelStatus.textContent = '';
    });
  }

  if (labelKeySelect) {
    labelKeySelect.addEventListener('change', async (event) => {
      const key = event.target.value;
      document.getElementById('admin_label_key').value = key;
      const response = await fetch('/api/admin-labels');
      const labels = await response.json();
      const label = labels.find((item) => item.key === key);
      if (!label) return;
      document.getElementById('label_value_ky').value = label.value_ky || '';
      document.getElementById('label_value_ru').value = label.value_ru || '';
      document.getElementById('label_value_en').value = label.value_en || '';
      cancelLabelEditBtn.style.display = 'inline-flex';
    });
  }

  if (adminLabelForm) {
    adminLabelForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const key = document.getElementById('admin_label_key').value || labelKeySelect.value;
      const payload = {
        value_ky: document.getElementById('label_value_ky').value.trim(),
        value_ru: document.getElementById('label_value_ru').value.trim(),
        value_en: document.getElementById('label_value_en').value.trim(),
      };

      const response = await fetch(`/api/admin-labels/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      adminLabelStatus.textContent = response.ok ? 'Заголовок жаңыртылды.' : (result.error || 'Ошибка');
      adminLabelStatus.style.color = response.ok ? '#1ea76f' : '#b42318';
      if (response.ok) {
        cancelLabelEditBtn.style.display = 'none';
        loadAdminLabels();
        window.location.reload();
      }
    });
  }

  if (navForm) {
    navForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        label_ky: document.getElementById('label_ky').value.trim(),
        label_ru: document.getElementById('label_ru').value.trim(),
        label_en: document.getElementById('label_en').value.trim(),
        url: document.getElementById('nav_url').value.trim() || '#',
        sort_order: Number(document.getElementById('sort_order').value || 0)
      };
      const itemId = document.getElementById('nav_id').value;
      const method = itemId ? 'PUT' : 'POST';
      const url = itemId ? `/api/nav-items/${itemId}` : '/api/nav-items';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      navStatus.textContent = response.ok ? (itemId ? 'Меню элементи жаңыртылды.' : 'Меню элементи кошулду.') : (result.error || 'Меню катасы');
      navStatus.style.color = response.ok ? '#1ea76f' : '#b42318';
      if (response.ok) {
        resetNavForm();
        loadNavItems();
      }
    });
  }

  if (articleList) {
    articleList.addEventListener('click', async (event) => {
      const editButton = event.target.closest('.edit-btn');
      const deleteButton = event.target.closest('.delete-btn');
      const articleId = Number(event.target.dataset.id || event.target.closest('button')?.dataset?.id);

      if (editButton && articleId) {
        const response = await fetch(`/api/articles/${articleId}`);
        const article = await response.json();
        fillForm(article);
      }

      if (deleteButton && articleId) {
        const confirmDelete = window.confirm('Бул макаланы өчүрүү керекпи?');
        if (!confirmDelete) return;
        const response = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
        const result = await response.json();
        adminStatus.textContent = response.ok ? result.message : (result.error || 'Өчүрүү катасы');
        adminStatus.style.color = response.ok ? '#1ea76f' : '#b42318';
        if (response.ok) loadArticles();
      }
    });
  }

  if (navList) {
    navList.addEventListener('click', async (event) => {
      const editButton = event.target.closest('.edit-nav-btn');
      const deleteButton = event.target.closest('.delete-nav-btn');
      const itemId = Number(event.target.dataset.id || event.target.closest('button')?.dataset?.id);

      if (editButton && itemId) {
        const response = await fetch(`/api/nav-items`);
        const items = await response.json();
        const item = items.find((entry) => entry.id === itemId);
        if (!item) return;
        document.getElementById('nav_id').value = item.id;
        document.getElementById('label_ky').value = item.label_ky || '';
        document.getElementById('label_ru').value = item.label_ru || '';
        document.getElementById('label_en').value = item.label_en || '';
        document.getElementById('nav_url').value = item.url || '#';
        document.getElementById('sort_order').value = item.sort_order || 0;
        cancelNavEditBtn.style.display = 'inline-flex';
      }

      if (deleteButton && itemId) {
        const confirmDelete = window.confirm('Бул меню элементин өчүрүү керекпи?');
        if (!confirmDelete) return;
        const response = await fetch(`/api/nav-items/${itemId}`, { method: 'DELETE' });
        const result = await response.json();
        navStatus.textContent = response.ok ? result.message : (result.error || 'Өчүрүү катасы');
        navStatus.style.color = response.ok ? '#1ea76f' : '#b42318';
        if (response.ok) loadNavItems();
      }
    });
  }

  loadArticles();
  loadNavItems();
  loadAdminLabels();
});
