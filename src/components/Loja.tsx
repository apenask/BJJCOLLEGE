import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Plus, Edit, Trash2, X, ShoppingCart, History, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';

// Categorias Padronizadas (Importante para o filtro funcionar)
const CATEGORIAS = ['Kimonos', 'Roupas Treino', 'Roupas Casuais', 'Bebidas/Alimentos'];

interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  imagem_url: string;
  ativo: boolean;
}

export default function Loja() {
  const { addToast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('Loja'); 
  const [categoriaAtual, setCategoriaAtual] = useState('Todas');
  
  // Modais
  const [showForm, setShowForm] = useState(false);
  const [showVenda, setShowVenda] = useState<Produto | null>(null);
  
  // Dados de Venda
  const [alunos, setAlunos] = useState<any[]>([]);
  const [vendaData, setVendaData] = useState({
    aluno_id: '',
    forma_pagamento: 'Dinheiro', 
    cartao_tipo: 'Crédito',
    parcelas: 1,
    quantidade: 1
  });

  // Dados de Produto (Cadastro)
  const [formData, setFormData] = useState<Partial<Produto>>({
    categoria: 'Kimonos',
    ativo: true,
    imagem_url: ''
  });

  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    fetchProdutos();
    fetchAlunos();
  }, []);

  useEffect(() => {
    if (tab === 'Historico') fetchHistorico();
  }, [tab]);

  async function fetchProdutos() {
    setLoading(true);
    const { data } = await supabase.from('produtos').select('*').order('nome');
    setProdutos(data || []);
    setLoading(false);
  }

  async function fetchAlunos() {
    const { data } = await supabase.from('alunos').select('id, nome').eq('status', 'Ativo').order('nome');
    setAlunos(data || []);
  }

  async function fetchHistorico() {
    const { data } = await supabase
        .from('transacoes')
        .select('*, alunos(nome)')
        .eq('categoria', 'Venda Loja')
        .order('data', { ascending: false })
        .limit(50);
    setHistorico(data || []);
  }

  // --- UPLOAD DE IMAGEM ---
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o bucket 'produtos'
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega a URL pública
      const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, imagem_url: data.publicUrl }));
      addToast('Imagem carregada com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Erro ao enviar imagem.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProduto(e: React.FormEvent) {
    e.preventDefault();
    try {
        if (formData.id) {
            await supabase.from('produtos').update(formData).eq('id', formData.id);
            addToast('Produto atualizado!', 'success');
        } else {
            await supabase.from('produtos').insert([formData]);
            addToast('Produto criado!', 'success');
        }
        setShowForm(false);
        setFormData({ categoria: 'Kimonos', ativo: true, imagem_url: '' });
        fetchProdutos();
    } catch { addToast('Erro ao salvar.', 'error'); }
  }

  async function handleRealizarVenda() {
    if (!showVenda) return;
    if (vendaData.forma_pagamento === 'Fiado' && !vendaData.aluno_id) {
        addToast('Selecione um aluno para vender Fiado.', 'warning');
        return;
    }

    try {
        const valorTotal = showVenda.preco * vendaData.quantidade;
        const detalhes = {
            item: showVenda.nome,
            qtd: vendaData.quantidade,
            pagamento: {
                metodo: vendaData.forma_pagamento,
                ...((vendaData.forma_pagamento === 'Cartao') && { 
                    tipo: vendaData.cartao_tipo, 
                    parcelas: vendaData.parcelas 
                })
            }
        };

        const { error } = await supabase.from('transacoes').insert([{
            descricao: `Venda Loja - ${showVenda.nome} (x${vendaData.quantidade})`,
            valor: valorTotal,
            tipo: 'Receita',
            categoria: 'Venda Loja',
            data: new Date().toISOString(),
            aluno_id: vendaData.aluno_id || null,
            detalhes_pagamento: detalhes
        }]);

        if (error) throw error;

        const novoEstoque = showVenda.estoque - vendaData.quantidade;
        await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', showVenda.id);

        addToast('Venda realizada!', 'success');
        setShowVenda(null);
        fetchProdutos();
    } catch (err) {
        addToast('Erro ao vender.', 'error');
    }
  }

  // Lógica de Filtro Corrigida
  const produtosFiltrados = produtos.filter(p => 
    categoriaAtual === 'Todas' ? true : p.categoria === categoriaAtual
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="text-blue-600"/> Loja BJJ
            </h2>
            <p className="text-slate-500 text-sm">Gerencie vendas e estoque</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setTab(tab === 'Loja' ? 'Historico' : 'Loja')} 
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 border ${tab === 'Historico' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}
            >
                {tab === 'Loja' ? <History size={18}/> : <ShoppingBag size={18}/>}
                {tab === 'Loja' ? 'Histórico' : 'Voltar pra Loja'}
            </button>
            {tab === 'Loja' && (
                <button onClick={() => { setFormData({categoria: 'Kimonos', ativo: true}); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-bold shadow-sm">
                    <Plus size={20} /> Novo Produto
                </button>
            )}
        </div>
      </div>

      {tab === 'Loja' && (
        <>
            {/* Abas de Categorias */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setCategoriaAtual('Todas')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${categoriaAtual === 'Todas' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}>Todas</button>
                {CATEGORIAS.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setCategoriaAtual(cat)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${categoriaAtual === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Lista de Produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {produtosFiltrados.map(produto => (
                    <div key={produto.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                            {produto.imagem_url ? (
                                <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ShoppingBag size={40} />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-700 shadow-sm">
                                {produto.estoque} un
                            </div>
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col">
                            <span className="text-xs text-blue-600 font-bold uppercase mb-1">{produto.categoria}</span>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2">{produto.nome}</h3>
                            <div className="mt-auto flex justify-between items-center">
                                <span className="text-xl font-bold text-slate-900">R$ {produto.preco.toFixed(2)}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => { setFormData(produto); setShowForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                    <button onClick={() => { setVendaData({...vendaData, quantidade: 1}); setShowVenda(produto); }} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 shadow-sm"><ShoppingCart size={18}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}

      {tab === 'Historico' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="p-4 text-sm font-bold text-slate-500">Data</th>
                        <th className="p-4 text-sm font-bold text-slate-500">Produto</th>
                        <th className="p-4 text-sm font-bold text-slate-500">Comprador</th>
                        <th className="p-4 text-sm font-bold text-slate-500">Pagamento</th>
                        <th className="p-4 text-sm font-bold text-slate-500 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {historico.map((venda: any) => (
                        <tr key={venda.id} className="hover:bg-slate-50">
                            <td className="p-4 text-sm text-slate-600">{format(new Date(venda.data), "dd/MM HH:mm")}</td>
                            <td className="p-4 font-medium text-slate-800">{venda.descricao.replace('Venda Loja - ', '')}</td>
                            <td className="p-4 text-sm text-slate-600">{venda.alunos?.nome || 'Balcão'}</td>
                            <td className="p-4 text-sm">
                                <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 text-xs font-bold border border-slate-200">
                                    {venda.detalhes_pagamento?.pagamento?.metodo || 'Dinheiro'}
                                </span>
                            </td>
                            <td className="p-4 text-right font-bold text-green-700">R$ {venda.valor.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
      )}

      {/* MODAL DE PRODUTO */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">Produto</h3><button onClick={()=>setShowForm(false)}><X/></button></div>
                <form onSubmit={handleSaveProduto} className="space-y-3">
                    <input className="w-full p-3 border rounded-lg bg-slate-50" placeholder="Nome do Produto" value={formData.nome || ''} onChange={e=>setFormData({...formData, nome: e.target.value})} required />
                    
                    {/* Select com Categorias Fixas */}
                    <select className="w-full p-3 border rounded-lg bg-slate-50" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value})}>
                        {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" className="p-3 border rounded-lg bg-slate-50" placeholder="Preço R$" value={formData.preco || ''} onChange={e=>setFormData({...formData, preco: parseFloat(e.target.value)})} required />
                        <input type="number" className="p-3 border rounded-lg bg-slate-50" placeholder="Estoque" value={formData.estoque || ''} onChange={e=>setFormData({...formData, estoque: parseInt(e.target.value)})} required />
                    </div>

                    {/* UPLOAD DE IMAGEM */}
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        {uploading ? (
                            <div className="text-slate-500 text-sm">Enviando imagem...</div>
                        ) : formData.imagem_url ? (
                            <div className="flex items-center gap-2 justify-center">
                                <img src={formData.imagem_url} alt="Preview" className="h-10 w-10 object-cover rounded" />
                                <span className="text-sm text-green-600 font-bold">Imagem Carregada!</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-500">
                                <Upload size={24} />
                                <span className="text-sm font-medium">Toque para enviar foto</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Campo de URL Manual (Fallback) */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold uppercase">Ou link:</span>
                        <input className="flex-1 p-2 border rounded text-sm" placeholder="https://..." value={formData.imagem_url || ''} onChange={e=>setFormData({...formData, imagem_url: e.target.value})} />
                    </div>

                    <button disabled={uploading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold mt-2 hover:bg-slate-800 disabled:opacity-50">
                        {uploading ? 'Aguarde...' : 'Salvar Produto'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL DE VENDA (Mantido igual, mas omitido para brevidade) */}
      {showVenda && (
          // ... Código do Modal de Venda (Idêntico ao passo anterior)
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
                <div className="flex justify-between mb-6 border-b pb-4">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Finalizar Venda</h3>
                        <p className="text-sm text-slate-500">{showVenda.nome}</p>
                    </div>
                    <button onClick={()=>setShowVenda(null)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                        <span className="font-bold text-slate-600">Quantidade</span>
                        <div className="flex items-center gap-4">
                            <button onClick={()=>setVendaData({...vendaData, quantidade: Math.max(1, vendaData.quantidade-1)})} className="w-8 h-8 bg-white rounded-full border shadow-sm flex items-center justify-center font-bold">-</button>
                            <span className="text-xl font-bold w-6 text-center">{vendaData.quantidade}</span>
                            <button onClick={()=>setVendaData({...vendaData, quantidade: Math.min(showVenda.estoque, vendaData.quantidade+1)})} className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">+</button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Pagamento</label>
                        <select className="w-full p-3 border rounded-lg bg-white" value={vendaData.forma_pagamento} onChange={e=>setVendaData({...vendaData, forma_pagamento: e.target.value})}>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Pix">Pix</option>
                            <option value="Cartao">Cartão</option>
                            <option value="Fiado">Fiado</option>
                        </select>
                    </div>

                    {vendaData.forma_pagamento === 'Cartao' && (
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex gap-2">
                                <button onClick={()=>setVendaData({...vendaData, cartao_tipo: 'Crédito'})} className={`flex-1 py-1 rounded text-sm font-bold ${vendaData.cartao_tipo === 'Crédito' ? 'bg-slate-800 text-white' : 'bg-white border'}`}>Crédito</button>
                                <button onClick={()=>setVendaData({...vendaData, cartao_tipo: 'Débito'})} className={`flex-1 py-1 rounded text-sm font-bold ${vendaData.cartao_tipo === 'Débito' ? 'bg-slate-800 text-white' : 'bg-white border'}`}>Débito</button>
                            </div>
                            {vendaData.cartao_tipo === 'Crédito' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Parcelas</label>
                                    <select className="w-full p-2 rounded border" value={vendaData.parcelas} onChange={e=>setVendaData({...vendaData, parcelas: parseInt(e.target.value)})}>
                                        {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Aluno (Comprador)</label>
                        <select className="w-full p-3 border rounded-lg bg-white" value={vendaData.aluno_id} onChange={e=>setVendaData({...vendaData, aluno_id: e.target.value})}>
                            <option value="">Venda Balcão (Sem cadastro)</option>
                            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                    </div>

                    <div className="pt-4 border-t mt-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500 font-bold">Total a Pagar</span>
                            <span className="text-2xl font-bold text-slate-900">R$ {(showVenda.preco * vendaData.quantidade).toFixed(2)}</span>
                        </div>
                        <button onClick={handleRealizarVenda} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-200">
                            Confirmar Venda
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}