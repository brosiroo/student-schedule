const DAYS = [
  {id:"sun", name:"الأحد"}, {id:"mon", name:"الإثنين"}, {id:"tue", name:"الثلاثاء"},
  {id:"wed", name:"الأربعاء"}, {id:"thu", name:"الخميس"}
];
const COLORS = ["#5b45ff","#1479ff","#16b978","#f28b18","#e83f59","#11a9c2","#ed42b4","#e8c522"];
const KEY = "studentScheduleV1";
let courses = JSON.parse(localStorage.getItem(KEY) || "[]");
let selectedColor = COLORS[0];
let editingId = null;

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,"0");
const minutes = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const fmtTime = t => {
  let [h,m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return `${pad(h)}:${pad(m)} ${suffix}`;
};
const durationHours = c => (minutes(c.end)-minutes(c.start))/60;

function save(){ localStorage.setItem(KEY, JSON.stringify(courses)); }
function toast(msg){ const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }

function buildPickers(){
  $("dayPicker").innerHTML = DAYS.map(d => `<label class="day-chip"><input type="checkbox" value="${d.id}"><span>${d.name}</span></label>`).join("");
  $("colorPicker").innerHTML = COLORS.map((c,i)=>`<button type="button" class="color-dot ${i===0?"selected":""}" data-color="${c}" style="background:${c}"></button>`).join("");
  document.querySelectorAll(".color-dot").forEach(b=>b.onclick=()=>{selectedColor=b.dataset.color;document.querySelectorAll(".color-dot").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
}

function timeRange(){
  const starts = courses.map(c=>minutes(c.start)), ends=courses.map(c=>minutes(c.end));
  let min = Math.min(8*60, ...starts.filter(Number.isFinite));
  let max = Math.max(17*60, ...ends.filter(Number.isFinite));
  min = Math.floor(min/60)*60; max=Math.ceil(max/60)*60;
  return [min,max];
}
function timeStr(m){return `${pad(Math.floor(m/60))}:${pad(m%60)}`}

function renderSchedule(){
  const [min,max]=timeRange();
  const rows=[];
  for(let t=min;t<max;t+=60) rows.push(t);
  let html='<div class="schedule-grid">';
  html += `<div class="cell header-cell">الوقت</div>`;
  DAYS.forEach(d=>html+=`<div class="cell header-cell">${d.name}<span>يوم دراسي</span></div>`);
  rows.forEach(t=>{
    html += `<div class="cell time-cell">${timeStr(t)} - ${timeStr(t+60)}</div>`;
    DAYS.forEach(d=>html+=`<div class="cell slot" data-day="${d.id}" data-time="${t}"></div>`);
  });
  html += '</div>';
  $("schedule").innerHTML=html;

  courses.forEach(c=>{
    c.days.forEach(day=>{
      const cell=document.querySelector(`.slot[data-day="${day}"][data-time="${Math.floor(minutes(c.start)/60)*60}"]`);
      if(!cell) return;
      const start=minutes(c.start), end=minutes(c.end);
      const top=(start-Math.floor(start/60)*60)/60*61;
      const height=Math.max(51, (end-start)/60*61-10);
      const block=document.createElement("div");
      block.className="course-block"; block.style.background=c.color;
      block.style.top=`${top+5}px`; block.style.height=`${height}px`;
      block.innerHTML=`<strong>${escapeHtml(c.name)}</strong><small>${fmtTime(c.start)} - ${fmtTime(c.end)}</small>`;
      block.onclick=()=>editCourse(c.id);
      cell.appendChild(block);
    });
  });
}
function escapeHtml(s){return s.replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));}

function renderList(){
  $("courseCount").textContent=courses.length;
  $("emptyList").style.display=courses.length?"none":"block";
  $("courseList").innerHTML=courses.map(c=>`
    <div class="course-item">
      <div class="course-color" style="background:${c.color}"></div>
      <div class="course-info"><strong>${escapeHtml(c.name)}</strong><small>${c.days.map(id=>DAYS.find(d=>d.id===id).name).join("، ")} · ${fmtTime(c.start)} - ${fmtTime(c.end)}</small></div>
      <div class="item-actions"><button title="تعديل" onclick="editCourse('${c.id}')">✎</button><button title="حذف" onclick="deleteCourse('${c.id}')">⌫</button></div>
    </div>`).join("");
}
function conflicts(){
  const bad=[];
  courses.forEach(a=>courses.forEach(b=>{
    if(a.id>=b.id) return;
    if(!a.days.some(d=>b.days.includes(d))) return;
    if(minutes(a.start)<minutes(b.end)&&minutes(b.start)<minutes(a.end)) bad.push([a,b]);
  }));
  return bad;
}
function renderStats(){
  const hours=courses.reduce((s,c)=>s+durationHours(c)*c.days.length,0);
  const days=new Set(courses.flatMap(c=>c.days)).size;
  $("statSubjects").textContent=courses.length;
  $("statHours").textContent=Number.isInteger(hours)?hours:hours.toFixed(1);
  $("statDays").textContent=days;
  $("statFree").textContent=5-days;
  const bad=conflicts();
  $("statusCard").className="status-card"+(bad.length?" status-bad":"");
  $("statusCard").innerHTML=bad.length
    ? `<div class="status-icon">!</div><div><h3>يوجد ${bad.length} تعارض${bad.length>1?"ات":""}</h3><p>${bad.map(x=>`${escapeHtml(x[0].name)} ↔ ${escapeHtml(x[1].name)}`).join(" · ")}</p></div>`
    : `<div class="status-icon">✓</div><div><h3>لا توجد تعارضات في الجدول</h3><p>جميع المواد مرتبة بشكل مناسب.</p></div>`;
}
function render(){renderSchedule();renderList();renderStats();}

function resetForm(){
  editingId=null;$("courseId").value="";$("courseForm").reset();$("startTime").value="09:00";$("endTime").value="10:00";
  selectedColor=COLORS[0];document.querySelectorAll(".color-dot").forEach((x,i)=>x.classList.toggle("selected",i===0));
  document.querySelectorAll("#dayPicker input").forEach(x=>x.checked=false);
  $("cancelEdit").classList.add("hidden");$("saveBtn").textContent="حفظ المادة";$("formError").textContent="";
}
function editCourse(id){
  const c=courses.find(x=>x.id===id); if(!c)return;
  editingId=id;$("courseId").value=id;$("courseName").value=c.name;$("startTime").value=c.start;$("endTime").value=c.end;
  document.querySelectorAll("#dayPicker input").forEach(x=>x.checked=c.days.includes(x.value));
  selectedColor=c.color;document.querySelectorAll(".color-dot").forEach(x=>x.classList.toggle("selected",x.dataset.color===c.color));
  $("cancelEdit").classList.remove("hidden");$("saveBtn").textContent="تحديث المادة";$("formError").textContent="";
  window.scrollTo({top:0,behavior:"smooth"});
}
window.editCourse=editCourse;
window.deleteCourse=function(id){
  const c=courses.find(x=>x.id===id); if(!c)return;
  if(confirm(`حذف مادة "${c.name}"؟`)){courses=courses.filter(x=>x.id!==id);save();render();toast("تم حذف المادة");}
};

$("courseForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("courseName").value.trim(), start=$("startTime").value, end=$("endTime").value;
  const days=[...document.querySelectorAll("#dayPicker input:checked")].map(x=>x.value);
  if(!name||!start||!end){$("formError").textContent="يرجى تعبئة جميع الحقول.";return;}
  if(minutes(end)<=minutes(start)){$("formError").textContent="وقت النهاية يجب أن يكون بعد وقت البداية.";return;}
  if(!days.length){$("formError").textContent="اختر يوماً واحداً على الأقل.";return;}
  const item={id:editingId||crypto.randomUUID(),name,start,end,days,color:selectedColor};
  if(editingId) courses=courses.map(c=>c.id===editingId?item:c); else courses.push(item);
  save();render();toast(editingId?"تم تحديث المادة":"تمت إضافة المادة");resetForm();
});
$("cancelEdit").onclick=resetForm;
$("clearBtn").onclick=()=>{if(courses.length&&confirm("هل تريد حذف جميع المواد؟")){courses=[];save();render();toast("تم مسح الجدول");}};
$("themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("scheduleTheme",document.body.classList.contains("light")?"light":"dark");};
if(localStorage.getItem("scheduleTheme")==="light")document.body.classList.add("light");

$("printBtn").onclick=()=>window.print();
$("imageBtn").onclick=async()=>{
  if(!window.html2canvas){toast("تعذر تحميل أداة الصورة");return}
  const canvas=await html2canvas($("schedule"),{backgroundColor:"#071426",scale:2});
  const a=document.createElement("a");a.download="my-schedule.png";a.href=canvas.toDataURL("image/png");a.click();toast("تم تصدير الصورة");
};
$("pdfBtn").onclick=async()=>{
  if(!window.html2canvas||!window.jspdf){toast("تعذر تحميل أدوات PDF");return}
  const canvas=await html2canvas($("schedule"),{backgroundColor:"#071426",scale:2});
  const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:"landscape",unit:"px",format:[canvas.width,canvas.height]});
  pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,canvas.width,canvas.height);pdf.save("my-schedule.pdf");toast("تم تصدير PDF");
};
$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(courses,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="my-schedule.json";a.click();toast("تم تصدير الجدول");
};
$("importInput").onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!Array.isArray(data))throw Error();
      courses=data;save();render();toast("تم استيراد الجدول");
    }catch{toast("ملف غير صالح");}
    e.target.value="";
  };reader.readAsText(file);
};

buildPickers();render();resetForm();
