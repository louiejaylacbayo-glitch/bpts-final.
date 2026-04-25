import mysql from "mysql2/promise";

// connection sa data base (now connected to Aiven Cloud)
const db = mysql.createPool({
  host: "mysql-3f513d2-bisu-4064.c.aivencloud.com",
  port: 27399,
  user: "avnadmin",
  password: process.env.DB_PASSWORD,
  database: "defaultdb", // Make sure this is defaultdb, not bpts!
  ssl: {
    rejectUnauthorized: false // This tells your code to use the secure connection Aiven requires
  }
});

// g export para ma gamit sa ubang files
export default db;