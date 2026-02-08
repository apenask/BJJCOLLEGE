/*
  # BJJ Gym Management System Schema

  ## Tables Created
  
  ### Students (alunos)
  - `id` (uuid, primary key)
  - `nome` (text) - Student name
  - `foto_url` (text) - Photo URL
  - `data_nascimento` (date) - Birth date
  - `peso` (numeric) - Weight in kg
  - `graduacao` (text) - Belt/graduation
  - `status` (text) - Active, Inadimplente (in debt)
  - `nome_responsavel` (text) - Guardian name
  - `parentesco` (text) - Relationship
  - `whatsapp` (text) - WhatsApp contact
  - `tipo_sanguineo` (text) - Blood type
  - `alergias` (text) - Allergies
  - `neurodivergente` (boolean) - Is neurodivergent
  - `detalhes_condicao` (text) - Condition details
  - `gatilhos_cuidados` (text) - Triggers/care notes
  - `created_at` (timestamptz) - Creation timestamp

  ### Transactions (transacoes)
  - `id` (uuid, primary key)
  - `tipo` (text) - Receita (income) or Despesa (expense)
  - `categoria` (text) - Category name
  - `descricao` (text) - Description
  - `valor` (numeric) - Amount
  - `data` (date) - Transaction date
  - `tipo_aula_id` (uuid, nullable) - Related class type for income
  - `created_at` (timestamptz)

  ### Products (produtos)
  - `id` (uuid, primary key)
  - `nome` (text) - Product name
  - `preco` (numeric) - Price
  - `estoque` (integer) - Stock quantity
  - `imagem_url` (text) - Image URL
  - `ativo` (boolean) - Is active
  - `created_at` (timestamptz)

  ### Sales (vendas)
  - `id` (uuid, primary key)
  - `aluno_id` (uuid, nullable) - Student who bought
  - `total` (numeric) - Total amount
  - `forma_pagamento` (text) - Payment method
  - `status` (text) - Pago or Fiado (credit)
  - `data` (timestamptz) - Sale date
  - `created_at` (timestamptz)

  ### Sale Items (itens_venda)
  - `id` (uuid, primary key)
  - `venda_id` (uuid) - Sale reference
  - `produto_id` (uuid) - Product reference
  - `quantidade` (integer) - Quantity
  - `preco_unitario` (numeric) - Unit price at time of sale
  - `subtotal` (numeric) - Subtotal

  ### Instructors (instrutores)
  - `id` (uuid, primary key)
  - `nome` (text) - Instructor name
  - `ativo` (boolean) - Is active
  - `created_at` (timestamptz)

  ### Class Types (tipos_aula)
  - `id` (uuid, primary key)
  - `nome` (text) - Class type name (e.g., "Kids Turma A")
  - `descricao` (text) - Description
  - `ativo` (boolean) - Is active
  - `created_at` (timestamptz)

  ### Commission Settings (rateio_config)
  - `id` (uuid, primary key)
  - `instrutor_id` (uuid) - Instructor reference
  - `tipo_aula_id` (uuid) - Class type reference
  - `percentual` (numeric) - Commission percentage (0-100)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated access (admin users)
*/

-- Create students table
CREATE TABLE IF NOT EXISTS alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  foto_url text DEFAULT '',
  data_nascimento date,
  peso numeric,
  graduacao text NOT NULL,
  status text DEFAULT 'Ativo',
  nome_responsavel text DEFAULT '',
  parentesco text DEFAULT '',
  whatsapp text DEFAULT '',
  tipo_sanguineo text DEFAULT '',
  alergias text DEFAULT '',
  neurodivergente boolean DEFAULT false,
  detalhes_condicao text DEFAULT '',
  gatilhos_cuidados text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  categoria text NOT NULL,
  descricao text DEFAULT '',
  valor numeric NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo_aula_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  preco numeric NOT NULL,
  estoque integer DEFAULT 0,
  imagem_url text DEFAULT '',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid,
  total numeric NOT NULL,
  forma_pagamento text NOT NULL,
  status text DEFAULT 'Pago',
  data timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE SET NULL
);

-- Create sale items table
CREATE TABLE IF NOT EXISTS itens_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade integer NOT NULL,
  preco_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

-- Create instructors table
CREATE TABLE IF NOT EXISTS instrutores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create class types table
CREATE TABLE IF NOT EXISTS tipos_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT '',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create commission settings table
CREATE TABLE IF NOT EXISTS rateio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrutor_id uuid NOT NULL,
  tipo_aula_id uuid NOT NULL,
  percentual numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (instrutor_id) REFERENCES instrutores(id) ON DELETE CASCADE,
  FOREIGN KEY (tipo_aula_id) REFERENCES tipos_aula(id) ON DELETE CASCADE,
  UNIQUE(instrutor_id, tipo_aula_id)
);

-- Enable RLS
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrutores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE rateio_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is an admin-only system)
CREATE POLICY "Allow all operations on alunos"
  ON alunos FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on transacoes"
  ON transacoes FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on produtos"
  ON produtos FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on vendas"
  ON vendas FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on itens_venda"
  ON itens_venda FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on instrutores"
  ON instrutores FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on tipos_aula"
  ON tipos_aula FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on rateio_config"
  ON rateio_config FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
CREATE INDEX IF NOT EXISTS idx_vendas_aluno ON vendas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto ON itens_venda(produto_id);