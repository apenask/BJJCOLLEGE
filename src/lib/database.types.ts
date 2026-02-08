export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      alunos: {
        Row: {
          id: string
          nome: string
          foto_url: string
          data_nascimento: string | null
          peso: number | null
          graduacao: string
          status: string
          nome_responsavel: string
          parentesco: string
          whatsapp: string
          tipo_sanguineo: string
          alergias: string
          neurodivergente: boolean
          detalhes_condicao: string
          gatilhos_cuidados: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          foto_url?: string
          data_nascimento?: string | null
          peso?: number | null
          graduacao: string
          status?: string
          nome_responsavel?: string
          parentesco?: string
          whatsapp?: string
          tipo_sanguineo?: string
          alergias?: string
          neurodivergente?: boolean
          detalhes_condicao?: string
          gatilhos_cuidados?: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          foto_url?: string
          data_nascimento?: string | null
          peso?: number | null
          graduacao?: string
          status?: string
          nome_responsavel?: string
          parentesco?: string
          whatsapp?: string
          tipo_sanguineo?: string
          alergias?: string
          neurodivergente?: boolean
          detalhes_condicao?: string
          gatilhos_cuidados?: string
          created_at?: string
        }
      }
      transacoes: {
        Row: {
          id: string
          tipo: string
          categoria: string
          descricao: string
          valor: number
          data: string
          tipo_aula_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo: string
          categoria: string
          descricao?: string
          valor: number
          data?: string
          tipo_aula_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: string
          categoria?: string
          descricao?: string
          valor?: number
          data?: string
          tipo_aula_id?: string | null
          created_at?: string
        }
      }
      produtos: {
        Row: {
          id: string
          nome: string
          preco: number
          estoque: number
          imagem_url: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          preco: number
          estoque?: number
          imagem_url?: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          preco?: number
          estoque?: number
          imagem_url?: string
          ativo?: boolean
          created_at?: string
        }
      }
      vendas: {
        Row: {
          id: string
          aluno_id: string | null
          total: number
          forma_pagamento: string
          status: string
          data: string
          created_at: string
        }
        Insert: {
          id?: string
          aluno_id?: string | null
          total: number
          forma_pagamento: string
          status?: string
          data?: string
          created_at?: string
        }
        Update: {
          id?: string
          aluno_id?: string | null
          total?: number
          forma_pagamento?: string
          status?: string
          data?: string
          created_at?: string
        }
      }
      itens_venda: {
        Row: {
          id: string
          venda_id: string
          produto_id: string
          quantidade: number
          preco_unitario: number
          subtotal: number
        }
        Insert: {
          id?: string
          venda_id: string
          produto_id: string
          quantidade: number
          preco_unitario: number
          subtotal: number
        }
        Update: {
          id?: string
          venda_id?: string
          produto_id?: string
          quantidade?: number
          preco_unitario?: number
          subtotal?: number
        }
      }
      instrutores: {
        Row: {
          id: string
          nome: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          ativo?: boolean
          created_at?: string
        }
      }
      tipos_aula: {
        Row: {
          id: string
          nome: string
          descricao: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string
          ativo?: boolean
          created_at?: string
        }
      }
      rateio_config: {
        Row: {
          id: string
          instrutor_id: string
          tipo_aula_id: string
          percentual: number
          created_at: string
        }
        Insert: {
          id?: string
          instrutor_id: string
          tipo_aula_id: string
          percentual: number
          created_at?: string
        }
        Update: {
          id?: string
          instrutor_id?: string
          tipo_aula_id?: string
          percentual?: number
          created_at?: string
        }
      }
    }
  }
}
