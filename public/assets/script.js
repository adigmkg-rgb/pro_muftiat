const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');
const siteSearch = document.getElementById('siteSearch');
const filterButtons = document.querySelectorAll('.filter-btn');
const articleCards = document.querySelectorAll('.article-card');
const langButtons = document.querySelectorAll('.lang-btn');

const storedTheme = localStorage.getItem('muftiat-theme');
if (storedTheme === 'dark') {
  body.classList.add('theme-dark');
  if (themeToggle) themeToggle.innerHTML = '<span class="toggle-icon">☾</span>';
} else {
  body.classList.remove('theme-dark');
  if (themeToggle) themeToggle.innerHTML = '<span class="toggle-icon">☀</span>';
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = body.classList.toggle('theme-dark');
    localStorage.setItem('muftiat-theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<span class="toggle-icon">☾</span>' : '<span class="toggle-icon">☀</span>';
  });
}

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (siteSearch) {
  siteSearch.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    articleCards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.classList.toggle('hidden', !text.includes(query) && query !== '');
    });
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    const selected = button.dataset.filter;
    articleCards.forEach((card) => {
      const category = card.dataset.category || '';
      const match = selected === 'all' || category.includes(selected);
      card.classList.toggle('hidden', !match);
    });
  });
});

const revealElements = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealElements.forEach((element) => observer.observe(element));

const quizData = [
  { question: '1. Билим берүүнүн негизги максаты кайсы?', options: ['Окуучуларды интеллектуалдык жана практикалык деңгээлде өнүктүрүү', 'Жөн гана сынак тапшырмаларын берүү', 'Тек гана билимге жетүү үчүн китепти окуу', 'Мугалимдерге кошумча убакыт берүүсү'], answer: 0 },
  { question: '2. Интерактивдүү окуу ыкмасы кандай пайда берет?', options: ['Окууда катышууну жана кызыгууну арттырат', 'Сабактын узактыгын гана көбөйтөт', 'Тек окуучулардын санын көбөйтөт', 'Мугалимдерди жумуштан бошотот'], answer: 0 },
  { question: '3. Билим берүүнүн заманбап ыкмасы кайсы?', options: ['AI, онлайн курстар жана интерактивдүү платформа', 'Факультеттик конспекттер гана', 'Китеп кошуунун методикасы', 'Сабактардын ысымдарын гана кароо'], answer: 0 }
];

const questionText = document.getElementById('questionText');
const quizOptions = document.getElementById('quizOptions');
const quizCounter = document.getElementById('quizCounter');
const quizScore = document.getElementById('quizScore');
const submitAnswer = document.getElementById('submitAnswer');
const nextQuestion = document.getElementById('nextQuestion');
const progressRing = document.getElementById('progressRing');
const progressValue = document.getElementById('progressValue');

let currentIndex = 0;
let selectedOptionIndex = null;
let score = 0;

function renderQuestion() {
  const currentQuestion = quizData[currentIndex];
  if (!questionText || !quizOptions || !quizCounter) return;
  questionText.textContent = currentQuestion.question;
  quizCounter.textContent = `${currentIndex + 1} / ${quizData.length}`;
  quizOptions.innerHTML = '';
  selectedOptionIndex = null;

  currentQuestion.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = option;
    button.addEventListener('click', () => {
      selectedOptionIndex = index;
      document.querySelectorAll('.option-btn').forEach((btn) => btn.classList.remove('selected'));
      button.classList.add('selected');
    });
    quizOptions.appendChild(button);
  });
}

function updateProgress() {
  if (!progressRing || !progressValue) return;
  const progressPercent = Math.min(100, Math.round((score / quizData.length) * 100));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  progressRing.style.strokeDasharray = String(circumference);
  progressRing.style.strokeDashoffset = String(circumference - (progressPercent / 100) * circumference);
  progressValue.textContent = `${progressPercent}%`;
}

if (submitAnswer) {
  submitAnswer.addEventListener('click', () => {
    if (selectedOptionIndex === null) return;
    const currentQuestion = quizData[currentIndex];
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach((button, index) => {
      if (index === currentQuestion.answer) button.classList.add('correct');
      if (index === selectedOptionIndex && index !== currentQuestion.answer) button.classList.add('incorrect');
      button.disabled = true;
    });

    if (selectedOptionIndex === currentQuestion.answer) {
      score += 1;
      if (quizScore) quizScore.textContent = `${score} балл`;
    }
    updateProgress();
  });
}

if (nextQuestion) {
  nextQuestion.addEventListener('click', () => {
    if (currentIndex < quizData.length - 1) {
      currentIndex += 1;
      renderQuestion();
      return;
    }
    currentIndex = 0;
    score = 0;
    if (quizScore) quizScore.textContent = '0 балл';
    renderQuestion();
    updateProgress();
    document.querySelectorAll('.option-btn').forEach((button) => {
      button.disabled = false;
      button.classList.remove('correct', 'incorrect', 'selected');
    });
  });
}

renderQuestion();
updateProgress();

// The public site is hosted on Vercel while the Flask API is hosted on Render.
// Keep database credentials on Render only; the browser needs only this public API URL.
const API_URL = 'https://pro-muftiat.onrender.com';

function articleText(article, field, lang) {
  return article[`${field}_${lang}`] || article[`${field}_ky`] || article[`${field}_ru`] || article[`${field}_en`] || '';
}

function articleDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function navText(item, lang) {
  return item[`label_${lang}`] || item.label_ky || item.label_ru || item.label_en || '';
}

async function loadNavigation() {
  const navigation = document.querySelector('.main-nav');
  if (!navigation) return;

  try {
    const response = await fetch(`${API_URL}/api/nav-items`);
    if (!response.ok) throw new Error('Could not load navigation');
    const items = await response.json();
    const lang = document.documentElement.lang || 'ky';
    navigation.replaceChildren();
    items.forEach((item) => {
      const link = document.createElement('a');
      link.href = item.url || '#';
      link.textContent = navText(item, lang);
      navigation.append(link);
    });
  } catch (error) {
    // Keep the links written in the HTML if the API is temporarily unavailable.
    console.error(error);
  }
}

function buildArticleCard(article, lang) {
  const link = document.createElement('a');
  link.className = 'article-card';
  link.href = `/article-detail.html?id=${encodeURIComponent(article.id)}`;
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';

  const image = document.createElement('img');
  image.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80';
  image.alt = articleText(article, 'title', lang);

  const content = document.createElement('div');
  content.className = 'article-content';
  const tag = document.createElement('span');
  tag.className = 'article-tag';
  tag.textContent = 'Article';
  const title = document.createElement('h3');
  title.textContent = articleText(article, 'title', lang);
  const summary = document.createElement('p');
  summary.textContent = articleText(article, 'summary', lang);
  const meta = document.createElement('div');
  meta.className = 'article-meta';
  const author = document.createElement('span');
  author.textContent = article.author || '';
  const createdAt = document.createElement('span');
  createdAt.textContent = articleDate(article.created_at);
  meta.append(author, createdAt);
  content.append(tag, title, summary, meta);
  link.append(image, content);
  return link;
}

async function loadArticleLists() {
  const listGrid = document.querySelector('.list-page-grid');
  const homeGrid = document.querySelector('.articles .article-grid');
  if (!listGrid && !homeGrid) return;

  try {
    const response = await fetch(`${API_URL}/api/articles`);
    if (!response.ok) throw new Error('Could not load articles');
    const articles = await response.json();
    const lang = document.documentElement.lang || 'ky';

    [listGrid, homeGrid].filter(Boolean).forEach((grid) => {
      grid.replaceChildren();
      const visibleArticles = grid === homeGrid ? articles.slice(0, 6) : articles;
      visibleArticles.forEach((article) => grid.append(buildArticleCard(article, lang)));
      if (!visibleArticles.length) grid.textContent = 'No articles yet.';
    });
  } catch (error) {
    console.error(error);
    [listGrid, homeGrid].filter(Boolean).forEach((grid) => {
      grid.textContent = 'Articles are temporarily unavailable.';
    });
  }
}

async function loadArticleDetail() {
  const articleElement = document.querySelector('.article-detail');
  if (!articleElement) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    articleElement.textContent = 'Select an article from the article list.';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/articles/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Could not load article');
    const article = await response.json();
    const lang = document.documentElement.lang || 'ky';
    articleElement.replaceChildren();

    const title = document.createElement('h1');
    title.textContent = articleText(article, 'title', lang);
    const meta = document.createElement('div');
    meta.className = 'article-meta';
    meta.textContent = [article.author, articleDate(article.created_at)].filter(Boolean).join(' · ');
    const content = document.createElement('div');
    articleText(article, 'content', lang).split(/\n{2,}/).filter(Boolean).forEach((paragraph) => {
      const element = document.createElement('p');
      element.textContent = paragraph;
      content.append(element);
    });
    articleElement.append(title, meta, content);
  } catch (error) {
    console.error(error);
    articleElement.textContent = 'This article is temporarily unavailable.';
  }
}

loadArticleLists();
loadArticleDetail();
loadNavigation();

langButtons.forEach((button) => {
  button.addEventListener('click', () => {
    langButtons.forEach((item) => item.classList.toggle('active', item === button));
    const lang = button.dataset.lang;
    localStorage.setItem('muftiat-lang', lang);
  });
});
