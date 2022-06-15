const mysql = require("mysql");

const con = mysql.createPool({
  host: "sql11.freemysqlhosting.net",
  user: "sql11499830",
  password: "RNWBEXNjPG",
  database: "sql11499830",
  connectionLimit: 40,
});

module.exports = con;
