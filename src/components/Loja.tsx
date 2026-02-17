import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Plus, Edit, Trash2, X, ShoppingCart, History, Upload, Search, Package, AlertTriangle, CheckCircle, Wallet, NotebookPen, Calculator } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';

const CATEGORIAS = ['Kimonos', 'Faixas', 'No-Gi / Rashguards', 'Roupas Casuais', 'Suplementos', 'Bebidas/Alimentos', 'Acessórios'];

interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  imagem_url: string;
  ativo: boolean;
}

interface ItemPagamento { metodo: string; valor: string; }

export default function Loja() {
  const { addToast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [tab, setTab] = useState<'Loja' | 'Historico' | 'Cobrancas'>('Loja'); 
  const [categoriaAtual, setCategoriaAtual] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [showVenda, setShowVenda] = useState<Produto | null>(null);
  const [showReceber, setShowReceber] = useState<any | null>(null);
  
  // ALERTA PERSONALIZADO (GLOBAL PARA LOJA)
  const [customAlert, setCustomAlert] = useState({ 
    show: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    type: 'danger' as 'danger' | 'success' 
  });

  const [alunos, setAlunos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [cobrancas, setCobrancas] = useState<any[]>([]);

  // ESTADOS DE VENDA AVANÇADA
  const [itensPagamento, setItensPagamento] = useState<ItemPagamento[]>([{ metodo: 'Dinheiro', valor: '' }]);
  const [vendaQtd, setVendaQtd] = useState(1);
  const [alunoSelecionado, setAlunoSelecionado] = useState('');
  
  // CAMPOS: DESCONTO E TROCO
  const [desconto, setDesconto] = useState<string>('');
  const [valorRecebidoCliente, setValorRecebidoCliente] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Produto>>({
    categoria: CATEGORIAS[0], ativo: true, imagem_url: '', estoque: 0, preco: 0
  });

  useEffect(() => { fetchProdutos(); fetchAlunos(); }, []);
  useEffect(() => { if (tab === 'Historico') fetchHistorico(); if (tab === 'Cobrancas') fetchCobrancas(); }, [tab]);

  // CÁLCULOS DA VENDA
  const subtotal = showVenda ? showVenda.preco * vendaQtd : 0;
  const valorDesconto = Number(desconto) || 0;
  const totalFinal = Math.max(0, subtotal - valorDesconto);
  const valorPagoPeloCliente = Number(valorRecebidoCliente) || 0;
  const troco = Math.max(0, valorPagoPeloCliente - totalFinal);

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
    const { data } = await supabase.from('transacoes').select('*, alunos(nome)').eq('categoria', 'Venda Loja').order('data', { ascending: false }).limit(50);
    setHistorico(data || []);
  }

  async function fetchCobrancas() {
    const { data } = await supabase.from('transacoes').select('*, alunos(nome)').eq('categoria', 'Venda Loja').eq('tipo', 'Pendente').order('data', { ascending: false });
    setCobrancas(data || []);
  }

  function updateItemPagamento(index: number, field: keyof ItemPagamento, value: string) {
      const newItens = [...itensPagamento];
      newItens[index] = { ...newItens[index], [field]: value };
      setItensPagamento(newItens);
  }
  function addItemPagamento() { setItensPagamento([...itensPagamento, { metodo: 'Dinheiro', valor: '' }]); }
  function removeItemPagamento(index: number) { if (itensPagamento.length > 1) setItensPagamento(itensPagamento.filter((_, i) => i !== index)); }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `loja/${fileName}`;
      const { error } = await supabase.storage.from('alunos_fotos').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('alunos_fotos').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, imagem_url: data.publicUrl }));
      addToast('Foto carregada!', 'success');
    } catch { addToast('Erro no upload.', 'error'); } finally { setUploading(false); }
  }

  async function handleSaveProduto(e: React.FormEvent) {
    e.preventDefault();
    try {
        if (!formData.nome || !formData.preco) { addToast('Preencha nome e preço.', 'warning'); return; }
        const payload = { ...formData, preco: Number(formData.preco), estoque: Number(formData.estoque) };
        if (formData.id) await supabase.from('produtos').update(payload).eq('id', formData.id);
        else await supabase.from('produtos').insert([payload]);
        addToast('Salvo!', 'success'); setShowForm(false); fetchProdutos();
    } catch { addToast('Erro ao salvar.', 'error'); }
  }

  // --- DELETE PRODUTO (VIA CUSTOM ALERT) ---
  async function handleDeleteProduto(id: string) {
      try { 
          await supabase.from('produtos').delete().eq('id', id); 
          addToast('Produto excluído.', 'success'); 
          fetchProdutos(); 
      } catch { addToast('Erro ao excluir.', 'error'); }
  }

  // --- FUNÇÃO DE VENDA ---
  async function handleRealizarVenda() {
    if (!showVenda) return;
    
    let metodosFinais = [...itensPagamento];
    const somaInput = metodosFinais.reduce((acc, i) => acc + (Number(i.valor)||0), 0);
    
    if (metodosFinais.length === 1 && somaInput === 0) {
        metodosFinais[0].valor = String(totalFinal);
    } else {
         if (Math.abs(totalFinal - somaInput) > 0.05) { 
             addToast(`Diferença de valores! Total: R$${totalFinal.toFixed(2)}`, 'warning'); 
             return; 
         }
    }

    if (showVenda.estoque < vendaQtd) { addToast('Estoque insuficiente.', 'error'); return; }
    
    const temFiado = metodosFinais.some(i => i.metodo === 'Fiado');
    if (temFiado && !alunoSelecionado) { addToast('Selecione um aluno para vender Fiado.', 'warning'); return; }

    try {
        const detalhesFinanceiros = {
            tipo_venda: 'Produto',
            desconto_aplicado: valorDesconto,
            itens: [{ produto_id: showVenda.id, nome: showVenda.nome, qtd: vendaQtd, unitario: showVenda.preco }],
            metodos: metodosFinais.map(i => ({ metodo: i.metodo, valor: Number(i.valor) }))
        };

        const tipoTransacao = temFiado ? 'Pendente' : 'Receita';

        const { error } = await supabase.from('transacoes').insert([{
            descricao: `Venda Loja - ${showVenda.nome} ${valorDesconto > 0 ? '(c/ Desc)' : ''}`,
            valor: totalFinal,
            tipo: tipoTransacao, 
            categoria: 'Venda Loja',
            data: new Date().toISOString(),
            aluno_id: alunoSelecionado || null,
            detalhes_pagamento: detalhesFinanceiros
        }]);

        if (error) throw error;

        await supabase.from('produtos').update({ estoque: showVenda.estoque - vendaQtd }).eq('id', showVenda.id);

        addToast(temFiado ? 'Registrado em Cobranças!' : 'Venda realizada!', 'success');
        setShowVenda(null);
        fetchProdutos(); 
    } catch { addToast('Erro na venda.', 'error'); }
  }

  // --- RECEBER FIADO ---
  function abrirModalReceber(cobranca: any) {
      const valorFiado = cobranca.valor;
      setItensPagamento([{ metodo: 'Pix', valor: String(valorFiado) }]); 
      setShowReceber({ ...cobranca });
  }

  async function handleConfirmarRecebimento() {
      if (!showReceber) return;
      const soma = itensPagamento.reduce((acc, i) => acc + (Number(i.valor)||0), 0);
      if (Math.abs(soma - showReceber.valor) > 0.05) { addToast(`Valor incorreto. Deve ser R$ ${showReceber.valor}`, 'warning'); return; }

      try {
          const novosMetodos = itensPagamento.map(i => ({ metodo: i.metodo, valor: Number(i.valor) }));
          
          await supabase.from('transacoes').update({
              detalhes_pagamento: { ...showReceber.detalhes_pagamento, metodos: novosMetodos },
              tipo: 'Receita',
              data: new Date().toISOString(),
              descricao: `${showReceber.descricao} (PAGO)`
          }).eq('id', showReceber.id);

          addToast('Recebido! Valor entrou no caixa.', 'success');
          setShowReceber(null);
          fetchCobrancas();
      } catch { addToast('Erro ao dar baixa.', 'error'); }
  }

  // --- EXECUÇÃO DA EXCLUSÃO DO HISTÓRICO (Chamada pelo Modal) ---
  async function executarExclusaoVenda(venda: any) {
      try {
          // 1. Devolver ao estoque
          const itens = venda.detalhes_pagamento?.itens;
          if (itens && Array.isArray(itens)) {
              for (const item of itens) {
                  if (item.produto_id && item.qtd) {
                      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single();
                      if (prod) {
                          await supabase.from('produtos').update({ estoque: prod.estoque + item.qtd }).eq('id', item.produto_id);
                      }
                  }
              }
          }
          // 2. Apagar transação
          await supabase.from('transacoes').delete().eq('id', venda.id);
          addToast('Venda cancelada e estoque estornado.', 'success');
          fetchHistorico();
          fetchProdutos();
      } catch { addToast('Erro ao cancelar venda.', 'error'); }
  }

  const produtosFiltrados = produtos.filter(p => (categoriaAtual === 'Todas' ? true : p.categoria === categoriaAtual) && p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="text-blue-600"/> Loja</h2></div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button onClick={() => setTab('Loja')} className={`px-4 py-2 rounded-lg font-bold text-sm ${tab === 'Loja' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Produtos</button>
            <button onClick={() => setTab('Cobrancas')} className={`px-4 py-2 rounded-lg font-bold text-sm flex gap-2 ${tab === 'Cobrancas' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>Cobranças {cobrancas.length > 0 && <span className="bg-red-500 text-white px-1.5 rounded-full text-[10px]">{cobrancas.length}</span>}</button>
            <button onClick={() => setTab('Historico')} className={`px-4 py-2 rounded-lg font-bold text-sm ${tab === 'Historico' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Histórico</button>
        </div>
      </div>

      {tab === 'Loja' && (
        <>
            <div className="flex justify-between gap-2 mb-4">
                 <input className="px-4 py-2 border rounded-xl bg-white w-full max-w-xs" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 <button onClick={() => { setFormData({categoria: CATEGORIAS[0], ativo: true, imagem_url: ''}); setShowForm(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Novo</button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button onClick={() => setCategoriaAtual('Todas')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${categoriaAtual==='Todas'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500'}`}>Todas</button>
                {CATEGORIAS.map(cat => <button key={cat} onClick={() => setCategoriaAtual(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${categoriaAtual===cat?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500'}`}>{cat}</button>)}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {produtosFiltrados.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="h-40 bg-slate-50 rounded-xl mb-3 overflow-hidden relative">
                            {p.imagem_url ? <img src={p.imagem_url} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-slate-300"><ShoppingBag size={40}/></div>}
                            {p.estoque < 5 && <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{p.estoque === 0 ? 'ESGOTADO' : 'BAIXO'}</span>}
                        </div>
                        <h3 className="font-bold text-slate-800 leading-tight mb-1">{p.nome}</h3>
                        <p className="text-xs text-slate-500 mb-3">{p.categoria}</p>
                        <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900">R$ {p.preco.toFixed(2)}</span>
                            <div className="flex gap-1">
                                <button onClick={()=>{setFormData(p); setShowForm(true)}} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg"><Edit size={16}/></button>
                                <button disabled={p.estoque===0} onClick={()=>{
                                    setVendaQtd(1); setItensPagamento([{metodo:'Dinheiro', valor: ''}]); setDesconto(''); setValorRecebidoCliente(''); setAlunoSelecionado(''); setShowVenda(p)
                                }} className="p-2 bg-slate-900 text-white rounded-lg disabled:opacity-50"><ShoppingCart size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}

      {tab === 'Cobrancas' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-3"><NotebookPen className="text-red-600"/><h3 className="font-bold text-red-900">Contas em Aberto (Fiado)</h3></div>
              {cobrancas.length === 0 ? <div className="p-10 text-center text-slate-400">Nenhuma pendência encontrada.</div> : (
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Data</th><th className="p-4">Aluno</th><th className="p-4">Produto</th><th className="p-4 text-right">Valor</th><th className="p-4 text-center">Ação</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                          {cobrancas.map(c => (
                              <tr key={c.id} className="hover:bg-slate-50">
                                  <td className="p-4 text-slate-500">{format(new Date(c.data), 'dd/MM/yy')}</td>
                                  <td className="p-4 font-bold text-slate-800">{c.alunos?.nome}</td>
                                  <td className="p-4 text-slate-600">{c.descricao.replace('Venda Loja - ', '')}</td>
                                  <td className="p-4 text-right font-bold text-red-600">R$ {c.valor.toFixed(2)}</td>
                                  <td className="p-4 text-center"><button onClick={()=>abrirModalReceber(c)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow hover:bg-green-700">RECEBER</button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>
      )}

      {tab === 'Historico' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Data</th><th className="p-4">Produto</th><th className="p-4">Status</th><th className="p-4 text-right">Valor</th><th className="p-4 text-right">Ação</th></tr></thead>
                 <tbody className="divide-y divide-slate-50">
                     {historico.map(h => (
                         <tr key={h.id}>
                             <td className="p-4">{format(new Date(h.data), 'dd/MM HH:mm')}</td>
                             <td className="p-4 font-bold">{h.descricao.replace('Venda Loja - ', '')}</td>
                             <td className="p-4">
                                {h.tipo === 'Pendente' ? <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">PENDENTE</span> : <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">PAGO</span>}
                             </td>
                             <td className="p-4 text-right font-black text-slate-700">R$ {h.valor.toFixed(2)}</td>
                             <td className="p-4 text-right">
                                 <button 
                                    onClick={() => setCustomAlert({
                                        show: true, 
                                        title: 'Cancelar Venda?', 
                                        message: `Deseja apagar a venda de "${h.descricao}"? O estoque será devolvido.`, 
                                        type: 'danger', 
                                        onConfirm: () => executarExclusaoVenda(h)
                                    })} 
                                    className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-xl transition-all"
                                 >
                                     <Trash2 size={16}/>
                                 </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
          </div>
      )}

      {/* MODAL VENDA COM CALCULADORA */}
      {showVenda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-[2rem] w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">{showVenda.nome}</h3><button onClick={()=>setShowVenda(null)}><X/></button></div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                        <span className="font-bold text-slate-500 text-xs uppercase">Quantidade</span>
                        <div className="flex items-center gap-3">
                            <button onClick={()=>setVendaQtd(Math.max(1, vendaQtd-1))} className="w-8 h-8 bg-white border rounded-lg font-bold">-</button>
                            <span className="font-black text-lg">{vendaQtd}</span>
                            <button onClick={()=>setVendaQtd(Math.min(showVenda.estoque, vendaQtd+1))} className="w-8 h-8 bg-slate-900 text-white rounded-lg font-bold">+</button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                         <div className="flex-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Recebido</label>
                             <div className="relative">
                                 <Wallet size={14} className="absolute left-3 top-3 text-green-600"/>
                                 <input type="number" className="w-full pl-8 p-2 bg-green-50 border-green-100 border rounded-xl font-bold text-slate-800" placeholder="0,00" value={valorRecebidoCliente} onChange={e=>setValorRecebidoCliente(e.target.value)} />
                             </div>
                         </div>
                         <div className="w-1/3">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Desconto</label>
                             <input type="number" className="w-full p-2 bg-red-50 border-red-100 border rounded-xl font-bold text-red-600" placeholder="0,00" value={desconto} onChange={e=>setDesconto(e.target.value)} />
                         </div>
                    </div>

                    <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg">
                        <div className="flex justify-between text-sm mb-1"><span>Subtotal:</span> <span>R$ {subtotal.toFixed(2)}</span></div>
                        {valorDesconto > 0 && <div className="flex justify-between text-sm mb-1 text-red-300"><span>Desconto:</span> <span>- R$ {valorDesconto.toFixed(2)}</span></div>}
                        <div className="flex justify-between text-xl font-black mt-2 border-t border-slate-600 pt-2"><span>TOTAL:</span> <span>R$ {totalFinal.toFixed(2)}</span></div>
                        
                        {valorPagoPeloCliente > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-600 flex justify-between items-center">
                                <span className="text-yellow-400 font-bold uppercase text-xs">Troco a devolver:</span>
                                <span className="text-2xl font-black text-yellow-400">R$ {troco.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Formas de Pagamento</label>
                        {itensPagamento.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <select className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold w-1/3" value={item.metodo} onChange={e=>updateItemPagamento(idx, 'metodo', e.target.value)}>
                                    <option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartao">Cartão</option><option value="Fiado">Fiado</option>
                                </select>
                                <input type="number" className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold flex-1" value={item.valor} onChange={e=>updateItemPagamento(idx, 'valor', e.target.value)} placeholder="Valor" />
                                {itensPagamento.length > 1 && <button onClick={()=>removeItemPagamento(idx)} className="text-red-500"><Trash2 size={18}/></button>}
                            </div>
                        ))}
                        <button onClick={addItemPagamento} className="text-xs font-bold text-blue-600 flex items-center gap-1">+ Dividir Pagto</button>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Cliente</label>
                        <select className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700" value={alunoSelecionado} onChange={e=>setAlunoSelecionado(e.target.value)}>
                            <option value="">Venda Balcão</option>
                            {alunos.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                    </div>


                    {itensPagamento.some(i => i.metodo === 'Pix') && (
                 <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[2rem] flex flex-col items-center animate-bounceIn">
                 <p className="text-[10px] font-black text-blue-600 uppercase mb-3">Escaneie para Pagar (Pix)</p>
                 <div className="bg-white p-2 rounded-2xl shadow-sm mb-3">
                 {/* Aqui você pode colocar a URL do seu QR Code fixo da loja */}
                 <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CHAVE_DA_LOJA" className="w-32 h-32" />
                </div>
                <button onClick={() => { navigator.clipboard.writeText('SUA_CHAVE_AQUI'); addToast('Chave copiada!', 'success'); }} className="text-[10px] font-bold text-blue-700 underline uppercase">Copiar Chave Pix</button>
    </div>
)}

                    <button onClick={handleRealizarVenda} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-green-700 mt-2">Confirmar</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL RECEBER FIADO */}
      {showReceber && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-[2rem] w-full max-w-md shadow-2xl">
                <div className="flex justify-between mb-4"><h3 className="font-bold text-xl text-green-700">Receber Dívida</h3><button onClick={()=>setShowReceber(null)}><X/></button></div>
                <p className="text-slate-500 mb-6 text-sm">Recebendo de <b>{showReceber.alunos?.nome}</b> o valor de:</p>
                <div className="text-center mb-6"><span className="text-4xl font-black text-slate-800">R$ {showReceber.valor.toFixed(2)}</span></div>
                
                <div className="space-y-2 mb-6">
                    {itensPagamento.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <select className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold w-1/3" value={item.metodo} onChange={e=>updateItemPagamento(idx, 'metodo', e.target.value)}><option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartao">Cartão</option></select>
                            <input type="number" className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold flex-1" value={item.valor} onChange={e=>updateItemPagamento(idx, 'valor', e.target.value)} />
                        </div>
                    ))}
                    <button onClick={addItemPagamento} className="text-xs font-bold text-blue-600 flex items-center gap-1">+ Dividir</button>
                </div>
                <button onClick={handleConfirmarRecebimento} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black">Confirmar Pagamento</button>
            </div>
        </div>
      )}

      {/* MODAL PRODUTO */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-[2rem] w-full max-w-lg shadow-2xl">
                <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">{formData.id?'Editar':'Novo'} Produto</h3><button onClick={()=>setShowForm(false)}><X/></button></div>
                <form onSubmit={handleSaveProduto} className="space-y-3">
                    <input className="w-full p-3 bg-slate-50 rounded-xl border-none" placeholder="Nome" value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} required/>
                    <select className="w-full p-3 bg-slate-50 rounded-xl border-none" value={formData.categoria} onChange={e=>setFormData({...formData, categoria:e.target.value})}>{CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}</select>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" step="0.01" className="p-3 bg-slate-50 rounded-xl border-none" placeholder="Preço" value={formData.preco||''} onChange={e=>setFormData({...formData, preco:e.target.value})} required/>
                        <input type="number" className="p-3 bg-slate-50 rounded-xl border-none" placeholder="Estoque" value={formData.estoque||''} onChange={e=>setFormData({...formData, estoque:e.target.value})} required/>
                    </div>
                    <div className="border-2 border-dashed p-4 rounded-xl text-center relative hover:bg-slate-50 cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={uploading}/>
                        {uploading ? 'Enviando...' : formData.imagem_url ? 'Imagem Trocada!' : 'Carregar Foto'}
                    </div>
                    <div className="flex gap-2 pt-2">
                        {formData.id && <button type="button" onClick={() => setCustomAlert({
                            show: true, title: 'Apagar Produto?', message: 'Tem certeza?', type: 'danger', onConfirm: ()=>handleDeleteProduto(formData.id!)
                        })} className="p-4 bg-red-100 text-red-500 rounded-xl"><Trash2/></button>}
                        <button disabled={uploading} className="flex-1 bg-slate-900 text-white rounded-xl font-bold py-4">SALVAR</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL ALERTA PERSONALIZADO (NOVO) */}
      {customAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center border border-white">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${customAlert.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {customAlert.type === 'danger' ? <Trash2 size={40} /> : <CheckCircle size={40} />}
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic mb-2">{customAlert.title}</h3>
            <p className="text-slate-500 mb-8 leading-relaxed font-medium">{customAlert.message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { customAlert.onConfirm(); setCustomAlert({ ...customAlert, show: false }); }}
                className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all ${customAlert.type === 'danger' ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700' : 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'}`}
              >
                Confirmar
              </button>
              <button 
                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs tracking-widest hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}