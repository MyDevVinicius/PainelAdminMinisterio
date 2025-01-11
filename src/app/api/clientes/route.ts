import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import bcrypt from "bcryptjs";

// Função para validar o nome do banco (evitar caracteres especiais ou inválidos)
const sanitizeDatabaseName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_]/g, ""); // Permite apenas letras, números e underscores
};

// Função para gerar código aleatório de 15 caracteres (sem criptografia)
const gerarCodigoVerificacao = (): string => {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Apenas maiúsculas e números
  let codigo = "";
  for (let i = 0; i < 15; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
};

export async function POST(req: NextRequest) {
  const { nome_responsavel, nome_igreja, email, cnpj_cpf, endereco } =
    await req.json();

  if (!nome_responsavel || !nome_igreja || !email || !cnpj_cpf || !endereco) {
    return NextResponse.json(
      { message: "Todos os campos são obrigatórios!" },
      { status: 400 }
    );
  }

  const nome_banco = sanitizeDatabaseName(
    nome_igreja.replace(/\s+/g, "_").toLowerCase()
  );

  let conn;

  try {
    conn = await pool.getConnection();

    // Verificar duplicidade do nome da igreja
    const checkQuery = `SELECT COUNT(*) AS count FROM clientes WHERE nome_igreja = ?`;

    // Tipando a consulta corretamente
    const [rows] = await conn.query(
      "SELECT COUNT(*) AS count FROM clientes WHERE nome_igreja = ?",
      [nome_igreja]
    );

    // Acessando o resultado corretamente
    const count = (rows as { count: number }[])[0].count;

    if (count > 0) {
      return NextResponse.json(
        { message: "Já existe um cliente cadastrado com o nome dessa igreja." },
        { status: 400 }
      );
    }

    const codigoAcesso = gerarCodigoVerificacao();
    const codigoVerificacao = gerarCodigoVerificacao();
    const chaveAcessoCriptografada = await bcrypt.hash(codigoAcesso, 10);

    const query = `INSERT INTO clientes (nome_responsavel, nome_igreja, email, cnpj_cpf, endereco, nome_banco, chave_acesso, status, codigo_verificacao) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      nome_responsavel,
      nome_igreja,
      email,
      cnpj_cpf,
      endereco,
      nome_banco,
      chaveAcessoCriptografada,
      "pendente",
      codigoVerificacao,
    ];
    const [resultInsert] = await conn.query(query, values);

    // Verificar o insertId no resultado da consulta de inserção
    const insertId = (resultInsert as any).insertId;

    // Criar banco de dados com limite de 1000 conexões e fechamento de conexões inativas após 2 minutos
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${nome_banco}`);

    // Configurações adicionais do banco de dados
    await conn.query(`SET GLOBAL max_connections = 1000`); // Define o limite de conexões
    await conn.query(`SET GLOBAL wait_timeout = 120`); // Define o tempo para fechamento de conexões inativas (2 minutos)

    // Criar tabela de usuários
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${nome_banco}.usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      senha VARCHAR(255) NOT NULL,
      cargo ENUM('cooperador', 'pastor', 'tesoureiro', 'diacono', 'conselho_fiscal') NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await conn.query(createTableQuery);

    // Criar tabela de permissões
    const createPermissionsTableQuery = `CREATE TABLE IF NOT EXISTS ${nome_banco}.permissoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      nome_pagina VARCHAR(255) NOT NULL,
      nome_funcao VARCHAR(255) NOT NULL,
      ativado BOOLEAN NOT NULL DEFAULT 1,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unico_usuario_pagina_funcao (usuario_id, nome_pagina, nome_funcao),
      FOREIGN KEY (usuario_id) REFERENCES ${nome_banco}.usuarios(id) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    )`;
    await conn.query(createPermissionsTableQuery);

    // Criar o usuário responsável e inserir permissões
    const insertUserQuery = `INSERT INTO ${nome_banco}.usuarios (nome, email, senha, cargo) 
      VALUES (?, ?, ?, ?)`;
    const userValues = [
      nome_responsavel,
      email,
      chaveAcessoCriptografada,
      "conselho_fiscal",
    ];
    const [userResult] = await conn.query(insertUserQuery, userValues);
    const usuarioId = (userResult as any).insertId;

    const permissaoData = [
      { nome_pagina: "Dashboard", nome_funcao: "Acessar Dashboard" },
      { nome_pagina: "Relatórios", nome_funcao: "Gerar Relatório" },
      { nome_pagina: "Usuários", nome_funcao: "Adicionar Usuário" },
      { nome_pagina: "Usuários", nome_funcao: "Editar Usuário" },
      { nome_pagina: "Usuários", nome_funcao: "Remover Usuário" },
      { nome_pagina: "Membros", nome_funcao: "Adicionar Membro" },
      { nome_pagina: "Membros", nome_funcao: "Excluir Membro" },
      { nome_pagina: "Membros", nome_funcao: "Editar Membro" },
      { nome_pagina: "Financeiro", nome_funcao: "Entradas" },
      { nome_pagina: "Financeiro", nome_funcao: "Saídas" },
      { nome_pagina: "Financeiro", nome_funcao: "Editar Contas" },
      { nome_pagina: "Financeiro", nome_funcao: "Excluir Contas" },
      { nome_pagina: "Permissões", nome_funcao: "Visualizar Permissões" },
      { nome_pagina: "Permissões", nome_funcao: "Alterar Permissões" },
    ];

    const insertPermissionsQuery = `INSERT INTO ${nome_banco}.permissoes (usuario_id, nome_pagina, nome_funcao, ativado) VALUES (?, ?, ?, ?)`;

    for (const permission of permissaoData) {
      await conn.query(insertPermissionsQuery, [
        usuarioId,
        permission.nome_pagina,
        permission.nome_funcao,
        true,
      ]);
    }

    // Criar tabela de membros
    const createMembersTableQuery = `CREATE TABLE IF NOT EXISTS ${nome_banco}.membros (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      data_nascimento DATE,
      endereco VARCHAR(255),
      status ENUM('ativo', 'inativo') NOT NULL
    )`;
    await conn.query(createMembersTableQuery);

    const createEntryTableQuery = `CREATE TABLE IF NOT EXISTS ${nome_banco}.entrada (
  id INT AUTO_INCREMENT PRIMARY KEY,
  observacao VARCHAR(255),
  tipo ENUM('Dizimo', 'Oferta', 'Doacao', 'Campanha') NOT NULL,
  forma_pagamento ENUM('Dinheiro', 'PIX', 'Debito', 'Credito'),
  valor DECIMAL(10, 2) NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  membro_id INT NULL,
  usuario_id INT NOT NULL, -- ID do usuário que fez o lançamento
  CONSTRAINT fk_membro
    FOREIGN KEY (membro_id) 
    REFERENCES ${nome_banco}.membros(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_usuario_entrada
    FOREIGN KEY (usuario_id) 
    REFERENCES ${nome_banco}.usuarios(id)
    ON DELETE CASCADE
)`;

    await conn.query(createEntryTableQuery);

    // Criar tabela de saídas (consolidada com os dados de contas a pagar)
    const createSaidasTableQuery = `CREATE TABLE IF NOT EXISTS ${nome_banco}.saida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('Pagamento', 'Salario', 'Ajuda de Custo', 'Dizimo', 'Oferta', 'Doacao', 'Campanha') NOT NULL,
  observacao VARCHAR(255),
  valor DECIMAL(10, 2) NOT NULL,
  valor_pago DECIMAL(10, 2),
  status ENUM('Pago', 'Pendente', 'Pago Parcial', 'Vencida') DEFAULT 'Pendente',
  forma_pagamento ENUM('Dinheiro', 'PIX', 'Debito', 'Credito'),
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_vencimento DATE DEFAULT NULL,
  data_pagamento DATE DEFAULT NULL,
  usuario_id INT NOT NULL,
  CONSTRAINT fk_usuario_saida
    FOREIGN KEY (usuario_id) 
    REFERENCES ${nome_banco}.usuarios(id)
    ON DELETE CASCADE
)`;
    await conn.query(createSaidasTableQuery);

    return NextResponse.json(
      { message: "Cliente cadastrado com sucesso!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro no cadastro do cliente: ", error);
    return NextResponse.json(
      { message: "Erro interno do servidor. Tente novamente." },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
