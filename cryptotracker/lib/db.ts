import mysql from "mysql2/promise";
import type { OkPacket, RowDataPacket } from "mysql2";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function queryRows<T = any>(sql: string, params?: any[] | readonly any[]): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export async function execute(sql: string, params?: any[] | readonly any[]): Promise<OkPacket> {
  const [result] = await pool.execute<OkPacket>(sql, params);
  return result as OkPacket;
}

export function closePool(): Promise<void> {
  return pool.end();
}