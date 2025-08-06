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

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// App config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Home
app.get('/', async (req, res) => {
  try {
    console.log("🔍 Running home route query...");
    const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
    const [categories] = await pool.query("SELECT DISTINCT category FROM q_categories ORDER BY category");
    console.log("✅ Queries successful");
    res.render('index', { authors, categories });
  } catch (err) {
    console.error("❌ Home route failed:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Authors
app.get('/author/new', (req, res) => res.render('newAuthor', { message: null }));

app.post('/author/new', async (req, res) => {
  try {
    const { fName, lName, birthDate, sex } = req.body;
    await pool.query(
      "INSERT INTO q_authors (firstName, lastName, dob, sex) VALUES (?, ?, ?, ?)",
      [fName, lName, birthDate, sex]
    );
    res.render('newAuthor', { message: 'Author added!' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding author");
  }
});

app.get('/authors', async (req, res) => {
  try {
    const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
    res.render('authorList', { authors });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading authors");
  }
});

app.get('/author/edit', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT *, DATE_FORMAT(dob, '%Y-%m-%d') AS dobISO FROM q_authors WHERE authorId = ?", [req.query.authorId]);
    res.render('editAuthor', { authorInfo: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading author for edit");
  }
});

app.post('/author/edit', async (req, res) => {
  try {
    const { authorId, fName, lName, dob, sex } = req.body;
    await pool.query(
      "UPDATE q_authors SET firstName = ?, lastName = ?, dob = ?, sex = ? WHERE authorId = ?",
      [fName, lName, dob, sex, authorId]
    );
    res.redirect('/authors');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating author");
  }
});

app.get('/author/delete', async (req, res) => {
  try {
    await pool.query("DELETE FROM q_authors WHERE authorId = ?", [req.query.authorId]);
    res.redirect('/authors');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting author");
  }
});

// Quotes
app.get('/quote/new', async (req, res) => {
  try {
    const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
    const [categories] = await pool.query("SELECT * FROM q_categories ORDER BY category");
    res.render('newQuote', { authors, categories, message: null });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading quote form");
  }
});

app.post('/quote/new', async (req, res) => {
  try {
    const { quote, authorId, categoryId } = req.body;
    await pool.query("INSERT INTO q_quotes (quote, authorId, categoryId) VALUES (?, ?, ?)", [quote, authorId, categoryId]);
    const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
    const [categories] = await pool.query("SELECT * FROM q_categories ORDER BY category");
    res.render('newQuote', { authors, categories, message: 'Quote added!' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding quote");
  }
});

app.get('/quotes', async (req, res) => {
  try {
    const [quotes] = await pool.query(`
      SELECT q.quoteId, q.quote, a.firstName, a.lastName, c.category
      FROM q_quotes q
      JOIN q_authors a ON q.authorId = a.authorId
      JOIN q_categories c ON q.categoryId = c.categoryId
      ORDER BY a.lastName
    `);
    res.render('quoteList', { quotes });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading quotes");
  }
});

app.get('/quote/edit', async (req, res) => {
  try {
    const [quoteInfo] = await pool.query("SELECT * FROM q_quotes WHERE quoteId = ?", [req.query.quoteId]);
    const [authors] = await pool.query("SELECT * FROM q_authors ORDER BY lastName");
    const [categories] = await pool.query("SELECT * FROM q_categories ORDER BY category");
    res.render('editQuote', { quoteInfo: quoteInfo[0], authors, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading quote for edit");
  }
});

app.post('/quote/edit', async (req, res) => {
  try {
    const { quoteId, quote, authorId, categoryId } = req.body;
    await pool.query(
      "UPDATE q_quotes SET quote = ?, authorId = ?, categoryId = ? WHERE quoteId = ?",
      [quote, authorId, categoryId, quoteId]
    );
    res.redirect('/quotes');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating quote");
  }
});

app.get('/quote/delete', async (req, res) => {
  try {
    await pool.query("DELETE FROM q_quotes WHERE quoteId = ?", [req.query.quoteId]);
    res.redirect('/quotes');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting quote");
  }
});

// Start server
app.listen(port, '0.0.0.0', () => console.log(`🚀 App running on port ${port}`));