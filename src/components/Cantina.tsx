import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ShoppingCart, X, Minus, Package } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  imagem_url: string;
  ativo: boolean;
}

interface Aluno {
  id: string;
  nome: string;
}

interface CartItem {
  produto: Produto;
  quantidade: number;
}

export default function Cantina() {
  const [activeView, setActiveView] = useState<'pos' | 'inventory'>('pos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedAluno, setSelectedAluno] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);

  const [productForm, setProductForm] = useState({
    nome: '',
    preco: '',
    estoque: '',
    imagem_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [produtosRes, alunosRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
      supabase.from('alunos').select('id, nome').order('nome'),
    ]);

    if (produtosRes.data) setProdutos(produtosRes.data);
    if (alunosRes.data) setAlunos(alunosRes.data);
  }

  function addToCart(produto: Produto) {
    const existing = cart.find((item) => item.produto.id === produto.id);
    if (existing) {
      if (existing.quantidade < produto.estoque) {
        setCart(
          cart.map((item) =>
            item.produto.id === produto.id
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          )
        );
      }
    } else {
      setCart([...cart, { produto, quantidade: 1 }]);
    }
  }

  function removeFromCart(produtoId: string) {
    setCart(cart.filter((item) => item.produto.id !== produtoId));
  }

  function updateQuantity(produtoId: string, quantidade: number) {
    if (quantidade === 0) {
      removeFromCart(produtoId);
    } else {
      setCart(
        cart.map((item) =>
          item.produto.id === produtoId ? { ...item, quantidade } : item
        )
      );
    }
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.produto.preco * item.quantidade, 0);
  }

  async function handleCheckout(formaPagamento: string) {
    if (cart.length === 0) return;

    const total = getCartTotal();
    const status = formaPagamento === 'Fiado' ? 'Fiado' : 'Pago';

    const { data: venda } = await supabase
      .from('vendas')
      .insert([
        {
          aluno_id: selectedAluno || null,
          total,
          forma_pagamento: formaPagamento,
          status,
        },
      ])
      .select()
      .single();

    if (venda) {
      const itensVenda = cart.map((item) => ({
        venda_id: venda.id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco,
        subtotal: item.produto.preco * item.quantidade,
      }));

      await supabase.from('itens_venda').insert(itensVenda);

      for (const item of cart) {
        await supabase
          .from('produtos')
          .update({ estoque: item.produto.estoque - item.quantidade })
          .eq('id', item.produto.id);
      }

      if (formaPagamento === 'Fiado' && selectedAluno) {
        await supabase
          .from('alunos')
          .update({ status: 'Inadimplente' })
          .eq('id', selectedAluno);
      }

      setCart([]);
      setSelectedAluno('');
      loadData();
      alert('Venda realizada com sucesso!');
    }
  }

  function openProductForm(produto?: Produto) {
    if (produto) {
      setEditingProduct(produto);
      setProductForm({
        nome: produto.nome,
        preco: produto.preco.toString(),
        estoque: produto.estoque.toString(),
        imagem_url: produto.imagem_url,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        nome: '',
        preco: '',
        estoque: '',
        imagem_url: '',
      });
    }
    setShowProductForm(true);
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      nome: productForm.nome,
      preco: parseFloat(productForm.preco),
      estoque: parseInt(productForm.estoque),
      imagem_url: productForm.imagem_url,
      ativo: true,
    };

    if (editingProduct) {
      await supabase.from('produtos').update(data).eq('id', editingProduct.id);
    } else {
      await supabase.from('produtos').insert([data]);
    }

    setShowProductForm(false);
    setEditingProduct(null);
    loadData();
  }

  async function toggleProductStatus(id: string, ativo: boolean) {
    await supabase.from('produtos').update({ ativo: !ativo }).eq('id', id);
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cantina (Loja)</h1>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveView('pos')}
              className={`px-6 py-4 font-medium ${
                activeView === 'pos'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Ponto de Venda
            </button>
            <button
              onClick={() => setActiveView('inventory')}
              className={`px-6 py-4 font-medium ${
                activeView === 'inventory'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Estoque
            </button>
          </nav>
        </div>

        {activeView === 'pos' && (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Produtos</h2>
                <div className="grid grid-cols-3 gap-4">
                  {produtos.map((produto) => (
                    <button
                      key={produto.id}
                      onClick={() => addToCart(produto)}
                      disabled={produto.estoque === 0}
                      className={`bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-all ${
                        produto.estoque === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-800 mb-1">{produto.nome}</h3>
                      <p className="text-blue-600 font-bold text-lg">
                        R$ {produto.preco.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Estoque: {produto.estoque}
                      </p>
                    </button>
                  ))}
                </div>
                {produtos.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum produto disponível
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Carrinho</h2>
                </div>

                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item.produto.id} className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-800">{item.produto.nome}</h3>
                        <button
                          onClick={() => removeFromCart(item.produto.id)}
                          className="text-red-600 hover:bg-red-50 rounded p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.produto.id, item.quantidade - 1)}
                            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4 mx-auto" />
                          </button>
                          <span className="w-12 text-center font-semibold">{item.quantidade}</span>
                          <button
                            onClick={() => updateQuantity(item.produto.id, item.quantidade + 1)}
                            disabled={item.quantidade >= item.produto.estoque}
                            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                        <p className="font-bold text-blue-600">
                          R$ {(item.produto.preco * item.quantidade).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {cart.length > 0 ? (
                  <div>
                    <div className="border-t border-gray-200 pt-4 mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-gray-800">Total:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          R$ {getCartTotal().toFixed(2)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aluno (opcional)
                        </label>
                        <select
                          value={selectedAluno}
                          onChange={(e) => setSelectedAluno(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione...</option>
                          {alunos.map((aluno) => (
                            <option key={aluno.id} value={aluno.id}>
                              {aluno.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleCheckout('Dinheiro')}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                      >
                        Dinheiro
                      </button>
                      <button
                        onClick={() => handleCheckout('Pix')}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                      >
                        Pix
                      </button>
                      <button
                        onClick={() => handleCheckout('Fiado')}
                        disabled={!selectedAluno}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Fiado / Conta
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Carrinho vazio
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'inventory' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openProductForm()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Novo Produto</span>
              </button>
            </div>

            {showProductForm && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      value={productForm.nome}
                      onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preço (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.preco}
                        onChange={(e) =>
                          setProductForm({ ...productForm, preco: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estoque *
                      </label>
                      <input
                        type="number"
                        value={productForm.estoque}
                        onChange={(e) =>
                          setProductForm({ ...productForm, estoque: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={productForm.imagem_url}
                      onChange={(e) =>
                        setProductForm({ ...productForm, imagem_url: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      {editingProduct ? 'Atualizar' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Estoque
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {produtos.map((produto) => (
                    <tr key={produto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {produto.imagem_url ? (
                            <img
                              src={produto.imagem_url}
                              alt={produto.nome}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{produto.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">R$ {produto.preco.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            produto.estoque === 0
                              ? 'text-red-600'
                              : produto.estoque < 10
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }`}
                        >
                          {produto.estoque}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            produto.ativo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openProductForm(produto)}
                            className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleProductStatus(produto.id, produto.ativo)}
                            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                          >
                            {produto.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {produtos.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhum produto cadastrado
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
