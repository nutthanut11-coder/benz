const $=s=>document.querySelector(s); const $$=s=>Array.from(document.querySelectorAll(s));

function todayISO(){ const d=new Date(); const tz=d.getTimezoneOffset()*60000; return new Date(Date.now()-tz).toISOString().slice(0,10); }
const fmt2=n=>(Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});

function bahtTextThai(n){
  n=Math.round((Number(n)||0)*100)/100; const [i,f]=n.toFixed(2).split(".");
  const thNums=["ศูนย์","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"]; const thUnits=["","สิบ","ร้อย","พัน","หมื่น","แสน","ล้าน"];
  function readInt(s){ let out=""; const len=s.length; for(let x=0;x<len;x++){ const d=Number(s.charAt(x)); const pos=len-x-1; if(d===0) continue;
    if(pos===0 && d===1 && len>1) out+="เอ็ด"; else if(pos===1 && d===2) out+="ยี่"; else if(pos===1 && d===1){} else out+=thNums[d];
    out+=thUnits[pos%6]; if(pos>=6 && pos%6===0) out+=thUnits[6];
  } return out||thNums[0];}
  let head=""; if(i.length>6){ const mil=i.slice(0,-6), rest=i.slice(-6); head=readInt(mil)+"ล้าน"+(Number(rest)?readInt(rest):""); } else head=readInt(i);
  const tail=Number(f)?readInt(f)+"สตางค์":"ถ้วน"; return head+"บาท"+tail;
}

const els = {
  customerSelect: $("#customerSelect"),
  custTaxId: $("#custTaxId"),
  custAddr: $("#custAddr"),
  docDate: $("#docDate"),
  itemsBody: $("#itemsBody"),
  grandTotal: $("#grandTotal"),
  bahtText: $("#bahtText"),
  p: {
    custName: $("#p_custName"),
    custTaxId: $("#p_custTaxId"),
    custAddr: $("#p_custAddr"),
    docDate: $("#p_docDate"),
    itemsBody: $("#p_itemsBody"),
    grandTotal: $("#p_grandTotal"),
    bahtText: $("#p_bahtText"),
  },
  btnAddRow: $("#btnAddRow"),
  btnAddCustomer: $("#btnAddCustomer"),
  btnSave: $("#btnSave"),
  btnPrint: $("#btnPrint"),
  dlg: {
    el: $("#dlgCustomer"),
    name: $("#new_cust_name"),
    tax: $("#new_cust_tax"),
    addr: $("#new_cust_addr"),
    btnOk: $("#btnDlgSave")
  }
};

function loadCustomers(){
  const saved = JSON.parse(localStorage.getItem("rr_customers")||"[]");
  const data = [...DEFAULT_CUSTOMERS, ...saved];
  els.customerSelect.innerHTML = data.map((c,i)=>`<option value="${i}">${c.name}</option>`).join("");
  els.customerSelect.dataset.json = JSON.stringify(data);
  applyCustomer(0);
}

function applyCustomer(idx){
  const data = JSON.parse(els.customerSelect.dataset.json||"[]");
  const c = data[idx]; if(!c) return;
  els.customerSelect.value = idx;
  els.custTaxId.value = c.taxId||"";
  els.custAddr.value = c.addr||"";
  // update print
  els.p.custName.textContent = c.name||"-";
  els.p.custTaxId.textContent = c.taxId||"-";
  els.p.custAddr.textContent = c.addr||"-";
}

function addRow(data={}){
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="qty" placeholder="เช่น 120 กระสอบ / 1 เที่ยว" value="${data.qty||""}"></td>
    <td><input class="name" placeholder="รายละเอียด" value="${data.name||""}"></td>
    <td><input class="price" type="number" step="0.01" value="${data.price!=null?data.price:""}"></td>
    <td><input class="amount" type="number" step="0.01" value="${data.amount!=null?data.amount:""}"></td>
    <td><button class="btn btn--icon del">✕</button></td>`;
  tr.querySelectorAll("input").forEach(i=> i.addEventListener("input", calcTotals));
  tr.querySelector(".del").addEventListener("click", ()=>{ tr.remove(); calcTotals(); saveForm(); });
  els.itemsBody.appendChild(tr);
}

function readRows(){
  return $$("#itemsBody tr").map(tr=> ({
    qty: tr.querySelector(".qty").value.trim(),
    name: tr.querySelector(".name").value.trim(),
    price: Number(tr.querySelector(".price").value||"0"),
    amount: Number(tr.querySelector(".amount").value||"0"),
  }));
}

function calcTotals(){
  const rows = readRows();
  const total = rows.reduce((a,r)=> a + (Number(r.amount)||0), 0);
  els.grandTotal.textContent = fmt2(total);
  const bt = bahtTextThai(total);
  els.bahtText.textContent = bt;

  // print rows
  els.p.itemsBody.innerHTML = "";
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(r.qty)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td style="text-align:right">${fmt2(r.price)}</td>
      <td style="text-align:right">${fmt2(r.amount)}</td>`;
    els.p.itemsBody.appendChild(tr);
  });
  els.p.grandTotal.textContent = fmt2(total);
  els.p.bahtText.textContent = bt;
  els.p.docDate.textContent = els.docDate.value || todayISO();

  saveForm();
}

function saveForm(){
  const form = {
    selected: Number(els.customerSelect.value||0),
    tax: els.custTaxId.value,
    addr: els.custAddr.value,
    date: els.docDate.value,
    rows: readRows(),
  };
  localStorage.setItem("rr_form_v2", JSON.stringify(form));
}

function loadForm(){
  const s = localStorage.getItem("rr_form_v2"); if(!s){ els.docDate.value = todayISO(); return; }
  try{
    const f = JSON.parse(s);
    els.docDate.value = f.date || todayISO();
    // customers must be loaded first then select
    const cb = ()=>{
      const data = JSON.parse(els.customerSelect.dataset.json||"[]");
      const c = data[f.selected] || data[0];
      els.customerSelect.value = data.indexOf(c);
      els.custTaxId.value = f.tax || c.taxId || "";
      els.custAddr.value = f.addr || c.addr || "";
      $$("#itemsBody tr").forEach(tr=>tr.remove());
      (f.rows||[]).forEach(r=> addRow(r));
      if((f.rows||[]).length===0){ addRow(); }
      applyCustomer(els.customerSelect.value);
      calcTotals();
    };
    setTimeout(cb,0);
  }catch(e){ console.error(e); els.docDate.value=todayISO(); }
}

function escapeHtml(s){ return (s||"").replace(/[&<>\"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }

// Events
window.addEventListener("DOMContentLoaded", ()=>{
  els.docDate.value = todayISO();
  loadCustomers();
  loadForm();
  if($$("#itemsBody tr").length===0){ addRow(); }

  els.customerSelect.addEventListener("change", (e)=> applyCustomer(e.target.value));
  els.btnAddRow.addEventListener("click", ()=> addRow());
  els.btnSave.addEventListener("click", ()=>{ saveForm(); alert("บันทึกเรียบร้อย"); });
  els.btnPrint.addEventListener("click", ()=>{ calcTotals(); setTimeout(()=>window.print(), 150); });

  // Add customer modal
  els.btnAddCustomer.addEventListener("click", ()=> els.dlg.el.showModal());
  els.dlg.btnOk.addEventListener("click", (ev)=>{
    ev.preventDefault();
    const name = els.dlg.name.value.trim();
    if(!name){ return; }
    const newC = { key: name, name, taxId: els.dlg.tax.value.trim(), addr: els.dlg.addr.value.trim() };
    const saved = JSON.parse(localStorage.getItem("rr_customers")||"[]");
    saved.push(newC);
    localStorage.setItem("rr_customers", JSON.stringify(saved));
    els.dlg.el.close();
    els.dlg.name.value=""; els.dlg.tax.value=""; els.dlg.addr.value="";
    loadCustomers();
    // select last
    els.customerSelect.value = JSON.parse(els.customerSelect.dataset.json).length-1;
    applyCustomer(els.customerSelect.value);
    calcTotals();
  });

  // Reflect form typing to print meta too
  $("#custTaxId").addEventListener("input", ()=>{ els.p.custTaxId.textContent = $("#custTaxId").value; saveForm(); });
  $("#custAddr").addEventListener("input", ()=>{ els.p.custAddr.textContent = $("#custAddr").value; saveForm(); });
  $("#docDate").addEventListener("change", ()=> calcTotals());
});

