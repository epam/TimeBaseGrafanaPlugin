/* [create-plugin] version: 5.8.2 */
define(["@grafana/data","@grafana/runtime","@grafana/ui","module","react","rxjs"],((e,t,r,n,a,o)=>(()=>{"use strict";var u={781:t=>{t.exports=e},531:e=>{e.exports=t},7:e=>{e.exports=r},308:e=>{e.exports=n},959:e=>{e.exports=a},269:e=>{e.exports=o}},i={};function c(e){var t=i[e];if(void 0!==t)return t.exports;var r=i[e]={exports:{}};return u[e](r,r.exports,c),r.exports}c.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return c.d(t,{a:t}),t},c.d=(e,t)=>{for(var r in t)c.o(t,r)&&!c.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},c.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),c.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},c.p="public/plugins/epam-timebase-datasource/";var s={};c.r(s),c.d(s,{plugin:()=>F});var l=c(308),p=c.n(l);c.p=p()&&p().uri?p().uri.slice(0,p().uri.lastIndexOf("/")+1):"public/plugins/epam-timebase-datasource/";var f=c(781),d=c(531);const y={constant:6.5};var b=c(269);function g(e,t,r,n,a,o,u){try{var i=e[o](u),c=i.value}catch(e){return void r(e)}i.done?t(c):Promise.resolve(c).then(n,a)}function O(e){return function(){var t=this,r=arguments;return new Promise((function(n,a){var o=e.apply(t,r);function u(e){g(o,n,a,u,i,"next",e)}function i(e){g(o,n,a,u,i,"throw",e)}u(void 0)}))}}class v extends f.DataSourceApi{getDefaultQuery(e){return y}filterQuery(e){return!!e.queryText}query(e){return O((function*(){const{range:t}=e,r=t.from.valueOf(),n=t.to.valueOf();return{data:e.targets.map((e=>(0,f.createDataFrame)({refId:e.refId,fields:[{name:"Time",values:[r,n],type:f.FieldType.time},{name:"Value",values:[e.constant,e.constant],type:f.FieldType.number}]})))}}))()}request(e,t){var r=this;return O((function*(){const n=(0,d.getBackendSrv)().fetch({url:`${r.baseUrl}${e}${(null==t?void 0:t.length)?`?${t}`:""}`});return(0,b.lastValueFrom)(n)}))()}testDatasource(){var e=this;return O((function*(){const t="Cannot connect to API";try{const r=yield e.request("/health");return 200===r.status?{status:"success",message:"Success"}:{status:"error",message:r.statusText?r.statusText:t}}catch(e){let r="";return"string"==typeof e?r=e:(0,d.isFetchError)(e)&&(r="Fetch error: "+(e.statusText?e.statusText:t),e.data&&e.data.error&&e.data.error.code&&(r+=": "+e.data.error.code+". "+e.data.error.message)),{status:"error",message:r}}}))()}constructor(e){var t,r,n;super(e),n=void 0,(r="baseUrl")in(t=this)?Object.defineProperty(t,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[r]=n,this.baseUrl=e.url}}var m=c(959),h=c.n(m),j=c(7);function P(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function w(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{},n=Object.keys(r);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(r).filter((function(e){return Object.getOwnPropertyDescriptor(r,e).enumerable})))),n.forEach((function(t){P(e,t,r[t])}))}return e}function x(e,t){return t=null!=t?t:{},Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):function(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}(Object(t)).forEach((function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})),e}function D(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function E(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{},n=Object.keys(r);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(r).filter((function(e){return Object.getOwnPropertyDescriptor(r,e).enumerable})))),n.forEach((function(t){D(e,t,r[t])}))}return e}function S(e,t){return t=null!=t?t:{},Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):function(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}(Object(t)).forEach((function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})),e}const F=new f.DataSourcePlugin(v).setConfigEditor((function(e){const{onOptionsChange:t,options:r}=e,{jsonData:n,secureJsonFields:a,secureJsonData:o}=r;return h().createElement(h().Fragment,null,h().createElement(j.InlineField,{label:"Path",labelWidth:14,interactive:!0,tooltip:"Json field returned to frontend"},h().createElement(j.Input,{id:"config-editor-path",onChange:e=>{t(x(w({},r),{jsonData:x(w({},n),{path:e.target.value})}))},value:n.path,placeholder:"Enter the path, e.g. /api/v1",width:40})),h().createElement(j.InlineField,{label:"API Key",labelWidth:14,interactive:!0,tooltip:"Secure json field (backend only)"},h().createElement(j.SecretInput,{required:!0,id:"config-editor-api-key",isConfigured:a.apiKey,value:null==o?void 0:o.apiKey,placeholder:"Enter your API key",width:40,onReset:()=>{t(x(w({},r),{secureJsonFields:x(w({},r.secureJsonFields),{apiKey:!1}),secureJsonData:x(w({},r.secureJsonData),{apiKey:""})}))},onChange:e=>{t(x(w({},r),{secureJsonData:{apiKey:e.target.value}}))}})))})).setQueryEditor((function({query:e,onChange:t,onRunQuery:r}){const{queryText:n,constant:a}=e;return h().createElement(j.Stack,{gap:0},h().createElement(j.InlineField,{label:"Constant"},h().createElement(j.Input,{id:"query-editor-constant",onChange:n=>{t(S(E({},e),{constant:parseFloat(n.target.value)})),r()},value:a,width:8,type:"number",step:"0.1"})),h().createElement(j.InlineField,{label:"Query Text",labelWidth:16,tooltip:"Not used yet"},h().createElement(j.Input,{id:"query-editor-query-text",onChange:r=>{t(S(E({},e),{queryText:r.target.value}))},value:n||"",required:!0,placeholder:"Enter a query"})))}));return s})()));
//# sourceMappingURL=module.js.map