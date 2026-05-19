"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Tractor, Search, Filter, Plus, FileSpreadsheet, 
  Pencil, Trash2, ShieldAlert, CheckCircle2,
  ChevronLeft, ChevronRight, X, Calendar, PlusCircle, 
  FileText, History, Image as ImageIcon, Loader2, Wrench, Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
})

export default function MaquinariaPage() {
  // --- ESTADOS DE DATOS ---
  const [equipments, setEquipments] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  // --- FILTROS Y BÚSQUEDA ---
  const [search, setSearch] = useState('')
  const [filterObra, setFilterObra] = useState('all')
  const [filterTipo, setFilterTipo] = useState('all') // all, maquinaria, vehiculo, equipo, herramienta
  const [filterMtto, setFilterMtto] = useState('all') // all, vencido, mes
  const [filterStatus, setFilterStatus] = useState('active') // active, inactive, all
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Período para filtrar y calcular horómetros históricos (Mes/Año)
  const currentYear = new Date().getFullYear()
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0')
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [filterYear, setFilterYear] = useState(String(currentYear))

  // --- MODALES ---
  const [showEqModal, setShowEqModal] = useState(false)
  const [showBajaModal, setShowBajaModal] = useState(false)
  const [showObraModal, setShowObraModal] = useState(false)
  const [showMttoModal, setShowMttoModal] = useState(false)
  const [showHorometroModal, setShowHorometroModal] = useState(false)

  // --- SELECCIONADOS / FORMULARIOS ---
  const [editingEquipment, setEditingEquipment] = useState(null)
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  // Formulario Nueva Obra Inline
  const [obraFormData, setObraFormData] = useState({ nombre_obra: '', ubicacion: '', descripcion: '' })

  // Formulario Baja de Equipo
  const [bajaData, setBajaData] = useState({ id: null, date: format(new Date(), 'yyyy-MM-dd') })

  // Formulario Equipo/Maquinaria
  const [formData, setFormData] = useState({
    id_obra: '',
    tipo_unidad: 'maquinaria',
    tipo: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    num_economico: '',
    serie: '',
    placa: '',
    horometro: '0',
    horometro_inicial: '0',
    intervalo_mantenimiento: '',
    fecha_proximo_mantenimiento: '',
    actividad: '',
    frente: '',
    fecha_ingreso_obra: format(new Date(), 'yyyy-MM-dd')
  })

  // --- MANTENIMIENTOS ---
  const [maintenanceHistory, setMaintenanceHistory] = useState([])
  const [editingMtto, setEditingMtto] = useState(null)
  const [mttoFormData, setMttoFormData] = useState({
    tipo_mantenimiento: 'Preventivo',
    fecha_mantenimiento: format(new Date(), 'yyyy-MM-dd'),
    horometro_mantenimiento: '',
    observaciones: '',
    realizado_por: ''
  })

  // --- HORÓMETROS ---
  const [horometroHistory, setHorometroHistory] = useState([])
  const [horometroFormData, setHorometroFormData] = useState({
    periodo: `${currentYear}-${currentMonth}`,
    horometro_final: '',
    fecha_proximo_mantenimiento: ''
  })

  // --- INICIO ---
  useEffect(() => {
    fetchInitialData()
  }, [filterMonth, filterYear])

  const fetchInitialData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // 1. Perfil del Usuario
    const { data: profile } = await supabase
      .from('dat_personal_area')
      .select('*, cat_empresas(*)')
      .eq('auth_user_id', user.id)
      .single()
    
    setUserProfile(profile)

    // 2. Cargar Obras
    await fetchObras()

    // 3. Cargar Maquinaria
    await fetchEquipments()
    setLoading(false)
  }

  const fetchObras = async () => {
    const { data } = await supabase
      .from('cat_obras')
      .select('*')
      .eq('activa', true)
      .order('nombre_obra')
    
    if (data) setObras(data)
  }

  const fetchEquipments = async () => {
    try {
      let url = `/api/maquinaria?mes=${filterMonth}&anio=${filterYear}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setEquipments(json.data)
      }
    } catch (err) {
      console.error('Error cargando equipos:', err)
    }
  }

  // --- FILTRADO ---
  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq => {
      const matchesSearch = 
        (eq.tipo && eq.tipo.toLowerCase().includes(search.toLowerCase())) ||
        (eq.marca && eq.marca.toLowerCase().includes(search.toLowerCase())) ||
        (eq.modelo && eq.modelo.toLowerCase().includes(search.toLowerCase())) ||
        (eq.num_economico && eq.num_economico.toLowerCase().includes(search.toLowerCase())) ||
        (eq.serie && eq.serie.toLowerCase().includes(search.toLowerCase())) ||
        (eq.placa && eq.placa.toLowerCase().includes(search.toLowerCase()))

      const matchesObra = filterObra === 'all' || eq.id_obra === filterObra
      const matchesTipo = filterTipo === 'all' || eq.tipo_unidad === filterTipo
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && eq.activo) ||
        (filterStatus === 'inactive' && !eq.activo)

      let matchesMtto = true
      if (filterMtto === 'vencido') {
        matchesMtto = eq.estado_mantenimiento === 'Vencido'
      } else if (filterMtto === 'mes') {
        if (eq.fecha_proximo_mantenimiento) {
          const dateParts = String(eq.fecha_proximo_mantenimiento).split('-')
          matchesMtto = dateParts[0] === filterYear && dateParts[1] === filterMonth
        } else {
          matchesMtto = false
        }
      }

      return matchesSearch && matchesObra && matchesTipo && matchesStatus && matchesMtto
    })
  }, [equipments, search, filterObra, filterTipo, filterStatus, filterMtto, filterMonth, filterYear])

  // Paginación
  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage)
  const paginatedEquipments = filteredEquipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // --- CRUD EQUIPOS ---
  const handleSaveEquipment = async (e) => {
    e.preventDefault()

    const tipoVal = (formData.tipo || '').trim()
    const marcaVal = (formData.marca || '').trim()
    const fechaIngresoVal = (formData.fecha_ingreso_obra || '').trim()

    if (!tipoVal || !marcaVal || !fechaIngresoVal) {
      return Swal.fire({
        title: 'Campos Obligatorios',
        text: 'Por favor, complete Tipo, Marca y Fecha de Ingreso.',
        icon: 'warning',
        confirmButtonColor: '#145184'
      })
    }

    setSaving(true)
    const submitData = new FormData()
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key])
    })

    if (editingEquipment) {
      submitData.append('id_maquinaria', editingEquipment.id_maquinaria)
      submitData.append('imagen_url_actual', editingEquipment.imagen_url || '')
    }

    if (imageFile) {
      submitData.append('imagen', imageFile)
    }

    try {
      const method = editingEquipment ? 'PUT' : 'POST'
      const res = await fetch('/api/maquinaria', { method, body: submitData })
      const json = await res.json()

      if (json.success) {
        Toast.fire({
          icon: 'success',
          title: editingEquipment ? 'Equipo actualizado correctamente' : 'Equipo registrado con éxito'
        })
        setShowEqModal(false)
        setImageFile(null)
        setEditingEquipment(null)
        fetchEquipments()
      } else {
        Swal.fire('Error', json.error || 'Ocurrió un error al guardar.', 'error')
      }
    } catch (err) {
      Swal.fire('Error', 'Problema al conectar con el servidor.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleBajaSubmit = async (e) => {
    e.preventDefault()
    if (!bajaData.id || !bajaData.date) return

    setSaving(true)
    try {
      const res = await fetch('/api/maquinaria', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_maquinaria: bajaData.id,
          fecha_baja: bajaData.date
        })
      })
      const json = await res.json()

      if (json.success) {
        Toast.fire({
          icon: 'success',
          title: 'Equipo dado de baja correctamente'
        })
        setShowBajaModal(false)
        fetchEquipments()
      } else {
        Swal.fire('Error', json.error, 'error')
      }
    } catch (err) {
      Swal.fire('Error', 'Error al procesar la baja.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReactivateEquipment = async (id) => {
    const result = await Swal.fire({
      title: '¿Reactivar Equipo?',
      text: '¿Estás seguro de que deseas reactivar este equipo?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#145184'
    })

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('dat_maquinaria')
          .update({ activo: true, fecha_baja: null })
          .eq('id_maquinaria', id)
        
        if (error) throw error

        Toast.fire({
          icon: 'success',
          title: 'Equipo reactivado con éxito'
        })
        fetchEquipments()
      } catch (err) {
        Swal.fire('Error', err.message, 'error')
      }
    }
  }

  const openEditModal = (eq) => {
    setEditingEquipment(eq)
    setFormData({
      id_obra: eq.id_obra || '',
      tipo_unidad: eq.tipo_unidad || 'maquinaria',
      tipo: eq.tipo || '',
      marca: eq.marca || '',
      modelo: eq.modelo || '',
      anio: eq.anio ? String(eq.anio) : '',
      color: eq.color || '',
      num_economico: eq.num_economico || '',
      serie: eq.serie || '',
      placa: eq.placa || '',
      horometro: eq.horometro ? String(eq.horometro) : '0',
      horometro_inicial: eq.horometro_inicial ? String(eq.horometro_inicial) : '0',
      intervalo_mantenimiento: eq.intervalo_mantenimiento ? String(eq.intervalo_mantenimiento) : '',
      fecha_proximo_mantenimiento: eq.fecha_proximo_mantenimiento || '',
      actividad: eq.actividad || '',
      frente: eq.frente || '',
      fecha_ingreso_obra: eq.fecha_ingreso_obra || ''
    })
    setShowEqModal(true)
  }

  const resetForm = () => {
    setEditingEquipment(null)
    setFormData({
      id_obra: '',
      tipo_unidad: 'maquinaria',
      tipo: '',
      marca: '',
      modelo: '',
      anio: '',
      color: '',
      num_economico: '',
      serie: '',
      placa: '',
      horometro: '0',
      horometro_inicial: '0',
      intervalo_mantenimiento: '',
      fecha_proximo_mantenimiento: '',
      actividad: '',
      frente: '',
      fecha_ingreso_obra: format(new Date(), 'yyyy-MM-dd')
    })
    setImageFile(null)
  }

  // --- CRUD OBRAS INLINE ---
  const handleSaveObra = async (e) => {
    e.preventDefault()
    if (!obraFormData.nombre_obra.trim()) return

    try {
      const res = await fetch('/api/catalogos/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obraFormData)
      })
      const json = await res.json()

      if (json.success) {
        Toast.fire({
          icon: 'success',
          title: 'Obra registrada con éxito'
        })
        setObraFormData({ nombre_obra: '', ubicacion: '', descripcion: '' })
        setShowObraModal(false)
        fetchObras()
      } else {
        Swal.fire('Error', json.error, 'error')
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo guardar la obra.', 'error')
    }
  }

  // --- HISTORIAL DE MANTENIMIENTO ---
  const openMttoHistory = async (eq) => {
    setSelectedEquipment(eq)
    setMaintenanceHistory([])
    setEditingMtto(null)
    setMttoFormData({
      tipo_mantenimiento: 'Preventivo',
      fecha_mantenimiento: format(new Date(), 'yyyy-MM-dd'),
      horometro_mantenimiento: '',
      observaciones: '',
      realizado_por: ''
    })
    setShowMttoModal(true)

    try {
      const res = await fetch(`/api/maquinaria/mantenimiento?id_maquinaria=${eq.id_maquinaria}`)
      const json = await res.json()
      if (json.success) {
        setMaintenanceHistory(json.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveMtto = async (e) => {
    e.preventDefault()
    if (!selectedEquipment) return

    setSaving(true)
    const payload = {
      ...mttoFormData,
      id_maquinaria: selectedEquipment.id_maquinaria
    }

    try {
      if (editingMtto) {
        payload.id_mantenimiento = editingMtto.id_mantenimiento
      }

      const method = editingMtto ? 'PUT' : 'POST'
      const res = await fetch('/api/maquinaria/mantenimiento', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()

      if (json.success) {
        Toast.fire({
          icon: 'success',
          title: editingMtto ? 'Servicio actualizado' : 'Servicio registrado correctamente'
        })
        setEditingMtto(null)
        setMttoFormData({
          tipo_mantenimiento: 'Preventivo',
          fecha_mantenimiento: format(new Date(), 'yyyy-MM-dd'),
          horometro_mantenimiento: '',
          observaciones: '',
          realizado_por: ''
        })
        // Recargar historial del equipo seleccionado
        openMttoHistory(selectedEquipment)
        // Recargar listado principal
        fetchEquipments()
      } else {
        Swal.fire('Error', json.error, 'error')
      }
    } catch (err) {
      Swal.fire('Error', 'Error al conectar con la API de mantenimiento.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrepEditMtto = (m) => {
    setEditingMtto(m)
    setMttoFormData({
      tipo_mantenimiento: m.tipo_mantenimiento,
      fecha_mantenimiento: m.fecha_mantenimiento,
      horometro_mantenimiento: m.horometro_mantenimiento || '',
      observaciones: m.observaciones || '',
      realizado_por: m.realizado_por || ''
    })
  }

  const handleDeleteMtto = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar Servicio?',
      text: 'Esta acción eliminará el registro de mantenimiento permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/maquinaria/mantenimiento?id=${id}`, { method: 'DELETE' })
        const json = await res.json()
        if (json.success) {
          Toast.fire({
            icon: 'success',
            title: 'Servicio eliminado'
          })
          openMttoHistory(selectedEquipment)
          fetchEquipments()
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar el servicio.', 'error')
      }
    }
  }

  // --- HISTORIAL DE HORÓMETROS ---
  const openHorometroHistory = async (eq) => {
    setSelectedEquipment(eq)
    setHorometroHistory([])
    setHorometroFormData({
      periodo: `${filterYear}-${filterMonth}`,
      horometro_final: '',
      fecha_proximo_mantenimiento: ''
    })
    setShowHorometroModal(true)

    try {
      const res = await fetch(`/api/maquinaria/horometros?id_maquinaria=${eq.id_maquinaria}`)
      const json = await res.json()
      if (json.success) {
        setHorometroHistory(json.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveHorometro = async (e) => {
    e.preventDefault()
    if (!selectedEquipment) return

    setSaving(true)
    const payload = {
      id_maquinaria: selectedEquipment.id_maquinaria,
      registros: [horometroFormData]
    }

    try {
      const res = await fetch('/api/maquinaria/horometros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()

      if (json.success) {
        Toast.fire({
          icon: 'success',
          title: 'Historial de horómetro actualizado'
        })
        openHorometroHistory(selectedEquipment)
        fetchEquipments()
      } else {
        Swal.fire('Error', json.error, 'error')
      }
    } catch (err) {
      Swal.fire('Error', 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // --- EXPORTACIONES ---
  const handleExportUtilizacion = () => {
    window.open(`/api/maquinaria/exportar-utilizacion?mes=${filterMonth}&anio=${filterYear}&tipo_unidad=${filterTipo}`, '_blank')
  }

  const handleExportBitacora = (idMaquinaria, idMantenimiento = '') => {
    let url = `/api/maquinaria/exportar-bitacora?id_maquinaria=${idMaquinaria}`
    if (idMantenimiento) url += `&id_mantenimiento=${idMantenimiento}`
    window.open(url, '_blank')
  }

  // --- ESTADÍSTICAS ---
  const stats = useMemo(() => {
    const total = equipments.filter(eq => eq.activo).length
    const vencidos = equipments.filter(eq => eq.activo && eq.estado_mantenimiento === 'Vencido').length
    const proximos = equipments.filter(eq => eq.activo && eq.estado_mantenimiento === 'Próximo').length
    return { total, vencidos, proximos }
  }, [equipments])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-36">
      
      {/* ── HEADER BENTO ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-gradient-to-br from-[#145184] to-blue-900 rounded-lg p-8 border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                 <Tractor className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight font-mono">Control de Maquinaria</h1>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mt-1">
                  Ecosistema {userProfile?.cat_empresas?.nombre_comercial}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
               <button onClick={handleExportUtilizacion} className="p-2.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/40 transition-all cursor-pointer" title="Exportar Programa de Utilización">
                  <FileSpreadsheet className="w-5 h-5" />
               </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-center items-center text-center group hover:border-accent/40 transition-all">
          <span className="text-4xl font-black text-primary dark:text-white tabular-nums">{stats.total}</span>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2">Equipos Activos</span>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-center items-center text-center group hover:border-red-500/40 transition-all">
          <span className="text-4xl font-black text-red-500 tabular-nums animate-pulse">{stats.vencidos}</span>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 italic text-red-500/80">Servicios Vencidos</span>
        </div>
      </div>

      {/* ── CONTROLES Y FILTROS ── */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Búsqueda Rápida</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input 
                type="text" 
                placeholder="Marca, Económico, Serie, Placa..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tipo de Unidad</label>
            <select 
              value={filterTipo}
              onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
              className="w-full pl-3 pr-8 py-2.5 bg-muted/50 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all cursor-pointer"
            >
              <option value="all">TODOS</option>
              <option value="maquinaria">MAQUINARIA PESADA</option>
              <option value="vehiculo">VEHÍCULOS</option>
              <option value="equipo">EQUIPO MENOR</option>
              <option value="herramienta">HERRAMIENTAS</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Obra / Proyecto</label>
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border h-[42px]">
              <select 
                value={filterObra}
                onChange={(e) => { setFilterObra(e.target.value); setCurrentPage(1); }}
                className="flex-1 pl-3 pr-8 py-2 bg-transparent border-none text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer truncate"
              >
                <option value="all">TODAS</option>
                {obras.map(o => (
                  <option key={o.id_obra} value={o.id_obra}>{o.nombre_obra}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowObraModal(true)}
                className="px-2 text-accent hover:scale-110 transition-transform cursor-pointer"
                title="Nueva Obra"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Mes</label>
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full py-2.5 px-2 bg-muted/50 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Año</label>
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full py-2.5 px-2 bg-muted/50 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => String(currentYear - i)).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={() => { resetForm(); setShowEqModal(true); }}
            className="h-[42px] flex items-center justify-center gap-3 px-6 bg-accent text-primary rounded-md font-black text-[10px] uppercase tracking-[0.1em] shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Ficha</span>
          </button>

        </div>

        {/* Filtros secundarios */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50 items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estado Mantenimiento:</span>
            <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-md border border-border">
              <button 
                onClick={() => setFilterMtto('all')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${filterMtto === 'all' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterMtto('vencido')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${filterMtto === 'vencido' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                Vencidos
              </button>
              <button 
                onClick={() => setFilterMtto('mes')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${filterMtto === 'mes' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                Toca este Mes
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estatus:</span>
            <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-md border border-border">
              <button 
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${filterStatus === 'active' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                Activos
              </button>
              <button 
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${filterStatus === 'inactive' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                Bajas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLA PRINCIPAL ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Foto</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Equipo</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Identificación</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Obra / Proyecto</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Horómetro/Km</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Mantenimiento</th>
                <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8"><div className="h-4 bg-muted rounded w-full" /></td>
                  </tr>
                ))
              ) : paginatedEquipments.length > 0 ? (
                paginatedEquipments.map((eq) => (
                  <tr key={eq.id_maquinaria} className={`group transition-all hover:bg-primary/[0.02] ${!eq.activo ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <td className="px-6 py-4">
                      {eq.imagen_url ? (
                        <img 
                          src={eq.imagen_url} 
                          alt={eq.tipo} 
                          className="w-14 h-14 object-cover rounded-lg border border-border bg-muted shadow-sm hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/40 border border-border">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black tracking-tight text-foreground uppercase">{eq.tipo}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{eq.marca} / {eq.modelo || 'S/N'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black py-0.5 px-1.5 rounded bg-muted text-muted-foreground uppercase">Econ</span>
                           <span className="text-[10px] font-bold">{eq.num_economico || 'S/N'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black py-0.5 px-1.5 rounded bg-muted text-muted-foreground uppercase">Serie</span>
                           <span className="text-[10px] font-bold tracking-tight">{eq.serie || 'S/N'}</span>
                        </div>
                        {eq.placa && (
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black py-0.5 px-1.5 rounded bg-muted text-muted-foreground uppercase">Placa</span>
                             <span className="text-[10px] font-bold">{eq.placa}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black text-primary/80 dark:text-accent/80 uppercase tracking-tight">
                        {eq.nombre_obra || 'SIN ASIGNAR'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black tabular-nums">
                          {eq.horometro_actual !== null ? Number(eq.horometro_actual).toFixed(1) : '0.0'} 
                          <span className="text-[9px] text-muted-foreground ml-1">{eq.tipo_unidad === 'vehiculo' ? 'KM' : 'HRS'}</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Inicial: {eq.horometro_inicial || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        {eq.estado_mantenimiento !== 'N/A' && (
                          <span className={`px-2 py-0.5 inline-flex self-start text-[9px] font-black rounded border ${
                            eq.estado_mantenimiento === 'Vencido' 
                              ? 'bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400 animate-pulse'
                              : eq.estado_mantenimiento === 'Próximo'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                              : 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                          }`}>
                            {eq.estado_mantenimiento === 'Vencido' 
                              ? `VENCIDO (Restan ${Math.abs(eq.horas_restantes).toFixed(1)} ${eq.tipo_unidad === 'vehiculo' ? 'KM' : 'HRS'})`
                              : `FALTAN ${Number(eq.horas_restantes).toFixed(1)} ${eq.tipo_unidad === 'vehiculo' ? 'KM' : 'HRS'}`
                            }
                          </span>
                        )}
                        {eq.fecha_proximo_mantenimiento && (
                          <span className="text-[9px] font-bold text-muted-foreground">
                            Próximo: {format(new Date(eq.fecha_proximo_mantenimiento), 'dd MMM yyyy', { locale: es })}
                          </span>
                        )}
                        {!eq.fecha_proximo_mantenimiento && eq.estado_mantenimiento === 'N/A' && (
                          <span className="text-[9px] text-muted-foreground italic">Sin programación</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(eq)}
                          className="p-2 rounded-md hover:bg-primary/10 text-primary dark:text-accent transition-all cursor-pointer"
                          title="Editar Datos"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openMttoHistory(eq)}
                          className="p-2 rounded-md hover:bg-blue-500/10 text-blue-500 transition-all cursor-pointer"
                          title="Historial de Mantenimiento"
                        >
                          <Wrench className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openHorometroHistory(eq)}
                          className="p-2 rounded-md hover:bg-amber-500/10 text-amber-500 transition-all cursor-pointer"
                          title="Historial de Horómetros"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        {eq.activo ? (
                          <button 
                            onClick={() => { setBajaData({ id: eq.id_maquinaria, date: format(new Date(), 'yyyy-MM-dd') }); setShowBajaModal(true); }}
                            className="p-2 rounded-md hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                            title="Dar de Baja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReactivateEquipment(eq.id_maquinaria)}
                            className="p-2 rounded-md hover:bg-green-500/10 text-green-500 transition-all cursor-pointer"
                            title="Reactivar Equipo"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-muted-foreground italic">
                    No se encontraron registros de maquinaria/equipo en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-muted/10 border-t border-border px-6 py-4 flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded bg-muted border border-border disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded bg-muted border border-border disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: ALTA/EDICIÓN EQUIPO ── */}
      {showEqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-primary dark:text-accent">
                <Tractor className="w-5 h-5" />
                <span>{editingEquipment ? 'Editar Ficha Técnica' : 'Registrar Nuevo Equipo'}</span>
              </h2>
              <button onClick={() => setShowEqModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tipo de Unidad */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Clasificación</label>
                  <select 
                    value={formData.tipo_unidad}
                    onChange={(e) => setFormData({ ...formData, tipo_unidad: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="maquinaria">MAQUINARIA PESADA</option>
                    <option value="vehiculo">VEHÍCULOS</option>
                    <option value="equipo">EQUIPO MENOR</option>
                    <option value="herramienta">HERRAMIENTAS</option>
                  </select>
                </div>

                {/* Tipo */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tipo de Equipo *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Retroexcavadora, Camioneta"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                {/* Marca */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Marca *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Caterpillar, Ford"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Modelo</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 416E, F-150"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Año */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Año</label>
                  <input 
                    type="number" 
                    placeholder="Ej. 2018"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Color */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Color</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Amarillo"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Número Económico */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Número Económico</label>
                  <input 
                    type="text" 
                    placeholder="Ej. RT-01"
                    value={formData.num_economico}
                    onChange={(e) => setFormData({ ...formData, num_economico: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Número de Serie */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Número de Serie</label>
                  <input 
                    type="text" 
                    placeholder="Número de Serie de chasis"
                    value={formData.serie}
                    onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Placa */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Placas</label>
                  <input 
                    type="text" 
                    placeholder="Ej. XX-1234-A"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Horómetro / Kilometraje Inicial */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                    {formData.tipo_unidad === 'vehiculo' ? 'Kilometraje Inicial' : 'Horómetro Inicial'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={formData.horometro_inicial}
                    onChange={(e) => setFormData({ ...formData, horometro_inicial: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Horómetro / Kilometraje Actual */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                    {formData.tipo_unidad === 'vehiculo' ? 'Kilometraje Actual' : 'Horómetro Actual'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={formData.horometro}
                    onChange={(e) => setFormData({ ...formData, horometro: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Intervalo Mantenimiento */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                    {formData.tipo_unidad === 'vehiculo' ? 'Intervalo Mtto (KM)' : 'Intervalo Mtto (HRS)'}
                  </label>
                  <input 
                    type="number" 
                    placeholder="Ej. 250"
                    value={formData.intervalo_mantenimiento}
                    onChange={(e) => setFormData({ ...formData, intervalo_mantenimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Obra / Proyecto */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Asignar a Obra</label>
                  <select 
                    value={formData.id_obra}
                    onChange={(e) => setFormData({ ...formData, id_obra: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="">SIN ASIGNAR</option>
                    {obras.map(o => (
                      <option key={o.id_obra} value={o.id_obra}>{o.nombre_obra}</option>
                    ))}
                  </select>
                </div>

                {/* Actividad */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Actividad Principal</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Movimiento de tierras"
                    value={formData.actividad}
                    onChange={(e) => setFormData({ ...formData, actividad: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Frente */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Frente de Trabajo</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Terracería A"
                    value={formData.frente}
                    onChange={(e) => setFormData({ ...formData, frente: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Fecha Ingreso */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Fecha Ingreso a Obra *</label>
                  <input 
                    type="date" 
                    value={formData.fecha_ingreso_obra}
                    onChange={(e) => setFormData({ ...formData, fecha_ingreso_obra: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                {/* Fecha Próximo Mantenimiento Programada */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Próximo Mtto Programado</label>
                  <input 
                    type="date" 
                    value={formData.fecha_proximo_mantenimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_proximo_mantenimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Upload Imagen */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Foto del Equipo</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-md text-[10px] font-black uppercase hover:bg-muted/30 transition-all cursor-pointer w-full text-center">
                      <ImageIcon className="w-4 h-4 text-accent" />
                      <span>{imageFile ? 'Reemplazar' : 'Seleccionar Foto'}</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {imageFile && (
                    <p className="text-[9px] text-accent font-bold truncate pl-1">{imageFile.name}</p>
                  )}
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button 
                  type="button"
                  onClick={() => setShowEqModal(false)}
                  className="px-6 py-2.5 rounded-lg border border-border text-[10px] font-black uppercase hover:bg-muted/30 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white dark:bg-accent dark:text-primary text-[10px] font-black uppercase shadow-lg hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingEquipment ? 'Guardar Cambios' : 'Registrar Equipo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BAJA DE EQUIPO ── */}
      {showBajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-red-500">
                <ShieldAlert className="w-5 h-5" />
                <span>Registrar Baja de Equipo</span>
              </h2>
              <button onClick={() => setShowBajaModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBajaSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Fecha de Baja *</label>
                <input 
                  type="date" 
                  value={bajaData.date}
                  onChange={(e) => setBajaData({ ...bajaData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowBajaModal(false)}
                  className="px-6 py-2.5 rounded-lg border border-border text-[10px] font-black uppercase hover:bg-muted/30 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase shadow-lg hover:scale-102 active:scale-98 transition-all cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Aplicar Baja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA OBRA INLINE ── */}
      {showObraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-primary dark:text-accent">
                <PlusCircle className="w-5 h-5" />
                <span>Agregar Obra / Proyecto</span>
              </h2>
              <button onClick={() => setShowObraModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveObra} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Nombre de la Obra *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Distribuidor Vial Poniente"
                  value={obraFormData.nombre_obra}
                  onChange={(e) => setObraFormData({ ...obraFormData, nombre_obra: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Ubicación</label>
                <input 
                  type="text" 
                  placeholder="Ej. Monterrey, N.L."
                  value={obraFormData.ubicacion}
                  onChange={(e) => setObraFormData({ ...obraFormData, ubicacion: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Descripción</label>
                <textarea 
                  placeholder="Detalles adicionales del proyecto..."
                  value={obraFormData.descripcion}
                  onChange={(e) => setObraFormData({ ...obraFormData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowObraModal(false)}
                  className="px-6 py-2.5 rounded-lg border border-border text-[10px] font-black uppercase hover:bg-muted/30 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-primary text-white dark:bg-accent dark:text-primary text-[10px] font-black uppercase shadow-lg hover:scale-102 active:scale-98 transition-all cursor-pointer"
                >
                  Guardar Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTORIAL DE MANTENIMIENTO ── */}
      {showMttoModal && selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-primary dark:text-accent">
                  <Wrench className="w-5 h-5" />
                  <span>Bitácora de Mantenimiento</span>
                </h2>
                <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                  {selectedEquipment.tipo} — {selectedEquipment.marca} {selectedEquipment.modelo} (Econ: {selectedEquipment.num_economico || 'S/N'})
                </span>
              </div>
              <button onClick={() => setShowMttoModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Formulario Registro Servicio */}
              <form onSubmit={handleSaveMtto} className="space-y-4 lg:col-span-1 border-r border-border/50 lg:pr-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary dark:text-accent">
                  {editingMtto ? 'Editar Registro de Servicio' : 'Registrar Nuevo Servicio'}
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tipo de Servicio *</label>
                  <select 
                    value={mttoFormData.tipo_mantenimiento}
                    onChange={(e) => setMttoFormData({ ...mttoFormData, tipo_mantenimiento: e.target.value })}
                    className="w-full pl-3 pr-8 py-2.5 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="Preventivo">PREVENTIVO</option>
                    <option value="Correctivo">CORRECTIVO</option>
                    <option value="Cambio de Aceite">CAMBIO DE ACEITE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Fecha del Servicio *</label>
                  <input 
                    type="date" 
                    value={mttoFormData.fecha_mantenimiento}
                    onChange={(e) => setMttoFormData({ ...mttoFormData, fecha_mantenimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                    {selectedEquipment.tipo_unidad === 'vehiculo' ? 'Kilometraje de Servicio *' : 'Horómetro de Servicio *'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ej. 250.5"
                    value={mttoFormData.horometro_mantenimiento}
                    onChange={(e) => setMttoFormData({ ...mttoFormData, horometro_mantenimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Realizado Por / Mecánico</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Taller Central, Juan Pérez"
                    value={mttoFormData.realizado_por}
                    onChange={(e) => setMttoFormData({ ...mttoFormData, realizado_por: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Observaciones</label>
                  <textarea 
                    placeholder="Describa el trabajo realizado..."
                    value={mttoFormData.observaciones}
                    onChange={(e) => setMttoFormData({ ...mttoFormData, observaciones: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all h-24 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  {editingMtto && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingMtto(null)
                        setMttoFormData({
                          tipo_mantenimiento: 'Preventivo',
                          fecha_mantenimiento: format(new Date(), 'yyyy-MM-dd'),
                          horometro_mantenimiento: '',
                          observaciones: '',
                          realizado_por: ''
                        })
                      }}
                      className="px-4 py-2 border border-border text-[9px] font-black uppercase rounded-md cursor-pointer hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white dark:bg-accent dark:text-primary text-[9px] font-black uppercase rounded-md shadow hover:scale-102 transition-all cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{editingMtto ? 'Actualizar' : 'Registrar'}</span>
                  </button>
                </div>
              </form>

              {/* Listado de Historial */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Historial de Servicios</h3>
                  <button 
                    onClick={() => handleExportBitacora(selectedEquipment.id_maquinaria)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all text-[9px] font-black uppercase cursor-pointer"
                    title="Exportar Bitácora Completa"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Descargar Todo</span>
                  </button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Folio</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Fecha</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Tipo</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Horómetro/Km</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Realizó</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {maintenanceHistory.length > 0 ? (
                          maintenanceHistory.map((m) => (
                            <tr key={m.id_mantenimiento} className="hover:bg-muted/10">
                              <td className="px-4 py-3 font-bold tabular-nums">
                                #{String(m.folio_mtto || '').padStart(5, '0')}
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                {format(new Date(m.fecha_mantenimiento), 'dd/MM/yyyy')}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                  m.tipo_mantenimiento === 'Preventivo'
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                    : m.tipo_mantenimiento === 'Correctivo'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                    : 'bg-green-500/10 border-green-500/20 text-green-500'
                                }`}>
                                  {m.tipo_mantenimiento}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold tabular-nums">
                                {m.horometro_mantenimiento !== null ? Number(m.horometro_mantenimiento).toFixed(1) : '-'}
                              </td>
                              <td className="px-4 py-3 truncate max-w-[120px]">
                                {m.realizado_por || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => handleExportBitacora(selectedEquipment.id_maquinaria, m.id_mantenimiento)}
                                    className="p-1 rounded hover:bg-green-500/10 text-green-500 cursor-pointer"
                                    title="Exportar Bitácora Individual"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handlePrepEditMtto(m)}
                                    className="p-1 rounded hover:bg-primary/10 text-primary dark:text-accent cursor-pointer"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMtto(m.id_mantenimiento)}
                                    className="p-1 rounded hover:bg-red-500/10 text-red-500 cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic text-xs">
                              No hay registros de servicio anteriores para este equipo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTORIAL DE HORÓMETROS ── */}
      {showHorometroModal && selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-primary dark:text-accent">
                  <Clock className="w-5 h-5" />
                  <span>Historial Mensual de Horómetros</span>
                </h2>
                <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                  {selectedEquipment.tipo} — {selectedEquipment.marca} {selectedEquipment.modelo} (Econ: {selectedEquipment.num_economico || 'S/N'})
                </span>
              </div>
              <button onClick={() => setShowHorometroModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Formulario Registro Período */}
              <form onSubmit={handleSaveHorometro} className="space-y-4 md:col-span-1 border-r border-border/50 md:pr-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary dark:text-accent">
                  Actualizar Período
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Período Mensual *</label>
                  <input 
                    type="month" 
                    value={horometroFormData.periodo}
                    onChange={(e) => setHorometroFormData({ ...horometroFormData, periodo: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                    {selectedEquipment.tipo_unidad === 'vehiculo' ? 'Kilometraje Final *' : 'Horómetro Final *'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Lectura al cierre de mes"
                    value={horometroFormData.horometro_final}
                    onChange={(e) => setHorometroFormData({ ...horometroFormData, horometro_final: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Fecha Próximo Mantenimiento</label>
                  <input 
                    type="date" 
                    value={horometroFormData.fecha_proximo_mantenimiento}
                    onChange={(e) => setHorometroFormData({ ...horometroFormData, fecha_proximo_mantenimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white dark:bg-accent dark:text-primary text-[9px] font-black uppercase rounded-md shadow hover:scale-102 transition-all w-full cursor-pointer"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Guardar Registro</span>
                </button>
              </form>

              {/* Tabla de Historial */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Histórico Mensual</h3>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Período</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Lectura Final</th>
                          <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase">Fecha Próximo Mtto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {horometroHistory.length > 0 ? (
                          horometroHistory.map((h) => (
                            <tr key={h.id} className="hover:bg-muted/10">
                              <td className="px-4 py-3 font-bold tabular-nums">{h.periodo}</td>
                              <td className="px-4 py-3 font-bold tabular-nums">
                                {Number(h.horometro_final).toFixed(1)} {selectedEquipment.tipo_unidad === 'vehiculo' ? 'KM' : 'HRS'}
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                {h.fecha_proximo_mantenimiento 
                                  ? format(new Date(h.fecha_proximo_mantenimiento), 'dd/MM/yyyy') 
                                  : '-'
                                }
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic text-xs">
                              No hay lecturas registradas para este equipo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
