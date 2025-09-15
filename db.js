const fs = require("fs");
const path = require("path");

const dbFile = path.join(__dirname, "db.json");

// ✅ Default DB structure
const defaultDB = {
  users: {},       // user data
  referrals: {},   // referral data
  coins: {}        // coins data
};

// 🔹 Load DB
function loadDB() {
  try {
    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(dbFile, JSON.stringify(defaultDB, null, 2));
      return defaultDB;
    }
    let data = fs.readFileSync(dbFile, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("DB Load Error:", e);
    return defaultDB;
  }
}

// 🔹 Save DB
function saveDB(db) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("DB Save Error:", e);
  }
}

// 🔹 Get user (auto create if missing)
function getUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = { coins: 0, referrals: [] };
  }
  return db.users[userId];
}

module.exports = { loadDB, saveDB, getUser };