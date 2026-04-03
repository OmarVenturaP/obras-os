export default function DashboardPage() {
  const kpis = [
    { name: 'Asistencia Hoy', value: '124', change: '+12%', icon: '👥', color: 'blue' },
    { name: 'Informes HSE', value: '42', change: 'Pendientes', icon: '🛡️', color: 'orange' },
    { name: 'Incidentes', value: '0', change: 'Mes actual', icon: '⚠️', color: 'green' },
    { name: 'Subcotratistas', value: '8', change: 'Activos', icon: '🏢', color: 'teal' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.name} className="p-6 rounded-3xl bg-white border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors opacity-50`} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl bg-gray-50 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">{kpi.icon}</span>
              <span className={`text-xs font-extrabold px-2 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider`}>
                {kpi.change}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{kpi.name}</p>
              <h3 className="text-3xl font-bold tracking-tight text-primary mt-1">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity (Reports) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold tracking-tight text-primary">Últimos Informes HSE</h2>
            <button className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              Ver todos <span>→</span>
            </button>
          </div>
          
          <div className="bg-white border border-border rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Folio</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Supervisor</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Estatus</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-bold text-primary">#HSE-2024-{i}0{i}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">SV</div>
                        <span className="text-sm">Supervisor {i}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
                        Aprobado
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">0{i} Abr, 2024</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Center */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">Accesos Rápidos</h2>
          <div className="space-y-3">
            <button className="w-full p-4 rounded-2xl bg-primary text-white font-bold flex items-center justify-between hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <span>Nuevo Informe HSE</span>
              <span className="text-xl">🛡️</span>
            </button>
            <button className="w-full p-4 rounded-2xl bg-accent text-primary font-bold flex items-center justify-between hover:shadow-xl hover:shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all border border-accent/20">
              <span>Generar QR Asistencia</span>
              <span className="text-xl">📍</span>
            </button>
            <button className="w-full p-4 rounded-2xl bg-white border border-border text-primary font-bold flex items-center justify-between hover:bg-gray-50/80 transition-all">
              <span>Descargar PDF Corte</span>
              <span className="text-xl">📄</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
