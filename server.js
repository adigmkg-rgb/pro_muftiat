const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/about.html'));
});

app.get('/science', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/science.html'));
});

app.get('/articles', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/articles.html'));
});

app.get('/article', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/article-detail.html'));
});

app.get('/teachers', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/teachers.html'));
});

app.get('/students', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/students.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/contact.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.listen(PORT, () => {
  console.log(`Muftiat site running on http://localhost:${PORT}`);
});
