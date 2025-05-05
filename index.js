const csvUrl = "https://raw.githubusercontent.com/rudyluis/DashboardJS/refs/heads/main/global_cancer.csv";
let allData = [];

$(async function() {
  const raw = await $.ajax({ url: csvUrl, dataType: 'text' });
  const parsed = Papa.parse(raw, { header: true, dynamicTyping: true });
  allData = parsed.data.filter(r => r.Patient_ID);

  initFilters();
  $('#filterRegion,#filterCancer,#filterYear,#filterGender,#filterAge,#filterCost')
    .on('change', updateDashboard);
  updateDashboard();
});

function initFilters() {
  const unique = (arr, key) =>
    [...new Set(arr.map(r => r[key]).filter(v => v != null))].sort();

  $('#filterRegion').append('<option value="">Todos</option>')
    .append(unique(allData, 'Country_Region').map(v => `<option>${v}</option>`));
  $('#filterCancer').append('<option value="">Todos</option>')
    .append(unique(allData, 'Cancer_Type').map(v => `<option>${v}</option>`));
  $('#filterYear').append('<option value="">Todos</option>')
    .append(unique(allData, 'Year').map(v => `<option>${v}</option>`));
  $('#filterGender').append('<option value="">Todos</option>')
    .append(unique(allData, 'Gender').map(v => `<option>${v}</option>`));
  $('#filterAge').append('<option value="">Todos</option>')
    .append(unique(allData, 'Age').map(v => `<option>${v}</option>`));
  $('#filterCost').append('<option value="">Todos</option>')
    .append(unique(allData, 'Treatment_Cost_USD').map(v => `<option>${v}</option>`));
}

function updateDashboard() {
  const filters = {
    reg: $('#filterRegion').val(),
    cancer: $('#filterCancer').val(),
    year: $('#filterYear').val(),
    gender: $('#filterGender').val(),
    age: $('#filterAge').val(),
    cost: $('#filterCost').val()
  };

  const data = allData.filter(r =>
    (!filters.reg    || r.Country_Region === filters.reg) &&
    (!filters.cancer || r.Cancer_Type === filters.cancer) &&
    (!filters.year   || r.Year === +filters.year) &&
    (!filters.gender || r.Gender === filters.gender) &&
    (!filters.age    || r.Age === +filters.age) &&
    (!filters.cost   || r.Treatment_Cost_USD === +filters.cost)
  );

  renderTable(data);
  renderCharts(data);
}

function renderTable(data) {
  $('#tablaDatos').DataTable()?.clear().destroy();
  const rows = data.map(r => [
    r.Patient_ID, r.Country_Region, r.Cancer_Type, r.Cancer_Stage,
    r.Age, r.Gender, r.Treatment_Cost_USD,
    r.Genetic_Risk, r.Air_Pollution, r.Alcohol_Use,
    r.Smoking, r.Obesity_Level, r.Target_Severity_Score,
    r.Survival_Years
  ]);

  $('#tablaDatos').DataTable({
    data: rows,
    columns: [
      { title: "🔢 ID" },
      { title: "🌍 Región" },
      { title: "🎗️ Cáncer" },
      { title: "🏷️ Etapa" },
      { title: "🎂 Edad" },
      { title: "🚻 Género" },
      { title: "💰 Costo", className: "text-end", render: d => d.toLocaleString() },
      { title: "🧬 Riesgo Genetico" },
      { title: "🌫️ Contaminación Atmosférica" },
      { title: "🍷 Uso de Alcohol" },
      { title: "🚬 Fumar" },
      { title: "⚖️ Nivel Obesidad" },
      { title: "🏥 Nivel de Severidad" },
      { title: "⏳ Supervivencia", className: "text-end", render: d => d.toFixed(1) }
    ],
    responsive: true,
    pageLength: 10,
    order: [[13, 'desc']]
  });
}

function renderCharts(data) {
  const ids = [
    'chartBarCasos','chartPieMortes','chartLineIncidence','chartAreaMortality',
    'chartRadar','chartPolar','chartHBar',
    'chartDoughnutGender','chartScatterCostSurv','chartStackedStageType'
  ];
  ids.forEach(id => Chart.getChart(id)?.destroy());

  const count = key => data.reduce((o,r)=>{ o[r[key]]=(o[r[key]]||0)+1; return o; }, {});
  const avg   = (k,v) => {
    const a = data.reduce((o,r)=>{ 
      if (!o[r[k]]) o[r[k]]={sum:0,c:0}; 
      o[r[k]].sum+=r[v]; o[r[k]].c++; return o; 
    }, {});
    const labels = Object.keys(a).sort();
    return { labels, vals: labels.map(l=>a[l].sum/a[l].c) };
  };

  const cRegion       = count('Country_Region'),
        cCancer       = count('Cancer_Type'),
        costYear      = avg('Year','Treatment_Cost_USD'),
        survYear      = avg('Year','Survival_Years'),
        factors       = ['Genetic_Risk','Smoking','Alcohol_Use','Obesity_Level']
                         .map(f=> data.map(r=>r[f]).filter(x=>x!=null).reduce((a,b)=>a+b,0)
                               / data.filter(r=>r[f]!=null).length),
        stAgg         = data.reduce((o,r)=>{ 
                         if (!o[r.Cancer_Stage]) o[r.Cancer_Stage]={sum:0,c:0};
                         o[r.Cancer_Stage].sum+=r.Target_Severity_Score; o[r.Cancer_Stage].c++; 
                         return o;
                       }, {}),
        stages        = Object.keys(stAgg),
        stageVals     = stages.map(s=>stAgg[s].sum/stAgg[s].c),
        costAgg       = data.reduce((o,r)=>{ 
                         if (!o[r.Cancer_Type]) o[r.Cancer_Type]={sum:0,c:0};
                         o[r.Cancer_Type].sum+=r.Treatment_Cost_USD; o[r.Cancer_Type].c++; 
                         return o;
                       }, {}),
        types         = Object.keys(costAgg),
        typeVals      = types.map(t=>costAgg[t].sum/costAgg[t].c);

  // 1. Bar Región
  new Chart($('#chartBarCasos')[0], {
    type:'bar',
    data:{ labels:Object.keys(cRegion), datasets:[{ label:'👥 Pacientes', data:Object.values(cRegion) }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 2. Pie Cáncer
  new Chart($('#chartPieMortes')[0], {
    type:'pie',
    data:{ labels:Object.keys(cCancer), datasets:[{ label:'🎗️ Casos', data:Object.values(cCancer) }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 3. Line Costo x Año
  new Chart($('#chartLineIncidence')[0], {
    type:'line',
    data:{ labels:costYear.labels, datasets:[{ label:'💵 Costo Año', data:costYear.vals, fill:false, tension:0.3 }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 4. Area Supervivencia
  new Chart($('#chartAreaMortality')[0], {
    type:'line',
    data:{ labels:survYear.labels, datasets:[{ label:'⏳ Supervivencia', data:survYear.vals, fill:true, tension:0.3 }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 5. Radar Riesgo
  new Chart($('#chartRadar')[0], {
    type:'radar',
    data:{ labels:['Genetic','Smoking','Alcohol','Obesity'], datasets:[{ label:'⚠️ Riesgo', data:factors, fill:true }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 6. Polar Etapa
  new Chart($('#chartPolar')[0], {
    type:'polarArea',
    data:{ labels:stages, datasets:[{ label:'🏷️ Etapa', data:stageVals }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 7. Horizontal Bar Costo Tipo
  new Chart($('#chartHBar')[0], {
    type:'bar',
    data:{ labels:types, datasets:[{ label:'💲 Costo Tipo', data:typeVals }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false }
  });

  // 8. Doughnut Género
  const cGender = count('Gender');
  new Chart($('#chartDoughnutGender')[0], {
    type:'doughnut',
    data:{ labels:Object.keys(cGender), datasets:[{ label:'🚻 Género', data:Object.values(cGender) }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // 9. Scatter Costo vs Supervivencia
  const scatterData = data.map(r=>({ x:r.Treatment_Cost_USD, y:r.Survival_Years }));
  new Chart($('#chartScatterCostSurv')[0], {
    type:'scatter',
    data:{ datasets:[{ label:'🔍 Costo vs Sup', data:scatterData, pointRadius:4 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{ x:{ title:{ display:true, text:'Costo' }}, y:{ title:{ display:true, text:'Supervivencia' }}}
    }
  });

  // 10. Stacked Etapa vs Tipo
  const stacked = types.map(()=>stages.map(()=>0));
  data.forEach(r=>{ stacked[types.indexOf(r.Cancer_Type)][stages.indexOf(r.Cancer_Stage)]++; });
  const ds = types.map((t,i)=>({ label:t, data:stacked[i], stack:'s' }));
  new Chart($('#chartStackedStageType')[0], {
    type:'bar',
    data:{ labels:stages, datasets:ds },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ x:{ stacked:true }, y:{ stacked:true }}}
  });
}

// Toggle theme
$('#toggleTheme').click(function(){
  const html = document.documentElement;
  const dark = html.getAttribute('data-bs-theme') === 'dark';
  html.setAttribute('data-bs-theme', dark ? 'light' : 'dark');
  $(this).text(dark ? '🌙' : '🌞');
});
