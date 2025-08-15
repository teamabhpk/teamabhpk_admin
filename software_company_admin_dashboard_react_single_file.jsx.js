import React, { useEffect, useMemo, useState } from "react";

// =============================
// Software Company Management – Single-file React App
// Tailwind CSS styling. No external libs required.
// Features (frontend prototype, localStorage persistence):
// - Team Management (CRUD, roles, skills, status, salary)
// - Tasks (CRUD, assign to members, priority, status, due dates)
// - Projects (CRUD)
// - Payroll (run payroll, bonuses, deductions, mark paid, export CSV)
// - Messaging (bulk WhatsApp & Email via wa.me & mailto templates)
// - Attendance (daily check-in/out, total hours)
// - Leaves (request/approve)
// - Reports (KPIs + CSV exports)
// - Settings (company info, message templates)
// =============================

// ---------- Helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const formatCurrency = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n || 0));
const classNames = (...a) => a.filter(Boolean).join(" ");

const STORAGE_KEY = "scm_dashboard_state_v1";

const seedData = () => ({
  company: {
    name: "Team ABH PK Software",
    email: "info@teamabhpk.me",
    phone: "+92 300 0000000",
    address: "Lahore, Pakistan",
    whatsappTemplate: "Assalam o Alaikum {name},\n\nThis is a reminder about: {subject}\nDue date: {due}\nDetails: {details}\n\nRegards, {company}",
    emailTemplateSubject: "Update from {company}: {subject}",
    emailTemplateBody: "Hi {name},\n\n{details}\n\nThanks,\n{company}",
  },
  team: [
    { id: uid(), name: "Abdul Basit", role: "Founder / PM", email: "abdul@example.com", phone: "+923001234567", skills: ["Android", "Firebase", "UI/UX"], status: "Active", salary: 180000, joined: today() },
    { id: uid(), name: "Ayesha Khan", role: "Frontend Dev", email: "ayesha@example.com", phone: "+923021112223", skills: ["React", "Tailwind"], status: "Active", salary: 150000, joined: today() },
    { id: uid(), name: "Ali Raza", role: "Backend Dev", email: "ali@example.com", phone: "+923331234567", skills: ["Node", "Firestore"], status: "Active", salary: 165000, joined: today() },
  ],
  projects: [
    { id: uid(), name: "Grocery App", client: "GrozyMart", budget: 1200000, status: "In Progress", start: today(), due: "2025-09-15", managerId: null },
  ],
  tasks: [
    { id: uid(), title: "Design checkout flow", projectId: null, assigneeId: null, priority: "High", status: "Todo", due: "2025-08-25", estimateHrs: 8, description: "Improve UX and validation.", created: today() },
  ],
  attendance: {}, // {yyyy-mm-dd: { memberId: {in:"09:30", out:"17:30"}}}
  leaves: [], // {id, memberId, from,to, type, reason, status}
  payroll: { history: [] }, // {month:"2025-08", items:[{memberId, base, bonus, deduct, net, paid:false, paidAt:null}]}
});

function usePersistedState() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : seedData();
    } catch (e) {
      return seedData();
    }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  return [state, setState];
}

// ---------- Generic UI ----------
function Modal({ open, onClose, title, children, wide=false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={classNames("bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-auto", wide?"max-w-5xl":"max-w-2xl")} onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone="gray" }) {
  const map = { gray: "bg-gray-100 text-gray-700", green:"bg-green-100 text-green-700", red:"bg-red-100 text-red-700", blue:"bg-blue-100 text-blue-700", amber:"bg-amber-100 text-amber-700", purple:"bg-purple-100 text-purple-700" };
  return <span className={classNames("px-2 py-0.5 rounded-full text-xs", map[tone] || map.gray)}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input(props){return <input {...props} className={classNames("w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring", props.className)} />}
function Textarea(props){return <textarea {...props} className={classNames("w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring", props.className)} />}
function Select(props){return <select {...props} className={classNames("w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring", props.className)} />}
function Btn({children, className, ...rest}){return <button {...rest} className={classNames("px-3 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-black disabled:opacity-50", className)}>{children}</button>}

// ---------- Sections ----------
function TeamSection({ state, setState }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(()=> state.team.filter(m => [m.name, m.role, m.email, m.phone, ...(m.skills||[])].join(" ").toLowerCase().includes(q.toLowerCase())), [state.team, q]);

  const upsert = (m) => {
    setState(s => ({...s, team: s.team.some(x=>x.id===m.id) ? s.team.map(x=>x.id===m.id?m:x) : [m, ...s.team]}));
  };
  const remove = (id) => setState(s => ({...s, team: s.team.filter(m=>m.id!==id)}));

  const startEdit = (m=null) => { setEditing(m || { id: uid(), name:"", role:"", email:"", phone:"", skills:[], status:"Active", salary:0, joined:today() }); setModalOpen(true); };

  const WhatsAppLink = (m, text) => `https://wa.me/${m.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(text)}`;
  const MailtoLink = (m, subject, body) => `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const { company } = state;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Input placeholder="Search team..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <Btn onClick={()=>startEdit(null)}>+ Add Member</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{m.name}</div>
                <div className="text-sm text-gray-600">{m.role}</div>
                <div className="mt-1 flex flex-wrap gap-1">{(m.skills||[]).map(s => <Pill key={s} tone="blue">{s}</Pill>)}</div>
              </div>
              <Pill tone={m.status==="Active"?"green":"amber"}>{m.status}</Pill>
            </div>
            <div className="text-sm text-gray-600 mt-3 space-y-1">
              <div>📧 {m.email}</div>
              <div>📱 {m.phone}</div>
              <div>💼 Salary: <b>{formatCurrency(m.salary)}</b></div>
              <div>📅 Joined: {m.joined}</div>
            </div>
            <div className="flex gap-2 mt-4">
              <a className="px-3 py-2 rounded-xl bg-green-600 text-white" href={WhatsAppLink(m, templateFill(state.company.whatsappTemplate, {name:m.name, subject:"Update", due:today(), details:"Hello from dashboard", company:state.company.name}))} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="px-3 py-2 rounded-xl bg-blue-600 text-white" href={MailtoLink(m, templateFill(company.emailTemplateSubject, {company:company.name, subject:"Update"}), templateFill(company.emailTemplateBody, {company:company.name, name:m.name, details:"Hello from dashboard"}))}>Email</a>
              <Btn className="bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={()=>{setEditing(m); setModalOpen(true);}}>Edit</Btn>
              <Btn className="bg-red-600 hover:bg-red-700" onClick={()=>remove(m.id)}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?.id?"Save Member":"Add Member"}>
        {editing && (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=>{e.preventDefault(); upsert(editing); setModalOpen(false);}}>
            <Field label="Name"><Input value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})} required/></Field>
            <Field label="Role"><Input value={editing.role} onChange={e=>setEditing({...editing, role:e.target.value})} /></Field>
            <Field label="Email"><Input type="email" value={editing.email} onChange={e=>setEditing({...editing, email:e.target.value})} /></Field>
            <Field label="Phone (with country code)"><Input value={editing.phone} onChange={e=>setEditing({...editing, phone:e.target.value})} placeholder="+92300..."/></Field>
            <Field label="Salary"><Input type="number" value={editing.salary} onChange={e=>setEditing({...editing, salary:Number(e.target.value)})} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={e=>setEditing({...editing, status:e.target.value})}><option>Active</option><option>Inactive</option><option>Probation</option></Select></Field>
            <Field label="Skills (comma separated)"><Input value={(editing.skills||[]).join(', ')} onChange={e=>setEditing({...editing, skills:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} /></Field>
            <Field label="Joined"><Input type="date" value={editing.joined} onChange={e=>setEditing({...editing, joined:e.target.value})} /></Field>
            <div className="col-span-full flex justify-end gap-2">
              <Btn type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={()=>setModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function templateFill(tpl, map){
  return (tpl||"").replace(/\{(.*?)\}/g, (_,k)=> map[k] ?? "");
}

function TasksSection({ state, setState }){
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const list = useMemo(()=> state.tasks.filter(t => (filter==="All" || t.status===filter) && [t.title, t.description].join(" ").toLowerCase().includes(q.toLowerCase())), [state.tasks, filter, q]);

  const upsert = (t) => setState(s => ({...s, tasks: s.tasks.some(x=>x.id===t.id) ? s.tasks.map(x=>x.id===t.id?t:x) : [t, ...s.tasks]}));
  const remove = (id) => setState(s => ({...s, tasks: s.tasks.filter(t=>t.id!==id)}));

  const startEdit = (t=null) => setEditing(t || { id: uid(), title:"", projectId: null, assigneeId: null, priority:"Medium", status:"Todo", due: today(), estimateHrs: 4, description:"", created: today() });

  const membersById = Object.fromEntries(state.team.map(m=>[m.id, m]));
  const projectsById = Object.fromEntries(state.projects.map(p=>[p.id, p]));

  const lanes = ["Todo","In Progress","Blocked","Done"];

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
        <div className="flex gap-2">
          <Select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option>All</option>
            {lanes.map(l=> <option key={l}>{l}</option>)}
          </Select>
          <Input placeholder="Search tasks..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <Btn onClick={()=>{setModalOpen(true); startEdit(null);}}>+ New Task</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lanes.map(lane => (
          <div key={lane} className="bg-gray-50 rounded-2xl p-3 border">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{lane}</div>
              <Pill tone={lane==="Done"?"green":lane==="Blocked"?"red":"blue"}>{state.tasks.filter(t=>t.status===lane).length}</Pill>
            </div>
            <div className="space-y-3">
              {list.filter(t=>t.status===lane || filter!=='All').filter(t=> filter==='All' ? t.status===lane : true ).map(t => (
                <div key={t.id} className="bg-white rounded-xl border shadow-sm p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t.title}</div>
                    <Pill tone={t.priority==="High"?"red":t.priority==="Low"?"green":"amber"}>{t.priority}</Pill>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{t.description}</div>
                  <div className="text-xs text-gray-500 mt-1">Due: {t.due} • Est: {t.estimateHrs}h</div>
                  <div className="text-xs text-gray-600 mt-1">{t.projectId?`📦 ${projectsById[t.projectId]?.name}`:""} {t.assigneeId?` • 👤 ${membersById[t.assigneeId]?.name}`:""}</div>
                  <div className="flex gap-2 mt-2">
                    <Btn className="bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={()=>{setEditing(t); setModalOpen(true);}}>Edit</Btn>
                    <Btn className="bg-red-600 hover:bg-red-700" onClick={()=>remove(t.id)}>Delete</Btn>
                    {t.status!=="Done" && <Btn className="bg-green-600 hover:bg-green-700" onClick={()=>upsert({...t, status:"Done"})}>Mark Done</Btn>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?.id?"Save Task":"New Task"}>
        {editing && (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=>{e.preventDefault(); upsert(editing); setModalOpen(false);}}>
            <Field label="Title"><Input value={editing.title} onChange={e=>setEditing({...editing, title:e.target.value})} required/></Field>
            <Field label="Project"><Select value={editing.projectId||""} onChange={e=>setEditing({...editing, projectId:e.target.value||null})}><option value="">-- None --</option>{state.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Assignee"><Select value={editing.assigneeId||""} onChange={e=>setEditing({...editing, assigneeId:e.target.value||null})}><option value="">-- Unassigned --</option>{state.team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
            <Field label="Priority"><Select value={editing.priority} onChange={e=>setEditing({...editing, priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></Select></Field>
            <Field label="Status"><Select value={editing.status} onChange={e=>setEditing({...editing, status:e.target.value})}><option>Todo</option><option>In Progress</option><option>Blocked</option><option>Done</option></Select></Field>
            <Field label="Due Date"><Input type="date" value={editing.due} onChange={e=>setEditing({...editing, due:e.target.value})} /></Field>
            <Field label="Estimate (hours)"><Input type="number" value={editing.estimateHrs} onChange={e=>setEditing({...editing, estimateHrs:Number(e.target.value)})} /></Field>
            <Field label="Description" ><Textarea rows={4} value={editing.description} onChange={e=>setEditing({...editing, description:e.target.value})} /></Field>
            <div className="col-span-full flex justify-end gap-2">
              <Btn type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={()=>setModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function ProjectsSection({ state, setState }){
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const upsert = (p) => setState(s => ({...s, projects: s.projects.some(x=>x.id===p.id) ? s.projects.map(x=>x.id===p.id?p:x) : [p, ...s.projects]}));
  const remove = (id) => setState(s => ({...s, projects: s.projects.filter(p=>p.id!==id)}));

  const startEdit = (p=null) => setEditing(p || { id: uid(), name:"", client:"", budget:0, status:"Planned", start: today(), due: today(), managerId: null });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">Total: {state.projects.length}</div>
        <Btn onClick={()=>{setModalOpen(true); startEdit(null);}}>+ New Project</Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.projects.map(p => (
          <div key={p.id} className="bg-white rounded-2xl shadow p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="text-sm text-gray-600">Client: {p.client}</div>
              </div>
              <Pill tone={p.status==="In Progress"?"blue":p.status==="Completed"?"green":"amber"}>{p.status}</Pill>
            </div>
            <div className="text-sm text-gray-600 mt-2">Budget: <b>{formatCurrency(p.budget)}</b></div>
            <div className="text-xs text-gray-500">{p.start} → {p.due}</div>
            <div className="flex gap-2 mt-3">
              <Btn className="bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={()=>{setEditing(p); setModalOpen(true);}}>Edit</Btn>
              <Btn className="bg-red-600 hover:bg-red-700" onClick={()=>remove(p.id)}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?.id?"Save Project":"New Project"}>
        {editing && (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=>{e.preventDefault(); upsert(editing); setModalOpen(false);}}>
            <Field label="Name"><Input value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})} required/></Field>
            <Field label="Client"><Input value={editing.client} onChange={e=>setEditing({...editing, client:e.target.value})} /></Field>
            <Field label="Budget"><Input type="number" value={editing.budget} onChange={e=>setEditing({...editing, budget:Number(e.target.value)})} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={e=>setEditing({...editing, status:e.target.value})}><option>Planned</option><option>In Progress</option><option>On Hold</option><option>Completed</option></Select></Field>
            <Field label="Start"><Input type="date" value={editing.start} onChange={e=>setEditing({...editing, start:e.target.value})} /></Field>
            <Field label="Due"><Input type="date" value={editing.due} onChange={e=>setEditing({...editing, due:e.target.value})} /></Field>
            <Field label="Manager"><Select value={editing.managerId||""} onChange={e=>setEditing({...editing, managerId:e.target.value||null})}><option value="">-- None --</option>{state.team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
            <div className="col-span-full flex justify-end gap-2">
              <Btn type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={()=>setModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function PayrollSection({ state, setState }){
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7));

  const currentRun = useMemo(()=> {
    const run = state.payroll.history.find(h=>h.month===month);
    if (!run) return null;
    const membersById = Object.fromEntries(state.team.map(m=>[m.id,m]));
    return run.items.map(it => ({...it, member: membersById[it.memberId]}));
  }, [state.payroll.history, month, state.team]);

  const runPayroll = () => {
    const exist = state.payroll.history.find(h=>h.month===month);
    if (exist) return;
    const items = state.team.map(m => ({ memberId: m.id, base: Number(m.salary||0), bonus: 0, deduct: 0, net: Number(m.salary||0), paid:false, paidAt:null }));
    setState(s => ({...s, payroll: { ...s.payroll, history: [{month, items}, ...s.payroll.history] }}));
  };

  const updateItem = (idx, patch) => {
    setState(s => ({...s, payroll: { ...s.payroll, history: s.payroll.history.map(h => h.month!==month ? h : ({...h, items: h.items.map((it,i)=> i!==idx?it: recompute({ ...it, ...patch }))})) }}));
  };

  const markPaid = (idx) => updateItem(idx, { paid:true, paidAt: new Date().toISOString() });

  const exportCSV = () => {
    const run = state.payroll.history.find(h=>h.month===month);
    if (!run) return;
    const lines = ["Name,Base,Bonus,Deduct,Net,Paid"].concat(run.items.map(it => {
      const member = state.team.find(m=>m.id===it.memberId);
      return [member?.name, it.base, it.bonus, it.deduct, it.net, it.paid?"Yes":"No"].join(",");
    }));
    downloadFile(`payroll_${month}.csv`, lines.join("\n"));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Field label="Month"><Input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></Field>
          {!currentRun && <Btn onClick={runPayroll}>Run Payroll</Btn>}
          {currentRun && <Btn className="bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={exportCSV}>Export CSV</Btn>}
        </div>
        <div className="text-sm text-gray-600">{currentRun?`Employees: ${currentRun.length}`:"No run for this month yet."}</div>
      </div>

      {currentRun && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl overflow-hidden border">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Base</th>
                <th className="p-3">Bonus</th>
                <th className="p-3">Deduct</th>
                <th className="p-3">Net</th>
                <th className="p-3">Paid</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRun.map((it, idx) => (
                <tr key={it.memberId} className="border-t">
                  <td className="p-3">{it.member?.name}</td>
                  <td className="p-3">{formatCurrency(it.base)}</td>
                  <td className="p-3"><Input type="number" value={it.bonus} onChange={e=>updateItem(idx, { bonus:Number(e.target.value) })} /></td>
                  <td className="p-3"><Input type="number" value={it.deduct} onChange={e=>updateItem(idx, { deduct:Number(e.target.value) })} /></td>
                  <td className="p-3 font-semibold">{formatCurrency(it.net)}</td>
                  <td className="p-3">{it.paid? <Pill tone="green">Paid</Pill>: <Pill tone="amber">Unpaid</Pill>}</td>
                  <td className="p-3 flex gap-2">
                    {!it.paid && <Btn className="bg-green-600 hover:bg-green-700" onClick={()=>markPaid(idx)}>Mark Paid</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function recompute(it){
  const net = Number(it.base||0) + Number(it.bonus||0) - Number(it.deduct||0);
  return {...it, net};
}

function MessagingSection({ state }){
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const toggle = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

  const sendWhatsApp = () => {
    const links = selectedIds.map(id => {
      const m = state.team.find(x=>x.id===id);
      const text = templateFill(state.company.whatsappTemplate, { name: m?.name||"Team", subject, due: today(), details, company: state.company.name });
      return `https://wa.me/${(m?.phone||"").replace(/[^0-9]/g,"")}?text=${encodeURIComponent(text)}`;
    });
    // open all links (may be blocked by popup blockers; open one by one)
    if (links[0]) window.open(links[0], "_blank");
    for(let i=1;i<links.length;i++) setTimeout(()=>window.open(links[i], "_blank"), i*500);
  };

  const sendEmail = () => {
    const m = state.team.find(x=>x.id===selectedIds[0]);
    const subjectStr = templateFill(state.company.emailTemplateSubject, { company: state.company.name, subject });
    const body = templateFill(state.company.emailTemplateBody, { company: state.company.name, name: m?.name||"Team", details });
    if (m) window.location.href = `mailto:${m.email}?subject=${encodeURIComponent(subjectStr)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-2xl p-4 shadow border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Subject"><Input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Sprint update"/></Field>
          <Field label="Details / Body"><Textarea rows={6} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Write message..."/></Field>
        </div>
        <div className="flex gap-2 mt-3">
          <Btn onClick={sendWhatsApp} disabled={!selectedIds.length}>Send WhatsApp</Btn>
          <Btn className="bg-blue-600 hover:bg-blue-700" onClick={sendEmail} disabled={!selectedIds.length}>Send Email</Btn>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow border">
        <div className="font-semibold mb-2">Select Recipients</div>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {state.team.map(m => (
            <label key={m.id} className="flex items-center gap-2 p-2 border rounded-xl">
              <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={()=>toggle(m.id)} />
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-gray-600">{m.role} • {m.email}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceSection({ state, setState }){
  const [date, setDate] = useState(today());

  const dayRec = state.attendance[date] || {};

  const setTime = (memberId, key, val) => {
    setState(s => ({...s, attendance: { ...s.attendance, [date]: { ...(s.attendance[date]||{}), [memberId]: { ...(s.attendance[date]?.[memberId]||{}), [key]: val }}}}));
  };

  const hours = (inT, outT) => {
    if(!inT || !outT) return 0;
    const [ih, im] = inT.split(":").map(Number); const [oh, om] = outT.split(":").map(Number);
    const ms = (oh*60+om - (ih*60+im))*60*1000; return Math.max(0, ms)/(1000*60*60);
  };

  const totalHours = Object.entries(dayRec).reduce((sum, [id, rec]) => sum + hours(rec.in, rec.out), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field>
        <div className="text-sm text-gray-600">Total Hours (all): {totalHours.toFixed(2)}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {state.team.map(m => {
          const rec = dayRec[m.id] || {};
          return (
            <div key={m.id} className="bg-white rounded-2xl border shadow p-4">
              <div className="font-medium mb-2">{m.name} <span className="text-xs text-gray-500">({m.role})</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Check-in"><Input type="time" value={rec.in||""} onChange={e=>setTime(m.id, 'in', e.target.value)} /></Field>
                <Field label="Check-out"><Input type="time" value={rec.out||""} onChange={e=>setTime(m.id, 'out', e.target.value)} /></Field>
              </div>
              <div className="text-sm text-gray-600 mt-2">Hours: <b>{hours(rec.in, rec.out).toFixed(2)}</b></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeavesSection({ state, setState }){
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const upsert = (l) => setState(s => ({...s, leaves: s.leaves.some(x=>x.id===l.id) ? s.leaves.map(x=>x.id===l.id?l:x) : [l, ...s.leaves]}));
  const remove = (id) => setState(s => ({...s, leaves: s.leaves.filter(l=>l.id!==id)}));

  const startEdit = (l=null) => setEditing(l || { id: uid(), memberId: state.team[0]?.id || null, from: today(), to: today(), type: "Annual", reason: "", status: "Pending" });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">Total: {state.leaves.length}</div>
        <Btn onClick={()=>{setModalOpen(true); startEdit(null);}}>+ New Leave</Btn>
      </div>
      <div className="overflow-x-auto bg-white rounded-2xl border shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Member</th>
              <th className="p-3">Type</th>
              <th className="p-3">Range</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.leaves.map(l => {
              const m = state.team.find(x=>x.id===l.memberId);
              return (
                <tr key={l.id} className="border-t">
                  <td className="p-3">{m?.name}</td>
                  <td className="p-3">{l.type}</td>
                  <td className="p-3">{l.from} → {l.to}</td>
                  <td className="p-3">{l.reason}</td>
                  <td className="p-3">{l.status}</td>
                  <td className="p-3 flex gap-2">
                    <Btn className="bg-green-600 hover:bg-green-700" onClick={()=>upsert({...l, status:"Approved"})}>Approve</Btn>
                    <Btn className="bg-red-600 hover:bg-red-700" onClick={()=>upsert({...l, status:"Rejected"})}>Reject</Btn>
                    <Btn className="bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={()=>{setEditing(l); setModalOpen(true);}}>Edit</Btn>
                    <Btn className="bg-red-600 hover:bg-red-700" onClick={()=>remove(l.id)}>Delete</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?.id?"Save Leave":"New Leave"}>
        {editing && (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=>{e.preventDefault(); upsert(editing); setModalOpen(false);}}>
            <Field label="Member"><Select value={editing.memberId||""} onChange={e=>setEditing({...editing, memberId:e.target.value})}>{state.team.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
            <Field label="Type"><Select value={editing.type} onChange={e=>setEditing({...editing, type:e.target.value})}><option>Annual</option><option>Sick</option><option>Casual</option></Select></Field>
            <Field label="From"><Input type="date" value={editing.from} onChange={e=>setEditing({...editing, from:e.target.value})} /></Field>
            <Field label="To"><Input type="date" value={editing.to} onChange={e=>setEditing({...editing, to:e.target.value})} /></Field>
            <Field label="Reason"><Textarea rows={3} value={editing.reason} onChange={e=>setEditing({...editing, reason:e.target.value})} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={e=>setEditing({...editing, status:e.target.value})}><option>Pending</option><option>Approved</option><option>Rejected</option></Select></Field>
            <div className="col-span-full flex justify-end gap-2">
              <Btn type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={()=>setModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function ReportsSection({ state }){
  const totals = useMemo(()=>{
    const members = state.team.length;
    const openTasks = state.tasks.filter(t=>t.status!=="Done").length;
    const doneTasks = state.tasks.filter(t=>t.status==="Done").length;
    const activeProjects = state.projects.filter(p=>p.status!=="Completed").length;
    const payrollThisMonth = (()=>{
      const month = new Date().toISOString().slice(0,7);
      const run = state.payroll.history.find(h=>h.month===month);
      if (!run) return {amount:0, paid:0};
      const amount = run.items.reduce((s,it)=>s+Number(it.net||0),0);
      const paid = run.items.filter(it=>it.paid).length;
      return { amount, paid, total: run.items.length };
    })();
    return {members, openTasks, doneTasks, activeProjects, payrollThisMonth};
  }, [state]);

  const exportTasks = () => {
    const lines = ["Title,Assignee,Priority,Status,Due"].concat(state.tasks.map(t => {
      const m = state.team.find(x=>x.id===t.assigneeId);
      return [t.title, m?.name||"-", t.priority, t.status, t.due].join(",");
    }));
    downloadFile("tasks.csv", lines.join("\n"));
  };

  const exportTeam = () => {
    const lines = ["Name,Role,Email,Phone,Salary,Status"].concat(state.team.map(m => [m.name, m.role, m.email, m.phone, m.salary, m.status].join(",")));
    downloadFile("team.csv", lines.join("\n"));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <KPI title="Team Members" value={totals.members} note="Active + Inactive" />
      <KPI title="Open Tasks" value={totals.openTasks} note="Pending or in progress" />
      <KPI title="Completed Tasks" value={totals.doneTasks} note="All time" />
      <KPI title="Active Projects" value={totals.activeProjects} note="Not completed" />
      <KPI title="Payroll (This Month)" value={formatCurrency(totals.payrollThisMonth.amount)} note={`${totals.payrollThisMonth.paid||0}/${totals.payrollThisMonth.total||0} paid`} />

      <div className="lg:col-span-3 bg-white rounded-2xl p-4 border shadow">
        <div className="flex flex-wrap gap-2">
          <Btn onClick={exportTeam}>Export Team CSV</Btn>
          <Btn className="bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={exportTasks}>Export Tasks CSV</Btn>
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, note }){
  return (
    <div className="bg-white rounded-2xl p-4 border shadow">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{note}</div>
    </div>
  );
}

function SettingsSection({ state, setState }){
  const [company, setCompany] = useState(state.company);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl p-4 border shadow">
        <div className="font-semibold mb-3">Company Info</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name"><Input value={company.name} onChange={e=>setCompany({...company, name:e.target.value})} /></Field>
          <Field label="Email"><Input type="email" value={company.email} onChange={e=>setCompany({...company, email:e.target.value})} /></Field>
          <Field label="Phone"><Input value={company.phone} onChange={e=>setCompany({...company, phone:e.target.value})} /></Field>
          <Field label="Address"><Input value={company.address} onChange={e=>setCompany({...company, address:e.target.value})} /></Field>
        </div>
        <div className="flex justify-end mt-3"><Btn onClick={()=>setState(s=>({...s, company}))}>Save</Btn></div>
      </div>
      <div className="bg-white rounded-2xl p-4 border shadow">
        <div className="font-semibold mb-3">Message Templates</div>
        <Field label="WhatsApp Template"><Textarea rows={5} value={company.whatsappTemplate} onChange={e=>setCompany({...company, whatsappTemplate:e.target.value})} /></Field>
        <Field label="Email Subject Template"><Input value={company.emailTemplateSubject} onChange={e=>setCompany({...company, emailTemplateSubject:e.target.value})} /></Field>
        <Field label="Email Body Template"><Textarea rows={6} value={company.emailTemplateBody} onChange={e=>setCompany({...company, emailTemplateBody:e.target.value})} /></Field>
        <div className="text-xs text-gray-600 mt-2">Available variables: {"{name}"}, {"{subject}"}, {"{due}"}, {"{details}"}, {"{company}"}</div>
        <div className="flex justify-end mt-3"><Btn onClick={()=>setState(s=>({...s, company}))}>Save</Btn></div>
      </div>
    </div>
  );
}

// ---------- Utilities ----------
function downloadFile(filename, text){
  const blob = new Blob([text], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

// ---------- Layout ----------
const NAV = [
  { key:"dashboard", label:"Dashboard" },
  { key:"team", label:"Team" },
  { key:"tasks", label:"Tasks" },
  { key:"projects", label:"Projects" },
  { key:"payroll", label:"Payroll" },
  { key:"messaging", label:"Messaging" },
  { key:"attendance", label:"Attendance" },
  { key:"leaves", label:"Leaves" },
  { key:"reports", label:"Reports" },
  { key:"settings", label:"Settings" },
];

export default function App(){
  const [state, setState] = usePersistedState();
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const Section = useMemo(()=>{
    switch(tab){
      case "team": return <TeamSection state={state} setState={setState} />;
      case "tasks": return <TasksSection state={state} setState={setState} />;
      case "projects": return <ProjectsSection state={state} setState={setState} />;
      case "payroll": return <PayrollSection state={state} setState={setState} />;
      case "messaging": return <MessagingSection state={state} setState={setState} />;
      case "attendance": return <AttendanceSection state={state} setState={setState} />;
      case "leaves": return <LeavesSection state={state} setState={setState} />;
      case "reports": return <ReportsSection state={state} setState={setState} />;
      case "settings": return <SettingsSection state={state} setState={setState} />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPI title="Team Members" value={state.team.length} note="Manage your people" />
            <KPI title="Open Tasks" value={state.tasks.filter(t=>t.status!=="Done").length} note="Stay on track" />
            <KPI title="Projects" value={state.projects.length} note="Active + planned" />
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 border shadow">
              <div className="text-lg font-semibold mb-2">Welcome to {state.company.name}</div>
              <p className="text-gray-700">Use the left navigation to manage Team, Tasks, Payroll, Messaging, and more. Data is saved in your browser (localStorage). Connect a backend later to make it multi-user.</p>
            </div>
          </div>
        );
    }
  }, [tab, state]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg border" onClick={()=>setSidebarOpen(s=>!s)}>☰</button>
            <div className="font-bold text-xl">{state.company.name}</div>
          </div>
          <div className="text-sm text-gray-600">{state.company.email} • {state.company.phone}</div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[240px,1fr] gap-4">
        <aside className={classNames("bg-white rounded-2xl border shadow p-3 h-max", sidebarOpen?"block":"hidden md:block") }>
          <nav className="space-y-1">
            {NAV.map(n => (
              <button key={n.key} onClick={()=>setTab(n.key)} className={classNames("w-full text-left px-3 py-2 rounded-xl", tab===n.key?"bg-gray-900 text-white":"hover:bg-gray-100")}>{n.label}</button>
            ))}
          </nav>
        </aside>
        <main>
          {Section}
        </main>
      </div>
      <footer className="text-center text-xs text-gray-500 py-6">© {new Date().getFullYear()} {state.company.name}. All rights reserved.</footer>
    </div>
  );
}
