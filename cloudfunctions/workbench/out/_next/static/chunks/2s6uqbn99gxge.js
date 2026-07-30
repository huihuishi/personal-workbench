(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,77328,e=>{"use strict";let t;var a=e.i(55967);let s=e=>{let t,a=new Set,s=(e,s)=>{let r="function"==typeof e?e(t):e;if(!Object.is(r,t)){let e=t;t=(null!=s?s:"object"!=typeof r||null===r)?r:Object.assign({},t,r),a.forEach(a=>a(t,e))}},r=()=>t,i={setState:s,getState:r,getInitialState:()=>o,subscribe:e=>(a.add(e),()=>a.delete(e))},o=t=e(s,r,i);return i},r=e=>{let t=e?s(e):s,r=e=>(function(e,t=e=>e){let s=a.default.useSyncExternalStore(e.subscribe,a.default.useCallback(()=>t(e.getState()),[e,t]),a.default.useCallback(()=>t(e.getInitialState()),[e,t]));return a.default.useDebugValue(s),s})(t,e);return Object.assign(r,t),r},i=(t=(e,t)=>({user:null,isLoading:!0,menuPermissions:[],setUser:t=>e({user:t}),setLoading:t=>e({isLoading:t}),setMenuPermissions:t=>e({menuPermissions:t}),hasMenuAccess:e=>{let a=t().menuPermissions.find(t=>t.menu_key===e);return!!a&&a.enabled},logout:()=>e({user:null,menuPermissions:[]})}))?r(t):r;e.s(["useAuthStore",0,i],77328)},98992,e=>{"use strict";let t,a;var s,r=e.i(55967);let i={data:""},o=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,n=/\/\*[^]*?\*\/|  +/g,l=/\n+/g,d=(e,t)=>{let a="",s="",r="";for(let i in e){let o=e[i];"@"==i[0]?"i"==i[1]?a=i+" "+o+";":s+="f"==i[1]?d(o,i):i+"{"+d(o,"k"==i[1]?"":t)+"}":"object"==typeof o?s+=d(o,t?t.replace(/([^,])+/g,e=>i.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):i):null!=o&&(i="-"==i[1]?i:i.replace(/[A-Z]/g,"-$&").toLowerCase(),r+=d.p?d.p(i,o):i+":"+o+";")}return a+(t&&r?t+"{"+r+"}":r)+s},c={},u=e=>{if("object"==typeof e){let t="";for(let a in e)t+=a+u(e[a]);return t}return e};function p(e){let t,a,s=this||{},r=e.call?e(s.p):e;return((e,t,a,s,r)=>{var i;let p=u(e),m=c[p]||(c[p]=(e=>{let t=0,a=11;for(;t<e.length;)a=101*a+e.charCodeAt(t++)>>>0;return"go"+a})(p));if(!c[m]){let t=p!==e?e:(e=>{let t,a,s=[{}];for(;t=o.exec(e.replace(n,""));)t[4]?s.shift():t[3]?(a=t[3].replace(l," ").trim(),s.unshift(s[0][a]=s[0][a]||{})):s[0][t[1]]=t[2].replace(l," ").trim();return s[0]})(e);c[m]=d(r?{["@keyframes "+m]:t}:t,a?"":"."+m)}let f=a&&c.g;return a&&(c.g=c[m]),i=c[m],f?t.data=t.data.replace(f,i):-1===t.data.indexOf(i)&&(t.data=s?i+t.data:t.data+i),m})(r.unshift?r.raw?(t=[].slice.call(arguments,1),a=s.p,r.reduce((e,s,r)=>{let i=t[r];if(i&&i.call){let e=i(a),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;i=t?"."+t:e&&"object"==typeof e?e.props?"":d(e,""):!1===e?"":e}return e+s+(null==i?"":i)},"")):r.reduce((e,t)=>Object.assign(e,t&&t.call?t(s.p):t),{}):r,(e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||i})(s.target),s.g,s.o,s.k)}p.bind({g:1});let m,f,g,b=p.bind({k:1});function y(e,t){let a=this||{};return function(){let s=arguments;function r(i,o){let n=Object.assign({},i),l=n.className||r.className;a.p=Object.assign({theme:f&&f()},n),a.o=/go\d/.test(l),n.className=p.apply(a,s)+(l?" "+l:""),t&&(n.ref=o);let d=e;return e[0]&&(d=n.as||e,delete n.as),g&&d[0]&&g(n),m(d,n)}return t?t(r):r}}var h=(e,t)=>"function"==typeof e?e(t):e,v=(t=0,()=>(++t).toString()),x=()=>{if(void 0===a&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");a=!e||e.matches}return a},w="default",E=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:s}=t;return E(e,{type:+!!e.toasts.find(e=>e.id===s.id),toast:s});case 3:let{toastId:r}=t;return{...e,toasts:e.toasts.map(e=>e.id===r||void 0===r?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+i}))}}},k=[],C={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},j={},I=(e,t=w)=>{j[t]=E(j[t]||C,e),k.forEach(([e,a])=>{e===t&&a(j[t])})},O=e=>Object.keys(j).forEach(t=>I(e,t)),S=(e=w)=>t=>{I(t,e)},$={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},A=(e={},t=w)=>{let[a,s]=(0,r.useState)(j[t]||C),i=(0,r.useRef)(j[t]);(0,r.useEffect)(()=>(i.current!==j[t]&&s(j[t]),k.push([t,s]),()=>{let e=k.findIndex(([e])=>e===t);e>-1&&k.splice(e,1)}),[t]);let o=a.toasts.map(t=>{var a,s,r;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(a=e[t.type])?void 0:a.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(s=e[t.type])?void 0:s.duration)||(null==e?void 0:e.duration)||$[t.type],style:{...e.style,...null==(r=e[t.type])?void 0:r.style,...t.style}}});return{...a,toasts:o}},D=e=>(t,a)=>{let s,r=((e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:(null==a?void 0:a.id)||v()}))(t,e,a);return S(r.toasterId||(s=r.id,Object.keys(j).find(e=>j[e].toasts.some(e=>e.id===s))))({type:2,toast:r}),r.id},T=(e,t)=>D("blank")(e,t);T.error=D("error"),T.success=D("success"),T.loading=D("loading"),T.custom=D("custom"),T.dismiss=(e,t)=>{let a={type:3,toastId:e};t?S(t)(a):O(a)},T.dismissAll=e=>T.dismiss(void 0,e),T.remove=(e,t)=>{let a={type:4,toastId:e};t?S(t)(a):O(a)},T.removeAll=e=>T.remove(void 0,e),T.promise=(e,t,a)=>{let s=T.loading(t.loading,{...a,...null==a?void 0:a.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let r=t.success?h(t.success,e):void 0;return r?T.success(r,{id:s,...a,...null==a?void 0:a.success}):T.dismiss(s),e}).catch(e=>{let r=t.error?h(t.error,e):void 0;r?T.error(r,{id:s,...a,...null==a?void 0:a.error}):T.dismiss(s)}),e};var N=1e3,P=(e,t="default")=>{let{toasts:a,pausedAt:s}=A(e,t),i=(0,r.useRef)(new Map).current,o=(0,r.useCallback)((e,t=N)=>{if(i.has(e))return;let a=setTimeout(()=>{i.delete(e),n({type:4,toastId:e})},t);i.set(e,a)},[]);(0,r.useEffect)(()=>{if(s)return;let e=Date.now(),r=a.map(a=>{if(a.duration===1/0)return;let s=(a.duration||0)+a.pauseDuration-(e-a.createdAt);if(s<0){a.visible&&T.dismiss(a.id);return}return setTimeout(()=>T.dismiss(a.id,t),s)});return()=>{r.forEach(e=>e&&clearTimeout(e))}},[a,s,t]);let n=(0,r.useCallback)(S(t),[t]),l=(0,r.useCallback)(()=>{n({type:5,time:Date.now()})},[n]),d=(0,r.useCallback)((e,t)=>{n({type:1,toast:{id:e,height:t}})},[n]),c=(0,r.useCallback)(()=>{s&&n({type:6,time:Date.now()})},[s,n]),u=(0,r.useCallback)((e,t)=>{let{reverseOrder:s=!1,gutter:r=8,defaultPosition:i}=t||{},o=a.filter(t=>(t.position||i)===(e.position||i)&&t.height),n=o.findIndex(t=>t.id===e.id),l=o.filter((e,t)=>t<n&&e.visible).length;return o.filter(e=>e.visible).slice(...s?[l+1]:[0,l]).reduce((e,t)=>e+(t.height||0)+r,0)},[a]);return(0,r.useEffect)(()=>{a.forEach(e=>{if(e.dismissed)o(e.id,e.removeDelay);else{let t=i.get(e.id);t&&(clearTimeout(t),i.delete(e.id))}})},[a,o]),{toasts:a,handlers:{updateHeight:d,startPause:l,endPause:c,calculateOffset:u}}},_=b`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,z=b`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,L=b`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,M=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${_} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${z} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${L} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,F=b`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,U=y("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${F} 1s linear infinite;
`,H=b`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,R=b`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,q=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${H} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${R} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,B=y("div")`
  position: absolute;
`,G=y("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,K=b`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,V=y("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${K} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Y=({toast:e})=>{let{icon:t,type:a,iconTheme:s}=e;return void 0!==t?"string"==typeof t?r.createElement(V,null,t):t:"blank"===a?null:r.createElement(G,null,r.createElement(U,{...s}),"loading"!==a&&r.createElement(B,null,"error"===a?r.createElement(M,{...s}):r.createElement(q,{...s})))},Z=y("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,J=y("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Q=r.memo(({toast:e,position:t,style:a,children:s})=>{let i=e.height?((e,t)=>{let a=e.includes("top")?1:-1,[s,r]=x()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*a}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*a}%,-1px) scale(.6); opacity:0;}
`];return{animation:t?`${b(s)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${b(r)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(e.position||t||"top-center",e.visible):{opacity:0},o=r.createElement(Y,{toast:e}),n=r.createElement(J,{...e.ariaProps},h(e.message,e));return r.createElement(Z,{className:e.className,style:{...i,...a,...e.style}},"function"==typeof s?s({icon:o,message:n}):r.createElement(r.Fragment,null,o,n))});s=r.createElement,d.p=void 0,m=s,f=void 0,g=void 0;var W=({id:e,className:t,style:a,onHeightUpdate:s,children:i})=>{let o=r.useCallback(t=>{if(t){let a=()=>{s(e,t.getBoundingClientRect().height)};a(),new MutationObserver(a).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,s]);return r.createElement("div",{ref:o,className:t,style:a},i)},X=p`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;e.s(["CheckmarkIcon",0,q,"ErrorIcon",0,M,"LoaderIcon",0,U,"ToastBar",0,Q,"ToastIcon",0,Y,"Toaster",0,({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:s,children:i,toasterId:o,containerStyle:n,containerClassName:l})=>{let{toasts:d,handlers:c}=P(a,o);return r.createElement("div",{"data-rht-toaster":o||"",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...n},className:l,onMouseEnter:c.startPause,onMouseLeave:c.endPause},d.map(a=>{let o,n,l=a.position||t,d=c.calculateOffset(a,{reverseOrder:e,gutter:s,defaultPosition:t}),u=(o=l.includes("top"),n=l.includes("center")?{justifyContent:"center"}:l.includes("right")?{justifyContent:"flex-end"}:{},{left:0,right:0,display:"flex",position:"absolute",transition:x()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${d*(o?1:-1)}px)`,...o?{top:0}:{bottom:0},...n});return r.createElement(W,{id:a.id,key:a.id,onHeightUpdate:c.updateHeight,className:a.visible?X:"",style:u},"custom"===a.type?h(a.message,a):i?i(a):r.createElement(Q,{toast:a,position:l}))}))},"default",0,T,"resolveValue",0,h,"toast",0,T,"useToaster",0,P,"useToasterStore",0,A],98992)},83914,e=>{"use strict";var t=e.i(46400),a=e.i(55967),s=e.i(77328),r=e.i(7471);e.s(["AuthProvider",0,function({children:e}){let{setUser:i,setLoading:o,setMenuPermissions:n}=(0,s.useAuthStore)();return(0,a.useEffect)(()=>{(async()=>{try{let{data:e}=await r.supabase.auth.getSession();if(e.session?.user){let{data:t}=await r.supabase.from("users").select("*").eq("id",e.session.user.id).single();if(t){i(t);let{data:e}=await r.supabase.from("user_menu_permissions").select("*").eq("user_id",t.id);e&&n(e)}}}catch{}finally{o(!1)}})();let{data:e}=r.supabase.auth.onAuthStateChange(async(e,t)=>{if("SIGNED_IN"===e&&t?.user){let{data:e}=await r.supabase.from("users").select("*").eq("id",t.user.id).single();e&&i(e)}"SIGNED_OUT"===e&&(i(null),n([]))});return()=>e.subscription.unsubscribe()},[i,o,n]),(0,t.jsx)(t.Fragment,{children:e})}])}]);