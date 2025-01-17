// src/app/api/listUser/route.ts
import { NextResponse } from "next/server";
import pool from "../../../lib/mysql"; // Certifique-se de apontar para seu arquivo de conexão ao banco

export async function GET() {
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query("SELECT * FROM usuarios");
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao listar usuários", error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
