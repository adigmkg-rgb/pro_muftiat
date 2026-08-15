const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');
const siteSearch = document.getElementById('siteSearch');
const filterButtons = document.querySelectorAll('.filter-btn');
const articleCards = document.querySelectorAll('.article-card');

const storedTheme = localStorage.getItem('muftiat-theme');
if (storedTheme === 'dark') {
  body.classList.add('theme-dark');
  themeToggle.innerHTML = '<span class="toggle-icon">☾</span>';
} else {
  body.classList.remove('theme-dark');
  themeToggle.innerHTML = '<span class="toggle-icon">☀</span>';
}

themeToggle.addEventListener('click', () => {
  const isDark = body.classList.toggle('theme-dark');
  localStorage.setItem('muftiat-theme', isDark ? 'dark' : 'light');
  themeToggle.innerHTML = isDark ? '<span class="toggle-icon">☾</span>' : '<span class="toggle-icon">☀</span>';
});

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

siteSearch.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();

  articleCards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    const visible = text.includes(query);
    card.classList.toggle('hidden', !visible);
  });
});

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
  {
    question: '1. Билим берүүнүн негизги максаты кайсы?',
    options: [
      'Окуучуларды интеллектуалдык жана практикалык деңгээлде өнүктүрүү',
      'Жөн гана сынак тапшырмаларын берүү',
      'Тек гана билимге жетүү үчүн китепти окуу',
      'Мугалимдерге кошумча убакыт берүүсү'
    ],
    answer: 0
  },
  {
    question: '2. Интерактивдүү окуу ыкмасы кандай пайда берет?',
    options: [
      'Окууда катышууну жана кызыгууну арттырат',
      'Сабактын узактыгын гана көбөйтөт',
      'Тек окуучулардын санын көбөйтөт',
      'Мугалимдерди жумуштан бошотот'
    ],
    answer: 0
  },
  {
    question: '3. Билим берүүнүн заманбап ыкмасы кайсы?',
    options: [
      'AI, онлайн курстар жана интерактивдүү платформа',
      'Факультеттик конспекттер гана',
      'Китеп кошуунун методикасы',
      'Сабактардын ысымдарын гана кароо'
    ],
    answer: 0
  }
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
  const progressPercent = Math.min(100, Math.round((score / quizData.length) * 100));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  progressRing.style.strokeDasharray = String(circumference);
  progressRing.style.strokeDashoffset = String(circumference - (progressPercent / 100) * circumference);
  progressValue.textContent = `${progressPercent}%`;
}

submitAnswer.addEventListener('click', () => {
  if (selectedOptionIndex === null) return;

  const currentQuestion = quizData[currentIndex];
  const optionButtons = document.querySelectorAll('.option-btn');

  optionButtons.forEach((button, index) => {
    if (index === currentQuestion.answer) {
      button.classList.add('correct');
    }
    if (index === selectedOptionIndex && index !== currentQuestion.answer) {
      button.classList.add('incorrect');
    }
    button.disabled = true;
  });

  if (selectedOptionIndex === currentQuestion.answer) {
    score += 1;
    quizScore.textContent = `${score} балл`;
  }

  updateProgress();
});

nextQuestion.addEventListener('click', () => {
  if (currentIndex < quizData.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }

  currentIndex = 0;
  score = 0;
  quizScore.textContent = '0 балл';
  renderQuestion();
  updateProgress();
  document.querySelectorAll('.option-btn').forEach((button) => {
    button.disabled = false;
    button.classList.remove('correct', 'incorrect', 'selected');
  });
});

renderQuestion();
updateProgress();
