"use client"

import { useState, useEffect, useMemo } from 'react'
import { 
  Users, Search, Filter, Plus, FileSpreadsheet, 
  MoreVertical, Pencil, Trash2, UserMinus, UserPlus,
  RefreshCw, Download, Upload, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, X, Calendar, PlusCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getLimit } from '@/lib/planLimits'

export default function PersonalPage() {
  // Estados de Datos
  const [workers, setWorkers] = useState([])
  const [subcontractors, setSubcontractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)

  // Filtros y Búsqueda
  const [search, setSearch] = useState('')
  const [filterSub, setFilterSub] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active') // active, inactive, all
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modales
  const [showModal, setShowModal] = useState(false)
  const [showBajaModal, setShowBajaModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
  const [editingWorker, setEditingWorker] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [bajaData, setBajaData] = useState({ id: null, date: format(new Date(), 'yyyy-MM-dd'), motive: '' })

  // Formulario Contratista
  const [subFormData, setSubFormData] = useState({ razon_social: '', rfc: '', contacto_nombre: '' })

  // Formulario Trabajador
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    nss: '',
    curp: '',
    puesto: '',
    numero_empleado: '',
    fecha_ingreso_obra: format(new Date(), 'yyyy-MM-dd'),
    fecha_alta_imss: '',
    id_subcontratista: ''
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // 1. Obtener Perfil e ID Empresa
    const { data: profile } = await supabase
      .from('dat_personal_area')
      .select('*, cat_empresas(*)')
      .eq('auth_user_id', user.id)
      .single()
    
    setUserProfile(profile)

    // 2. Obtener Subcontratistas
    const { data: subs } = await supabase
      .from('cat_subcontratistas')
      .select('*')
      .order('razon_social')
    
    if (subs) setSubcontractors(subs)

    // 3. Obtener Trabajadores
    await fetchWorkers()
    setLoading(false)
  }

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('dat_fuerza_trabajo')
      .select('*, cat_subcontratistas(razon_social)')
      .order('fecha_registro', { ascending: false })
    
    if (data) setWorkers(data)
  }

  // Lógica de Filtrado
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const nombreC = w.nombre_completo || w.nombre || ''
      const matchesSearch = 
        nombreC.toLowerCase().includes(search.toLowerCase()) ||
        (w.nss && w.nss.includes(search)) ||
        (w.curp && w.curp.toLowerCase().includes(search.toLowerCase()))
      
      const matchesSub = filterSub === 'all' || w.id_subcontratista === filterSub
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'active' && w.activo) || 
        (filterStatus === 'inactive' && !w.activo)

      return matchesSearch && matchesSub && matchesStatus
    })
  }, [workers, search, filterSub, filterStatus])

  // Paginación
  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage)
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Handlers CRUD
  const handleSaveWorker = async (e) => {
    e.preventDefault()
    
    // Validaciones Básicas
    if (formData.nss && formData.nss.length !== 11) {
      return Swal.fire('Error', 'El NSS debe tener 11 dígitos', 'error')
    }
    if (formData.curp && formData.curp.length !== 18) {
      return Swal.fire('Error', 'La CURP debe tener 18 caracteres', 'error')
    }

    try {
      if (editingWorker) {
        const { error } = await supabase
          .from('dat_fuerza_trabajo')
          .update(formData)
          .eq('id_trabajador', editingWorker.id_trabajador)
        if (error) throw error
        Swal.fire('¡Éxito!', 'Trabajador actualizado correctamente', 'success')
      } else {
        // >>> CANDADO DE PLAN (Manual) <<<
        const plan = userProfile?.cat_empresas?.plan_suscripcion || 'free'
        const maxEmployees = getLimit(plan, 'maxEmployees')
        const activeCount = workers.filter(w => w.activo).length

        if (activeCount >= maxEmployees) {
          return Swal.fire({
            title: 'Límite Alcazado',
            text: `Tu plan ${plan.toUpperCase()} permite hasta ${maxEmployees} empleados activos. ¡Es momento de un Upgrade!`,
            icon: 'warning',
            confirmButtonText: 'Entendido'
          })
        }

        const { error } = await supabase
          .from('dat_fuerza_trabajo')
          .insert([{ ...formData, id_empresa: userProfile.id_empresa, creado_por: userProfile.auth_user_id }])
        if (error) throw error
        Swal.fire('¡Éxito!', 'Trabajador registrado correctamente', 'success')
      }
      
      setShowModal(false)
      fetchWorkers()
    } catch (error) {
      Swal.fire('Error', error.message, 'error')
    }
  }

  const handleBajaSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('dat_fuerza_trabajo')
        .update({ 
          activo: false, 
          fecha_baja: bajaData.date, 
          motivo_baja: bajaData.motive 
        })
        .eq('id_trabajador', bajaData.id)
      
      if (error) throw error
      Swal.fire('Procesado', 'Baja registrada correctamente', 'success')
      setShowBajaModal(false)
      fetchWorkers()
    } catch (error) {
      Swal.fire('Error', error.message, 'error')
    }
  }

  const handleReactivate = async (id) => {
    const result = await Swal.fire({
      title: '¿Reactivar trabajador?',
      text: "El personal volverá a aparecer como activo en las listas.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('dat_fuerza_trabajo')
        .update({ activo: true, fecha_baja: null, motivo_baja: null })
        .eq('id_trabajador', id)
      
      if (error) Swal.fire('Error', error.message, 'error')
      else {
        Swal.fire('Activado', 'Trabajador reactivado con éxito', 'success')
        fetchWorkers()
      }
    }
  }

  const openEditModal = (worker) => {
    setEditingWorker(worker)
    setFormData({
      nombre: worker.nombre,
      apellido_paterno: worker.apellido_paterno || '',
      apellido_materno: worker.apellido_materno || '',
      nss: worker.nss || '',
      curp: worker.curp || '',
      puesto: worker.puesto || '',
      numero_empleado: worker.numero_empleado || '',
      fecha_ingreso_obra: worker.fecha_ingreso_obra || '',
      fecha_alta_imss: worker.fecha_alta_imss || '',
      id_subcontratista: worker.id_subcontratista || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingWorker(null)
    setFormData({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      nss: '',
      curp: '',
      puesto: '',
      numero_empleado: '',
      fecha_ingreso_obra: format(new Date(), 'yyyy-MM-dd'),
      fecha_alta_imss: '',
      id_subcontratista: ''
    })
  }

  const handleExportExcel = () => {
    window.open(`/api/personal/export?subcontratista=${filterSub}`, '_blank')
  }

  const handleImportExcel = async (e) => {
    e.preventDefault()
    if (!importFile) return

    Swal.fire({
      title: 'Procesando...',
      text: 'Cargando trabajadores, por favor espera.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    const formData = new FormData()
    formData.append('file', importFile)
    if (filterSub !== 'all') formData.append('id_subcontratista', filterSub)

    try {
      const res = await fetch('/api/personal/import', { method: 'POST', body: formData })
      const data = await res.json()
      
      Swal.close()

      if (data.success) {
        Swal.fire('¡Importado!', `Se registraron ${data.count} trabajadores con éxito.`, 'success')
        setShowImportModal(false)
        setImportFile(null)
        fetchWorkers()
      } else throw new Error(data.error)
    } catch (error) {
      Swal.close()
      Swal.fire('Error', error.message, 'error')
    }
  }

  const handleSaveSub = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('cat_subcontratistas')
        .insert([{ ...subFormData, id_empresa: userProfile.id_empresa }])
      if (error) throw error
      Swal.fire('¡Éxito!', 'Contratista agregada', 'success')
      setSubFormData({ razon_social: '', rfc: '', contacto_nombre: '' })
      fetchInitialData() // Para actualizar el select
    } catch (error) {
      Swal.fire('Error', error.message, 'error')
    }
  }

  // Stats
  const stats = useMemo(() => {
    const active = workers.filter(w => w.activo).length
    const errors = workers.filter(w => w.activo && (!w.curp || w.curp.length < 18 || !w.nss)).length
    return { total: workers.length, active, errors }
  }, [workers])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-36">
      
      {/* ── HEADER BENTO ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-gradient-to-br from-[#145184] to-blue-900 rounded-lg p-8 border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                 <Users className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight font-mono">Personal de Obra</h1>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mt-1">Ecosistema {userProfile?.cat_empresas?.nombre_comercial}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
               <button onClick={handleExportExcel} className="p-2.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/40 transition-all" title="Exportar a Excel">
                  <Download className="w-5 h-5" />
               </button>
               <button onClick={() => setShowImportModal(true)} className="p-2.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:bg-purple-500/40 transition-all" title="Importar FT">
                  <Upload className="w-5 h-5" />
               </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-center items-center text-center group hover:border-accent/40 transition-all">
          <span className="text-4xl font-black text-primary dark:text-white tabular-nums">{stats.active}</span>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2">Personal Activo</span>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-center items-center text-center group hover:border-alert/40 transition-all">
          <span className="text-4xl font-black text-alert tabular-nums">{stats.errors}</span>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 italic">Faltan Datos (CURP/NSS)</span>
        </div>
      </div>

      {/* ── CONTROLES ── */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Búsqueda Rápida</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input 
                type="text" 
                placeholder="Nombre, NSS o CURP..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Estatus</label>
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border h-[42px]">
              <button 
                onClick={() => { setFilterStatus('active'); setCurrentPage(1); }}
                className={`flex-1 py-2 rounded text-[9px] font-black uppercase transition-all ${filterStatus === 'active' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                En Obra
              </button>
              <button 
                onClick={() => { setFilterStatus('inactive'); setCurrentPage(1); }}
                className={`flex-1 py-2 rounded text-[9px] font-black uppercase transition-all ${filterStatus === 'inactive' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                Bajas
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Contratista</label>
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border h-[42px]">
              <select 
                value={filterSub}
                onChange={(e) => { setFilterSub(e.target.value); setCurrentPage(1); }}
                className="flex-1 pl-3 pr-8 py-2 bg-transparent border-none text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer truncate"
              >
                <option value="all">TODAS</option>
                {subcontractors.map(s => (
                  <option key={s.id_subcontratista} value={s.id_subcontratista}>{s.razon_social}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowSubModal(true)}
                className="px-2 text-accent hover:scale-110 transition-transform"
                title="Gestionar Contratistas"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="h-[42px] flex items-center justify-center gap-3 px-6 bg-accent text-primary rounded-md font-black text-[10px] uppercase tracking-[0.1em] shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Registro</span>
          </button>

        </div>
      </div>

      {/* ── TABLA ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Personal</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">NSS / CURP</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Puesto / Contratista</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ingreso</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-muted rounded w-full" /></td>
                  </tr>
                ))
              ) : paginatedWorkers.length > 0 ? (
                paginatedWorkers.map((w) => (
                  <tr key={w.id_trabajador} className={`group transition-all hover:bg-primary/[0.02] ${!w.activo ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm border transition-all ${w.activo ? 'bg-primary/5 border-primary/10 text-primary dark:text-accent group-hover:scale-105' : 'bg-muted border-border text-muted-foreground'}`}>
                          {w.nombre.substring(0, 1)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tracking-tight text-foreground">{w.nombre_completo}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Emp. #{w.numero_empleado || 'S/N'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold py-0.5 px-1.5 rounded bg-muted text-muted-foreground tabular-nums">NSS</span>
                           <span className={`text-[10px] font-bold tabular-nums ${!w.nss ? 'text-alert italic' : 'text-foreground'}`}>{w.nss || 'Faltante'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold py-0.5 px-1.5 rounded bg-muted text-muted-foreground tabular-nums">CURP</span>
                           <span className={`text-[10px] font-bold tabular-nums ${(!w.curp || w.curp.length < 18) ? 'text-alert italic' : 'text-foreground'}`}>{w.curp || 'Faltante'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-primary/80 dark:text-accent/80 uppercase tracking-tight">{w.puesto || 'GENERAL'}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">{w.cat_subcontratistas?.razon_social || 'PERSONAL INTERNO'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold tabular-nums uppercase">{w.fecha_ingreso_obra ? format(new Date(w.fecha_ingreso_obra), 'dd MMM yyyy', { locale: es }) : '---'}</span>
                          {!w.activo && (
                            <span className="text-[9px] font-black text-alert uppercase tracking-tighter mt-1">Baja: {format(new Date(w.fecha_baja), 'dd/MM/yy')}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                         <button 
                            onClick={() => openEditModal(w)}
                            className="p-2 rounded-md hover:bg-primary/10 text-primary dark:text-accent transition-all"
                            title="Editar Datos"
                          >
                            <Pencil className="w-4 h-4" />
                         </button>
                         {w.activo ? (
                           <button 
                            onClick={() => { setBajaData({ ...bajaData, id: w.id_trabajador }); setShowBajaModal(true); }}
                            className="p-2 rounded-md hover:bg-alert/10 text-alert transition-all"
                            title="Registrar Baja"
                           >
                            <UserMinus className="w-4 h-4" />
                           </button>
                         ) : (
                           <button 
                            onClick={() => handleReactivate(w.id_trabajador)}
                            className="p-2 rounded-md hover:bg-success/10 text-success transition-all"
                            title="Reactivar"
                           >
                            <UserPlus className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Mostrando {paginatedWorkers.length} de {filteredWorkers.length} registros
            </span>
            <div className="flex items-center gap-2">
               <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded border border-border disabled:opacity-30 hover:bg-card transition-all"
               >
                <ChevronLeft className="w-4 h-4" />
               </button>
               <div className="flex items-center gap-1">
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                   <button 
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded text-[10px] font-black transition-all ${currentPage === p ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-card'}`}
                   >
                     {p}
                   </button>
                 ))}
               </div>
               <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded border border-border disabled:opacity-30 hover:bg-card transition-all"
               >
                <ChevronRight className="w-4 h-4" />
               </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL EDICIÓN/NUEVO ── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-card border border-border w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-[#145184] text-white">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                    <Plus className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-widest">{editingWorker ? 'Editar Expediente' : 'Nuevo Ingreso de Personal'}</h3>
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                 <X className="w-5 h-5" />
               </button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Filas de Formulario */}
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Información Básica</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-muted-foreground/60">Nombre(s) *</span>
                        <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-muted-foreground/60">Apellido Paterno *</span>
                        <input required type="text" value={formData.apellido_paterno} onChange={e => setFormData({...formData, apellido_paterno: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-muted-foreground/60">Apellido Materno</span>
                        <input type="text" value={formData.apellido_materno} onChange={e => setFormData({...formData, apellido_materno: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">NSS (11 Dígitos)</span>
                    <input type="text" maxLength={11} value={formData.nss} onChange={e => setFormData({...formData, nss: e.target.value.replace(/\D/g, '')})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20 tabular-nums" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">CURP (18 Dígitos)</span>
                    <input type="text" maxLength={18} value={formData.curp} onChange={e => setFormData({...formData, curp: e.target.value.toUpperCase()})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20 uppercase tabular-nums" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Puesto / Categoría</span>
                    <input type="text" list="puestos-sugeridos" value={formData.puesto} onChange={e => setFormData({...formData, puesto: e.target.value.toUpperCase()})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                    <datalist id="puestos-sugeridos">
                      <option value="AYUDANTE GENERAL" />
                      <option value="CABO DE OFICIOS" />
                      <option value="OPERADOR DE MAQUINARIA" />
                      <option value="SUPERVISOR HSE" />
                      <option value="FIERRERO" />
                      <option value="CARPINTERO" />
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">No. Empleado</span>
                    <input type="text" value={formData.numero_empleado} onChange={e => setFormData({...formData, numero_empleado: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Fecha Alta IMSS</span>
                    <input type="date" value={formData.fecha_alta_imss} onChange={e => setFormData({...formData, fecha_alta_imss: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Contratista Asociada</span>
                    <select 
                      value={formData.id_subcontratista}
                      onChange={e => setFormData({...formData, id_subcontratista: e.target.value})}
                      className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                    >
                      <option value="">Personal Interno (Directo)</option>
                      {subcontractors.map(s => (
                        <option key={s.id_subcontratista} value={s.id_subcontratista}>{s.razon_social}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Fecha Ingreso Obra</span>
                    <input type="date" value={formData.fecha_ingreso_obra} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-primary/20" />
                  </div>
               </div>

               <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all">Cancelar</button>
                  <button type="submit" className="px-10 py-2.5 bg-primary text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">Guardar Expediente</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL BAJA ── */}
      {showBajaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBajaModal(false)} />
          <div className="relative bg-card border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-6 bg-alert text-white flex flex-col items-center">
               <UserMinus className="w-12 h-12 mb-2" />
               <h3 className="font-black text-sm uppercase tracking-widest font-mono">Registrar Salida de Obra</h3>
            </div>
            <form onSubmit={handleBajaSubmit} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Fecha de Baja / Salida</span>
                    <input required type="date" value={bajaData.date} onChange={e => setBajaData({...bajaData, date: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-alert/20" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Motivo (Opcional)</span>
                    <textarea rows={3} value={bajaData.motive} onChange={e => setBajaData({...bajaData, motive: e.target.value})} className="w-full bg-muted/30 border border-border rounded-md px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-alert/20 resize-none" placeholder="Termino de contrato, renuncia, etc..." />
                  </div>
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={() => setShowBajaModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-alert text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-alert/20">Confirmar Baja</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTAR ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-card border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-6 bg-purple-600 text-white flex flex-col items-center">
               <Upload className="w-12 h-12 mb-2" />
               <h3 className="font-black text-sm uppercase tracking-widest">Importar Personal (XLSX)</h3>
            </div>
            <form onSubmit={handleImportExcel} className="p-8 space-y-6">
               <div className="p-4 border-2 border-dashed border-border rounded-lg text-center hover:bg-muted/30 transition-all cursor-pointer relative">
                  <input required type="file" accept=".xlsx, .xls" onChange={e => setImportFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{importFile ? importFile.name : 'Seleccionar Archivo Excel'}</p>
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cerrar</button>
                  <button type="submit" disabled={!importFile} className="flex-1 py-3 bg-purple-600 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 disabled:opacity-50">Comenzar Carga</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONTRATISTAS ── */}
      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSubModal(false)} />
          <div className="relative bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-border flex items-center justify-between bg-primary text-white">
               <h3 className="font-black text-sm uppercase tracking-widest">Gestión de Contratistas</h3>
               <button onClick={() => setShowSubModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-8">
               {/* Formulario rápido */}
               <form onSubmit={handleSaveSub} className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">Nueva Contratista</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="text" placeholder="Razón Social" value={subFormData.razon_social} onChange={e => setSubFormData({...subFormData, razon_social: e.target.value})} className="w-full bg-card border border-border rounded px-3 py-2 text-xs font-bold" />
                    <input type="text" placeholder="RFC" value={subFormData.rfc} onChange={e => setSubFormData({...subFormData, rfc: e.target.value.toUpperCase()})} className="w-full bg-card border border-border rounded px-3 py-2 text-xs font-bold" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-accent text-primary rounded font-black text-[10px] uppercase tracking-widest">Registrar</button>
               </form>

               {/* Lista */}
               <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contratistas Registradas</span>
                  <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                    {subcontractors.map(s => (
                      <div key={s.id_subcontratista} className="flex items-center justify-between p-3 bg-muted/10 border border-border rounded-md group hover:bg-white/5 transition-all">
                        <div className="flex flex-col">
                          <span className="text-xs font-black">{s.razon_social}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.rfc || 'Sin RFC'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
