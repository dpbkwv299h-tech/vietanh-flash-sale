const $=s=>document.querySelector(s);let products=[];
const money=n=>new Intl.NumberFormat("vi-VN").format(n)+"đ";
async function load(){
 const [pr,st]=await Promise.all([fetch("/api/products").then(r=>r.json()),fetch("/api/status").then(r=>r.json())]);
 products=pr; render(st); setInterval(async()=>render(await fetch("/api/status").then(r=>r.json())),1000);
}
function render(st){
 const now=st.vietnamTime.split(":").map(Number); let target;
 if(st.open) target=10*3600; else target=now[0]<6?6*3600:30*3600;
 let sec=target-(now[0]*3600+now[1]*60+now[2]); if(sec<0)sec+=24*3600;
 $("#countdown").textContent=`${String(Math.floor(sec/3600)).padStart(2,"0")}:${String(Math.floor(sec%3600/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
 const closed=$("#closed"); closed.classList.toggle("hidden",st.open); if(!st.open)closed.textContent="Flash Sale đang đóng. Hệ thống nhận đơn từ 06:00 đến trước 10:00.";
 $("#products").innerHTML=products.map(p=>`<article class="card"><div class="emoji">${p.emoji}</div><h3>${p.name}</h3><p>${p.description}</p><div class="promo">${p.promoTitle}</div><s>${money(p.oldPrice)}</s><strong>${money(p.price)}</strong><p>Còn ${p.stock} suất</p><button onclick="choose('${p.id}')">MUA NGAY</button></article>`).join("");
 $("#productSelect").innerHTML=products.filter(p=>p.active&&p.stock>0).map(p=>`<option value="${p.id}">${p.name} — ${money(p.price)}</option>`).join("");
}
window.choose=id=>{$("#productSelect").value=id;$("#orderForm").scrollIntoView({behavior:"smooth"})};
$("#orderForm").addEventListener("submit",async e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(e));
 const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 const j=await r.json();$("#result").textContent=r.ok?`✅ Đặt hàng thành công! Mã đơn: ${j.id} — Tổng: ${money(j.total)}`:`❌ ${j.error}`;if(r.ok){e.target.reset();load();}
});
load();
