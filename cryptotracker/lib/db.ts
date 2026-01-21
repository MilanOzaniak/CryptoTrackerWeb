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

export async function queryRows<T = unknown>(sql: string, params?: unknown[] | readonly unknown[]): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export async function execute(sql: string, params?: unknown[] | readonly unknown[]): Promise<OkPacket> {
  const [result] = await pool.execute<OkPacket>(sql, params);
  return result as OkPacket;
}

export function closePool(): Promise<void> {
  return pool.end();
}


export interface PortfolioHolding extends RowDataPacket {
  portfolio_id: number;
  user_id: number;
  coin_id: string;
  amount: string;
  purchase_price: string | null;
  purchase_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}