import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { ResultSetHeader } from "mysql2";

// Função para criar uma notificação
export async function POST(req: NextRequest) {
  const { titulo, mensagem, autor } = await req.json();

  if (!titulo || !mensagem || !autor) {
    return NextResponse.json(
      { message: "Todos os campos são obrigatórios!" },
      { status: 400 }
    );
  }

  let conn;

  try {
    conn = await pool.getConnection();

    const query = `
      INSERT INTO admin_db.notificacoes (titulo, texto, autor, data_lancamento)
      VALUES (?, ?, ?, NOW())
    `;
    const values = [titulo, mensagem, autor];
    const result = await conn.query(query, values);

    const resultHeader = result[0] as ResultSetHeader;

    if (resultHeader.affectedRows === 0) {
      return NextResponse.json(
        { message: "Erro ao inserir notificação." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Notificação criada com sucesso!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro na inserção da notificação:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor. Tente novamente." },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// Função para deletar uma notificação
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json(
      { message: "ID da notificação é obrigatório!" },
      { status: 400 }
    );
  }

  let conn;

  try {
    conn = await pool.getConnection();

    const query = `
      DELETE FROM admin_db.notificacoes WHERE id = ?
    `;
    const result = await conn.query(query, [id]);

    const resultHeader = result[0] as ResultSetHeader;

    if (resultHeader.affectedRows === 0) {
      return NextResponse.json(
        { message: "Notificação não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Notificação excluída com sucesso!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao excluir notificação:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor. Tente novamente." },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// Função para listar notificações
export async function GET(req: NextRequest) {
  let conn;

  try {
    conn = await pool.getConnection();

    const query =
      "SELECT * FROM admin_db.notificacoes ORDER BY data_lancamento DESC";
    const result = await conn.query(query);

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor. Tente novamente." },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
