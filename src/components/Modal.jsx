import React, {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function Modal({title,children,onClose,wide=false}) {
  const ref=useRef(null);
  useEffect(()=>{const previous=document.activeElement;ref.current.querySelector('button')?.focus();const handle=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const elements=[...ref.current.querySelectorAll('button,a[href],input,textarea,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.offsetParent!==null);if(!elements.length)return;const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',handle);return()=>{document.removeEventListener('keydown',handle);previous?.focus?.();};},[]);
  return <div className="modal-scrim" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`modal glass ${wide?'modal-wide':''}`}><header><div><span className="eyebrow">ECHO ATLAS</span><h2>{title}</h2></div><button className="icon-button" aria-label="关闭窗口" onClick={onClose}><X size={20}/></button></header>{children}</section></div>;
}
