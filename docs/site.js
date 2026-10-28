"use strict";
(() => {
 const menu = document.querySelector("#main-nav");
 const toggle = document.querySelector("#menu-toggle");
 if(toggle && menu){
  toggle.addEventListener("click",() => {
    const open=menu.dataset.open!=="true";
    menu.dataset.open=String(open);
    toggle.setAttribute("aria-expanded",String(open));
    toggle.setAttribute("aria-label",open?"Cerrar menú":"Abrir menú");
  });
  menu.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{menu.dataset.open="false";toggle.setAttribute("aria-expanded","false")}));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){menu.dataset.open="false";toggle.setAttribute("aria-expanded","false")}});
 }
 const tabs=Array.from(document.querySelectorAll("[data-filter]"));
 const cards=Array.from(document.querySelectorAll("[data-category]"));
 const result=document.querySelector("#filter-count");
 tabs.forEach(tab=>tab.addEventListener("click",()=>{
   const selected=tab.getAttribute("data-filter");
   tabs.forEach(item=>item.setAttribute("aria-pressed",String(item===tab)));
   const shown=cards.filter(card=>selected==="todos" || card.getAttribute("data-category")===selected);
   cards.forEach(card=>{card.hidden=!shown.includes(card)});
   if(result)result.textContent=shown.length+" formatos de muestra";
 }));
})();
