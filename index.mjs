// index.mjs
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Home
app.get('/', async (req, res) => {
  const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
  const [categories] = await pool.query("SELECT DISTINCT category FROM q_categories ORDER BY category");
  res.render('index', { authors, categories });
});

// Author Routes
app.get('/author/new', (req, res) => res.render('newAuthor', { message: null }));

app.post('/author/new', async (req, res) => {
  const { fName, lName, birthDate, sex } = req.body;
  await pool.query("INSERT INTO q_authors (firstName, lastName, dob, sex) VALUES (?, ?, ?, ?)", [fName, lName, birthDate, sex]);
  res.render('newAuthor', { message: 'Author added!' });
});

app.get('/authors', async (req, res) => {
  const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
  res.render('authorList', { authors });
});

app.get('/author/edit', async (req, res) => {
  const [rows] = await pool.query("SELECT *, DATE_FORMAT(dob, '%Y-%m-%d') AS dobISO FROM q_authors WHERE authorId = ?", [req.query.authorId]);
  res.render('editAuthor', { authorInfo: rows });
});

app.post('/author/edit', async (req, res) => {
  const { authorId, fName, lName, dob, sex } = req.body;
  await pool.query("UPDATE q_authors SET firstName = ?, lastName = ?, dob = ?, sex = ? WHERE authorId = ?", [fName, lName, dob, sex, authorId]);
  res.redirect('/authors');
});

app.get('/author/delete', async (req, res) => {
  await pool.query("DELETE FROM q_authors WHERE authorId = ?", [req.query.authorId]);
  res.redirect('/authors');
});

// Quote Routes
app.get('/quote/new', async (req, res) => {
  const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
  const [categories] = await pool.query("SELECT * FROM q_categories ORDER BY category");
  res.render('newQuote', { authors, categories, message: null });
});

app.post('/quote/new', async (req, res) => {
  const { quote, authorId, categoryId } = req.body;
  await pool.query("INSERT INTO q_quotes (quote, authorId, categoryId) VALUES (?, ?, ?)", [quote, authorId, categoryId]);
  const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
  const [categories] = await pool.query("SELECT * FROM q_categories ORDER BY category");
  res.render('newQuote', { authors, categories, message: 'Quote added!' });
});

app.get('/quotes', async (req, res) => {
  const [quotes] = await pool.query(`
    SELECT q.quoteId, q.quote, a.firstName, a.lastName, c.category
    FROM q_quotes q
    JOIN q_authors a ON q.authorId = a.authorId
    JOIN q_categories c ON q.categoryId = c.categoryId
    ORDER BY a.lastName
  `);
  res.render('quoteList', { quotes });
});

app.get('/quote/edit', async (req, res) => {
  const [quoteInfo] = await pool.query("SELECT * FROM q_quotes WHERE quoteId = ?", [req.query.quoteId]);
  const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
  const [categories] = await pool.query("SELECT * FROM q_categories ORDER BY category");
  res.render('editQuote', { quoteInfo: quoteInfo[0], authors, categories });
});

app.post('/quote/edit', async (req, res) => {
  const { quoteId, quote, authorId, categoryId } = req.body;
  await pool.query("UPDATE q_quotes SET quote = ?, authorId = ?, categoryId = ? WHERE quoteId = ?", [quote, authorId, categoryId, quoteId]);
  res.redirect('/quotes');
});

app.get('/quote/delete', async (req, res) => {
  await pool.query("DELETE FROM q_quotes WHERE quoteId = ?", [req.query.quoteId]);
  res.redirect('/quotes');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App running at http://localhost:${port}`));