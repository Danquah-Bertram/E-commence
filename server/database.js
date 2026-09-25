import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure database directory and file exist
function initDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      products: [],
      orders: [],
      transactions: [],
      invoices: [],
      cart: [],
      sessions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read database
export function readDB() {
  initDatabase();
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

// Write database
export function writeDB(data) {
  initDatabase();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generic CRUD operations
export const Database = {
  // Get all items from a collection
  getAll(collection) {
    const db = readDB();
    return db[collection] || [];
  },

  // Get item by ID
  getById(collection, id) {
    const db = readDB();
    return db[collection]?.find(item => item.id === id);
  },

  // Get items by field value
  getByField(collection, field, value) {
    const db = readDB();
    return db[collection]?.filter(item => item[field] === value) || [];
  },

  // Create new item
  create(collection, item) {
    const db = readDB();
    if (!db[collection]) {
      db[collection] = [];
    }
    db[collection].push(item);
    writeDB(db);
    return item;
  },

  // Update item
  update(collection, id, updates) {
    const db = readDB();
    const index = db[collection]?.findIndex(item => item.id === id);
    if (index !== -1) {
      db[collection][index] = { ...db[collection][index], ...updates };
      writeDB(db);
      return db[collection][index];
    }
    return null;
  },

  // Delete item
  delete(collection, id) {
    const db = readDB();
    const index = db[collection]?.findIndex(item => item.id === id);
    if (index !== -1) {
      const deleted = db[collection].splice(index, 1)[0];
      writeDB(db);
      return deleted;
    }
    return null;
  },

  // Delete by field
  deleteByField(collection, field, value) {
    const db = readDB();
    const initialLength = db[collection]?.length || 0;
    db[collection] = db[collection]?.filter(item => item[field] !== value) || [];
    const deleted = initialLength - db[collection].length;
    if (deleted > 0) {
      writeDB(db);
    }
    return deleted;
  },

  // Clear collection
  clear(collection) {
    const db = readDB();
    db[collection] = [];
    writeDB(db);
  }
};
