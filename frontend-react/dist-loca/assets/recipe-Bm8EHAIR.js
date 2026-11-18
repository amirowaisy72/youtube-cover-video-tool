import{C as e,D as t,E as n,O as r,S as i,_ as a,b as o,d as s,p as c,u as l,w as u,x as d,y as f}from"./gemini-Ds0weRxF.js";var p={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},m={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},h=1e3,g=1001,_=1002,v=1003,y=1004,b=1005,x=1006,S=1007,C=1008,w=1009,T=1010,E=1011,D=1012,O=1013,k=1014,A=1015,ee=1016,te=1017,ne=1018,re=1020,ie=35902,ae=35899,oe=1021,se=1022,ce=1023,le=1026,ue=1027,de=1028,fe=1029,pe=1030,me=1031,he=1033,ge=33776,_e=33777,ve=33778,ye=33779,be=35840,xe=35841,Se=35842,Ce=35843,we=36196,Te=37492,Ee=37496,De=37488,Oe=37489,ke=37490,Ae=37491,je=37808,Me=37809,Ne=37810,Pe=37811,Fe=37812,Ie=37813,Le=37814,Re=37815,j=37816,ze=37817,Be=37818,Ve=37819,M=37820,He=37821,N=36492,Ue=36494,We=36495,Ge=36283,Ke=36284,qe=36285,Je=36286,Ye=2300,Xe=2301,Ze=2302,Qe=2303,$e=2400,et=2401,tt=2402,nt=3200,rt=`srgb`,it=`srgb-linear`,at=`linear`,ot=`srgb`,st=7680,ct=35044,lt=2e3;function ut(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function dt(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function ft(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function pt(){let e=ft(`canvas`);return e.style.display=`block`,e}var mt={};function ht(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function gt(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function P(...e){e=gt(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function F(...e){e=gt(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function _t(...e){let t=e.join(` `);t in mt||(mt[t]=!0,P(...e))}function vt(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var yt={0:0,2:6,4:4,3:5,1:1,6:2,7:7,5:3},bt=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},xt=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),St=1234567,Ct=Math.PI/180,wt=180/Math.PI;function Tt(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(xt[e&255]+xt[e>>8&255]+xt[e>>16&255]+xt[e>>24&255]+`-`+xt[t&255]+xt[t>>8&255]+`-`+xt[t>>16&15|64]+xt[t>>24&255]+`-`+xt[n&63|128]+xt[n>>8&255]+`-`+xt[n>>16&255]+xt[n>>24&255]+xt[r&255]+xt[r>>8&255]+xt[r>>16&255]+xt[r>>24&255]).toLowerCase()}function Et(e,t,n){return Math.max(t,Math.min(n,e))}function Dt(e,t){return(e%t+t)%t}function Ot(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function kt(e,t,n){return e===t?0:(n-e)/(t-e)}function At(e,t,n){return(1-n)*e+n*t}function jt(e,t,n,r){return At(e,t,1-Math.exp(-n*r))}function Mt(e,t=1){return t-Math.abs(Dt(e,t*2)-t)}function Nt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function Pt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function Ft(e,t){return e+Math.floor(Math.random()*(t-e+1))}function It(e,t){return e+Math.random()*(t-e)}function Lt(e){return e*(.5-Math.random())}function Rt(e){e!==void 0&&(St=e);let t=St+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function zt(e){return e*Ct}function Bt(e){return e*wt}function Vt(e){return e>0&&Number.isInteger(e)&&2**Math.round(Math.log2(e))===e}function Ht(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function Ut(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Wt(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:P(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Gt(e){switch(e.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function Kt(e,t){if(t.constructor===Float32Array)return e;let n=Gt(t);if(n===void 0)throw Error(`THREE.MathUtils: Invalid component type.`);return Math.max(e/n,-1)}function qt(e,t){if(t.constructor===Float32Array)return e;let n=Gt(t);if(n===void 0)throw Error(`THREE.MathUtils: Invalid component type.`);return Math.round(e*n)}var Jt={DEG2RAD:Ct,RAD2DEG:wt,generateUUID:Tt,clamp:Et,euclideanModulo:Dt,mapLinear:Ot,inverseLerp:kt,lerp:At,damp:jt,pingpong:Mt,smoothstep:Nt,smootherstep:Pt,randInt:Ft,randFloat:It,randFloatSpread:Lt,seededRandom:Rt,degToRad:zt,radToDeg:Bt,isPowerOfTwo:Vt,ceilPowerOfTwo:Ht,floorPowerOfTwo:Ut,setQuaternionFromProperEuler:Wt,normalize:qt,denormalize:Kt},I=class{static{this.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Et(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Et(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Yt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:P(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Et(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},L=class{static{this.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Zt.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Zt.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this.z=Et(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this.z=Et(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Et(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Xt.copy(this).projectOnVector(e),this.sub(Xt)}reflect(e){return this.sub(Xt.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Et(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Xt=new L,Zt=new Yt,Qt=class{static{this.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return _t(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply($t.makeScale(e,t)),this}rotate(e){return _t(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply($t.makeRotation(-e)),this}translate(e,t){return _t(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply($t.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},$t=new Qt,en=new Qt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),tn=new Qt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function nn(){let e={enabled:!0,workingColorSpace:it,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=an(e.r),e.g=an(e.g),e.b=an(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=on(e.r),e.g=on(e.g),e.b=on(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?at:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[n].fromXYZ).multiply(this.spaces[t].toXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[it]:{primaries:t,whitePoint:r,transfer:at,toXYZ:en,fromXYZ:tn,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:rt},outputColorSpaceConfig:{drawingBufferColorSpace:rt}},[rt]:{primaries:t,whitePoint:r,transfer:ot,toXYZ:en,fromXYZ:tn,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:rt}}}),e}var rn=nn();function an(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function on(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var sn,cn=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{sn===void 0&&(sn=ft(`canvas`)),sn.width=e.width,sn.height=e.height;let t=sn.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=sn}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=ft(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=an(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(an(t[e]/255)*255):t[e]=an(t[e]);return{data:t,width:e.width,height:e.height}}return P(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},ln=0,un=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:ln++}),this.uuid=Tt(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width||0,t.height||0,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(dn(r[t].image)):e.push(dn(r[t]))}else e=dn(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function dn(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?cn.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(P(`Texture: Unable to serialize Texture.`),{})}var fn=0,pn=new L,mn=class e extends bt{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=g,i=g,a=x,o=C,s=ce,c=w,l=e.DEFAULT_ANISOTROPY,u=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fn++}),this.uuid=Tt(),this.name=``,this.source=new un(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new I(0,0),this.repeat=new I(1,1),this.center=new I(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Qt,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(pn).x}get height(){return this.source.getSize(pn).y}get depth(){return this.source.getSize(pn).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){P(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){P(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case h:e.x-=Math.floor(e.x);break;case g:e.x=e.x<0?0:1;break;case _:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case h:e.y-=Math.floor(e.y);break;case g:e.y=e.y<0?0:1;break;case _:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};mn.DEFAULT_IMAGE=null,mn.DEFAULT_MAPPING=300,mn.DEFAULT_ANISOTROPY=1;var hn=class{static{this.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this.z=Et(this.z,e.z,t.z),this.w=Et(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this.z=Et(this.z,e,t),this.w=Et(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Et(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},gn=class extends bt{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:x,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new hn(0,0,e,t),this.scissorTest=!1,this.viewport=new hn(0,0,e,t),this.textures=[];let r=n.count;for(let i=0;i<r;i++)this.textures[i]=new mn({width:e,height:t,depth:n.depth}),this.textures[i].isRenderTargetTexture=!0,this.textures[i].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:x,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new un(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},_n=class extends gn{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},vn=class extends mn{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=v,this.minFilter=v,this.wrapR=g,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},yn=class extends mn{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=v,this.minFilter=v,this.wrapR=g,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}},bn=class e{static{this.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/xn.setFromMatrixColumn(e,0).length(),i=1/xn.setFromMatrixColumn(e,1).length(),a=1/xn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Cn,e,wn)}lookAt(e,t,n){let r=this.elements;return Dn.subVectors(e,t),Dn.lengthSq()===0&&(Dn.z=1),Dn.normalize(),Tn.crossVectors(n,Dn),Tn.lengthSq()===0&&(Math.abs(n.z)===1?Dn.x+=1e-4:Dn.z+=1e-4,Dn.normalize(),Tn.crossVectors(n,Dn)),Tn.normalize(),En.crossVectors(Dn,Tn),r[0]=Tn.x,r[4]=En.x,r[8]=Dn.x,r[1]=Tn.y,r[5]=En.y,r[9]=Dn.y,r[2]=Tn.z,r[6]=En.z,r[10]=Dn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],ee=r[10],te=r[14],ne=r[3],re=r[7],ie=r[11],ae=r[15];return i[0]=a*x+o*T+s*k+c*ne,i[4]=a*S+o*E+s*A+c*re,i[8]=a*C+o*D+s*ee+c*ie,i[12]=a*w+o*O+s*te+c*ae,i[1]=l*x+u*T+d*k+f*ne,i[5]=l*S+u*E+d*A+f*re,i[9]=l*C+u*D+d*ee+f*ie,i[13]=l*w+u*O+d*te+f*ae,i[2]=p*x+m*T+h*k+g*ne,i[6]=p*S+m*E+h*A+g*re,i[10]=p*C+m*D+h*ee+g*ie,i[14]=p*w+m*O+h*te+g*ae,i[3]=_*x+v*T+y*k+b*ne,i[7]=_*S+v*E+y*A+b*re,i[11]=_*C+v*D+y*ee+b*ie,i[15]=_*w+v*O+y*te+b*ae,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=xn.set(r[0],r[1],r[2]).length(),o=xn.set(r[4],r[5],r[6]).length(),s=xn.set(r[8],r[9],r[10]).length();i<0&&(a=-a),Sn.copy(this);let c=1/a,l=1/o,u=1/s;return Sn.elements[0]*=c,Sn.elements[1]*=c,Sn.elements[2]*=c,Sn.elements[4]*=l,Sn.elements[5]*=l,Sn.elements[6]*=l,Sn.elements[8]*=u,Sn.elements[9]*=u,Sn.elements[10]*=u,t.setFromRotationMatrix(Sn),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=lt,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=lt,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},xn=new L,Sn=new bn,Cn=new L(0,0,0),wn=new L(1,1,1),Tn=new L,En=new L,Dn=new L,On=new bn,kn=new Yt,An=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(Et(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-Et(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(Et(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-Et(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(Et(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-Et(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:P(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return On.makeRotationFromQuaternion(e),this.setFromRotationMatrix(On,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return kn.setFromEuler(this),this.setFromQuaternion(kn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};An.DEFAULT_ORDER=`XYZ`;var jn=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},Mn=0,Nn=new L,Pn=new Yt,Fn=new bn,In=new L,Ln=new L,Rn=new L,zn=new Yt,Bn=new L(1,0,0),Vn=new L(0,1,0),Hn=new L(0,0,1),Un={type:`added`},Wn={type:`removed`},Gn={type:`childadded`,child:null},Kn={type:`childremoved`,child:null},qn=class e extends bt{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Mn++}),this.uuid=Tt(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new L,n=new An,r=new Yt,i=new L(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new bn},normalMatrix:{value:new Qt}}),this.matrix=new bn,this.matrixWorld=new bn,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new jn,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Pn.setFromAxisAngle(e,t),this.quaternion.multiply(Pn),this}rotateOnWorldAxis(e,t){return Pn.setFromAxisAngle(e,t),this.quaternion.premultiply(Pn),this}rotateX(e){return this.rotateOnAxis(Bn,e)}rotateY(e){return this.rotateOnAxis(Vn,e)}rotateZ(e){return this.rotateOnAxis(Hn,e)}translateOnAxis(e,t){return Nn.copy(e).applyQuaternion(this.quaternion),this.position.add(Nn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Bn,e)}translateY(e){return this.translateOnAxis(Vn,e)}translateZ(e){return this.translateOnAxis(Hn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Fn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?In.copy(e):In.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),Ln.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Fn.lookAt(Ln,In,this.up):Fn.lookAt(In,Ln,this.up),this.quaternion.setFromRotationMatrix(Fn),r&&(Fn.extractRotation(r.matrixWorld),Pn.setFromRotationMatrix(Fn),this.quaternion.premultiply(Pn.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(F(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Un),Gn.child=e,this.dispatchEvent(Gn),Gn.child=null):F(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Wn),Kn.child=e,this.dispatchEvent(Kn),Kn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Fn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Fn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Fn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Un),Gn.child=e,this.dispatchEvent(Gn),Gn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ln,e,Rn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ln,zn,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material);if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:`dispose`})}};qn.DEFAULT_UP=new L(0,1,0),qn.DEFAULT_MATRIX_AUTO_UPDATE=!0,qn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var R=class extends qn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Jn={type:`move`},Yn=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new R,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new R,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new R,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.quaternion,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.quaternion,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Jn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new R;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Xn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Zn={h:0,s:0,l:0},Qn={h:0,s:0,l:0};function $n(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var z=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=rt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,rn.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=rn.workingColorSpace){return this.r=e,this.g=t,this.b=n,rn.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=rn.workingColorSpace){if(e=Dt(e,1),t=Et(t,0,1),n=Et(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=$n(i,r,e+1/3),this.g=$n(i,r,e),this.b=$n(i,r,e-1/3)}return rn.colorSpaceToWorking(this,r),this}setStyle(e,t=rt){function n(t){t!==void 0&&parseFloat(t)<1&&P(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseFloat(i[1]))/100,Math.min(100,parseFloat(i[2]))/100,Math.min(100,parseFloat(i[3]))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:P(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);P(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=rt){let n=Xn[e.toLowerCase()];return n===void 0?P(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=an(e.r),this.g=an(e.g),this.b=an(e.b),this}copyLinearToSRGB(e){return this.r=on(e.r),this.g=on(e.g),this.b=on(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=rt){return rn.workingToColorSpace(er.copy(this),e),Math.round(Et(er.r*255,0,255))*65536+Math.round(Et(er.g*255,0,255))*256+Math.round(Et(er.b*255,0,255))}getHexString(e=rt){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=rn.workingColorSpace){rn.workingToColorSpace(er.copy(this),t);let n=er.r,r=er.g,i=er.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=rn.workingColorSpace){return rn.workingToColorSpace(er.copy(this),t),e.r=er.r,e.g=er.g,e.b=er.b,e}getStyle(e=rt){rn.workingToColorSpace(er.copy(this),e);let t=er.r,n=er.g,r=er.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Zn),this.setHSL(Zn.h+e,Zn.s+t,Zn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Zn),e.getHSL(Qn);let n=At(Zn.h,Qn.h,t),r=At(Zn.s,Qn.s,t),i=At(Zn.l,Qn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},er=new z;z.NAMES=Xn;var tr=class e{constructor(e,t=1,n=1e3){this.isFog=!0,this.name=``,this.color=new z(e),this.near=t,this.far=n}clone(){return new e(this.color,this.near,this.far)}toJSON(){return{type:`Fog`,name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},nr=class extends qn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new An,this.environmentIntensity=1,this.environmentRotation=new An,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background===null?null:e.background.clone(),this.environment=e.environment===null?null:e.environment.clone(),this.fog=e.fog===null?null:e.fog.clone(),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial===null?null:e.overrideMaterial.clone(),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},rr=new L,ir=new L,ar=new L,or=new L,sr=new L,cr=new L,lr=new L,ur=new L,dr=new L,fr=new L,pr=new hn,mr=new hn,hr=new hn,gr=class e{constructor(e=new L,t=new L,n=new L){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),rr.subVectors(e,t),r.cross(rr);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){rr.subVectors(r,t),ir.subVectors(n,t),ar.subVectors(e,t);let a=rr.dot(rr),o=rr.dot(ir),s=rr.dot(ar),c=ir.dot(ir),l=ir.dot(ar),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,or)!==null&&or.x>=0&&or.y>=0&&or.x+or.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,or)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,or.x),s.addScaledVector(a,or.y),s.addScaledVector(o,or.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return pr.setScalar(0),mr.setScalar(0),hr.setScalar(0),pr.fromBufferAttribute(e,t),mr.fromBufferAttribute(e,n),hr.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(pr,i.x),a.addScaledVector(mr,i.y),a.addScaledVector(hr,i.z),a}static isFrontFacing(e,t,n,r){return rr.subVectors(n,t),ir.subVectors(e,t),rr.cross(ir).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return rr.subVectors(this.c,this.b),ir.subVectors(this.a,this.b),rr.cross(ir).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;sr.subVectors(r,n),cr.subVectors(i,n),ur.subVectors(e,n);let s=sr.dot(ur),c=cr.dot(ur);if(s<=0&&c<=0)return t.copy(n);dr.subVectors(e,r);let l=sr.dot(dr),u=cr.dot(dr);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0&&s-l>0)return a=s/(s-l),t.copy(n).addScaledVector(sr,a);fr.subVectors(e,i);let f=sr.dot(fr),p=cr.dot(fr);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(cr,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return lr.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(lr,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(sr,a).addScaledVector(cr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},_r=class{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(yr.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(yr.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=yr.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,yr):yr.fromBufferAttribute(r,t),yr.applyMatrix4(e.matrixWorld),this.expandByPoint(yr);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),br.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),br.copy(e.boundingBox)),br.applyMatrix4(e.matrixWorld),this.union(br)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,yr),yr.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Dr),Or.subVectors(this.max,Dr),xr.subVectors(e.a,Dr),Sr.subVectors(e.b,Dr),Cr.subVectors(e.c,Dr),wr.subVectors(Sr,xr),Tr.subVectors(Cr,Sr),Er.subVectors(xr,Cr);let t=[0,-wr.z,wr.y,0,-Tr.z,Tr.y,0,-Er.z,Er.y,wr.z,0,-wr.x,Tr.z,0,-Tr.x,Er.z,0,-Er.x,-wr.y,wr.x,0,-Tr.y,Tr.x,0,-Er.y,Er.x,0];return!jr(t,xr,Sr,Cr,Or)||(t=[1,0,0,0,1,0,0,0,1],!jr(t,xr,Sr,Cr,Or))?!1:(kr.crossVectors(wr,Tr),t=[kr.x,kr.y,kr.z],jr(t,xr,Sr,Cr,Or))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,yr).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(yr).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(vr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),vr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),vr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),vr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),vr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),vr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),vr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),vr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(vr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},vr=[new L,new L,new L,new L,new L,new L,new L,new L],yr=new L,br=new _r,xr=new L,Sr=new L,Cr=new L,wr=new L,Tr=new L,Er=new L,Dr=new L,Or=new L,kr=new L,Ar=new L;function jr(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){Ar.fromArray(e,a);let o=i.x*Math.abs(Ar.x)+i.y*Math.abs(Ar.y)+i.z*Math.abs(Ar.z),s=t.dot(Ar),c=n.dot(Ar),l=r.dot(Ar);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var Mr=new L,Nr=new I,Pr=0,Fr=class extends bt{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Pr++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=ct,this.updateRanges=[],this.gpuType=A,this.version=0,this._normalizationScale=e===void 0?void 0:Gt(e)}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Nr.fromBufferAttribute(this,t),Nr.applyMatrix3(e),this.setXY(t,Nr.x,Nr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Mr.fromBufferAttribute(this,t),Mr.applyMatrix3(e),this.setXYZ(t,Mr.x,Mr.y,Mr.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Mr.fromBufferAttribute(this,t),Mr.applyMatrix4(e),this.setXYZ(t,Mr.x,Mr.y,Mr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Mr.fromBufferAttribute(this,t),Mr.applyNormalMatrix(e),this.setXYZ(t,Mr.x,Mr.y,Mr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Mr.fromBufferAttribute(this,t),Mr.transformDirection(e),this.setXYZ(t,Mr.x,Mr.y,Mr.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:`dispose`})}_denormalize(e){let t=this._normalizationScale;return t===void 0?Kt(e,this.array):Math.max(e/t,-1)}_normalize(e){let t=this._normalizationScale;return t===void 0?qt(e,this.array):Math.round(e*t)}},Ir=class extends Fr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},Lr=class extends Fr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Rr=class extends Fr{constructor(e,t,n){super(new Float32Array(e),t,n)}},zr=new _r,Br=new L,Vr=new L,Hr=class{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?zr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Br.subVectors(e,this.center);let t=Br.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(Br,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Vr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Br.copy(e.center).add(Vr)),this.expandByPoint(Br.copy(e.center).sub(Vr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Ur=0,Wr=new bn,Gr=new qn,Kr=new L,qr=new _r,Jr=new _r,Yr=new L,Xr=class e extends bt{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ur++}),this.uuid=Tt(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(ut(e)?Lr:Ir)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new Qt().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Wr.makeRotationFromQuaternion(e),this.applyMatrix4(Wr),this}rotateX(e){return Wr.makeRotationX(e),this.applyMatrix4(Wr),this}rotateY(e){return Wr.makeRotationY(e),this.applyMatrix4(Wr),this}rotateZ(e){return Wr.makeRotationZ(e),this.applyMatrix4(Wr),this}translate(e,t,n){return Wr.makeTranslation(e,t,n),this.applyMatrix4(Wr),this}scale(e,t,n){return Wr.makeScale(e,t,n),this.applyMatrix4(Wr),this}lookAt(e){return Gr.lookAt(e),Gr.updateMatrix(),this.applyMatrix4(Gr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Kr).negate(),this.translate(Kr.x,Kr.y,Kr.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new Rr(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&P(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new _r);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){F(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];qr.setFromBufferAttribute(n),this.morphTargetsRelative?(Yr.addVectors(this.boundingBox.min,qr.min),this.boundingBox.expandByPoint(Yr),Yr.addVectors(this.boundingBox.max,qr.max),this.boundingBox.expandByPoint(Yr)):(this.boundingBox.expandByPoint(qr.min),this.boundingBox.expandByPoint(qr.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&F(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Hr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){F(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new L,1/0);return}if(e){let n=this.boundingSphere.center;if(qr.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Jr.setFromBufferAttribute(n),this.morphTargetsRelative?(Yr.addVectors(qr.min,Jr.min),qr.expandByPoint(Yr),Yr.addVectors(qr.max,Jr.max),qr.expandByPoint(Yr)):(qr.expandByPoint(Jr.min),qr.expandByPoint(Jr.max))}qr.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Yr.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Yr));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Yr.fromBufferAttribute(a,t),o&&(Kr.fromBufferAttribute(e,t),Yr.add(Kr)),r=Math.max(r,n.distanceToSquared(Yr))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&F(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){F(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new Fr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[],c=new Uint8Array(n.count);for(let e=0;e<n.count;e++)o[e]=new L,s[e]=new L;let l=new L,u=new L,d=new L,f=new I,p=new I,m=new I,h=new L,g=new L;function _(e,t,r){c[e]=c[t]=c[r]=1,l.fromBufferAttribute(n,e),u.fromBufferAttribute(n,t),d.fromBufferAttribute(n,r),f.fromBufferAttribute(i,e),p.fromBufferAttribute(i,t),m.fromBufferAttribute(i,r),u.sub(l),d.sub(l),p.sub(f),m.sub(f);let a=1/(p.x*m.y-m.x*p.y);isFinite(a)&&(h.copy(u).multiplyScalar(m.y).addScaledVector(d,-p.y).multiplyScalar(a),g.copy(d).multiplyScalar(p.x).addScaledVector(u,-m.x).multiplyScalar(a),o[e].add(h),o[t].add(h),o[r].add(h),s[e].add(g),s[t].add(g),s[r].add(g))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let t=0,n=v.length;t<n;++t){let n=v[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)_(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let y=new L,b=new L,x=new L,S=new L;function C(e){x.fromBufferAttribute(r,e),S.copy(x);let t=o[e];y.copy(t),y.sub(x.multiplyScalar(x.dot(t))).normalize(),b.crossVectors(S,t);let n=b.dot(s[e])<0?-1:1;a.setXYZW(e,y.x,y.y,y.z,n)}for(let e=0,t=n.count;e<t;++e)c[e]&&C(e);this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new Fr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new L,i=new L,a=new L,o=new L,s=new L,c=new L,l=new L,u=new L;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Yr.fromBufferAttribute(e,t),Yr.normalize(),e.setXYZ(t,Yr.x,Yr.y,Yr.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new Fr(a,r,i)}if(this.index===null)return P(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Zr=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=ct,this.updateRanges=[],this.version=0,this.uuid=Tt()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});let t=Qr(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=this.array.slice(0).buffer);let n=new this.array.constructor(e.arrayBuffers[t]),r=new this.constructor(n,this.stride);return r.setUsage(this.usage),r}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});let t=Qr(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=Array.from(new Uint32Array(this.array.slice(0).buffer)));let n={uuid:this.uuid,buffer:t,type:this.array.constructor.name,stride:this.stride};return n.usage=this.usage,n}};function Qr(e){return e.buffer._uuid===void 0&&(e.buffer._uuid=Tt()),e.byteOffset===0&&e.byteLength===e.buffer.byteLength?e.buffer._uuid:e.buffer._uuid+`:`+e.byteOffset+`:`+e.byteLength}var $r=new L,ei=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r,this._normalizationScale=e===void 0?void 0:Gt(e.array)}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)$r.fromBufferAttribute(this,t),$r.applyMatrix4(e),this.setXYZ(t,$r.x,$r.y,$r.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)$r.fromBufferAttribute(this,t),$r.applyNormalMatrix(e),this.setXYZ(t,$r.x,$r.y,$r.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)$r.fromBufferAttribute(this,t),$r.transformDirection(e),this.setXYZ(t,$r.x,$r.y,$r.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=this._denormalize(t)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=this._denormalize(t)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=this._denormalize(t)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=this._denormalize(t)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r),i=this._normalize(i)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){ht(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new Fr(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){ht(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(e){let t=this._normalizationScale;return t===void 0?Kt(e,this.data.array):Math.max(e/t,-1)}_normalize(e){let t=this._normalizationScale;return t===void 0?qt(e,this.data.array):Math.round(e*t)}},ti=new L,ni=new L,ri=new Qt,ii=class{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=ti.subVectors(n,t).cross(ni.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(ti),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||ri.getNormalMatrix(e),r=this.coplanarPoint(ti).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},ai=0,oi=class extends bt{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ai++}),this.uuid=Tt(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new z(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=st,this.stencilZFail=st,this.stencilZPass=st,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){P(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){P(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(e=>e.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new z().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(e=>new ii().fromJSON(e))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new I().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new I().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},si=class extends oi{constructor(e){super(),this.isSpriteMaterial=!0,this.type=`SpriteMaterial`,this.color=new z(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},ci,li=new L,ui=new L,di=new L,fi=new I,pi=new I,mi=new bn,hi=new L,gi=new L,_i=new L,vi=new I,yi=new I,bi=new I,xi=class extends qn{constructor(e=new si){if(super(),this.isSprite=!0,this.type=`Sprite`,ci===void 0){ci=new Xr;let e=new Zr(new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),5);ci.setIndex([0,1,2,0,2,3]),ci.setAttribute(`position`,new ei(e,3,0,!1)),ci.setAttribute(`uv`,new ei(e,2,3,!1))}this.geometry=ci,this.material=e,this.center=new I(.5,.5),this.count=1}intersectsFrustum(e){return e.intersectsSprite(this)}raycast(e,t){e.camera===null&&F(`Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.`),ui.setFromMatrixScale(this.matrixWorld),mi.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),di.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ui.multiplyScalar(-di.z);let n=this.material.rotation,r,i;n!==0&&(i=Math.cos(n),r=Math.sin(n));let a=this.center;Si(hi.set(-.5,-.5,0),di,a,ui,r,i),Si(gi.set(.5,-.5,0),di,a,ui,r,i),Si(_i.set(.5,.5,0),di,a,ui,r,i),vi.set(0,0),yi.set(1,0),bi.set(1,1);let o=e.ray.intersectTriangle(hi,gi,_i,!1,li);if(o===null&&(Si(gi.set(-.5,.5,0),di,a,ui,r,i),yi.set(0,1),o=e.ray.intersectTriangle(hi,_i,gi,!1,li),o===null))return;let s=e.ray.origin.distanceTo(li);s<e.near||s>e.far||t.push({distance:s,point:li.clone(),uv:gr.getInterpolation(li,hi,gi,_i,vi,yi,bi,new I),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}toJSON(e){let t=super.toJSON(e);return t.object.center=this.center.toArray(),t}};function Si(e,t,n,r,i,a){fi.subVectors(e,n).addScalar(.5).multiply(r),i===void 0?pi.copy(fi):(pi.x=a*fi.x-i*fi.y,pi.y=i*fi.x+a*fi.y),e.copy(t),e.x+=pi.x,e.y+=pi.y,e.applyMatrix4(mi)}var Ci=new L,wi=new L,Ti=new L,Ei=new L,Di=class{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ci)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Ci.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ci.copy(this.origin).addScaledVector(this.direction,t),Ci.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){wi.copy(e).add(t).multiplyScalar(.5),Ti.copy(t).sub(e).normalize(),Ei.copy(this.origin).sub(wi);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Ti),o=Ei.dot(this.direction),s=-Ei.dot(Ti),c=Ei.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0)if(u=a*s-o,d=a*o-s,p=i*l,u>=0)if(d>=-p)if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c);else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(wi).addScaledVector(Ti,d),f}intersectSphere(e,t){if(e.radius<0)return null;Ci.subVectors(e.center,this.origin);let n=Ci.dot(this.direction),r=Ci.dot(Ci)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Ci)!==null}intersectTriangle(e,t,n,r,i){let a=this.origin,o=this.direction,s=o.x,c=o.y,l=o.z,u=e.x-a.x,d=e.y-a.y,f=e.z-a.z,p=t.x-a.x,m=t.y-a.y,h=t.z-a.z,g=n.x-a.x,_=n.y-a.y,v=n.z-a.z,y=Math.abs(s),b=Math.abs(c),x=Math.abs(l),S,C,w,T,E,D,O,k,A,ee,te,ne;if(y>=b&&y>=x?(w=s,D=u,A=p,ne=g,s>=0?(S=c,C=l,T=d,E=f,O=m,k=h,ee=_,te=v):(S=l,C=c,T=f,E=d,O=h,k=m,ee=v,te=_)):b>=x?(w=c,D=d,A=m,ne=_,c>=0?(S=l,C=s,T=f,E=u,O=h,k=p,ee=v,te=g):(S=s,C=l,T=u,E=f,O=p,k=h,ee=g,te=v)):(w=l,D=f,A=h,ne=v,l>=0?(S=s,C=c,T=u,E=d,O=p,k=m,ee=g,te=_):(S=c,C=s,T=d,E=u,O=m,k=p,ee=_,te=g)),w===0)return null;let re=S/w,ie=C/w,ae=1/w,oe=T-re*D,se=E-ie*D,ce=O-re*A,le=k-ie*A,ue=ee-re*ne,de=te-ie*ne,fe=ue*le-de*ce,pe=oe*de-se*ue,me=ce*se-le*oe;if(r){if(fe<0||pe<0||me<0)return null}else if((fe<0||pe<0||me<0)&&(fe>0||pe>0||me>0))return null;let he=fe+pe+me;if(he===0)return null;let ge=ae*(fe*D+pe*A+me*ne);return(he>0?ge<0:ge>0)?null:this.at(ge/he,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Oi=class extends oi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new z(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new An,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},ki=new bn,Ai=new Di,ji=new Hr,Mi=new L,Ni=new L,Pi=new L,Fi=new L,Ii=new L,Li=new L,Ri=new L,zi=new L,B=class extends qn{constructor(e=new Xr,t=new Oi){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){Li.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(Ii.fromBufferAttribute(s,e),a?Li.addScaledVector(Ii,r):Li.addScaledVector(Ii.sub(t),r))}t.add(Li)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ji.copy(n.boundingSphere),ji.applyMatrix4(i),Ai.copy(e.ray).recast(e.near),!(ji.containsPoint(Ai.origin)===!1&&(Ai.intersectSphere(ji,Mi)===null||Ai.origin.distanceToSquared(Mi)>(e.far-e.near)**2))&&(ki.copy(i).invert(),Ai.copy(e.ray).applyMatrix4(ki),(n.boundingBox===null||Ai.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,Ai)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null)if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=Vi(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=Vi(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}else if(s!==void 0)if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=Vi(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=Vi(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}};function Bi(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;zi.copy(s),zi.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(zi);return l<n.near||l>n.far?null:{distance:l,point:zi.clone(),object:e}}function Vi(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,Ni),e.getVertexPosition(c,Pi),e.getVertexPosition(l,Fi);let u=Bi(e,t,n,r,Ni,Pi,Fi,Ri);if(u){let e=new L;gr.getBarycoord(Ri,Ni,Pi,Fi,e),i&&(u.uv=gr.getInterpolatedAttribute(i,s,c,l,e,new I)),a&&(u.uv1=gr.getInterpolatedAttribute(a,s,c,l,e,new I)),o&&(u.normal=gr.getInterpolatedAttribute(o,s,c,l,e,new L),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new L,materialIndex:0};gr.getNormal(Ni,Pi,Fi,t.normal),u.face=t,u.barycoord=e}return u}var Hi=class extends mn{constructor(e=null,t=1,n=1,r,i,a,o,s,c=v,l=v,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Ui=class extends Fr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Wi=new bn,Gi=new bn,Ki=[],qi=new _r,Ji=new bn,Yi=new B,Xi=new Hr,Zi=class extends B{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ui(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Ji)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new _r),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Wi),qi.copy(e.boundingBox).applyMatrix4(Wi),this.boundingBox.union(qi)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Hr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Wi),Xi.copy(e.boundingSphere).applyMatrix4(Wi),this.boundingSphere.union(Xi)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),this.morphTexture=e.morphTexture===null?null:e.morphTexture.clone(),this.instanceColor=e.instanceColor===null?null:e.instanceColor.clone(),this.count=e.count,this.boundingBox=e.boundingBox===null?null:e.boundingBox.clone(),this.boundingSphere=e.boundingSphere===null?null:e.boundingSphere.clone(),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(Yi.geometry=this.geometry,Yi.material=this.material,Yi.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Xi.copy(this.boundingSphere),Xi.applyMatrix4(n),e.ray.intersectsSphere(Xi)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,Wi),Gi.multiplyMatrices(n,Wi),Yi.matrixWorld=Gi,Yi.raycast(e,Ki);for(let e=0,n=Ki.length;e<n;e++){let n=Ki[e];n.instanceId=i,n.object=this,t.push(n)}Ki.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Ui(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Hi(new Float32Array(r*this.count),r,this.count,de,A));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Qi=new Hr,$i=new I(.5,.5),ea=new L,ta=class{constructor(e=new ii,t=new ii,n=new ii,r=new ii,i=new ii,a=new ii){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=lt,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Qi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Qi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Qi)}intersectsSprite(e){return Qi.center.set(0,0,0),Qi.radius=.7071067811865476+$i.distanceTo(e.center),Qi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Qi)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(ea.x=r.normal.x>0?e.max.x:e.min.x,ea.y=r.normal.y>0?e.max.y:e.min.y,ea.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(ea)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},na=new bn,ra=class e{constructor(){this.coordinateSystem=lt,this._frustums=[],this._count=0}setFromArrayCamera(e){let t=e.cameras,n=this._frustums;for(let e=0;e<t.length;e++){let r=t[e];na.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[e]===void 0&&(n[e]=new ta),n[e].setFromProjectionMatrix(na,r.coordinateSystem,r.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;let t=this._frustums,n=e._frustums;for(let r=0;r<e._count;r++)t[r]===void 0&&(t[r]=new ta),t[r].copy(n[r]);return this._count=e._count,this}clone(){return new e().copy(this)}},ia=class extends oi{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new z(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},aa=new L,oa=new L,sa=new bn,ca=new Di,la=new Hr,ua=new L,da=new L,fa=class extends qn{constructor(e=new Xr,t=new ia){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)aa.fromBufferAttribute(t,e-1),oa.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=aa.distanceTo(oa);e.setAttribute(`lineDistance`,new Rr(n,1))}else P(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),la.copy(n.boundingSphere),la.applyMatrix4(r),la.radius+=i,e.ray.intersectsSphere(la)===!1)return;sa.copy(r).invert(),ca.copy(e.ray).applyMatrix4(sa);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=pa(this,e,ca,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=pa(this,e,ca,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=pa(this,e,ca,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=pa(this,e,ca,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function pa(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(aa.fromBufferAttribute(s,i),oa.fromBufferAttribute(s,a),n.distanceSqToSegment(aa,oa,ua,da)>r)return;ua.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(ua);if(!(c<t.near||c>t.far))return{distance:c,point:da.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var ma=new L,ha=new L,ga=class extends fa{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)ma.fromBufferAttribute(t,e),ha.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+ma.distanceTo(ha);e.setAttribute(`lineDistance`,new Rr(n,1))}else P(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},_a=class extends oi{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new z(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},va=new bn,ya=new Di,ba=new Hr,xa=new L,Sa=class extends qn{constructor(e=new Xr,t=new _a){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ba.copy(n.boundingSphere),ba.applyMatrix4(r),ba.radius+=i,e.ray.intersectsSphere(ba)===!1)return;va.copy(r).invert(),ya.copy(e.ray).applyMatrix4(va);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);xa.fromBufferAttribute(l,n),Ca(xa,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)xa.fromBufferAttribute(l,a),Ca(xa,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Ca(e,t,n,r,i,a,o){let s=ya.distanceSqToPoint(e);if(s<n){let n=new L;ya.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var wa=class extends mn{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ta=class extends mn{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},Ea=class extends mn{constructor(e,t,n=k,r,i,a,o=v,s=v,c,l=le,u=1){if(l!==1026&&l!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:u},r,i,a,o,s,l,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new un(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},Da=class extends Ea{constructor(e,t=k,n=301,r,i,a=v,o=v,s,c=le){let l={width:e,height:e,depth:1},u=[l,l,l,l,l,l];super(e,e,t,n,r,i,a,o,s,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Oa=class extends mn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},ka=class e extends Xr{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new Rr(c,3)),this.setAttribute(`normal`,new Rr(l,3)),this.setAttribute(`uv`,new Rr(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new L;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Aa=class e extends Xr{constructor(e=1,t=1,n=4,r=8,i=1){super(),this.type=`CapsuleGeometry`,this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:i},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),i=Math.max(1,Math.floor(i));let a=[],o=[],s=[],c=[],l=t/2,u=Math.PI/2*e,d=t,f=2*u+d,p=n*2+i,m=r+1,h=new L,g=new L;for(let _=0;_<=p;_++){let v=0,y=0,b=0,x=0;if(_<=n){let t=_/n,r=t*Math.PI/2;y=-l-e*Math.cos(r),b=e*Math.sin(r),x=-e*Math.cos(r),v=t*u}else if(_<=n+i){let r=(_-n)/i;y=-l+r*t,b=e,x=0,v=u+r*d}else{let t=(_-n-i)/n,r=t*Math.PI/2;y=l+e*Math.sin(r),b=e*Math.cos(r),x=e*Math.sin(r),v=u+d+t*u}let S=Math.max(0,Math.min(1,v/f)),C=0;_===0?C=.5/r:_===p&&(C=-.5/r);for(let e=0;e<=r;e++){let t=e/r,n=t*Math.PI*2,i=Math.sin(n),a=Math.cos(n);g.x=-b*a,g.y=y,g.z=b*i,o.push(g.x,g.y,g.z),h.set(-b*a,x,b*i),h.normalize(),s.push(h.x,h.y,h.z),c.push(t+C,S)}if(_>0){let e=(_-1)*m;for(let t=0;t<r;t++){let n=e+t,r=e+t+1,i=_*m+t,o=_*m+t+1;a.push(n,r,i),a.push(r,o,i)}}}this.setIndex(a),this.setAttribute(`position`,new Rr(o,3)),this.setAttribute(`normal`,new Rr(s,3)),this.setAttribute(`uv`,new Rr(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},ja=class e extends Xr{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new L,l=new I;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new Rr(a,3)),this.setAttribute(`normal`,new Rr(o,3)),this.setAttribute(`uv`,new Rr(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},Ma=class e extends Xr{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new Rr(u,3)),this.setAttribute(`normal`,new Rr(d,3)),this.setAttribute(`uv`,new Rr(f,2));function _(){let a=new L,_=new L,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new I,m=new L,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Na=class e extends Ma{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Pa=class e extends Xr{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new Rr(i,3)),this.setAttribute(`normal`,new Rr(i.slice(),3)),this.setAttribute(`uv`,new Rr(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new L,r=new L,i=new L;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new L;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new L;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new L,t=new L,n=new L,r=new L,o=new I,s=new I,c=new I;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},Fa=class e extends Pa{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=1/n,i=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r];super(i,[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],e,t),this.type=`DodecahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ia=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){P(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new I:new L);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new L,r=[],i=[],a=[],o=new L,s=new bn;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new L)}i[0]=new L,a[0]=new L;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(Et(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(Et(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}};function La(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var Ra=new L,za=new L,Ba=new La,Va=new La,Ha=new La,Ua=class extends Ia{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new L){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(za.subVectors(r[0],r[1]).add(r[0]),c=za);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(Ra.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=Ra),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),Ba.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),Va.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),Ha.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(Ba.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),Va.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),Ha.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(Ba.calc(s),Va.calc(s),Ha.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new L().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}},Wa=class e extends Pa{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ga=class e extends Pa{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type=`OctahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ka=class e extends Xr{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new Rr(p,3)),this.setAttribute(`normal`,new Rr(m,3)),this.setAttribute(`uv`,new Rr(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},qa=class e extends Xr{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new L,p=new I;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new Rr(s,3)),this.setAttribute(`normal`,new Rr(c,3)),this.setAttribute(`uv`,new Rr(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Ja=class e extends Xr{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new L,d=new L,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new Rr(p,3)),this.setAttribute(`normal`,new Rr(m,3)),this.setAttribute(`uv`,new Rr(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Ya=class e extends Xr{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new L,f=new L,p=new L;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new Rr(c,3)),this.setAttribute(`normal`,new Rr(l,3)),this.setAttribute(`uv`,new Rr(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};function Xa(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Qa(i))i.isRenderTargetTexture?(P(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i))if(Qa(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice();else t[n][r]=i}}return t}function Za(e){let t={};for(let n=0;n<e.length;n++){let r=Xa(e[n]);for(let e in r)t[e]=r[e]}return t}function Qa(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function $a(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function eo(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:rn.workingColorSpace}var to={clone:Xa,merge:Za},no=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ro=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,io=class extends oi{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=no,this.fragmentShader=ro,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Xa(e.uniforms),this.uniformsGroups=$a(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new z().setHex(r.value);break;case`v2`:this.uniforms[n].value=new I().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new L().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new hn().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new Qt().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new bn().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},ao=class extends io{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},oo=class extends oi{constructor(e){super(),this.isMeshToonMaterial=!0,this.defines={TOON:``},this.type=`MeshToonMaterial`,this.color=new z(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new z(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new I(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.gradientMap=e.gradientMap,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.alphaMap=e.alphaMap,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},so=class extends oi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=nt,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},co=class extends oi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function lo(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function uo(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}var fo=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},po=class extends fo{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:$e,endingEnd:$e}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case et:i=e,o=2*t-n;break;case tt:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case et:a=e,s=2*n-t;break;case tt:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},mo=class extends fo{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},ho=class extends fo{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},go=class extends fo{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=yo(n,t,g,y,r);i[p]=_o(x,o,_,b,m)}return i}};function _o(e,t,n,r,i){let a=1-e;return a*a*a*t+3*a*a*e*n+3*a*e*e*r+e*e*e*i}function vo(e,t,n,r,i){let a=1-e;return 3*a*a*(n-t)+6*a*e*(r-n)+3*e*e*(i-r)}function yo(e,t,n,r,i){let a=(e-t)/(i-t);for(let o=0;o<8;o++){let o=_o(a,t,n,r,i)-e;if(Math.abs(o)<1e-10)break;let s=vo(a,t,n,r,i);if(Math.abs(s)<1e-10)break;a=Math.max(0,Math.min(1,a-o/s))}return a}var bo=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=lo(t,this.TimeBufferType),this.values=lo(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:lo(e.times,Array),values:lo(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t),uo(e.settings)&&(n.settings={inTangents:lo(e.settings.inTangents,Array),outTangents:lo(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ho(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new mo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new po(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new go(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Ye:t=this.InterpolantFactoryMethodDiscrete;break;case Xe:t=this.InterpolantFactoryMethodLinear;break;case Ze:t=this.InterpolantFactoryMethodSmooth;break;case Qe:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t);return P(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ye;case this.InterpolantFactoryMethodLinear:return Xe;case this.InterpolantFactoryMethodSmooth:return Ze;case this.InterpolantFactoryMethodBezier:return Qe}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e;uo(this.settings)&&(xo(this.settings.inTangents,e),xo(this.settings.outTangents,e))}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;uo(this.settings)&&(So(this.settings.inTangents,e),So(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(F(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(F(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){F(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){F(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&dt(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){F(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Ze,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0]))if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,uo(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function xo(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]+=t}function So(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]*=t}bo.prototype.ValueTypeName=``,bo.prototype.TimeBufferType=Float32Array,bo.prototype.ValueBufferType=Float32Array,bo.prototype.DefaultInterpolation=Xe;var Co=class extends bo{constructor(e,t,n){super(e,t,n)}};Co.prototype.ValueTypeName=`bool`,Co.prototype.ValueBufferType=Array,Co.prototype.DefaultInterpolation=Ye,Co.prototype.InterpolantFactoryMethodLinear=void 0,Co.prototype.InterpolantFactoryMethodSmooth=void 0;var wo=class extends bo{constructor(e,t,n,r){super(e,t,n,r)}};wo.prototype.ValueTypeName=`color`;var To=class extends bo{constructor(e,t,n,r){super(e,t,n,r)}};To.prototype.ValueTypeName=`number`;var Eo=class extends fo{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Yt.slerpFlat(i,0,a,c-o,a,c,s);return i}},Do=class extends bo{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new Eo(this.times,this.values,this.getValueSize(),e)}};Do.prototype.ValueTypeName=`quaternion`,Do.prototype.InterpolantFactoryMethodSmooth=void 0;var Oo=class extends bo{constructor(e,t,n){super(e,t,n)}};Oo.prototype.ValueTypeName=`string`,Oo.prototype.ValueBufferType=Array,Oo.prototype.DefaultInterpolation=Ye,Oo.prototype.InterpolantFactoryMethodLinear=void 0,Oo.prototype.InterpolantFactoryMethodSmooth=void 0;var ko=class extends bo{constructor(e,t,n,r){super(e,t,n,r)}};ko.prototype.ValueTypeName=`vector`;var Ao=class extends qn{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new z(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},jo=class extends Ao{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(qn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new z(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},Mo=new bn,No=new L,Po=new L,Fo=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new I(512,512),this.mapType=w,this.map=null,this.mapPass=null,this.matrix=new bn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ta,this._frameExtents=new I(1,1),this._viewportCount=1,this._viewports=[new hn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;No.setFromMatrixPosition(e.matrixWorld),t.position.copy(No),Po.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Po),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,r){Mo.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(Mo,e.coordinateSystem,e.reversedDepth);let i=this._frameExtents,a=r?r.z/i.x:1,o=r?r.w/i.y:1,s=r?r.x/i.x:0,c=r?r.y/i.y:0;e.coordinateSystem===2001||e.reversedDepth?t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),t.multiply(Mo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Io=new L,Lo=new Yt,Ro=new L,zo=class extends qn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new bn,this.projectionMatrix=new bn,this.projectionMatrixInverse=new bn,this.coordinateSystem=lt,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Io,Lo,Ro),Ro.x===1&&Ro.y===1&&Ro.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Io,Lo,Ro.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Io,Lo,Ro),Ro.x===1&&Ro.y===1&&Ro.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Io,Lo,Ro.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Bo=new L,Vo=new I,Ho=new I,Uo=class extends zo{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=wt*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ct*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return wt*2*Math.atan(Math.tan(Ct*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Bo.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Bo.x,Bo.y).multiplyScalar(-e/Bo.z),Bo.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Bo.x,Bo.y).multiplyScalar(-e/Bo.z)}getViewSize(e,t){return this.getViewBounds(e,Vo,Ho),t.subVectors(Ho,Vo)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ct*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Wo=class extends Fo{constructor(){super(new Uo(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=wt*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){let e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}},Go=class extends Ao{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(qn.DEFAULT_UP),this.updateMatrix(),this.target=new qn,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new Wo}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},Ko=class extends Fo{constructor(){super(new Uo(90,1,.5,500)),this.isPointLightShadow=!0}},qo=class extends Ao{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Ko}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},Jo=class extends zo{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Yo=class extends Fo{constructor(){super(new Jo(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Xo=class extends Ao{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(qn.DEFAULT_UP),this.updateMatrix(),this.target=new qn,this.shadow=new Yo}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Zo=-90,Qo=1,$o=class extends qn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Uo(Zo,Qo,e,t);r.layers=this.layers,this.add(r);let i=new Uo(Zo,Qo,e,t);i.layers=this.layers,this.add(i);let a=new Uo(Zo,Qo,e,t);a.layers=this.layers,this.add(a);let o=new Uo(Zo,Qo,e,t);o.layers=this.layers,this.add(o);let s=new Uo(Zo,Qo,e,t);s.layers=this.layers,this.add(s);let c=new Uo(Zo,Qo,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.mipmapsAutoUpdate=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},es=class extends Uo{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}},ts=`\\[\\]\\.:\\/`,ns=RegExp(`[\\[\\]\\.:\\/]`,`g`),rs=`[^\\[\\]\\.:\\/]`,is=`[^`+ts.replace(`\\.`,``)+`]`,as=`((?:WC+[\\/:])*)`.replace(`WC`,rs),os=`(WCOD+)?`.replace(`WCOD`,is),ss=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,rs),cs=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,rs),ls=RegExp(`^`+as+os+ss+cs+`$`),us=[`material`,`materials`,`bones`,`map`],ds=class{constructor(e,t,n){let r=n||fs.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},fs=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(ns,``)}static parseTrackName(e){let t=ls.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);us.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){P(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){F(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){F(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){F(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){F(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){F(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){F(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){F(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;F(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){F(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){F(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};fs.Composite=ds,fs.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},fs.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},fs.prototype.GetterByBindingType=[fs.prototype._getValue_direct,fs.prototype._getValue_array,fs.prototype._getValue_arrayElement,fs.prototype._getValue_toArray],fs.prototype.SetterByBindingTypeAndVersioning=[[fs.prototype._setValue_direct,fs.prototype._setValue_direct_setNeedsUpdate,fs.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[fs.prototype._setValue_array,fs.prototype._setValue_array_setNeedsUpdate,fs.prototype._setValue_array_setMatrixWorldNeedsUpdate],[fs.prototype._setValue_arrayElement,fs.prototype._setValue_arrayElement_setNeedsUpdate,fs.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[fs.prototype._setValue_fromArray,fs.prototype._setValue_fromArray_setNeedsUpdate,fs.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var ps=new bn,ms=class{constructor(e,t,n=0,r=1/0){this.ray=new Di(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new jn,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):F(`Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return ps.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(ps),this}intersectObject(e,t=!0,n=[]){return gs(e,this,n,t),n.sort(hs),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)gs(e[r],this,n,t);return n.sort(hs),n}};function hs(e,t){return e.distance-t.distance}function gs(e,t,n,r){let i=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(i=!1),i===!0&&r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)gs(r[e],t,n,!0)}}var _s=class{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){let e=1e-6;return this.phi=Et(this.phi,e,Math.PI-e),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(Et(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};(class{static{this.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}});var vs=class extends bt{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function ys(e,t,n,r){let i=bs(r);switch(n){case oe:return e*t;case de:return e*t/i.components*i.byteLength;case fe:return e*t/i.components*i.byteLength;case pe:return e*t*2/i.components*i.byteLength;case me:return e*t*2/i.components*i.byteLength;case se:return e*t*3/i.components*i.byteLength;case ce:return e*t*4/i.components*i.byteLength;case he:return e*t*4/i.components*i.byteLength;case ge:case _e:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ve:case ye:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case xe:case Ce:return Math.max(e,16)*Math.max(t,8)/4;case be:case Se:return Math.max(e,8)*Math.max(t,8)/2;case we:case Te:case De:case Oe:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case Ee:case ke:case Ae:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case je:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Me:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case Ne:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case Pe:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case Fe:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case Ie:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case Le:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Re:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case j:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case ze:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Be:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Ve:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case M:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case He:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case N:case Ue:case We:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Ge:case Ke:return Math.ceil(e/4)*Math.ceil(t/4)*8;case qe:case Je:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function bs(e){switch(e){case w:case T:return{byteLength:1,components:1};case D:case E:case ee:return{byteLength:2,components:1};case te:case ne:return{byteLength:2,components:4};case k:case O:case A:return{byteLength:4,components:1};case ie:case ae:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`187`}})),typeof window<`u`&&(window.__THREE__?P(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`187`);function xs(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Ss(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Cs={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},V={common:{diffuse:{value:new z(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Qt},alphaMap:{value:null},alphaMapTransform:{value:new Qt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Qt}},envmap:{envMap:{value:null},envMapRotation:{value:new Qt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Qt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Qt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Qt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Qt},normalScale:{value:new I(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Qt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Qt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Qt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Qt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new z(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new z(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Qt},alphaTest:{value:0},uvTransform:{value:new Qt}},sprite:{diffuse:{value:new z(16777215)},opacity:{value:1},center:{value:new I(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Qt},alphaMap:{value:null},alphaMapTransform:{value:new Qt},alphaTest:{value:0}}},ws={basic:{uniforms:Za([V.common,V.specularmap,V.envmap,V.aomap,V.lightmap,V.fog]),vertexShader:Cs.meshbasic_vert,fragmentShader:Cs.meshbasic_frag},lambert:{uniforms:Za([V.common,V.specularmap,V.envmap,V.aomap,V.lightmap,V.emissivemap,V.bumpmap,V.normalmap,V.displacementmap,V.fog,V.lights,{emissive:{value:new z(0)},envMapIntensity:{value:1}}]),vertexShader:Cs.meshlambert_vert,fragmentShader:Cs.meshlambert_frag},phong:{uniforms:Za([V.common,V.specularmap,V.envmap,V.aomap,V.lightmap,V.emissivemap,V.bumpmap,V.normalmap,V.displacementmap,V.fog,V.lights,{emissive:{value:new z(0)},specular:{value:new z(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Cs.meshphong_vert,fragmentShader:Cs.meshphong_frag},standard:{uniforms:Za([V.common,V.envmap,V.aomap,V.lightmap,V.emissivemap,V.bumpmap,V.normalmap,V.displacementmap,V.roughnessmap,V.metalnessmap,V.fog,V.lights,{emissive:{value:new z(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Cs.meshphysical_vert,fragmentShader:Cs.meshphysical_frag},toon:{uniforms:Za([V.common,V.aomap,V.lightmap,V.emissivemap,V.bumpmap,V.normalmap,V.displacementmap,V.gradientmap,V.fog,V.lights,{emissive:{value:new z(0)}}]),vertexShader:Cs.meshtoon_vert,fragmentShader:Cs.meshtoon_frag},matcap:{uniforms:Za([V.common,V.bumpmap,V.normalmap,V.displacementmap,V.fog,{matcap:{value:null}}]),vertexShader:Cs.meshmatcap_vert,fragmentShader:Cs.meshmatcap_frag},points:{uniforms:Za([V.points,V.fog]),vertexShader:Cs.points_vert,fragmentShader:Cs.points_frag},dashed:{uniforms:Za([V.common,V.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Cs.linedashed_vert,fragmentShader:Cs.linedashed_frag},depth:{uniforms:Za([V.common,V.displacementmap]),vertexShader:Cs.depth_vert,fragmentShader:Cs.depth_frag},normal:{uniforms:Za([V.common,V.bumpmap,V.normalmap,V.displacementmap,{opacity:{value:1}}]),vertexShader:Cs.meshnormal_vert,fragmentShader:Cs.meshnormal_frag},sprite:{uniforms:Za([V.sprite,V.fog]),vertexShader:Cs.sprite_vert,fragmentShader:Cs.sprite_frag},background:{uniforms:{uvTransform:{value:new Qt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Cs.background_vert,fragmentShader:Cs.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Qt}},vertexShader:Cs.backgroundCube_vert,fragmentShader:Cs.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Cs.cube_vert,fragmentShader:Cs.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Cs.equirect_vert,fragmentShader:Cs.equirect_frag},distance:{uniforms:Za([V.common,V.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Cs.distance_vert,fragmentShader:Cs.distance_frag},shadow:{uniforms:Za([V.lights,V.fog,{color:{value:new z(0)},opacity:{value:1}}]),vertexShader:Cs.shadow_vert,fragmentShader:Cs.shadow_frag}};ws.physical={uniforms:Za([ws.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Qt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Qt},clearcoatNormalScale:{value:new I(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Qt},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Qt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Qt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Qt},sheen:{value:0},sheenColor:{value:new z(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Qt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Qt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Qt},transmissionSamplerSize:{value:new I},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Qt},attenuationDistance:{value:0},attenuationColor:{value:new z(0)},specularColor:{value:new z(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Qt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Qt},anisotropyVector:{value:new I},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Qt}}]),vertexShader:Cs.meshphysical_vert,fragmentShader:Cs.meshphysical_frag};var Ts={r:0,b:0,g:0},Es=new bn,Ds=new Qt;Ds.set(-1,0,0,0,1,0,0,0,1);function Os(e,t,n,r,i,a){let o=new z(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&i.isCubeTexture?(l===void 0&&(l=new B(new ka(1,1,1),new io({name:`BackgroundCubeMaterial`,uniforms:Xa(ws.backgroundCube.uniforms),vertexShader:ws.backgroundCube.vertexShader,fragmentShader:ws.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Es.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Ds),l.material.toneMapped=rn.getTransfer(i.colorSpace)!==ot,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new B(new Ka(2,2),new io({name:`BackgroundMaterial`,uniforms:Xa(ws.background.uniforms),vertexShader:ws.background.vertexShader,fragmentShader:ws.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=rn.getTransfer(i.colorSpace)!==ot,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(Ts,eo(e)),n.buffers.color.setClear(Ts.r,Ts.g,Ts.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function ks(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function As(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function js(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(P(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&P(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&P(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function Ms(e){let t=this,n=null,r=0,i=!1,a=!1,o=new ii,s=new Qt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Ns=class extends _n{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new wa(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ka(5,5,5),i=new io({name:`CubemapFromEquirect`,uniforms:Xa(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new B(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=x),new $o(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Ps=256,Fs=3,Is=20,Ls=256,Rs=16,zs=3,Bs=new L,Vs=new z,Hs=class e{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new $o(1,10,null),this._boxMesh=new B(new ka(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Bs}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(Vs));let h=new $o(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ys(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Js(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Ps,Ut(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?Ps:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=Us(e,!1,!1),n=Math.log2(e)-Fs;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=Us(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ys()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Js()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=Gs(),this._integrationMaterial=Ks());let n=this._cubeSize,r=t.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/Rs);for(let o=0;o<=r;o++){let s=e.lodToRoughness(o,r);if(o>r-zs)a.roughness.value=s,this._renderCube(t,o,this._integrationMaterial);else{let e=s>0?Math.log2(n)+.5*Math.log2(6/(Ls*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=e,this._renderCube(t,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=qs());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function Us(e,t,n){return new Ns(e,{minFilter:C,generateMipmaps:t,type:ee,colorSpace:it,depthBuffer:n})}function Ws(e,t,n){return new io({name:e,uniforms:t,vertexShader:Cs.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function Gs(){return Ws(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Ls}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Ks(){return Ws(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Rs}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function qs(){return Ws(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Is}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Js(){return Ws(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Ys(){return Ws(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Xs(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304)if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}else{let r=n.image;if(r&&r.height>0){let i=new Ns(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Hs(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Hs(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Zs(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&_t(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Qs(e,t,n,r){let i={},a=new WeakMap,o=new FinalizationRegistry(e=>delete i[e]);function s(e){c(e.target)}function c(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,s),delete i[e.id],o.unregister(e);let c=a.get(e);c&&(t.remove(c),a.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function l(e,t){return i[t.id]===void 0?(t.addEventListener(`dispose`,s),i[t.id]=new WeakRef(t),o.register(t,t.id,t),n.memory.geometries++,t):t}function u(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function d(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let o=n===null?r.array.length/3-1:n.array.length,s=new(r.count>=65535?Lr:Ir)(Math.ceil(o/3)*6,1),c=s.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<o;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];c[n++]=r,c[n++]=i,c[n++]=i,c[n++]=a,c[n++]=a,c[n++]=r}}else{i=r.version;for(let e=0,t=0;e<o;e+=3){let n=e+0,r=e+1,i=e+2;c[t++]=n,c[t++]=r,c[t++]=r,c[t++]=i,c[t++]=i,c[t++]=n}}s.version=i;let l=a.get(e);l&&t.remove(l),a.set(e,s)}function f(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&d(e)}else d(e);return a.get(e)}function p(){for(let e in i){let t=i[e].deref();t!==void 0&&c(t)}}return{get:l,update:u,getWireframeAttribute:f,dispose:p}}function $s(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function ec(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:F(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function tc(e,t,n){let r=new WeakMap,i=new hn;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new vn(h,p,m,u);g.type=A,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new I(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function nc(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var rc={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function ic(e,t,n,r,i,a){let o=new _n(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=null,u=new Xr;u.setAttribute(`position`,new Rr([-1,3,0,-1,-1,0,3,-1,0],3)),u.setAttribute(`uv`,new Rr([0,2,0,0,2,0],2));let d=new ao({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new B(u,d),p=new Jo(-1,1,1,-1,0,1),m=null,h=null,g=!1,_,v=null,y=[],b=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<y.length;n++){let r=y[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){y=e,b=y.length>0&&y[0].isRenderPass===!0;let t=o.width,n=o.height;y.length>0&&s===null&&(s=new _n(t,n,{type:ee,depthBuffer:!1,stencilBuffer:!1}),c=new _n(t,n,{type:ee,depthBuffer:!1,stencilBuffer:!1}));let r=i===!0&&y.some(e=>e.needsDepthTexture===!0);r!==(o.depthTexture!==null)&&(r===!0&&l===null&&(l=new Ea(t,n),a===!0&&(l.format=ue,l.type=re)),o.dispose(),o.depthTexture=r?l:null,o.resolveDepthBuffer=r,o.storeMultisampledDepthBuffer=r);for(let e=0;e<y.length;e++){let i=y[e];i.setSize&&i.setSize(t,n),r&&i.needsDepthTexture===!0&&i.setDepthTexture&&i.setDepthTexture(l)}},this.begin=function(e,t){if(g||e.toneMapping===0&&y.length===0)return!1;if(v=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return b===!1&&e.setRenderTarget(o),_=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return b},this.end=function(e,t){e.toneMapping=_,g=!0;let n=o,r=s;for(let i=0;i<y.length;i++){let a=y[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(m!==e.outputColorSpace||h!==e.toneMapping){m=e.outputColorSpace,h=e.toneMapping,d.defines={},rn.getTransfer(m)===`srgb`&&(d.defines.SRGB_TRANSFER=``);let t=rc[h];t&&(d.defines[t]=``),d.needsUpdate=!0}d.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(v),e.render(f,p),v=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),u.dispose(),d.dispose()}}var ac=new mn,oc=new Ea(1,1),sc=new Da(1),cc=new vn,lc=new yn,uc=new wa,dc=[],fc=[],pc=new Float32Array(16),mc=new Float32Array(9),hc=new Float32Array(4);function gc(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=dc[i];if(a===void 0&&(a=new Float32Array(i),dc[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function _c(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function vc(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function yc(e,t){let n=fc[t];n===void 0&&(n=new Int32Array(t),fc[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function bc(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function xc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(_c(n,t))return;e.uniform2fv(this.addr,t),vc(n,t)}}function Sc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(_c(n,t))return;e.uniform3fv(this.addr,t),vc(n,t)}}function Cc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(_c(n,t))return;e.uniform4fv(this.addr,t),vc(n,t)}}function wc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(_c(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),vc(n,t)}else{if(_c(n,r))return;hc.set(r),e.uniformMatrix2fv(this.addr,!1,hc),vc(n,r)}}function Tc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(_c(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),vc(n,t)}else{if(_c(n,r))return;mc.set(r),e.uniformMatrix3fv(this.addr,!1,mc),vc(n,r)}}function Ec(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(_c(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),vc(n,t)}else{if(_c(n,r))return;pc.set(r),e.uniformMatrix4fv(this.addr,!1,pc),vc(n,r)}}function Dc(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Oc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(_c(n,t))return;e.uniform2iv(this.addr,t),vc(n,t)}}function kc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(_c(n,t))return;e.uniform3iv(this.addr,t),vc(n,t)}}function Ac(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(_c(n,t))return;e.uniform4iv(this.addr,t),vc(n,t)}}function jc(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Mc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(_c(n,t))return;e.uniform2uiv(this.addr,t),vc(n,t)}}function Nc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(_c(n,t))return;e.uniform3uiv(this.addr,t),vc(n,t)}}function Pc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(_c(n,t))return;e.uniform4uiv(this.addr,t),vc(n,t)}}function Fc(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function Ic(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?Fc(oc):ac,n.setTexture2D(t||a,i)}function Lc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||lc,i)}function Rc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?Fc(sc):uc,n.setTextureCube(t||a,i)}function zc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||cc,i)}function Bc(e){switch(e){case 5126:return bc;case 35664:return xc;case 35665:return Sc;case 35666:return Cc;case 35674:return wc;case 35675:return Tc;case 35676:return Ec;case 5124:case 35670:return Dc;case 35667:case 35671:return Oc;case 35668:case 35672:return kc;case 35669:case 35673:return Ac;case 5125:return jc;case 36294:return Mc;case 36295:return Nc;case 36296:return Pc;case 35678:case 36198:case 36298:case 36306:case 35682:return Ic;case 35679:case 36299:case 36307:return Lc;case 35680:case 36300:case 36308:case 36293:return Rc;case 36289:case 36303:case 36311:case 36292:return zc}}function Vc(e,t){e.uniform1fv(this.addr,t)}function Hc(e,t){let n=gc(t,this.size,2);e.uniform2fv(this.addr,n)}function Uc(e,t){let n=gc(t,this.size,3);e.uniform3fv(this.addr,n)}function Wc(e,t){let n=gc(t,this.size,4);e.uniform4fv(this.addr,n)}function Gc(e,t){let n=gc(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Kc(e,t){let n=gc(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function qc(e,t){let n=gc(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Jc(e,t){e.uniform1iv(this.addr,t)}function Yc(e,t){e.uniform2iv(this.addr,t)}function Xc(e,t){e.uniform3iv(this.addr,t)}function Zc(e,t){e.uniform4iv(this.addr,t)}function Qc(e,t){e.uniform1uiv(this.addr,t)}function $c(e,t){e.uniform2uiv(this.addr,t)}function el(e,t){e.uniform3uiv(this.addr,t)}function tl(e,t){e.uniform4uiv(this.addr,t)}function nl(e,t,n){let r=this.cache,i=t.length,a=yc(n,i);_c(r,a)||(e.uniform1iv(this.addr,a),vc(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Fc(oc):ac;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function rl(e,t,n){let r=this.cache,i=t.length,a=yc(n,i);_c(r,a)||(e.uniform1iv(this.addr,a),vc(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||lc,a[e])}function il(e,t,n){let r=this.cache,i=t.length,a=yc(n,i);_c(r,a)||(e.uniform1iv(this.addr,a),vc(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?Fc(sc):uc;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function al(e,t,n){let r=this.cache,i=t.length,a=yc(n,i);_c(r,a)||(e.uniform1iv(this.addr,a),vc(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||cc,a[e])}function ol(e){switch(e){case 5126:return Vc;case 35664:return Hc;case 35665:return Uc;case 35666:return Wc;case 35674:return Gc;case 35675:return Kc;case 35676:return qc;case 5124:case 35670:return Jc;case 35667:case 35671:return Yc;case 35668:case 35672:return Xc;case 35669:case 35673:return Zc;case 5125:return Qc;case 36294:return $c;case 36295:return el;case 36296:return tl;case 35678:case 36198:case 36298:case 36306:case 35682:return nl;case 35679:case 36299:case 36307:return rl;case 35680:case 36300:case 36308:case 36293:return il;case 36289:case 36303:case 36311:case 36292:return al}}var sl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Bc(t.type)}},cl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=ol(t.type)}},ll=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},ul=/(\w+)(\])?(\[|\.)?/g;function dl(e,t){e.seq.push(t),e.map[t.id]=t}function fl(e,t,n){let r=e.name,i=r.length;for(ul.lastIndex=0;;){let a=ul.exec(r),o=ul.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){dl(n,l===void 0?new sl(s,e,t):new cl(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new ll(s),dl(n,e)),n=e}}}var pl=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);fl(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function ml(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var hl=37297,gl=0;function _l(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var vl=new Qt;function yl(e){rn._getMatrix(vl,rn.workingColorSpace,e);let t=`mat3( ${vl.elements.map(e=>e.toFixed(4))} )`;switch(rn.getTransfer(e)){case at:return[t,`LinearTransferOETF`];case ot:return[t,`sRGBTransferOETF`];default:return P(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function bl(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+_l(e.getShaderSource(t),r)}return i}function xl(e,t){let n=yl(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var Sl={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Cl(e,t){let n=Sl[t];return n===void 0?(P(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var wl=new L;function Tl(){return rn.getLuminanceCoefficients(wl),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${wl.x.toFixed(4)}, ${wl.y.toFixed(4)}, ${wl.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function El(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(kl).join(`
`)}function Dl(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function Ol(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function kl(e){return e!==``}function Al(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function jl(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Ml=/^[ \t]*#include +<([\w\d./]+)>/gm;function Nl(e){return e.replace(Ml,Pl)}function Pl(e,t){let n=Cs[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return Nl(n)}var Fl=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Il(e){return e.replace(Fl,Ll)}function Ll(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Rl(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var zl={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Bl(e){return zl[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Vl={302:`ENVMAP_MODE_REFRACTION`};function Hl(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Vl[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Ul={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Wl(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Ul[e.combine]||`ENVMAP_BLENDING_NONE`}function Gl(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Bl(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=Hl(n),d=Wl(n),f=El(n),p=Dl(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(kl).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(kl).join(`
`),g.length>0&&(g+=`
`)):(h=[Rl(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(kl).join(`
`),g=[Rl(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Cs.tonemapping_pars_fragment,n.toneMapping===0?``:Cl(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Cs.colorspace_pars_fragment,xl(`linearToOutputTexel`,n.outputColorSpace),Tl(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(kl).join(`
`)),o=Nl(o),o=Al(o,n),o=jl(o,n),s=Nl(s),s=Al(s,n),s=jl(s,n),o=Il(o),s=Il(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=ml(i,i.VERTEX_SHADER,v),x=ml(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1)if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=bl(i,b,`vertex`),n=bl(i,x,`fragment`);F(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}else o===``?(s===``||c===``)&&(u=!1):P(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new pl(i,m),w=Ol(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,hl)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=gl++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var Kl=0,ql=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Jl(e),t.set(e,n)),n}},Jl=class{constructor(e){this.id=Kl++,this.code=e,this.usedTimes=0}};function Yl(e){return e===1030||e===37490||e===36285}function Xl(e,t,n,r,i,a){let o=new jn,s=new ql,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function p(e){return c.add(e),e===0?`uv`:`uv${e}`}function m(i,o,l,u,m,h){let g=u.fog,_=m.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=f[i.type],S=r.precision;i.precision!==null&&(S=r.getMaxPrecision(i.precision),S!==i.precision&&P(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,k;if(x){let e=ws[x];E=e.vertexShader,D=e.fragmentShader}else{E=i.vertexShader,D=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,k=t.id}let A=e.getRenderTarget(),ee=e.state.buffers.depth.getReversed(),te=m.isInstancedMesh===!0,ne=m.isBatchedMesh===!0,re=!!i.map,ie=!!i.matcap,ae=!!b,oe=ae&&b.isPMREMTexture===!0,se=!!i.aoMap,ce=!!i.lightMap,le=!!i.bumpMap&&i.wireframe===!1,ue=!!i.normalMap,de=!!i.displacementMap,fe=!!i.emissiveMap,pe=!!i.metalnessMap,me=!!i.roughnessMap,he=i.anisotropy>0,ge=i.clearcoat>0,_e=i.diffuseRoughness>0,ve=i.dispersion>0,ye=i.retroreflectivity>0,be=i.iridescence>0,xe=i.sheen>0,Se=i.transmission>0,Ce=he&&!!i.anisotropyMap,we=ge&&!!i.clearcoatMap,Te=ge&&!!i.clearcoatNormalMap,Ee=ge&&!!i.clearcoatRoughnessMap,De=_e&&!!i.diffuseRoughnessMap,Oe=be&&!!i.iridescenceMap,ke=be&&!!i.iridescenceThicknessMap,Ae=xe&&!!i.sheenColorMap,je=xe&&!!i.sheenRoughnessMap,Me=!!i.specularMap,Ne=!!i.specularColorMap,Pe=!!i.specularIntensityMap,Fe=Se&&!!i.transmissionMap,Ie=Se&&!!i.thicknessMap,Le=!!i.gradientMap,Re=!!i.alphaMap,j=i.alphaTest>0,ze=!!i.alphaHash,Be=!!i.extensions,Ve=0;i.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(Ve=e.toneMapping);let M=oe?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,He={shaderID:x,shaderType:i.type,shaderName:i.name,vertexShader:E,fragmentShader:D,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:k,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:S,batching:ne,batchingColor:ne&&m._colorsTexture!==null,instancing:te,instancingColor:te&&m.instanceColor!==null,instancingMorph:te&&m.morphTexture!==null,outputColorSpace:A===null?e.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:rn.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:re,matcap:ie,envMap:ae,envMapMode:ae&&b.mapping,envMapPMREM:oe,envMapMaxLod:oe?M.length-1:null,envMapSize:oe?M[0].width:null,aoMap:se,lightMap:ce,bumpMap:le,normalMap:ue,displacementMap:de,emissiveMap:fe,normalMapObjectSpace:ue&&i.normalMapType===1,normalMapTangentSpace:ue&&i.normalMapType===0,packedNormalMap:ue&&i.normalMapType===0&&Yl(i.normalMap.format),metalnessMap:pe,roughnessMap:me,anisotropy:he,anisotropyMap:Ce,clearcoat:ge,clearcoatMap:we,clearcoatNormalMap:Te,clearcoatRoughnessMap:Ee,diffuseRoughness:_e,diffuseRoughnessMap:De,dispersion:ve,retroreflection:ye,iridescence:be,iridescenceMap:Oe,iridescenceThicknessMap:ke,sheen:xe,sheenColorMap:Ae,sheenRoughnessMap:je,specularMap:Me,specularColorMap:Ne,specularIntensityMap:Pe,transmission:Se,transmissionMap:Fe,thicknessMap:Ie,gradientMap:Le,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Re,alphaTest:j,alphaHash:ze,combine:i.combine,mapUv:re&&p(i.map.channel),aoMapUv:se&&p(i.aoMap.channel),lightMapUv:ce&&p(i.lightMap.channel),bumpMapUv:le&&p(i.bumpMap.channel),normalMapUv:ue&&p(i.normalMap.channel),displacementMapUv:de&&p(i.displacementMap.channel),emissiveMapUv:fe&&p(i.emissiveMap.channel),metalnessMapUv:pe&&p(i.metalnessMap.channel),roughnessMapUv:me&&p(i.roughnessMap.channel),anisotropyMapUv:Ce&&p(i.anisotropyMap.channel),clearcoatMapUv:we&&p(i.clearcoatMap.channel),clearcoatNormalMapUv:Te&&p(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ee&&p(i.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:De&&p(i.diffuseRoughnessMap.channel),iridescenceMapUv:Oe&&p(i.iridescenceMap.channel),iridescenceThicknessMapUv:ke&&p(i.iridescenceThicknessMap.channel),sheenColorMapUv:Ae&&p(i.sheenColorMap.channel),sheenRoughnessMapUv:je&&p(i.sheenRoughnessMap.channel),specularMapUv:Me&&p(i.specularMap.channel),specularColorMapUv:Ne&&p(i.specularColorMap.channel),specularIntensityMapUv:Pe&&p(i.specularIntensityMap.channel),transmissionMapUv:Fe&&p(i.transmissionMap.channel),thicknessMapUv:Ie&&p(i.thicknessMap.channel),alphaMapUv:Re&&p(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(ue||he),vertexNormals:!!_.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!_.attributes.uv&&(re||Re),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&ue===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:ee,skinning:m.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ve,decodeVideoTexture:re&&i.map.isVideoTexture===!0&&rn.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:fe&&i.emissiveMap.isVideoTexture===!0&&rn.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:Be&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Be&&i.extensions.multiDraw===!0||ne)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return He.vertexUv1s=c.has(1),He.vertexUv2s=c.has(2),He.vertexUv3s=c.has(3),c.clear(),He}function h(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(g(n,t),_(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function g(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function _(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.diffuseRoughness&&o.enable(25),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function v(e){let t=f[e.type],n;if(t){let e=ws[t];n=to.clone(e.uniforms)}else n=e.uniforms;return n}function y(t,n){let r=u.get(n);return r===void 0?(r=new Gl(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function b(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function x(e){s.remove(e)}function S(){s.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:v,acquireProgram:y,releaseProgram:b,releaseShaderCache:x,programs:l,dispose:S}}function Zl(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Ql(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function $l(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function eu(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Ql),r.length>1&&r.sort(t||$l),i.length>1&&i.sort(t||$l)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function tu(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new eu,e.set(t,[i])):n>=r.length?(i=new eu,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function nu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new L,color:new z};break;case`SpotLight`:n={position:new L,direction:new L,color:new z,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new L,color:new z,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new L,skyColor:new z,groundColor:new z};break;case`RectAreaLight`:n={color:new z,position:new L,halfWidth:new L,halfHeight:new L}}return e[t.id]=n,n}}}function ru(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new I};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new I};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new I,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var iu=0;function au(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function ou(e){let t=new nu,n=ru(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new L);let i=new L,a=new bn,o=new bn;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(au);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=V.LTC_FLOAT_1,r.rectAreaLTC2=V.LTC_FLOAT_2):(r.rectAreaLTC1=V.LTC_HALF_1,r.rectAreaLTC2=V.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=iu++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function su(e){let t=new ou(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function cu(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new su(e),t.set(n,[a])):r>=i.length?(a=new su(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var lu=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,uu=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,du=[new L(1,0,0),new L(-1,0,0),new L(0,1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1)],fu=[new L(0,-1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1),new L(0,-1,0),new L(0,-1,0)],pu=new bn,mu=new L,hu=new L;function gu(e,t,n){let r=new ta,i=new I,a=new I,o=new hn,s=new so,c=new co,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new io({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new I},radius:{value:4}},vertexShader:lu,fragmentShader:uu}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new Xr;m.setAttribute(`position`,new Fr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new B(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(P(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){P(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){P(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new _n(i.x,i.y,{format:pe,type:ee,minFilter:x,magFilter:x,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new Ea(i.x,i.y,A),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=le,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=v,d.map.depthTexture.magFilter=v}else l.isPointLight?(d.map=new Ns(i.x),d.map.depthTexture=new Da(i.x,k)):(d.map=new _n(i.x,i.y),d.map.depthTexture=new Ea(i.x,i.y,k)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=le,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=x,d.map.depthTexture.magFilter=x):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=v,d.map.depthTexture.magFilter=v);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let g=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();l.isPointLight!==!0&&d.updateMatrices(l,s);let _=d.camera.layers.mask&4294967294?d.camera.layers:s.layers;for(let t=0;t<g;t++){let i=d.getCamera(t);if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),mu.setFromMatrixPosition(l.matrixWorld),e.position.copy(mu),hu.copy(e.position),hu.add(du[t]),e.up.copy(fu[t]),e.lookAt(hu),e.updateMatrixWorld(),n.makeTranslation(-mu.x,-mu.y,-mu.z),pu.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(pu,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}r=d.getFrustum(t),S(n,s,i,l,_,this.type)}d.isPointLightShadow!==!0&&this.type===3&&y(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function y(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null?n.mapPass=new _n(i.x,i.y,{format:pe,type:ee}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value.set(n.map.width,n.map.height),f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function b(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,C)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function S(n,i,a,o,s,c){if(n.visible===!1)return;if(n.layers.test(s)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&c===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),s=n.material;if(Array.isArray(s)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=s[u.materialIndex];if(d&&d.visible){let t=b(n,d,o,c);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(s.visible){let t=b(n,s,o,c);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let l=n.children;for(let e=0,t=l.length;e<t;e++)S(l[e],i,a,o,s,c)}function C(e){e.target.removeEventListener(`dispose`,C);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function _u(e,t){function n(){let t=!1,n=new hn,r=null,i=new hn(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?pe(e.DEPTH_TEST):me(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=yt[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?pe(e.STENCIL_TEST):me(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c={},l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new z(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,ee=null,te=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),ne=!1,re=0,ie=e.getParameter(e.VERSION);ie.indexOf(`WebGL`)===-1?ie.indexOf(`OpenGL ES`)!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(ie)[1]),ne=re>=2):(re=parseFloat(/^WebGL (\d)/.exec(ie)[1]),ne=re>=1);let ae=null,oe={},se=e.getParameter(e.SCISSOR_BOX),ce=e.getParameter(e.VIEWPORT),le=new hn().fromArray(se),ue=new hn().fromArray(ce);function de(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let fe={};fe[e.TEXTURE_2D]=de(e.TEXTURE_2D,e.TEXTURE_2D,1),fe[e.TEXTURE_CUBE_MAP]=de(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),fe[e.TEXTURE_2D_ARRAY]=de(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),fe[e.TEXTURE_3D]=de(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),pe(e.DEPTH_TEST),o.setFunc(3),Se(!1),Ce(1),pe(e.CULL_FACE),be(0);function pe(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function me(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function he(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function ge(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function _e(t){return h!==t&&(e.useProgram(t),h=t,!0)}let ve={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ve[103]=e.MIN,ve[104]=e.MAX;let ye={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function be(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(me(e.BLEND),g=!1);return}if(g===!1&&(pe(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:F(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:F(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:F(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:F(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(ve[n],ve[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(ye[r],ye[i],ye[o],ye[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function xe(t,n){t.side===2?me(e.CULL_FACE):pe(e.CULL_FACE);let r=t.side===1;n&&(r=!r),Se(r),t.blending===1&&t.transparent===!1?be(0):be(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),Te(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?pe(e.SAMPLE_ALPHA_TO_COVERAGE):me(e.SAMPLE_ALPHA_TO_COVERAGE)}function Se(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function Ce(t){t===0?me(e.CULL_FACE):(pe(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function we(t){t!==k&&(ne&&e.lineWidth(t),k=t)}function Te(t,n,r){t?(pe(e.POLYGON_OFFSET_FILL),(A!==n||ee!==r)&&(A=n,ee=r,o.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):me(e.POLYGON_OFFSET_FILL)}function Ee(t){t?pe(e.SCISSOR_TEST):me(e.SCISSOR_TEST)}function De(t){t===void 0&&(t=e.TEXTURE0+te-1),ae!==t&&(e.activeTexture(t),ae=t)}function Oe(t,n,r){r===void 0&&(r=ae===null?e.TEXTURE0+te-1:ae);let i=oe[r];i===void 0&&(i={type:void 0,texture:void 0},oe[r]=i),(i.type!==t||i.texture!==n)&&(ae!==r&&(e.activeTexture(r),ae=r),e.bindTexture(t,n||fe[t]),i.type=t,i.texture=n)}function ke(){let t=oe[ae];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Ae(){try{e.compressedTexImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function je(){try{e.compressedTexImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Me(){try{e.texSubImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ne(){try{e.texSubImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Pe(){try{e.compressedTexSubImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Fe(){try{e.compressedTexSubImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ie(){try{e.texStorage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Le(){try{e.texStorage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Re(){try{e.texImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function j(){try{e.texImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function ze(t){return d[t]===void 0?e.getParameter(t):d[t]}function Be(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function Ve(t){le.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),le.copy(t))}function M(t){ue.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ue.copy(t))}function He(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function N(t,n,r){let i=l.get(n).get(t);c[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),c[i]=r)}function Ue(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},ae=null,oe={},f={},c={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new z(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,ee=null,le.set(0,0,e.canvas.width,e.canvas.height),ue.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:pe,disable:me,bindFramebuffer:he,drawBuffers:ge,useProgram:_e,setBlending:be,setMaterial:xe,setFlipSided:Se,setCullFace:Ce,setLineWidth:we,setPolygonOffset:Te,setScissorTest:Ee,activeTexture:De,bindTexture:Oe,unbindTexture:ke,compressedTexImage2D:Ae,compressedTexImage3D:je,texImage2D:Re,texImage3D:j,pixelStorei:Be,getParameter:ze,updateUBOMapping:He,uniformBlockBinding:N,texStorage2D:Ie,texStorage3D:Le,texSubImage2D:Me,texSubImage3D:Ne,compressedTexSubImage2D:Pe,compressedTexSubImage3D:Fe,scissor:Ve,viewport:M,reset:Ue}}function vu(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new I,u=new WeakMap,d=new Set,f,p=new WeakMap,m=new Set,w=new FinalizationRegistry(e=>m.delete(e)),T=!1;try{T=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function E(e,t){return T?new OffscreenCanvas(e,t):ft(`canvas`)}function D(e,t,n){let r=1,i=Ue(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1)if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=E(n,a));let o=t?E(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),P(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}else return`data`in e&&P(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e;return e}function O(e){return e.generateMipmaps}function k(t){e.generateMipmap(t)}function A(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function ee(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];P(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||P(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?at:rn.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function te(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,P(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function ne(e,t){return O(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function re(e){let t=new WeakRef(e);r.get(e).__ref=t,m.add(t),w.register(e,t,t)}function ie(e){let t=r.get(e).__ref;t!==void 0&&(m.delete(t),w.unregister(t))}function ae(e){se(e.target)}function oe(e){ce(e.target)}function se(e){e.removeEventListener(`dispose`,ae),ie(e),de(e),e.isVideoTexture&&u.delete(e),e.isHTMLTexture&&d.delete(e)}function ce(e){e.removeEventListener(`dispose`,oe),ie(e),pe(e)}function le(){for(let e of m){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?ce(t):se(t))}m.clear(),d.clear()}function de(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&fe(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function fe(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function pe(t){let n=r.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let i=t.depthTexture;if(i&&i.renderTarget===t&&se(i),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=r.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(a[t])}r.remove(t)}let me=0;function he(){me=0}function ge(){return me}function _e(e){me=e}function ve(){let e=me;return e>=i.maxTextures&&P(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),me+=1,e}function ye(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function be(t,i){let a=r.get(t);if(t.isVideoTexture&&He(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)P(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)P(`WebGLRenderer: Texture marked for update but image is incomplete`);else{je(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function xe(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){je(a,t,i);return}t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function Se(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){je(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function Ce(t,i){let a=r.get(t);if(t.version>0&&a.__version!==t.version){Me(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let we={[h]:e.REPEAT,[g]:e.CLAMP_TO_EDGE,[_]:e.MIRRORED_REPEAT},Te={[v]:e.NEAREST,[y]:e.NEAREST_MIPMAP_NEAREST,[b]:e.NEAREST_MIPMAP_LINEAR,[x]:e.LINEAR,[S]:e.LINEAR_MIPMAP_NEAREST,[C]:e.LINEAR_MIPMAP_LINEAR},Ee={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function De(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&P(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,we[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,we[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,we[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,Te[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,Te[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,Ee[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function Oe(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,ae),re(n));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=ye(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&fe(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function ke(e,t,n){return Math.floor(Math.floor(e/n)/t)}function Ae(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=ke(n.start,r.width,4),c=ke(t.start,r.width,4);n.start<=i+1&&a===c&&ke(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function je(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=Oe(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=rn.getPrimaries(rn.workingColorSpace),r=o.colorSpace===``?null:rn.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=D(o.image,!1,i.maxTextureSize);t=N(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=ee(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);De(c,o);let h,g=o.mipmaps,_=o.isVideoTexture!==!0,v=f.__version===void 0||l===!0,y=u.dataReady,b=ne(o,t);if(o.isDepthTexture)m=te(o.format===ue,o.type),v&&(_?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture)if(g.length>0){_&&v&&n.texStorage2D(e.TEXTURE_2D,b,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],_?y&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else _?(v&&n.texStorage2D(e.TEXTURE_2D,b,m,t.width,t.height),y&&Ae(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data);else if(o.isCompressedTexture)if(o.isCompressedArrayTexture){_&&v&&n.texStorage3D(e.TEXTURE_2D_ARRAY,b,m,g[0].width,g[0].height,t.depth);for(let i=0,a=g.length;i<a;i++)if(h=g[i],o.format!==1023)if(r!==null)if(_){if(y)if(o.layerUpdates.size>0){let t=ys(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0);else P(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`);else _?y&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{_&&v&&n.texStorage2D(e.TEXTURE_2D,b,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],o.format===1023?_?y&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?P(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):_?y&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}else if(o.isDataArrayTexture)if(_){if(v&&n.texStorage3D(e.TEXTURE_2D_ARRAY,b,m,t.width,t.height,t.depth),y)if(o.layerUpdates.size>0){let i=ys(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isData3DTexture)_?(v&&n.texStorage3D(e.TEXTURE_3D,b,m,t.width,t.height,t.depth),y&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(v)if(_)n.texStorage2D(e.TEXTURE_2D,b,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<b;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(g.length>0){if(_&&v){let t=Ue(g[0]);n.texStorage2D(e.TEXTURE_2D,b,m,t.width,t.height)}for(let t=0,i=g.length;t<i;t++)h=g[t],_?y&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(_){if(v){let r=Ue(t);n.texStorage2D(e.TEXTURE_2D,b,m,r.width,r.height)}y&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);O(o)&&o.mipmapsAutoUpdate===!0&&k(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function Me(t,o,s){if(o.image.length!==6)return;let c=Oe(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=rn.getPrimaries(rn.workingColorSpace),r=o.colorSpace===``?null:rn.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=D(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=N(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),_=a.convert(o.type),v=ee(o.internalFormat,g,_,o.normalized,o.colorSpace),y=o.isVideoTexture!==!0,b=u.__version===void 0||c===!0,x=l.dataReady,S=ne(o,h);De(e.TEXTURE_CUBE_MAP,o);let C;if(o.isDepthTexture){if(v=te(o.format===ue,o.type),b)if(y)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,v,h.width,h.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,h.width,h.height,0,g,_,null)}else if(f){y&&b&&n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let t=0;t<6;t++){C=m[t].mipmaps;for(let r=0;r<C.length;r++){let i=C[r];o.format===1023?y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,g,_,i.data):g===null?P(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,i.data)}}}else{if(C=o.mipmaps,y&&b){C.length>0&&S++;let t=Ue(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,t.width,t.height)}for(let t=0;t<6;t++)if(p){y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<C.length;r++){let i=C[r].image[t].image;y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,m[t]);for(let r=0;r<C.length;r++){let i=C[r];y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}O(o)&&o.mipmapsAutoUpdate===!0&&k(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function Ne(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=ee(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),M(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,Ve(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Pe(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=te(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;M(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ve(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ve(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=ee(o.internalFormat,c,l,o.normalized,o.colorSpace);M(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ve(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ve(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Fe(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let c=r.get(i.depthTexture);c.__renderTarget=i;let l=o?i.depthTexture.image[0]:i.depthTexture.image;(!c.__webglTexture||l.width!==i.width||l.height!==i.height)&&(l.width=i.width,l.height=i.height,i.depthTexture.needsUpdate=!0),o?Ce(i.depthTexture,0):be(i.depthTexture,0);let u=c.__webglTexture,d=Ve(i),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)M(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)M(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function Ie(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer)if(a)for(let e=0;e<6;e++)Fe(i.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?Fe(i.__webglFramebuffer[0],t,0):Fe(i.__webglFramebuffer,t,0);else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),Pe(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),Pe(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Le(t,n,i){let a=r.get(t);n!==void 0&&Ne(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&Ie(t)}function Re(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,oe),re(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&M(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=ee(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=Ve(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),Pe(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),De(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)Ne(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else Ne(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);O(i)?k(e.TEXTURE_CUBE_MAP):i.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),De(c,a),Ne(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),O(a)&&k(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),De(r,i),i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)Ne(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else Ne(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);O(i)?k(r):i.mipmaps.length>0&&e.texParameteri(r,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&Ie(t)}function j(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(O(a)&&a.mipmapsAutoUpdate===!0){let t=A(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),k(t),n.unbindTexture()}}}let ze=[];function Be(t){if(t.samples>0){if(M(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(ze.length=0,ze.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&ze.push(l),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,ze))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function Ve(e){return Math.min(i.maxSamples,e.samples)}function M(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function He(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function N(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(rn.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&P(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):F(`WebGLTextures: Unsupported texture color space:`,n)),t}function Ue(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=ve,this.resetTextureUnits=he,this.getTextureUnits=ge,this.setTextureUnits=_e,this.setTexture2D=be,this.setTexture2DArray=xe,this.setTexture3D=Se,this.setTextureCube=Ce,this.rebindTextures=Le,this.setupRenderTarget=Re,this.updateRenderTargetMipmap=j,this.updateMultisampleRenderTarget=Be,this.setupDepthRenderbuffer=Ie,this.setupFrameBufferTexture=Ne,this.useMultisampledRTT=M,this.dispose=le}function yu(e,t){function n(n,r=``){let i,a=rn.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779)if(a===`srgb`)if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===35840||n===35841||n===35842||n===35843)if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491)if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821)if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===36492||n===36494||n===36495)if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===36283||n===36284||n===36285||n===36286)if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var bu=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,xu=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Su=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Oa(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new io({vertexShader:bu,fragmentShader:xu,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new B(new Ka(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Cu=class extends bt{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new Su,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new I,C=null,T=null,E=new Uo;E.viewport=new hn;let D=new Uo;D.viewport=new hn;let O=[E,D],A=new es,ee=null,te=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new Yn,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new Yn,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new Yn,b[e]=t),t.getHandSpace()};function ne(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ie(){r.removeEventListener(`select`,ne),r.removeEventListener(`selectstart`,ne),r.removeEventListener(`selectend`,ne),r.removeEventListener(`squeeze`,ne),r.removeEventListener(`squeezestart`,ne),r.removeEventListener(`squeezeend`,ne),r.removeEventListener(`end`,ie),r.removeEventListener(`inputsourceschange`,ae);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}ee=null,te=null,h.reset();for(let e in g)delete g[e];if(e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,pe.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),T!==null){let e=T.camera;e.fov=T.fov,e.zoom=T.zoom,e.updateProjectionMatrix(),T=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&P(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&P(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,ne),r.addEventListener(`selectstart`,ne),r.addEventListener(`selectend`,ne),r.addEventListener(`squeeze`,ne),r.addEventListener(`squeezestart`,ne),r.addEventListener(`squeezeend`,ne),r.addEventListener(`end`,ie),r.addEventListener(`inputsourceschange`,ae),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?ue:le,a=_.stencil?re:k);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new _n(d.textureWidth,d.textureHeight,{format:ce,type:w,depthTexture:new Ea(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new _n(f.framebufferWidth,f.framebufferHeight,{format:ce,type:w,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),pe.setContext(r),pe.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function ae(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}function oe(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),A.near=D.near=E.near=t,A.far=D.far=E.far=n,(ee!==A.near||te!==A.far)&&(r.updateRenderState({depthNear:A.near,depthFar:A.far}),ee=A.near,te=A.far),A.layers.mask=e.layers.mask|6,E.layers.mask=A.layers.mask&-5,D.layers.mask=A.layers.mask&-3;let i=e.parent,a=A.cameras;oe(A,i);for(let e=0;e<a.length;e++)oe(a[e],i);A.projectionMatrix.copy(E.projectionMatrix),A.projectionMatrixInverse.copy(E.projectionMatrixInverse),T===null&&e.isPerspectiveCamera&&(T={camera:e,fov:e.fov,zoom:e.zoom}),se(e,A,i)};function se(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=wt*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return A},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(A)},this.getCameraTexture=function(e){return g[e]};let de=null;function fe(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==A.cameras.length&&(A.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=O[n];o===void 0&&(o=new Uo,o.layers.enable(n),o.viewport=new hn,O[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(A.matrix.copy(o.matrix),A.matrix.decompose(A.position,A.quaternion,A.scale)),i===!0&&A.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new Oa,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}de&&de(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let pe=new xs;pe.setAnimationLoop(fe),this.setAnimationLoop=function(e){de=e},this.dispose=function(){}}},wu=new bn,Tu=new Qt;Tu.set(-1,0,0,0,1,0,0,0,1);function Eu(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,eo(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(wu.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Tu),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Du(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?P(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):P(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var Ou=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ku=null;function Au(){return ku===null&&(ku=new Hi(Ou,16,16,pe,ee),ku.name=`DFG_LUT`,ku.minFilter=x,ku.magFilter=x,ku.wrapS=g,ku.wrapT=g,ku.generateMipmaps=!1,ku.needsUpdate=!0),ku}var ju=class{constructor(e={}){let{canvas:t=pt(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=w}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([he,me,fe]),g=new Set([w,k,D,re,te,ne]),_=new Uint32Array(4),v=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]},b=null,x=null,S=[],T=[],E=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let O=this,A=!1,ie=null,ae=null,oe=null,se=null;this._outputColorSpace=rt;let ce=0,le=0,ue=null,de=-1,pe=null,ge=new hn,_e=new hn,ve=null,ye=new z(0),be=0,xe=t.width,Se=t.height,Ce=1,we=null,Te=null,Ee=new hn(0,0,xe,Se),De=new hn(0,0,xe,Se),Oe=!1,ke=new ta,Ae=new ra,je=!1,Me=!1,Ne=new bn,Pe=new L,Fe=new hn,Ie={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Le=!1;function Re(){return ue===null?Ce:1}let j=n;function ze(e,n){return t.getContext(e,n)}let Be,Ve,M,He,N,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,it,at,ot,st;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r187`),t.addEventListener(`webglcontextlost`,dt,!1),t.addEventListener(`webglcontextrestored`,ft,!1),t.addEventListener(`webglcontextcreationerror`,mt,!1),j===null){let t=`webgl2`;if(j=ze(t,e),j===null)throw ze(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}ct()}catch(e){throw t.removeEventListener(`webglcontextlost`,dt,!1),t.removeEventListener(`webglcontextrestored`,ft,!1),t.removeEventListener(`webglcontextcreationerror`,mt,!1),F(`WebGLRenderer: `+e.message),e}function ct(){Be=new Zs(j),Be.init(),at=new yu(j,Be),Ve=new js(j,Be,e,at),M=new _u(j,Be),Ve.reversedDepthBuffer&&d&&M.buffers.depth.setReversed(!0),ae=j.createFramebuffer(),oe=j.createFramebuffer(),se=j.createFramebuffer(),He=new ec(j),N=new Zl,Ue=new vu(j,Be,M,N,Ve,at,He),We=new Xs(O),Ge=new Ss(j),ot=new ks(j,Ge),Ke=new Qs(j,Ge,He,ot),qe=new nc(j,Ke,Ge,ot,He),tt=new tc(j,Ve,Ue),Qe=new Ms(N),Je=new Xl(O,We,Be,Ve,ot,Qe),Ye=new Eu(O,N),Xe=new tu,Ze=new cu(Be),et=new Os(O,We,M,qe,p,s),$e=new gu(O,qe,Ve),st=new Du(j,He,Ve,M),nt=new As(j,Be,He),it=new $s(j,Be,He),He.programs=Je.programs,O.capabilities=Ve,O.extensions=Be,O.properties=N,O.renderLists=Xe,O.shadowMap=$e,O.state=M,O.info=He}m!==1009&&(E=new ic(m,t.width,t.height,o,r,i));let ut=new Cu(O,j);this.xr=ut,this.getContext=function(){return j},this.getContextAttributes=function(){return j.getContextAttributes()},this.forceContextLoss=function(){let e=Be.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Be.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return Ce},this.setPixelRatio=function(e){e!==void 0&&(Ce=e,this.setSize(xe,Se,!1))},this.getSize=function(e){return e.set(xe,Se)},this.setSize=function(e,n,r=!0){if(ut.isPresenting){P(`WebGLRenderer: Can't change size while VR device is presenting.`);return}xe=e,Se=n,t.width=Math.floor(e*Ce),t.height=Math.floor(n*Ce),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),E!==null&&E.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(xe*Ce,Se*Ce).floor()},this.setDrawingBufferSize=function(e,n,r){xe=e,Se=n,Ce=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009){F(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){P(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}E.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(ge)},this.getViewport=function(e){return e.copy(Ee)},this.setViewport=function(e,t,n,r){e.isVector4?Ee.set(e.x,e.y,e.z,e.w):Ee.set(e,t,n,r),M.viewport(ge.copy(Ee).multiplyScalar(Re()).round())},this.getScissor=function(e){return e.copy(De)},this.setScissor=function(e,t,n,r){e.isVector4?De.set(e.x,e.y,e.z,e.w):De.set(e,t,n,r),M.scissor(_e.copy(De).multiplyScalar(Re()).round())},this.getScissorTest=function(){return Oe},this.setScissorTest=function(e){M.setScissorTest(Oe=e)},this.setOpaqueSort=function(e){we=e},this.setTransparentSort=function(e){Te=e},this.getClearColor=function(e){return e.copy(et.getClearColor())},this.setClearColor=function(){et.setClearColor(...arguments)},this.getClearAlpha=function(){return et.getClearAlpha()},this.setClearAlpha=function(){et.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(ue!==null){let t=ue.texture.format;e=h.has(t)}if(e){let e=ue.texture.type,t=g.has(e),n=et.getClearColor(),r=et.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,j.clearBufferuiv(j.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,j.clearBufferiv(j.COLOR,0,v))}else r|=j.COLOR_BUFFER_BIT}t&&(r|=j.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=j.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&j.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),ie=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,dt,!1),t.removeEventListener(`webglcontextrestored`,ft,!1),t.removeEventListener(`webglcontextcreationerror`,mt,!1),et.dispose(),Xe.dispose(),Ze.dispose(),Ue.dispose(),N.dispose(),We.dispose(),qe.dispose(),Ke.dispose(),ot.dispose(),st.dispose(),Je.dispose(),ut.dispose(),ut.removeEventListener(`sessionstart`,Ct),ut.removeEventListener(`sessionend`,wt),Tt.stop()};function dt(e){e.preventDefault(),ht(`WebGLRenderer: Context Lost.`),A=!0}function ft(){ht(`WebGLRenderer: Context Restored.`),A=!1;let e=He.autoReset,t=$e.enabled,n=$e.autoUpdate,r=$e.needsUpdate,i=$e.type;ct(),He.autoReset=e,$e.enabled=t,$e.autoUpdate=n,$e.needsUpdate=r,$e.type=i}function mt(e){F(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function gt(e){let t=e.target;t.removeEventListener(`dispose`,gt),_t(t)}function _t(e){yt(e),N.remove(e)}function yt(e){let t=N.get(e).programs;t!==void 0&&(t.forEach(function(e){Je.releaseProgram(e)}),e.isShaderMaterial&&Je.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ie);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=It(e,t,n,r,i);M.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Ke.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;ot.setup(i,r,s,n,c);let h,g=nt;if(c!==null&&(h=Ge.get(c),g=it,g.setIndex(h)),i.isMesh)r.wireframe===!0?(M.setLineWidth(r.wireframeLinewidth*Re()),g.setMode(j.LINES)):g.setMode(j.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),M.setLineWidth(e*Re()),i.isLineSegments?g.setMode(j.LINES):i.isLineLoop?g.setMode(j.LINE_LOOP):g.setMode(j.LINE_STRIP)}else i.isPoints?g.setMode(j.POINTS):i.isSprite&&g.setMode(j.TRIANGLES);if(i.isBatchedMesh)if(Be.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Ge.get(c).bytesPerElement:1,o=N.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(j,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function bt(e,t,n,r){ie!==null&&e.isNodeMaterial&&ie.setObject(r,e),je===!0&&Qe.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,Mt(e,t,r),e.side=0,e.needsUpdate=!0,Mt(e,t,r),e.side=2):Mt(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),ie!==null&&ie.renderStart(e,t,n),x=Ze.get(n),x.init(t),T.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),ie!==null&&ie.updateLights(x.state.lightsArray),Me=this.localClippingEnabled,je=Qe.init(this.clippingPlanes,Me),je===!0&&Qe.setGlobalState(this.clippingPlanes,t),ie!==null&&$e.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i)if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];bt(o,n,t,e),r.add(o)}else bt(i,n,t,e),r.add(i)}),x=T.pop(),ie!==null&&ie.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){let t=N.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Be.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let xt=null;function St(e){xt&&xt(e)}function Ct(){Tt.stop()}function wt(){Tt.start()}let Tt=new xs;Tt.setAnimationLoop(St),typeof self<`u`&&Tt.setContext(self),this.setAnimationLoop=function(e){xt=e,ut.setAnimationLoop(e),e===null?Tt.stop():Tt.start()},ut.addEventListener(`sessionstart`,Ct),ut.addEventListener(`sessionend`,wt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){F(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(A===!0)return;ie!==null&&ie.renderStart(e,t);let n=ut.enabled===!0&&ut.isPresenting===!0,r=E!==null&&(ue===null||n)&&E.begin(O,ue);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),ut.enabled===!0&&ut.isPresenting===!0&&(E===null||E.isCompositing()===!1)&&(ut.cameraAutoUpdate===!0&&ut.updateCamera(t),t=ut.getCamera()),e.isScene===!0&&e.onBeforeRender(O,e,t,ue),x=Ze.get(e,T.length),x.init(t),x.state.textureUnits=Ue.getTextureUnits(),T.push(x),Ne.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?Ae.setFromArrayCamera(t):ke.setFromProjectionMatrix(Ne,lt,t.reversedDepth),Me=this.localClippingEnabled,je=Qe.init(this.clippingPlanes,Me),b=Xe.get(e,S.length),b.init(),S.push(b),this.info.render.frame++,ut.enabled===!0&&ut.isPresenting===!0){let e=O.xr.getDepthSensingMesh();e!==null&&Et(e,t,-1/0,O.sortObjects)}Et(e,t,0,O.sortObjects),b.finish(),ie!==null&&ie.updateLights(x.state.lightsArray),O.sortObjects===!0&&b.sort(we,Te),Le=ut.enabled===!1||ut.isPresenting===!1||ut.hasDepthSensing()===!1,Le&&et.addToRenderList(b,e),this.info.autoReset===!0&&this.info.reset(),je===!0&&Qe.beginShadows();let i=x.state.shadowsArray;if($e.render(i,e,t),je===!0&&Qe.endShadows(),(r&&E.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];Ot(n,r,e,a)}Le&&et.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];Dt(b,e,n,n.viewport)}}else r.length>0&&Ot(n,r,e,t),Le&&et.render(e),Dt(b,e,t)}ue!==null&&le===0&&(Ue.updateMultisampleRenderTarget(ue),Ue.updateRenderTargetMipmap(ue)),r&&E.end(O),e.isScene===!0&&e.onAfterRender(O,e,t),ot.resetDefaultState(),de=-1,pe=null,T.pop(),T.length>0?(x=T[T.length-1],Ue.setTextureUnits(x.state.textureUnits),je===!0&&Qe.setGlobalState(O.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,ie!==null&&ie.renderEnd()};function Et(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?Ae:ke;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&Fe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Ne);let i=qe.update(e),a=e.material;a.visible&&b.push(e,i,a,n,Fe.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?Ae:ke;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=qe.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),Fe.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Fe.copy(e.boundingSphere.center)),Fe.applyMatrix4(e.matrixWorld).applyMatrix4(Ne)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,Fe.z,s,t)}}else a.visible&&b.push(e,i,a,n,Fe.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)Et(i[e],t,n,r)}function Dt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),je===!0&&Qe.setGlobalState(O.clippingPlanes,n),r&&M.viewport(ge.copy(r)),i.length>0&&kt(i,t,n),a.length>0&&kt(a,t,n),o.length>0&&kt(o,t,n),M.buffers.depth.setTest(!0),M.buffers.depth.setMask(!0),M.buffers.color.setMask(!0),M.setPolygonOffset(!1)}function Ot(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=Be.has(`EXT_color_buffer_half_float`)||Be.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new _n(1,1,{generateMipmaps:!0,type:e?ee:w,minFilter:C,samples:Math.max(4,Ve.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:rn.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||ge;a.setSize(o.z*O.transmissionResolutionScale,o.w*O.transmissionResolutionScale);let s=O.getRenderTarget(),c=O.getActiveCubeFace(),l=O.getActiveMipmapLevel();O.setRenderTarget(a),O.getClearColor(ye),be=O.getClearAlpha(),be<1&&O.setClearColor(16777215,.5),O.clear(),Le&&et.render(n);let u=O.toneMapping;O.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),je===!0&&Qe.setGlobalState(O.clippingPlanes,r),kt(e,n,r),Ue.updateMultisampleRenderTarget(a),Ue.updateRenderTargetMipmap(a),Be.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,At(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(Ue.updateMultisampleRenderTarget(a),Ue.updateRenderTargetMipmap(a))}O.setRenderTarget(s,c,l),O.setClearColor(ye,be),d!==void 0&&(r.viewport=d),O.toneMapping=u}function kt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&At(o,t,n,s,l,c)}}function At(e,t,n,r,i,a){ie!==null&&i.isNodeMaterial&&ie.setObject(e,i),e.onBeforeRender(O,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(O,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,O.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,O.renderBufferDirect(n,t,r,i,e,a),i.side=2):O.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(O,t,n,r,i,a)}function jt(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function Mt(e,t,n){t.isScene!==!0&&(t=Ie);let r=N.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=Je.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=Je.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=We.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,gt),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Ft(e,s),d}else s.uniforms=Je.getUniforms(e),ie!==null&&e.isNodeMaterial&&ie.build(e,n,s),e.onBeforeCompile(s,O),d=Je.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Qe.uniform),Ft(e,s),r.needsLights=Rt(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=jt(x.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function Nt(e,t,n,r,i){let a=N.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=Mt(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function Pt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=pl.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Ft(e,t){let n=N.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function It(e,t,n,r,i){t.isScene!==!0&&(t=Ie),Ue.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=ue===null?O.outputColorSpace:ue.isXRRenderTarget===!0?ue.texture.colorSpace:rn.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=We.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(ue===null||ue.isXRRenderTarget===!0)&&(h=O.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=N.get(r),b=x.state.lights;if(je===!0&&(Me===!0||e!==pe)){let t=e===pe&&r.id===de;Qe.setState(r,e,t)}let S=!1,C=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==b.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?S=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Qe.numPlanes||v.numIntersection!==Qe.numIntersection)?S=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===jt(x.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(C=!0):S=!0:S=!0:(S=!0,v.__version=r.version);let w=v.currentProgram;(S===!0||C===!0)&&(w=C===!0?Nt(r,t,i,s,h):Mt(r,t,i),ie&&r.isNodeMaterial&&ie.onUpdateProgram(r,w,v));let T=!1,E=!1,D=!1,k=w.getUniforms(),A=v.uniforms;if(M.useProgram(w.program)&&(T=!0,E=!0,D=!0),r.id!==de&&(de=r.id,E=!0),T||pe!==e){M.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),k.setValue(j,`projectionMatrix`,e.projectionMatrix),k.setValue(j,`viewMatrix`,e.matrixWorldInverse);let t=k.map.cameraPosition;t!==void 0&&t.setValue(j,Pe.setFromMatrixPosition(e.matrixWorld)),Ve.logarithmicDepthBuffer&&k.setValue(j,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&k.setValue(j,`isOrthographic`,e.isOrthographicCamera===!0),pe!==e&&(pe=e,E=!0,D=!0)}if(v.needsLights&&(b.state.sunShadowMap.length>0&&k.setValue(j,`sunShadowMap`,b.state.sunShadowMap,Ue),b.state.directionalShadowMap.length>0&&k.setValue(j,`directionalShadowMap`,b.state.directionalShadowMap,Ue),b.state.spotShadowMap.length>0&&k.setValue(j,`spotShadowMap`,b.state.spotShadowMap,Ue),b.state.pointShadowMap.length>0&&k.setValue(j,`pointShadowMap`,b.state.pointShadowMap,Ue)),i.isSkinnedMesh){k.setOptional(j,i,`bindMatrix`),k.setOptional(j,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),k.setValue(j,`boneTexture`,e.boneTexture,Ue))}i.isBatchedMesh&&(k.setOptional(j,i,`batchingTexture`),k.setValue(j,`batchingTexture`,i._matricesTexture,Ue),k.setOptional(j,i,`batchingIdTexture`),k.setValue(j,`batchingIdTexture`,i._indirectTexture,Ue),k.setOptional(j,i,`batchingColorTexture`),i._colorsTexture!==null&&k.setValue(j,`batchingColorTexture`,i._colorsTexture,Ue));let ee=n.morphAttributes;if((ee.position!==void 0||ee.normal!==void 0||ee.color!==void 0)&&tt.update(i,n,w),(E||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,k.setValue(j,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(A.envMapIntensity.value=t.environmentIntensity),A.dfgLUT!==void 0&&(A.dfgLUT.value=Au()),E){if(k.setValue(j,`toneMappingExposure`,O.toneMappingExposure),v.needsLights&&Lt(A,D),a&&r.fog===!0&&Ye.refreshFogUniforms(A,a),Ye.refreshMaterialUniforms(A,r,Ce,Se,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=y,t=0;for(let n of x.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;A.probesSH.value=e.textures,A.probesMin.value=e.min,A.probesMax.value=e.max,A.probesResolution.value=e.resolution}pl.upload(j,Pt(v),A,Ue)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(pl.upload(j,Pt(v),A,Ue),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&k.setValue(j,`center`,i.center),k.setValue(j,`modelViewMatrix`,i.modelViewMatrix),k.setValue(j,`normalMatrix`,i.normalMatrix),k.setValue(j,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];st.update(n,w),st.bind(n,w)}}return w}function Lt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Rt(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return ce},this.getActiveMipmapLevel=function(){return le},this.getRenderTarget=function(){return ue},this.setRenderTargetTextures=function(e,t,n){let r=N.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),N.get(e.texture).__webglTexture=t,N.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=N.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){ue=e,ce=t,le=n;let r=null,i=!1,a=!1;if(e){let o=N.get(e);if(o.__useDefaultFramebuffer!==void 0){M.bindFramebuffer(j.FRAMEBUFFER,o.__webglFramebuffer),ge.copy(e.viewport),_e.copy(e.scissor),ve=e.scissorTest,M.viewport(ge),M.scissor(_e),M.setScissorTest(ve),de=-1;return}if(o.__webglFramebuffer===void 0)Ue.setupRenderTarget(e);else if(o.__hasExternalTextures)Ue.rebindTextures(e,N.get(e.texture).__webglTexture,N.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&N.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);Ue.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=N.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&Ue.useMultisampledRTT(e)===!1?N.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ge.copy(e.viewport),_e.copy(e.scissor),ve=e.scissorTest}else ge.copy(Ee).multiplyScalar(Ce).floor(),_e.copy(De).multiplyScalar(Ce).floor(),ve=Oe;if(n!==0&&(r=ae),M.bindFramebuffer(j.FRAMEBUFFER,r)&&M.drawBuffers(e,r),M.viewport(ge),M.scissor(_e),M.setScissorTest(ve),i){let r=N.get(e.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=N.get(e.textures[t]);j.framebufferTextureLayer(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=N.get(e.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,t.__webglTexture,n)}de=-1};function zt(e){let t=N.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Ve.textureFormatReadable(e.format),t.__typeReadable=Ve.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=N.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){M.bindFramebuffer(j.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+s);let u=zt(o);if(u.__formatReadable===!1){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&j.readPixels(t,n,r,i,at.convert(c),at.convert(l),a)}finally{let e=ue===null?null:N.get(ue).__webglFramebuffer;M.bindFramebuffer(j.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=N.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c)if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){M.bindFramebuffer(j.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+s);let d=zt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=j.createBuffer();j.bindBuffer(j.PIXEL_PACK_BUFFER,f),j.bufferData(j.PIXEL_PACK_BUFFER,a.byteLength,j.STREAM_READ),j.readPixels(t,n,r,i,at.convert(l),at.convert(u),0),j.bindBuffer(j.PIXEL_PACK_BUFFER,null);let p=ue===null?null:N.get(ue).__webglFramebuffer;M.bindFramebuffer(j.FRAMEBUFFER,p);let m=j.fenceSync(j.SYNC_GPU_COMMANDS_COMPLETE,0);return j.flush(),await vt(j,m,4),j.bindBuffer(j.PIXEL_PACK_BUFFER,f),j.getBufferSubData(j.PIXEL_PACK_BUFFER,0,a),j.bindBuffer(j.PIXEL_PACK_BUFFER,null),j.deleteBuffer(f),j.deleteSync(m),a}else throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;Ue.setTexture2D(e,0),j.copyTexSubImage2D(j.TEXTURE_2D,n,0,0,o,s,i,a),M.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=at.convert(t.format),_=at.convert(t.type),v;t.isData3DTexture?(Ue.setTexture3D(t,0),v=j.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(Ue.setTexture2DArray(t,0),v=j.TEXTURE_2D_ARRAY):(Ue.setTexture2D(t,0),v=j.TEXTURE_2D),M.activeTexture(j.TEXTURE0),M.pixelStorei(j.UNPACK_FLIP_Y_WEBGL,t.flipY),M.pixelStorei(j.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),M.pixelStorei(j.UNPACK_ALIGNMENT,t.unpackAlignment);let y=M.getParameter(j.UNPACK_ROW_LENGTH),b=M.getParameter(j.UNPACK_IMAGE_HEIGHT),x=M.getParameter(j.UNPACK_SKIP_PIXELS),S=M.getParameter(j.UNPACK_SKIP_ROWS),C=M.getParameter(j.UNPACK_SKIP_IMAGES);M.pixelStorei(j.UNPACK_ROW_LENGTH,h.width),M.pixelStorei(j.UNPACK_IMAGE_HEIGHT,h.height),M.pixelStorei(j.UNPACK_SKIP_PIXELS,l),M.pixelStorei(j.UNPACK_SKIP_ROWS,u),M.pixelStorei(j.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=N.get(e),r=N.get(t),h=N.get(n.__renderTarget),g=N.get(r.__renderTarget);M.bindFramebuffer(j.READ_FRAMEBUFFER,h.__webglFramebuffer),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,N.get(e).__webglTexture,i,d+n),j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,N.get(t).__webglTexture,a,m+n)),j.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,j.DEPTH_BUFFER_BIT,j.NEAREST);M.bindFramebuffer(j.READ_FRAMEBUFFER,null),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||N.has(e)){let n=N.get(e),r=N.get(t);M.bindFramebuffer(j.READ_FRAMEBUFFER,oe),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,se);for(let e=0;e<c;e++)w?j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):j.framebufferTexture2D(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,n.__webglTexture,i),T?j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):j.framebufferTexture2D(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,r.__webglTexture,a),i===0?T?j.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):j.copyTexSubImage2D(v,a,f,p,l,u,o,s):j.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,j.COLOR_BUFFER_BIT,j.NEAREST);M.bindFramebuffer(j.READ_FRAMEBUFFER,null),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?j.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?j.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):j.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?j.texSubImage2D(j.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?j.compressedTexSubImage2D(j.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):j.texSubImage2D(j.TEXTURE_2D,a,f,p,o,s,g,_,h);M.pixelStorei(j.UNPACK_ROW_LENGTH,y),M.pixelStorei(j.UNPACK_IMAGE_HEIGHT,b),M.pixelStorei(j.UNPACK_SKIP_PIXELS,x),M.pixelStorei(j.UNPACK_SKIP_ROWS,S),M.pixelStorei(j.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&j.generateMipmap(v),M.unbindTexture()},this.initRenderTarget=function(e){N.get(e).__webglFramebuffer===void 0&&Ue.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?Ue.setTextureCube(e,0):e.isData3DTexture?Ue.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?Ue.setTexture2DArray(e,0):Ue.setTexture2D(e,0),M.unbindTexture()},this.resetState=function(){ce=0,le=0,ue=null,M.reset(),ot.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return lt}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=rn._getDrawingBufferColorSpace(e),t.unpackColorSpace=rn._getUnpackColorSpace()}},Mu=`#1b1b1b`,Nu=(e,t,n,r,i,a={})=>({name:e,form:t,h:n,len:r,color:i,legs:.38,neck:.08,head:.2,ears:`round`,snout:`short`,tail:`thin`,...a}),Pu={cat:Nu(`cat`,`quad`,.34,1.5,`#f59e0b`,{belly:`#fde68a`,ears:`pointy`,tail:`thin`,head:.26,legs:.36,pattern:`stripes`,patternColor:`#d97706`}),dog:Nu(`dog`,`quad`,.48,1.4,`#c08552`,{belly:`#f1d9b5`,ears:`floppy`,snout:`long`,tail:`thin`,head:.24,legs:.4}),lion:Nu(`lion`,`quad`,.8,1.6,`#f2b33d`,{belly:`#fde68a`,ears:`mane`,snout:`short`,tail:`fluffy`,head:.2,legs:.42}),tiger:Nu(`tiger`,`quad`,.78,1.7,`#f97316`,{belly:`#ffedd5`,ears:`round`,tail:`thin`,head:.19,pattern:`stripes`,patternColor:`#1b1b1b`}),elephant:Nu(`elephant`,`quad`,1.45,1.3,`#9ca3af`,{ears:`floppy`,snout:`trunk`,tail:`thin`,head:.22,legs:.42}),monkey:Nu(`monkey`,`biped`,.6,1,`#8b5a2b`,{belly:`#e7c9a0`,ears:`round`,snout:`short`,tail:`curly`,head:.26,legs:.3}),gorilla:Nu(`gorilla`,`biped`,1.15,1,`#374151`,{belly:`#6b7280`,ears:`round`,snout:`short`,tail:`none`,head:.2,legs:.28}),bear:Nu(`bear`,`biped`,1.15,1,`#7c4a24`,{belly:`#c08552`,ears:`round`,snout:`short`,tail:`stub`,head:.22,legs:.28}),panda:Nu(`panda`,`biped`,1,1,`#ffffff`,{belly:`#ffffff`,ears:`round`,snout:`short`,tail:`stub`,head:.24,legs:.28,pattern:`spots`,patternColor:`#1b1b1b`}),penguin:Nu(`penguin`,`biped`,.55,1,`#1f2937`,{belly:`#ffffff`,ears:`none`,snout:`beak`,tail:`none`,head:.24,legs:.12,beak:`#f59e0b`}),crocodile:Nu(`crocodile`,`quad`,.32,4.4,`#4d8b3a`,{belly:`#c5e4a5`,ears:`none`,snout:`croc`,tail:`long`,head:.32,legs:.18,neck:0}),snake:Nu(`snake`,`snake`,.2,6,`#65a30d`,{belly:`#d9f99d`,ears:`none`,snout:`none`,tail:`none`,head:.6,pattern:`spots`,patternColor:`#365314`}),parrot:Nu(`parrot`,`bird`,.38,1,`#22c55e`,{belly:`#facc15`,ears:`none`,snout:`beak`,tail:`feather`,head:.3,legs:.16,beak:`#f97316`}),bird:Nu(`bird`,`bird`,.24,1,`#60a5fa`,{belly:`#e0f2fe`,ears:`none`,snout:`beak`,tail:`feather`,head:.32,legs:.16,beak:`#f59e0b`}),owl:Nu(`owl`,`bird`,.42,1,`#a16207`,{belly:`#fde68a`,ears:`pointy`,snout:`beak`,tail:`stub`,head:.36,legs:.1,beak:`#f59e0b`}),duck:Nu(`duck`,`bird`,.38,1,`#fde047`,{belly:`#fef9c3`,ears:`none`,snout:`duck`,tail:`feather`,head:.3,legs:.14,beak:`#f97316`}),chicken:Nu(`chicken`,`bird`,.42,1,`#ffffff`,{belly:`#fef2f2`,ears:`none`,snout:`beak`,tail:`feather`,head:.28,legs:.18,beak:`#f59e0b`}),horse:Nu(`horse`,`quad`,1.25,1.4,`#a0522d`,{belly:`#c08552`,ears:`pointy`,snout:`long`,tail:`fluffy`,head:.16,legs:.5,neck:.22}),donkey:Nu(`donkey`,`quad`,1,1.35,`#9ca3af`,{belly:`#e5e7eb`,ears:`long`,snout:`long`,tail:`thin`,head:.17,legs:.48,neck:.16}),zebra:Nu(`zebra`,`quad`,1.15,1.4,`#ffffff`,{ears:`pointy`,snout:`long`,tail:`thin`,head:.16,legs:.5,neck:.2,pattern:`stripes`,patternColor:`#1b1b1b`}),cow:Nu(`cow`,`quad`,1.1,1.5,`#ffffff`,{belly:`#fbcfe8`,ears:`horns`,snout:`pig`,tail:`thin`,head:.18,legs:.42,neck:.08,pattern:`spots`,patternColor:`#1b1b1b`}),buffalo:Nu(`buffalo`,`quad`,1.1,1.5,`#374151`,{ears:`horns`,snout:`pig`,tail:`thin`,head:.18,legs:.4}),goat:Nu(`goat`,`quad`,.7,1.3,`#e5e7eb`,{ears:`horns`,snout:`long`,tail:`stub`,head:.18,legs:.46,neck:.12}),sheep:Nu(`sheep`,`quad`,.65,1.3,`#f8fafc`,{ears:`floppy`,snout:`short`,tail:`stub`,head:.18,legs:.4}),pig:Nu(`pig`,`quad`,.55,1.4,`#f9a8d4`,{belly:`#fbcfe8`,ears:`pointy`,snout:`pig`,tail:`curly`,head:.24,legs:.3}),rabbit:Nu(`rabbit`,`quad`,.34,1.2,`#f5f5f4`,{belly:`#ffffff`,ears:`long`,snout:`short`,tail:`stub`,head:.3,legs:.3}),mouse:Nu(`mouse`,`quad`,.16,1.6,`#9ca3af`,{belly:`#e5e7eb`,ears:`round`,snout:`long`,tail:`long`,head:.3,legs:.25}),fox:Nu(`fox`,`quad`,.5,1.6,`#ea580c`,{belly:`#ffffff`,ears:`pointy`,snout:`long`,tail:`fluffy`,head:.22,legs:.38}),wolf:Nu(`wolf`,`quad`,.72,1.6,`#6b7280`,{belly:`#d1d5db`,ears:`pointy`,snout:`long`,tail:`fluffy`,head:.2,legs:.42}),deer:Nu(`deer`,`quad`,1.05,1.3,`#b45309`,{belly:`#fde68a`,ears:`antlers`,snout:`long`,tail:`stub`,head:.15,legs:.55,neck:.2,pattern:`spots`,patternColor:`#fef3c7`}),giraffe:Nu(`giraffe`,`quad`,2.1,.85,`#fbbf24`,{ears:`horns`,snout:`long`,tail:`thin`,head:.09,legs:.42,neck:.42,pattern:`spots`,patternColor:`#b45309`}),camel:Nu(`camel`,`quad`,1.5,1.2,`#d4a373`,{ears:`round`,snout:`long`,tail:`thin`,head:.12,legs:.5,neck:.25}),kangaroo:Nu(`kangaroo`,`biped`,1,1,`#c08552`,{belly:`#f1d9b5`,ears:`long`,snout:`long`,tail:`thin`,head:.18,legs:.34}),squirrel:Nu(`squirrel`,`quad`,.24,1.3,`#b45309`,{belly:`#fde68a`,ears:`pointy`,snout:`short`,tail:`fluffy`,head:.3,legs:.28}),frog:Nu(`frog`,`quad`,.2,1.4,`#4ade80`,{belly:`#bbf7d0`,ears:`none`,snout:`none`,tail:`none`,head:.5,legs:.2}),turtle:Nu(`turtle`,`quad`,.3,1.8,`#16a34a`,{belly:`#a3e635`,ears:`none`,snout:`short`,tail:`stub`,head:.25,legs:.15,pattern:`spots`,patternColor:`#166534`}),dinosaur:Nu(`dinosaur`,`quad`,1.8,1.3,`#4d8b3a`,{belly:`#c5e4a5`,ears:`none`,snout:`long`,tail:`long`,head:.15,legs:.42,neck:.3}),fish:Nu(`fish`,`fish`,.25,1.6,`#fb923c`,{ears:`none`,snout:`none`,tail:`feather`,head:.4}),shark:Nu(`shark`,`fish`,.6,3,`#64748b`,{belly:`#e2e8f0`,ears:`none`,snout:`none`,tail:`feather`,head:.4}),dolphin:Nu(`dolphin`,`fish`,.5,2.6,`#60a5fa`,{belly:`#e0f2fe`,ears:`none`,snout:`none`,tail:`feather`,head:.4})},Fu={kitty:`cat`,kitten:`cat`,billi:`cat`,puppy:`dog`,doggy:`dog`,kutta:`dog`,sher:`lion`,haathi:`elephant`,bandar:`monkey`,chimp:`monkey`,ape:`gorilla`,croc:`crocodile`,alligator:`crocodile`,magarmach:`crocodile`,cobra:`snake`,python:`snake`,tota:`parrot`,sparrow:`bird`,crow:`bird`,pigeon:`bird`,eagle:`bird`,hen:`chicken`,rooster:`chicken`,chick:`chicken`,murgi:`chicken`,bull:`cow`,ox:`cow`,calf:`cow`,lamb:`sheep`,bunny:`rabbit`,rat:`mouse`,leopard:`tiger`,cheetah:`tiger`,puma:`lion`,t_rex:`dinosaur`,"t-rex":`dinosaur`,dino:`dinosaur`,tortoise:`turtle`,whale:`dolphin`,toad:`frog`,donkeys:`donkey`,pony:`horse`,reindeer:`deer`,moose:`deer`,hippo:`buffalo`,hippopotamus:`buffalo`,rhino:`buffalo`,rhinoceros:`buffalo`,koala:`bear`,"polar bear":`bear`,teddy:`bear`,gadha:`donkey`,oont:`camel`};function Iu(e){let t=e.toLowerCase(),n=t.match(/[a-z][a-z-]*/g)??[];for(let e of n){let t=e.endsWith(`s`)&&Pu[e.slice(0,-1)]?e.slice(0,-1):e;if(Pu[t])return Pu[t];if(Fu[t])return Pu[Fu[t]]}for(let[e,n]of Object.entries(Fu))if(e.includes(` `)&&t.includes(e))return Pu[n];return null}function Lu(e){let t=0;for(let n of e)t=t*31+n.charCodeAt(0)>>>0;let n=[`#f59e0b`,`#a78bfa`,`#34d399`,`#f472b6`,`#60a5fa`,`#c08552`,`#9ca3af`,`#fb7185`],r=[`pointy`,`round`,`floppy`,`long`];return Nu(e,`quad`,.45+t%5*.12,1.3+t%3*.2,n[t%n.length],{ears:r[t%r.length],snout:t%2?`long`:`short`,tail:t%3?`fluffy`:`thin`,head:.22})}function Ru(e,t){let n=parseInt(e.slice(1),16),r=e=>Math.max(0,Math.min(255,Math.round(e+t)));return`#${(r(n>>16&255)<<16|r(n>>8&255)<<8|r(n&255)).toString(16).padStart(6,`0`)}`}function zu(e,t,n,r){e.lineCap=`round`,e.lineJoin=`round`,e.beginPath(),t.forEach(([t,n],r)=>r?e.lineTo(t,n):e.moveTo(t,n)),e.strokeStyle=Mu,e.lineWidth=n+Math.max(3,n*.28),e.stroke(),e.strokeStyle=r,e.lineWidth=n,e.stroke()}function Bu(e,t,n,r,i,a,o,s=0){e.beginPath(),e.ellipse(t,n,Math.max(1,r),Math.max(1,i),s,0,Math.PI*2),e.fillStyle=a,e.fill(),e.lineWidth=o,e.strokeStyle=Mu,e.stroke()}function Vu(e,t,n,r,i,a,o=!1){let s=r*.3,c=o?[[t+r*.35,n-r*.2,1]]:[[t+r*.05,n-r*.25,.85],[t+r*.5,n-r*.25,1]];for(let[t,n,r]of c){if(i.blink){e.beginPath(),e.moveTo(t-s*r,n),e.lineTo(t+s*r,n),e.lineWidth=a,e.strokeStyle=Mu,e.stroke();continue}Bu(e,t,n,s*r,s*r*(i.expr===`surprised`?1.15:1),`#ffffff`,a*.8);let o=s*r*(i.expr===`surprised`?.35:.5);if(e.beginPath(),e.arc(t+s*.3,n+(i.expr===`sad`?s*.2:0),o,0,Math.PI*2),e.fillStyle=Mu,e.fill(),e.beginPath(),e.arc(t+s*.45,n-s*.2,o*.35,0,Math.PI*2),e.fillStyle=`#ffffff`,e.fill(),i.expr===`angry`||i.expr===`sad`||i.expr===`suspicious`){e.beginPath();let o=i.expr===`angry`?1:i.expr===`sad`?-1:0;e.moveTo(t-s*r,n-s*1.5-o*s*.4),e.lineTo(t+s*r,n-s*1.5+o*s*.4),e.lineWidth=a*1.2,e.strokeStyle=Mu,e.stroke()}}}function Hu(e,t,n,r,i,a){if(e.lineWidth=a,e.strokeStyle=Mu,i.talk>.05||i.expr===`surprised`){let o=i.talk>.05?i.talk:.6;Bu(e,t,n+r*.15,r*.45,r*.45*o+1,`#7f1d1d`,a*.8);return}e.beginPath(),i.expr===`sad`||i.expr===`angry`?e.arc(t,n+r*.4,r*.4,Math.PI*1.15,Math.PI*1.85):e.arc(t,n-r*.05,r*.4,Math.PI*.15,Math.PI*.85),e.stroke()}function Uu(e,t,n,r,i,a,o,s){let c=t.color,l=Ru(c,-30);if(t.ears===`mane`&&!s){e.beginPath();for(let t=0;t<28;t++){let a=t/28*Math.PI*2,o=i*(t%2?1.45:1.75);e.lineTo(n+Math.cos(a)*o,r+Math.sin(a)*o)}e.closePath(),e.fillStyle=`#b45309`,e.fill(),e.lineWidth=a,e.strokeStyle=Mu,e.stroke()}if(s!==(t.ears===`floppy`))return;let u=Math.sin(o/9)*.08;if(t.ears===`pointy`)for(let t of[-.45,.35])e.beginPath(),e.moveTo(n+(t-.25)*i,r-i*.6),e.lineTo(n+(t+u)*i,r-i*1.45),e.lineTo(n+(t+.3)*i,r-i*.7),e.closePath(),e.fillStyle=c,e.fill(),e.lineWidth=a,e.strokeStyle=Mu,e.stroke();else if(t.ears===`round`)for(let t of[-.6,.5])Bu(e,n+t*i,r-i*.75,i*.32,i*.32,l,a);else if(t.ears===`long`)for(let t of[-.3,.25])Bu(e,n+t*i,r-i*1.35,i*.2,i*.7,c,a,u+t*.3);else if(t.ears===`floppy`){let o=t.snout===`trunk`?1.5:.75;Bu(e,n-i*.55,r+i*.05,i*.32*o,i*.6*o,Ru(c,-20),a,.3+u)}else if(t.ears===`horns`||t.ears===`antlers`)for(let o of[-.35,.3])e.beginPath(),e.moveTo(n+o*i,r-i*.8),e.quadraticCurveTo(n+(o-.3)*i,r-i*1.5,n+(o+.1)*i,r-i*(t.ears===`antlers`?2:1.4)),t.ears===`antlers`&&(e.moveTo(n+(o-.05)*i,r-i*1.35),e.lineTo(n+(o+.4)*i,r-i*1.6)),e.lineWidth=a*2.4,e.strokeStyle=Mu,e.stroke(),e.lineWidth=a*1.2,e.strokeStyle=`#f5f5f4`,e.stroke()}function Wu(e,t,n,r,i,a,o){if(Uu(e,t,n,r,i,o,a.n,!1),t.snout===`croc`){let s=Math.max(a.talk,a.expr===`angry`?.4:0)*i*.8;Bu(e,n,r,i*.7,i*.55,t.color,o),e.fillStyle=t.color,e.strokeStyle=Mu,e.lineWidth=o,e.beginPath(),e.roundRect(n,r-i*.35-s*.5,i*2.1,i*.5,i*.2),e.fill(),e.stroke(),e.beginPath(),e.roundRect(n,r+i*.05+s*.5,i*2,i*.4,i*.18),e.fillStyle=t.belly??Ru(t.color,40),e.fill(),e.stroke(),e.fillStyle=`#ffffff`;for(let t=0;t<6;t++){let a=n+i*(.3+t*.28);e.beginPath(),e.moveTo(a,r+i*.15-s*.5),e.lineTo(a+i*.1,r+i*.32-s*.3),e.lineTo(a+i*.2,r+i*.15-s*.5),e.fill()}Vu(e,n-i*.05,r-i*.35,i*.7,a,o,!1);return}Bu(e,n,r,i,i*.95,t.color,o),t.ears===`mane`&&Bu(e,n,r,i,i*.95,t.color,o);let s=t.belly??Ru(t.color,45),c=n+i*.55,l=r+i*.3;if(t.snout===`short`||t.snout===`pig`)Bu(e,c,l,i*.42,i*.3,t.snout===`pig`?Ru(t.color,-25):s,o),t.snout===`pig`?(Bu(e,c-i*.12,l,i*.06,i*.1,Mu,1),Bu(e,c+i*.12,l,i*.06,i*.1,Mu,1)):Bu(e,c+i*.15,l-i*.12,i*.1,i*.07,Mu,1),Hu(e,c,l+i*.22,i*.5,a,o*.8);else if(t.snout===`long`)Bu(e,n+i*.85,r+i*.25,i*.6,i*.32,s,o),Bu(e,n+i*1.4,r+i*.12,i*.12,i*.1,Mu,1),Hu(e,n+i*1.05,r+i*.48,i*.5,a,o*.8);else if(t.snout===`trunk`){let s=Math.sin(a.n/11)*.5+a.talk*.6;e.beginPath(),e.moveTo(n+i*.6,r+i*.2),e.quadraticCurveTo(n+i*(1.4+s*.3),r+i*.6,n+i*(1.1+s),r+i*(1.5-s*.5)),zu(e,[[n+i*.6,r+i*.2],[n+i*(1.25+s*.2),r+i*.7],[n+i*(1.1+s),r+i*(1.5-s*.5)]],i*.32,t.color),Hu(e,n+i*.45,r+i*.62,i*.45,a,o*.8)}else if(t.snout===`beak`||t.snout===`duck`){let s=a.talk*i*.35;e.fillStyle=t.beak??`#f59e0b`,e.strokeStyle=Mu,e.lineWidth=o;let c=t.snout===`duck`?1.6:1.3;e.beginPath(),e.moveTo(n+i*.75,r-i*.05),e.lineTo(n+i*c,r+i*.15-s*.3),e.lineTo(n+i*.75,r+i*.3),e.closePath(),e.fill(),e.stroke(),e.beginPath(),e.moveTo(n+i*.75,r+i*.3),e.lineTo(n+i*(c-.15),r+i*.3+s),e.lineTo(n+i*.75,r+i*.45),e.closePath(),e.fill(),e.stroke()}else Hu(e,n+i*.45,r+i*.45,i*.6,a,o*.8);Vu(e,n,r,i,a,o,!1),Uu(e,t,n,r,i,o,a.n,!0)}function Gu(e,t,n,r,i,a){if(t.pattern){if(e.save(),e.beginPath(),e.ellipse(n,r,i,a,0,0,Math.PI*2),e.clip(),e.fillStyle=t.patternColor??Mu,e.strokeStyle=t.patternColor??Mu,t.pattern===`stripes`){e.lineWidth=i*.09;for(let t=-3;t<=3;t++)e.beginPath(),e.moveTo(n+t*i*.28,r-a),e.quadraticCurveTo(n+t*i*.28+i*.08,r,n+t*i*.28-i*.05,r+a*.2),e.stroke()}else for(let t=0;t<9;t++){let o=n+Math.sin(t*7.3)*i*.7,s=r+Math.cos(t*3.1)*a*.5;e.beginPath(),e.ellipse(o,s,i*.12,a*.15,t,0,Math.PI*2),e.fill()}e.restore()}}function Ku(e,t,n,r,i,a,o){let s=Math.sin(a/5)*.5,c=t.color;if(t.tail===`thin`||t.tail===`fluffy`){let a=n-i*.35,l=r-i*(.35+s*.2);zu(e,[[n,r],[n-i*.2,r-i*.05],[a,l]],i*(t.tail===`fluffy`?.08:.05),c),t.tail===`fluffy`&&Bu(e,a,l,i*.08,i*.11,t.ears===`mane`?`#b45309`:Ru(c,30),o)}else if(t.tail===`long`){let a=t.snout===`croc`?.12:.05,l=t.snout===`croc`?1.1:.7;e.beginPath(),e.moveTo(n,r-i*a),e.quadraticCurveTo(n-i*l*.45,r-i*(.05+s*.1),n-i*l,r+i*.05),e.lineTo(n,r+i*a),e.closePath(),e.fillStyle=c,e.fill(),e.lineWidth=o,e.strokeStyle=Mu,e.stroke()}else if(t.tail===`curly`)e.beginPath(),e.moveTo(n,r),e.bezierCurveTo(n-i*.4,r-i*.1,n-i*.5,r-i*(.6+s*.2),n-i*.25,r-i*.55),e.lineWidth=i*.05+3,e.strokeStyle=Mu,e.stroke(),e.lineWidth=i*.05,e.strokeStyle=c,e.stroke();else if(t.tail===`stub`)Bu(e,n-i*.02,r-i*.05,i*.07,i*.06,Ru(c,25),o);else if(t.tail===`feather`)for(let t of[-.4,0,.4])Bu(e,n-i*.15,r-i*.05,i*.18,i*.06,Ru(c,-25),o,t+s*.3)}function qu(e,t,n,r,i,a,o){let s=Math.max(2,a*.018+1.5),c=n.walking?n.n*.42:0;e.save(),e.translate(r,i),e.scale(o,1),e.fillStyle=`rgba(0,0,0,0.13)`,e.beginPath(),e.ellipse(0,0,a*t.len*.35+a*.1,a*.05,0,0,Math.PI*2),e.fill();let l=n.walking?Math.abs(Math.sin(c))*a*.03:Math.sin(n.n/18)*a*.008;if(e.translate(0,-l),t.form===`quad`){let r=t.legs*a,i=a*(t.name===`giraffe`?.18:.34),o=t.len*a*.55,l=-(r+i/2),u=Ru(t.color,-35),d=[[o*.32,0],[-o*.32,Math.PI]];for(let[t,n]of d){let s=Math.sin(c+n+1.6)*.45;zu(e,[[t+o*.05,l+i*.2],[t+o*.05+Math.sin(s)*r,-Math.cos(s)*2]],a*.07,u)}Ku(e,t,-o*.45,l-i*.1,a,n.n,s),Bu(e,0,l,o/2,i/2,t.color,s),t.belly&&Bu(e,0,l+i*.2,o*.35,i*.22,t.belly,.01),Gu(e,t,0,l,o/2,i/2);for(let[n,o]of d){let u=Math.sin(c+o)*.45,d=n+Math.sin(u)*r,f=-Math.cos(u)*2;zu(e,[[n,l+i*.2],[n+Math.sin(u)*r*.5+2,l+i*.2+r*.55],[d,f]],a*.08,t.color),Bu(e,d+a*.02,f-a*.01,a*.055,a*.035,Ru(t.color,-15),s*.8)}let f=t.head*a,p=Math.sin(n.n/10)*a*.01+n.talk*a*.02,m=o*.5+t.neck*a*.35+(t.snout===`croc`?-f*.2:f*.2),h=l-i*.25-t.neck*a+(t.snout===`croc`?i*.25:0)+p;t.neck>.02&&zu(e,[[o*.38,l-i*.15],[m-f*.2,h+f*.3]],Math.max(a*.09,f*.8),t.color),Wu(e,t,m,h,f,n,s)}else if(t.form===`biped`){let r=t.legs*a,i=a*.45,o=a*.3,l=-(r+i/2);for(let n of[0,Math.PI]){let s=Math.sin(c+n)*.4;zu(e,[[n?-o*.2:o*.2,l+i*.35],[(n?-o*.2:o*.2)+Math.sin(s)*r,-2]],a*.09,Ru(t.color,n?-30:0))}if(Ku(e,t,-o*.45,l+i*.3,a,n.n,s),Bu(e,0,l,o/2,i/2,t.color,s),t.belly&&Bu(e,o*.08,l+i*.06,o*.32,i*.34,t.belly,.01),t.name===`panda`)for(let t of[-1,1])Bu(e,t*o*.42,l-i*.05,o*.12,i*.3,Mu,.01);let u=n.walking?Math.sin(c)*.6:Math.sin(n.n/14)*.1+n.talk*.4,d=a*(t.name===`penguin`?.18:.32);zu(e,[[o*.35,l-i*.25],[o*.35+Math.sin(u+.3)*d,l-i*.25+Math.cos(u+.3)*d]],a*.07,t.name===`panda`?Mu:t.color);let f=t.head*a;Wu(e,t,o*.1,l-i/2-f*.75+Math.sin(n.n/10)*a*.01,f,n,s)}else if(t.form===`bird`){let r=n.flying?0:t.legs*a,i=a*.32,o=-(r+i)-(n.flying?a*1.6+Math.sin(n.n/5)*a*.2:0);if(!n.flying)for(let r of[-1,1])zu(e,[[r*i*.25,o+i*.8],[r*i*.25+(n.walking?Math.sin(c+(r>0?0:Math.PI))*i*.4:0),-1]],a*.03,t.beak??`#f59e0b`);Ku(e,t,-i*.9,o+i*.2,a,n.n,s),Bu(e,0,o,i*1.05,i,t.color,s),t.belly&&Bu(e,i*.25,o+i*.25,i*.55,i*.6,t.belly,.01);let l=n.flying?Math.sin(n.n*.9)*.9:n.talk*.4+Math.sin(n.n/12)*.05;Bu(e,-i*.15,o-i*.1,i*.6,i*.3,Ru(t.color,-30),s,-.4-l),Wu(e,t,i*.55,o-i*.95,t.head*a,n,s)}else if(t.form===`snake`){let r=t.len*a,i=a*.45,o=[];for(let e=0;e<=26;e++){let t=e/26,a=-r/2+t*r;o.push([a,-i*.5+Math.sin(t*9-n.n*.25)*i*.35*(1-t*.5)])}let c=r/2+a*.1,l=-a*1.2+Math.sin(n.n/8)*a*.1;o.push([r/2,-a*.6],[c-a*.1,l+a*.2]),zu(e,o,i,t.color),(n.n%30<6||n.talk>.2)&&(e.beginPath(),e.moveTo(c+a*.3,l+a*.08),e.lineTo(c+a*.55,l+a*.05),e.moveTo(c+a*.48,l+a*.06),e.lineTo(c+a*.6,l-a*.02),e.moveTo(c+a*.48,l+a*.06),e.lineTo(c+a*.6,l+a*.14),e.lineWidth=s,e.strokeStyle=`#dc2626`,e.stroke()),Bu(e,c,l,a*.38,a*.28,t.color,s),Vu(e,c-a*.08,l-a*.05,a*.3,n,s,!1),Hu(e,c+a*.18,l+a*.12,a*.2,n,s*.8)}else{let r=t.len*a*.5,i=-a*1.5+Math.sin(n.n/9)*a*.2,o=Math.sin(n.n/3)*.4;e.save(),e.translate(-r*.9,i),e.rotate(o),e.beginPath(),e.moveTo(0,0),e.lineTo(-r*.6,-a*.45),e.lineTo(-r*.6,a*.45),e.closePath(),e.fillStyle=Ru(t.color,-20),e.fill(),e.lineWidth=s,e.strokeStyle=Mu,e.stroke(),e.restore(),Bu(e,0,i,r,a*.45,t.color,s),t.belly&&Bu(e,0,i+a*.18,r*.7,a*.18,t.belly,.01),t.name!==`fish`&&(e.beginPath(),e.moveTo(-r*.1,i-a*.4),e.lineTo(-r*.35,i-a*.95),e.lineTo(r*.2,i-a*.4),e.fillStyle=t.color,e.fill(),e.stroke()),Vu(e,r*.55,i-a*.1,a*.35,n,s,!1),Hu(e,r*.8,i+a*.12,a*.25,n,s*.8)}e.restore()}var Ju={bus:[3.4,1.55],car:[2,.8],taxi:[2,.8],jeep:[2,.95],truck:[3.2,1.5],bike:[.95,.55],train:[4.6,1.55],tractor:[1.8,1.1],boat:[2.6,.9],rickshaw:[1.5,1]},Yu={bus:`bus`,coach:`bus`,car:`car`,automobile:`car`,taxi:`taxi`,cab:`taxi`,jeep:`jeep`,truck:`truck`,lorry:`truck`,bike:`bike`,bicycle:`bike`,cycle:`bike`,train:`train`,locomotive:`train`,tractor:`tractor`,boat:`boat`,ship:`boat`,rickshaw:`rickshaw`,tuk:`rickshaw`};function Xu(e){for(let t of e.toLowerCase().match(/[a-z]+/g)??[])if(Yu[t])return Yu[t];return null}function Zu(e,t,n,r,i,a,o){Bu(e,t,n,r,r,`#1f2937`,o),Bu(e,t,n,r*.5,r*.5,`#d1d5db`,o*.8);let s=a?i*.5:0;e.strokeStyle=Mu,e.lineWidth=o*.7;for(let i=0;i<3;i++)e.beginPath(),e.moveTo(t+Math.cos(s+i*2.09)*r*.48,n+Math.sin(s+i*2.09)*r*.48),e.lineTo(t-Math.cos(s+i*2.09)*r*.48,n-Math.sin(s+i*2.09)*r*.48),e.stroke()}function Qu(e,t,n,r,i,a,o,s,c){let[l,u]=Ju[t],d=l*i,f=u*i,p=Math.max(3,i*.012);e.save(),e.translate(n,r-(s?Math.abs(Math.sin(o*.7))*i*.008:0)),e.scale(a,1),e.fillStyle=`rgba(0,0,0,0.15)`,e.beginPath(),e.ellipse(0,0,d*.5,i*.04,0,0,Math.PI*2),e.fill();let m=t===`bike`?f*.42:f*.17;if(e.lineWidth=p,e.strokeStyle=Mu,t===`bike`){Zu(e,-d*.32,-m,m,o,s,p),Zu(e,d*.32,-m,m,o,s,p),e.beginPath(),e.moveTo(-d*.32,-m),e.lineTo(-d*.05,-m*2),e.lineTo(d*.25,-m*2),e.lineTo(d*.32,-m),e.moveTo(-d*.05,-m*2),e.lineTo(0,-m),e.lineTo(-d*.32,-m),e.moveTo(d*.25,-m*2),e.lineTo(d*.22,-m*2.4),e.strokeStyle=Mu,e.lineWidth=p*2.4,e.stroke(),e.strokeStyle=c,e.lineWidth=p*1.2,e.stroke(),e.restore();return}let h=-m*1.1,g=-f;if(e.fillStyle=c,e.beginPath(),t===`car`||t===`taxi`||t===`jeep`?(e.moveTo(-d/2,h),e.lineTo(-d/2,g+f*.45),e.lineTo(-d*.28,g+f*.42),e.lineTo(-d*.15,g),e.lineTo(d*.18,g),e.lineTo(d*.32,g+f*.42),e.lineTo(d/2,g+f*.5),e.lineTo(d/2,h)):t===`boat`?(e.moveTo(-d/2,g+f*.4),e.lineTo(d/2,g+f*.4),e.lineTo(d*.35,0),e.lineTo(-d*.4,0)):e.roundRect(-d/2,g,d,f+h,f*.1),e.closePath(),e.fill(),e.stroke(),e.fillStyle=`#cfe8ff`,t===`bus`||t===`train`){let n=t===`bus`?5:7;for(let t=0;t<n;t++)e.beginPath(),e.roundRect(-d/2+d*.05+t*(d*.82/n),g+f*.12,d*.82/n-d*.02,f*.32,f*.04),e.fill(),e.stroke();e.fillStyle=Ru(c,-40),e.fillRect(-d/2,g+f*.55,d,f*.06),e.fillStyle=`#cfe8ff`,e.beginPath(),e.roundRect(d/2-d*.11,g+f*.12,d*.09,f*.6,f*.03),e.fill(),e.stroke(),t===`bus`&&(e.fillStyle=Mu,e.font=`bold ${Math.round(f*.11)}px Arial`,e.fillText(`CITY BUS`,-d*.42,g+f*.53))}else t===`car`||t===`taxi`||t===`jeep`?(e.beginPath(),e.moveTo(-d*.12,g+f*.08),e.lineTo(d*.15,g+f*.08),e.lineTo(d*.26,g+f*.4),e.lineTo(-d*.22,g+f*.4),e.closePath(),e.fill(),e.stroke(),t===`taxi`&&(e.fillStyle=Mu,e.fillRect(-d*.08,g-f*.1,d*.16,f*.1))):(t===`truck`||t===`tractor`||t===`rickshaw`)&&(e.beginPath(),e.roundRect(d*.18,g+f*.1,d*.24,f*.3,f*.04),e.fill(),e.stroke());if(e.fillStyle=`#fde047`,e.beginPath(),e.arc(d/2-d*.01,h-f*.15,f*.05,0,Math.PI*2),e.fill(),e.stroke(),t!==`boat`){let n=t===`train`?[-.38,-.2,.2,.38]:t===`bus`||t===`truck`?[-.33,.3]:[-.3,.3];for(let r of n)Zu(e,d*r,-m,t===`tractor`&&r<0?m*1.6:m,o,s,p)}else{e.strokeStyle=`#e0f2fe`,e.lineWidth=p*1.5,e.beginPath();for(let t=-3;t<=3;t++)e.arc(t*d*.12+o%20,2,d*.05,Math.PI,0);e.stroke()}e.restore()}var $u=[{id:`park`,label:`Park`},{id:`street`,label:`Street`},{id:`home`,label:`Living room`},{id:`office`,label:`Office`},{id:`classroom`,label:`Classroom`},{id:`kitchen`,label:`Kitchen`},{id:`bedroom`,label:`Bedroom`},{id:`shop`,label:`Shop`},{id:`restaurant`,label:`Restaurant`},{id:`police`,label:`Police station`},{id:`plain`,label:`Plain`},{id:`jungle`,label:`Jungle`},{id:`forest`,label:`Forest`},{id:`beach`,label:`Beach`},{id:`desert`,label:`Desert`},{id:`cave`,label:`Cave`},{id:`mountain`,label:`Mountains`},{id:`snow`,label:`Snow`},{id:`farm`,label:`Farm`},{id:`village`,label:`Village`},{id:`space`,label:`Space / Moon`},{id:`underwater`,label:`Under the sea`},{id:`hospital`,label:`Hospital`},{id:`library`,label:`Library`},{id:`stage`,label:`Stage`},{id:`gym`,label:`Gym`},{id:`bus`,label:`Inside a bus`},{id:`train`,label:`Inside a train`},{id:`car`,label:`Inside a car`},{id:`plane`,label:`Inside a plane`}],ed=`#1b1b1b`,H=e=>Math.round(e*10)/10,U=(e,t=e.sw)=>`stroke="${ed}" stroke-width="${H(t)}" stroke-linejoin="round"`;function W(e,t,n,r,i,a,o=0){return`<rect x="${H(t)}" y="${H(n)}" width="${H(r)}" height="${H(i)}" rx="${H(o)}" fill="${a}" ${U(e)}/>`}function td(e,t,n){return`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t}"/><stop offset="1" stop-color="${n}"/></linearGradient></defs><rect width="${e.width}" height="${e.height}" fill="url(#sky)"/>`}function nd(e,t,n,r){let i=e.unit*r;return`<path d="M${H(t)} ${H(n)} q${H(10*i)} ${H(-28*i)} ${H(38*i)} ${H(-18*i)} q${H(22*i)} ${H(-24*i)} ${H(50*i)} ${H(-4*i)} q${H(30*i)} ${H(-6*i)} ${H(34*i)} ${H(22*i)} z" fill="#ffffff" ${U(e,e.sw*.7)}/>`}function rd(e,t,n,r=`#ffffff`){let i=e.floorY-70*e.unit,a=`<rect width="${e.width}" height="${e.height}" fill="${t}"/>`;return a+=`<rect x="0" y="${H(i)}" width="${e.width}" height="${H(e.height-i)}" fill="${n}"/>`,a+=`<rect x="0" y="${H(i-10*e.unit)}" width="${e.width}" height="${H(10*e.unit)}" fill="${r}" ${U(e)}/>`,a}function id(e,t,n,r,i,a){let o=W(e,t,n,r,i,`#cfe8ff`);return o+=`<path d="M${H(t+r/2)} ${H(n)} V${H(n+i)} M${H(t)} ${H(n+i/2)} H${H(t+r)}" ${U(e)}/>`,a&&(o+=`<path d="M${H(t-8)} ${H(n-6)} h${H(r*.32)} q${H(-r*.12)} ${H(i*.6)} ${H(-r*.04)} ${H(i+12)} h${H(-r*.28)} z" fill="${a}" ${U(e)}/>`,o+=`<path d="M${H(t+r+8)} ${H(n-6)} h${H(-r*.32)} q${H(r*.12)} ${H(i*.6)} ${H(r*.04)} ${H(i+12)} h${H(r*.28)} z" fill="${a}" ${U(e)}/>`),o}function ad(e,t,n=1,r=`#7cc36b`){let i=e.unit*n,a=e.floorY-40*e.unit;return W(e,t-12*i,a-190*i,24*i,190*i,`#8b5a2b`)+`<circle cx="${H(t)}" cy="${H(a-230*i)}" r="${H(85*i)}" fill="${r}" ${U(e)}/><circle cx="${H(t-60*i)}" cy="${H(a-190*i)}" r="${H(50*i)}" fill="${r}" ${U(e)}/><circle cx="${H(t+60*i)}" cy="${H(a-190*i)}" r="${H(50*i)}" fill="${r}" ${U(e)}/>`}function od(e,t,n,r=1){let i=e.unit*r;return`<path d="M${H(t-50*i)} ${H(n)} q0 ${H(-40*i)} ${H(30*i)} ${H(-34*i)} q${H(14*i)} ${H(-30*i)} ${H(42*i)} ${H(-8*i)} q${H(30*i)} ${H(-6*i)} ${H(28*i)} ${H(42*i)} z" fill="#6fb35e" ${U(e)}/>`}function sd(e,t){let n=e.unit,r=e.floorY;return`<path d="M${H(t-22*n)} ${H(r-50*n)} L${H(t+22*n)} ${H(r-50*n)} L${H(t+16*n)} ${H(r)} L${H(t-16*n)} ${H(r)} Z" fill="#c8693c" ${U(e)}/><path d="M${H(t)} ${H(r-50*n)} q${H(-40*n)} ${H(-40*n)} ${H(-30*n)} ${H(-90*n)} q${H(26*n)} ${H(30*n)} ${H(30*n)} ${H(90*n)} q${H(10*n)} ${H(-70*n)} ${H(40*n)} ${H(-80*n)} q${H(6*n)} ${H(50*n)} ${H(-40*n)} ${H(80*n)}" fill="#5fae55" ${U(e)}/>`}function cd(e,t,n){let r=e.unit;return`<circle cx="${H(t)}" cy="${H(n)}" r="${H(26*r)}" fill="#ffffff" ${U(e)}/><path d="M${H(t)} ${H(n)} V${H(n-16*r)} M${H(t)} ${H(n)} H${H(t+12*r)}" ${U(e)}/>`}function ld(e,t,n,r,i,a){return W(e,t,n,r,i,`#d9a066`)+W(e,t+8*e.unit,n+8*e.unit,r-16*e.unit,i-16*e.unit,a)}function ud(e,t,n){let r=e.unit,i=e.wood,a=e.seatY,o=t-70*r,s=n+70*r,c=``;for(let t of[o+14*r,s-22*r])c+=W(e,t,a-92*r,8*r,92*r,`#4b5563`);c+=W(e,o,a-96*r,s-o,22*r,i,4*r)+W(e,o,a-64*r,s-o,22*r,i,4*r);for(let t of[o+12*r,s-24*r])c+=W(e,t,a,12*r,e.floorY-a,`#4b5563`);return c+=W(e,o-6*r,a-6*r,s-o+12*r,16*r,i,4*r),c}function dd(e,t,n){let r=e.unit,i=e.sofaCol,a=e.seatY,o=t-80*r,s=n+80*r,c=W(e,o+20*r,a-110*r,s-o-40*r,118*r,i,22*r);return c+=W(e,o,a-50*r,40*r,e.floorY-a+30*r,hd(i),16*r),c+=W(e,s-40*r,a-50*r,40*r,e.floorY-a+30*r,hd(i),16*r),c+=W(e,o+36*r,a-6*r,s-o-72*r,30*r,i,10*r),c+=W(e,o+36*r,a+24*r,s-o-72*r,e.floorY-a-34*r,hd(i)),c}function fd(e,t,n){let r=e.unit,i=e.seatY,a=t-90*r,o=n+110*r,s=W(e,o-26*r,i-140*r,26*r,e.floorY-i+140*r,`#a0704a`,6*r);return s+=W(e,a,i-4*r,o-a-20*r,26*r,`#ffffff`,8*r),s+=W(e,a,i+20*r,o-a-20*r,e.floorY-i-30*r,e.blanket,4*r),s+=W(e,o-110*r,i-30*r,80*r,30*r,`#ffffff`,12*r),s}function pd(e,t){let n=e.unit,r=e.wood,i=e.seatY,a=W(e,t-52*n,i-120*n,104*n,26*n,r,6*n);return a+=W(e,t-52*n,i-120*n,12*n,120*n,r)+W(e,t+40*n,i-120*n,12*n,120*n,r),a+=W(e,t-50*n,i,10*n,e.floorY-i,r)+W(e,t+40*n,i,10*n,e.floorY-i,r),a+=W(e,t-58*n,i-6*n,116*n,14*n,r,3*n),a}function md(e,t,n){let r=e.unit,i=e.floorY-150*r,a=e.wood,o=W(e,t-70*r,i,12*r,e.floorY-i,a)+W(e,t+58*r,i,12*r,e.floorY-i,a);return o+=W(e,t-90*r,i-12*r,180*r,14*r,a,3*r),n?o+=`<path d="M${H(t-34*r)} ${H(i-12*r)} L${H(t-26*r)} ${H(i-62*r)} L${H(t+30*r)} ${H(i-62*r)} L${H(t+34*r)} ${H(i-12*r)} Z" fill="#9ca3af" ${U(e)}/>`:(o+=W(e,t-30*r,i-34*r,22*r,22*r,`#ffffff`,3*r),o+=`<ellipse cx="${H(t+24*r)}" cy="${H(i-16*r)}" rx="${H(26*r)}" ry="${H(6*r)}" fill="#ffffff" ${U(e)}/>`),o}function hd(e){let t=parseInt(e.slice(1),16),n=e=>Math.max(0,Math.round(e*.82));return`#${(n(t>>16&255)<<16|n(t>>8&255)<<8|n(t&255)).toString(16).padStart(6,`0`)}`}function gd(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}var G=(e,t)=>t[Math.floor(e.rng()*t.length)],_d=[{top:`#9fd4ff`,bottom:`#e8f6ff`,sun:`#ffd54a`,night:!1},{top:`#7ec8ff`,bottom:`#d9f0ff`,sun:`#ffe066`,night:!1},{top:`#ffb37a`,bottom:`#ffe3b8`,sun:`#ff7b3a`,night:!1},{top:`#2b3a67`,bottom:`#5a6aa0`,sun:`#f8f4d7`,night:!0}],vd=[`#f6e7d2`,`#e3f0e6`,`#e6eefb`,`#fbe3e8`,`#f3ead0`,`#ece4f7`,`#fff2cc`,`#e0f2f1`],yd=[`#c99a6b`,`#b98b5e`,`#a8744f`,`#c4ab84`,`#9aa7b4`,`#d6c2a3`],bd=[`#e07a5f`,`#3d84c6`,`#81b29a`,`#f2cc8f`,`#9b8bd4`,`#e76f51`,`#2a9d8f`,`#c0392b`];function xd(e){let t=G(e,_d),n=e.width,r=e.unit,i=td(e,t.top,t.bottom),a=n*(.1+e.rng()*.8);if(i+=`<circle cx="${H(a)}" cy="${H(e.height*.12)}" r="${H(40*r)}" fill="${t.sun}" ${U(e)}/>`,t.night)for(let t=0;t<18;t++)i+=`<circle cx="${H(e.rng()*n)}" cy="${H(e.rng()*e.height*.35)}" r="${H(2.5*r)}" fill="#ffffff"/>`;else{let t=1+Math.floor(e.rng()*3);for(let r=0;r<t;r++)i+=nd(e,n*e.rng(),e.height*(.06+e.rng()*.14),.7+e.rng()*.5);if(e.rng()<.5)for(let t=0;t<3;t++){let t=n*(.3+e.rng()*.4),a=e.height*(.12+e.rng()*.1);i+=`<path d="M${H(t-10*r)} ${H(a)} q${H(5*r)} ${H(-6*r)} ${H(10*r)} 0 q${H(5*r)} ${H(-6*r)} ${H(10*r)} 0" fill="none" ${U(e,e.sw*.7)}/>`}}return{svg:i,night:t.night}}function Sd(e,t,n){let r=e.unit,i=G(e,[`#ef4444`,`#f59e0b`,`#ec4899`,`#a855f7`,`#ffffff`]);return`<line x1="${H(t)}" y1="${H(n)}" x2="${H(t)}" y2="${H(n-26*r)}" stroke="#4d7c0f" stroke-width="${H(e.sw)}"/><circle cx="${H(t)}" cy="${H(n-30*r)}" r="${H(8*r)}" fill="${i}" ${U(e,e.sw*.7)}/>`}function Cd(e,t){let n=e.unit,r=e.floorY;return W(e,t-4*n,r-260*n,8*n,260*n,`#4b5563`)+`<path d="M${H(t-34*n)} ${H(r-250*n)} L${H(t+34*n)} ${H(r-250*n)} L${H(t+22*n)} ${H(r-300*n)} L${H(t-22*n)} ${H(r-300*n)} Z" fill="${G(e,[`#fde68a`,`#fecaca`,`#bfdbfe`])}" ${U(e)}/>`}function wd(e,t){let n=e.unit,r=e.floorY-70*n,i=W(e,t-70*n,r-300*n,140*n,300*n,`#a0704a`,4*n);for(let a=0;a<3;a++){let o=r-290*n+a*98*n;i+=W(e,t-62*n,o+80*n,124*n,8*n,`#7c4f2c`);for(let r=t-58*n;r<t+50*n;r+=16*n){let t=(50+e.rng()*26)*n;i+=W(e,r,o+80*n-t,13*n,t,G(e,bd))}}return i}function Td(e,t){let n=e.unit,r=e.floorY-70*n;return W(e,t-80*n,r-70*n,160*n,70*n,`#8b5a2b`,4*n)+W(e,t-90*n,r-200*n,180*n,115*n,`#1f2937`,6*n)+W(e,t-80*n,r-192*n,160*n,99*n,G(e,[`#60a5fa`,`#34d399`,`#fbbf24`]),2*n)}function Ed(e){let t=e.unit;return`<ellipse cx="${H(e.width/2)}" cy="${H(e.floorY+6*t)}" rx="${H(e.width*.32)}" ry="${H(24*t)}" fill="${G(e,bd)}" opacity="0.55"/>`}function Dd(e,t,n){let r=e.unit;return ld(e,t,n,(80+e.rng()*50)*r,(90+e.rng()*40)*r,G(e,bd))}function Od(e,t,n){let r=e.unit,i=G(e,[`#ef4444`,`#3b82f6`,`#f59e0b`,`#10b981`,`#ffffff`]);return`<path d="M${H(t-110*r)} ${H(n-20*r)} L${H(t-100*r)} ${H(n-60*r)} L${H(t-50*r)} ${H(n-64*r)} L${H(t-20*r)} ${H(n-100*r)} L${H(t+50*r)} ${H(n-100*r)} L${H(t+80*r)} ${H(n-62*r)} L${H(t+110*r)} ${H(n-56*r)} L${H(t+112*r)} ${H(n-20*r)} Z" fill="${i}" ${U(e)}/><path d="M${H(t-12*r)} ${H(n-92*r)} L${H(t+44*r)} ${H(n-92*r)} L${H(t+66*r)} ${H(n-64*r)} L${H(t-34*r)} ${H(n-64*r)} Z" fill="#cfe8ff" ${U(e)}/><circle cx="${H(t-64*r)}" cy="${H(n-16*r)}" r="${H(20*r)}" fill="#1f2937" ${U(e)}/><circle cx="${H(t+66*r)}" cy="${H(n-16*r)}" r="${H(20*r)}" fill="#1f2937" ${U(e)}/>`}function kd(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg,o=i.night?`#5b7b5a`:G(e,[`#b8e0a0`,`#a7d68f`,`#c5e4a5`]),s=i.night?`#4d6b49`:G(e,[`#9fd07f`,`#8cc66b`,`#a8d88a`]);a+=`<path d="M0 ${H(r-60*n)} Q${H(t*(.15+e.rng()*.2))} ${H(r-(120+e.rng()*60)*n)} ${H(t*.5)} ${H(r-70*n)} T${t} ${H(r-(60+e.rng()*60)*n)} V${e.height} H0 Z" fill="${o}" ${U(e)}/>`,a+=`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="${s}"/>`,a+=`<line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`;let c=[`#7cc36b`,`#8bcf74`,`#5fae55`,`#a3d977`,`#e6a23c`];a+=ad(e,t*(.03+e.rng()*.06),.85+e.rng()*.3,G(e,c)),a+=ad(e,t*(.91+e.rng()*.06),.8+e.rng()*.3,G(e,c)),e.rng()<.5&&(a+=ad(e,t*(.2+e.rng()*.1),.6,G(e,c))),a+=od(e,t*(.15+e.rng()*.1),r,.7+e.rng()*.3)+od(e,t*(.78+e.rng()*.1),r,.7+e.rng()*.3),e.rng()<.6&&(a+=Cd(e,t*(.12+e.rng()*.05)));for(let r=0;r<6;r++)a+=Sd(e,t*e.rng(),e.floorY+(10+e.rng()*30)*n);return a}function Ad(e){let{width:t,unit:n}=e,r=e.floorY-60*n,i=xd(e),a=i.svg,o=[`#f4c27a`,`#e9967a`,`#a8c8e8`,`#c9a7e0`,`#f2e394`,`#9fd3b0`,`#f0b6c8`,`#d4a373`,`#cdb4db`],s=[`CHAI`,`TAILOR`,`MOBILE`,`BAKERY`,`PHARMACY`,`BOOKS`,`PIZZA`,`HOTEL`],c=(200+e.rng()*60)*n,l=0;for(let u=-e.rng()*60*n;u<t;u+=c,l++){let t=(280+e.rng()*200)*n;a+=W(e,u,r-t,c,t,G(e,o));let l=i.night?`#fde68a`:`#dff1ff`;for(let i=r-t+30*n;i<r-140*n;i+=90*n)a+=W(e,u+30*n,i,60*n,50*n,l)+W(e,u+c-90*n,i,60*n,50*n,l);e.rng()<.5?a+=W(e,u+c/2-30*n,r-100*n,60*n,100*n,`#8b5a2b`):(a+=`<path d="M${H(u+10*n)} ${H(r-130*n)} h${H(c-20*n)} l${H(-16*n)} ${H(36*n)} h${H(-(c-52*n))} z" fill="${G(e,[`#e74c3c`,`#2a9d8f`,`#f59e0b`,`#3b82f6`])}" ${U(e)}/>`,a+=W(e,u+24*n,r-175*n,c-48*n,38*n,`#ffffff`,4*n),a+=`<text x="${H(u+c/2)}" y="${H(r-148*n)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${H(26*n)}" fill="#1f2937">${G(e,s)}</text>`)}if(e.rng()<.7){let i=t*(.4+e.rng()*.2);a+=W(e,i-6*n,r-420*n,12*n,420*n,`#6b7280`),a+=`<path d="M0 ${H(r-380*n)} Q${H(i/2)} ${H(r-340*n)} ${H(i)} ${H(r-400*n)} T${t} ${H(r-370*n)}" fill="none" ${U(e)}/>`}return a+=`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="${G(e,[`#d6d3d1`,`#cbd5e1`,`#d4c5b0`])}"/>`,a+=`<line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`,e.rng()<.5&&(a+=Od(e,t*(e.rng()<.5?.1:.9),r+4*n)),a}function jd(e){let{width:t,unit:n}=e,r=rd(e,G(e,vd),G(e,yd)),i=t*(.35+e.rng()*.3);r+=id(e,i-110*n,e.floorY-470*n,220*n,160*n,G(e,bd));let a=e.rng()<.5;return r+=a?wd(e,t*.08):Td(e,t*.1),r+=e.rng()<.5?Dd(e,t*.78,e.floorY-450*n):Cd(e,t*.9),r+=sd(e,t*(a?.96:.03)),e.rng()<.6&&(r+=Ed(e)),r}function Md(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e3ebf3`,`#eef2f7`,`#e7efe9`,`#f3f0e8`]),G(e,[`#9aa7b4`,`#a3a3a3`,`#b8b2a7`])),i=e.rng()<.5?t*.08:t*.75;r+=id(e,i,e.floorY-470*n,200*n,170*n,null);for(let t=e.floorY-460*n;t<e.floorY-310*n;t+=18*n)r+=`<line x1="${H(i)}" y1="${H(t)}" x2="${H(i+200*n)}" y2="${H(t)}" stroke="#9fb3c8" stroke-width="${e.sw*.6}"/>`;r+=W(e,t*.5-140*n,e.floorY-480*n,280*n,150*n,`#ffffff`,6*n);let a=`M${H(t*.5-110*n)} ${H(e.floorY-380*n)}`;for(let t=0;t<4;t++)a+=` l${H(55*n)} ${H((e.rng()-.6)*70*n)}`;return r+=`<path d="${a}" fill="none" stroke="${G(e,[`#e74c3c`,`#16a34a`,`#2563eb`])}" stroke-width="${e.sw*1.3}"/>`,r+=cd(e,i<t/2?t*.86:t*.14,e.floorY-430*n),r+=e.rng()<.5?wd(e,i<t/2?t*.93:t*.07):sd(e,t*.95),r}function Nd(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#f3ead0`,`#e6eefb`,`#e3f0e6`,`#fbe3e8`]),G(e,yd));return r+=W(e,t*.5-220*n,e.floorY-500*n,440*n,190*n,G(e,[`#2f5d50`,`#1f3b2c`,`#334155`]),6*n),r+=`<path d="M${H(t*.5-180*n)} ${H(e.floorY-450*n)} h${H((100+e.rng()*120)*n)} M${H(t*.5-180*n)} ${H(e.floorY-410*n)} h${H((140+e.rng()*120)*n)} M${H(t*.5-180*n)} ${H(e.floorY-370*n)} h${H((80+e.rng()*80)*n)}" stroke="#f5f5f5" stroke-width="${e.sw}" stroke-linecap="round"/>`,r+=`<text x="${H(t*.5+110*n)}" y="${H(e.floorY-380*n)}" font-family="Arial" font-weight="bold" font-size="${H(34*n)}" fill="#f5f5f5">${G(e,[`A+B`,`2+2=4`,`ABC`,`E=mc²`,`x+y`,`1-10`])}</text>`,r+=cd(e,t*(e.rng()<.5?.12:.88),e.floorY-440*n),r+=Dd(e,t*(e.rng()<.5?.8:.08),e.floorY-470*n),r}function Pd(e){let{width:t,unit:n}=e,r=G(e,[`#e4f2ec`,`#eef2ff`,`#fff7ed`,`#f0fdf4`]),i=G(e,[`#f2c38b`,`#e7b98c`,`#cbd5e1`,`#fca5a5`,`#a7f3d0`]),a=rd(e,r,G(e,[`#c9c2b8`,`#b8b2a7`,`#d6d3d1`]));for(let r=0;r<t;r+=40*n)a+=`<line x1="${H(r)}" y1="0" x2="${H(r)}" y2="${H(e.floorY-80*n)}" stroke="#d1d5db" stroke-width="${e.sw*.5}"/>`;for(let r=0;r<t;r+=170*n)a+=W(e,r,e.floorY-560*n,160*n,110*n,i,6*n);a+=W(e,-10,e.floorY-220*n,t+20,18*n,`#9ca3af`);for(let r=0;r<t;r+=170*n)a+=W(e,r,e.floorY-202*n,160*n,132*n,i,4*n);return a+=W(e,t*(e.rng()<.5?.92:0),e.floorY-400*n,120*n,330*n,`#e5e7eb`,10*n),a}function Fd(e){let{width:t,unit:n}=e,r=rd(e,G(e,vd),G(e,yd));return r+=id(e,t*(.35+e.rng()*.25)-100*n,e.floorY-470*n,200*n,150*n,G(e,bd)),r+=W(e,t*.9,e.floorY-420*n,160*n,350*n,G(e,[`#a0704a`,`#8b5e3c`,`#d6c2a3`]),6*n),r+=Dd(e,t*.1,e.floorY-450*n),e.rng()<.6&&(r+=Cd(e,t*.06)),e.rng()<.6&&(r+=Ed(e)),r}function Id(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#fde7c8`,`#e0f2fe`,`#fef9c3`,`#fce7f3`]),G(e,yd)),i=[`#e74c3c`,`#3b82f6`,`#22c55e`,`#eab308`,`#a855f7`,`#f97316`,`#14b8a6`];for(let a=0;a<3;a++){let o=e.floorY-470*n+a*110*n;r+=W(e,0,o+70*n,t,10*n,`#a0704a`);for(let a=20*n;a<t-40*n;a+=(60+e.rng()*30)*n){let t=(36+e.rng()*22)*n;r+=W(e,a,o+70*n-t,(40+e.rng()*14)*n,t,G(e,i),4*n)}}return r}function Ld(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#f7d9c4`,`#fde68a`,`#d1fae5`,`#e0e7ff`]),G(e,yd)),i=G(e,[`#ffd54a`,`#fca5a5`,`#93c5fd`]);for(let a of[.2,.5,.8])r+=`<line x1="${H(t*a)}" y1="0" x2="${H(t*a)}" y2="${H(e.floorY-520*n)}" ${U(e)}/>`,r+=`<path d="M${H(t*a-40*n)} ${H(e.floorY-480*n)} Q${H(t*a)} ${H(e.floorY-560*n)} ${H(t*a+40*n)} ${H(e.floorY-480*n)} Z" fill="${i}" ${U(e)}/>`;let a=G(e,bd);return r+=id(e,t*.06,e.floorY-430*n,160*n,130*n,a),r+=id(e,t*.94-160*n,e.floorY-430*n,160*n,130*n,a),r}function Rd(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#dde6ef`,`#e5e7eb`,`#e0f2fe`]),G(e,[`#9aa5b1`,`#a3a3a3`]));r+=W(e,t*.5-150*n,e.floorY-480*n,300*n,170*n,`#c8a27a`,6*n);for(let i=0;i<3;i++)r+=W(e,t*.5-130*n+i*95*n,e.floorY-460*n,75*n,95*n,`#ffffff`),r+=`<circle cx="${H(t*.5-92*n+i*95*n)}" cy="${H(e.floorY-425*n)}" r="${H(16*n)}" fill="#e5e7eb" ${U(e)}/>`;let i=e.rng()<.5?t*.86:0;for(let a=i;a<i+t*.14;a+=34*n)r+=W(e,a,e.floorY-560*n,10*n,490*n,`#6b7280`);return r+=W(e,i-10*n,e.floorY-560*n,t*.16,16*n,`#6b7280`),r}function zd(e){return td(e,`#f8fafc`,`#e2e8f0`)+`<line x1="0" y1="${H(e.floorY-4*e.unit)}" x2="${e.width}" y2="${H(e.floorY-4*e.unit)}" ${U(e)}/>`}function Bd(e,t,n){let r=e.unit,i=e.floorY-70*r,a=120*r,o=300*r,s=n??G(e,[`#a0704a`,`#8b5e3c`,`#5b84b1`,`#b15b5b`,`#ffffff`,`#2a9d8f`]);return W(e,t-a/2-10*r,i-o-10*r,a+20*r,o+10*r,`#e7d3b5`)+W(e,t-a/2,i-o,a,o,s,3*r)+W(e,t-a/2+16*r,i-o+20*r,a-32*r,100*r,hd(s),3*r)+W(e,t-a/2+16*r,i-o+140*r,a-32*r,130*r,hd(s),3*r)+`<circle cx="${H(t+a/2-18*r)}" cy="${H(i-o/2)}" r="${H(7*r)}" fill="#fbbf24" ${U(e)}/>`}function Vd(e,t,n){let r=e.unit;return W(e,t-30*r,n+46*r,60*r,10*r,`#6b4f3a`)+W(e,t-4*r,n+30*r,8*r,18*r,`#6b4f3a`)+`<circle cx="${H(t)}" cy="${H(n)}" r="${H(34*r)}" fill="#7dd3fc" ${U(e)}/><path d="M${H(t-20*r)} ${H(n-14*r)} q${H(14*r)} ${H(-8*r)} ${H(20*r)} ${H(6*r)} q${H(-6*r)} ${H(18*r)} ${H(-18*r)} ${H(10*r)} z M${H(t+8*r)} ${H(n+8*r)} q${H(16*r)} 0 ${H(14*r)} ${H(16*r)} q${H(-12*r)} ${H(4*r)} ${H(-14*r)} ${H(-16*r)} z" fill="#86efac" ${U(e,e.sw*.7)}/>`}function Hd(e,t,n,r){let i=e.unit*r,a=``;for(let r=0;r<n;r++){let o=e.width*(r+.5)/n;a+=W(e,o-60*i,t-60*i,120*i,12*i,e.wood,2*i)+W(e,o-52*i,t-48*i,10*i,48*i,e.wood)+W(e,o+42*i,t-48*i,10*i,48*i,e.wood)+W(e,o-20*i,t-82*i,30*i,22*i,G(e,bd),2*i)}return a}function Ud(e,t,n){let r=e.unit,i=e.floorY-70*r,a=G(e,[`#60a5fa`,`#f87171`,`#34d399`,`#fbbf24`,`#a78bfa`]),o=``;for(let s=t;s<n-60*r;s+=66*r){o+=W(e,s,i-300*r,62*r,300*r,a,2*r);for(let t=0;t<4;t++)o+=`<line x1="${H(s+14*r)}" y1="${H(i-280*r+t*9*r)}" x2="${H(s+48*r)}" y2="${H(i-280*r+t*9*r)}" ${U(e,e.sw*.6)}/>`;o+=W(e,s+46*r,i-170*r,8*r,24*r,`#e5e7eb`)}return o}function Wd(e,t){let n=e.unit,r=e.floorY-70*n,i=G(e,[`#e5e7eb`,`#fca5a5`,`#bfdbfe`,`#d1fae5`]);return W(e,t-70*n,r-380*n,140*n,380*n,i,14*n)+`<line x1="${H(t-70*n)}" y1="${H(r-250*n)}" x2="${H(t+70*n)}" y2="${H(r-250*n)}" ${U(e)}/>`+W(e,t+44*n,r-330*n,10*n,50*n,`#9ca3af`,4*n)+W(e,t+44*n,r-220*n,10*n,60*n,`#9ca3af`,4*n)+W(e,t-40*n,r-340*n,30*n,30*n,G(e,bd),4*n)}function Gd(e,t){let n=e.unit,r=e.floorY-70*n;return W(e,t-90*n,r-160*n,180*n,160*n,`#d1d5db`,4*n)+W(e,t-70*n,r-120*n,140*n,90*n,`#1f2937`,4*n)+`<path d="M${H(t-60*n)} ${H(r-160*n)} h${H(70*n)} v${H(-50*n)} q${H(-35*n)} ${H(-10*n)} ${H(-70*n)} 0 z" fill="#9ca3af" ${U(e)}/><path d="M${H(t-40*n)} ${H(r-225*n)} q${H(-10*n)} ${H(-20*n)} 0 ${H(-40*n)} M${H(t-20*n)} ${H(r-225*n)} q${H(-10*n)} ${H(-20*n)} 0 ${H(-40*n)}" fill="none" stroke="#9ca3af" stroke-width="${H(e.sw)}" stroke-linecap="round"/>`}function Kd(e,t,n,r){let i=e.unit,a=W(e,t-140*i,n,280*i,170*i,`#1f2937`,8*i);a+=`<text x="${H(t)}" y="${H(n+38*i)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${H(28*i)}" fill="#fde68a">${r}</text>`;for(let r=0;r<4;r++)a+=`<line x1="${H(t-110*i)}" y1="${H(n+70*i+r*26*i)}" x2="${H(t+(40+e.rng()*50)*i)}" y2="${H(n+70*i+r*26*i)}" stroke="#f5f5f5" stroke-width="${H(e.sw)}" stroke-linecap="round"/>`,a+=`<circle cx="${H(t+110*i)}" cy="${H(n+70*i+r*26*i)}" r="${H(5*i)}" fill="#fde68a"/>`;return a}function qd(e,t,n,r){let i=e.unit,a=e.floorY-70*i;return W(e,t,a-150*i,n-t,150*i,r,4*i)+W(e,t-10*i,a-165*i,n-t+20*i,18*i,hd(r),4*i)}function Jd(e,t,n){let r=e.unit,i=e.floorY-70*r,a=``;for(let o=t;o<n-100*r;o+=120*r){a+=W(e,o,i-80*r,110*r,80*r,`#c08552`,3*r);let t=G(e,[`#ef4444`,`#f59e0b`,`#84cc16`,`#fde047`,`#a855f7`]);for(let n=0;n<5;n++)a+=`<circle cx="${H(o+16*r+n*20*r)}" cy="${H(i-86*r-n%2*10*r)}" r="${H(13*r)}" fill="${t}" ${U(e,e.sw*.7)}/>`}return a}function Yd(e,t){let n=e.unit,r=e.floorY-70*n,i=W(e,t-110*n,r-330*n,220*n,10*n,`#6b7280`)+W(e,t-110*n,r-330*n,10*n,330*n,`#6b7280`)+W(e,t+100*n,r-330*n,10*n,330*n,`#6b7280`);for(let a=0;a<6;a++){let o=t-90*n+a*36*n,s=G(e,bd);i+=`<path d="M${H(o)} ${H(r-300*n)} l${H(-18*n)} ${H(20*n)} v${H(120*n)} h${H(36*n)} v${H(-120*n)} z" fill="${s}" ${U(e,e.sw*.7)}/>`}return i}function Xd(e){let t=e.unit,n=``;for(let r=0;r<2;r++)for(let i=0;i<4;i++){let a=e.width*(.14+i*.24),o=e.floorY-520*t+r*140*t;n+=W(e,a-90*t,o,180*t,110*t,`#1f2937`,6*t)+W(e,a-80*t,o+8*t,160*t,94*t,G(e,[`#60a5fa`,`#34d399`,`#fbbf24`,`#f472b6`,`#a78bfa`]),2*t)}return n}function Zd(e,t){let n=e.unit,r=G(e,[`#ffffff`,`#d6b98c`,`#a0704a`]),i=W(e,-10,t-70*n,e.width+20,12*n,r)+W(e,-10,t-36*n,e.width+20,12*n,r);for(let a=10*n;a<e.width;a+=46*n)i+=`<path d="M${H(a)} ${H(t)} V${H(t-90*n)} l${H(12*n)} ${H(-14*n)} l${H(12*n)} ${H(14*n)} V${H(t)} Z" fill="${r}" ${U(e,e.sw*.8)}/>`;return i}function Qd(e,t){let n=e.unit,r=e.floorY-40*n;return`<path d="M${H(t-120*n)} ${H(r)} L${H(t-80*n)} ${H(r-300*n)} L${H(t+80*n)} ${H(r-300*n)} L${H(t+120*n)} ${H(r)}" fill="none" stroke="#ef4444" stroke-width="${H(e.sw*3)}" stroke-linejoin="round"/><path d="M${H(t-30*n)} ${H(r-296*n)} V${H(r-90*n)} M${H(t+30*n)} ${H(r-296*n)} V${H(r-90*n)}" ${U(e)}/>`+W(e,t-40*n,r-92*n,80*n,12*n,`#fbbf24`,3*n)}function $d(e,t){let n=e.unit,r=e.floorY-40*n;return W(e,t-10*n,r-220*n,12*n,220*n,`#3b82f6`)+W(e,t+50*n,r-220*n,12*n,220*n,`#3b82f6`)+`<path d="M${H(t)} ${H(r-220*n)} h${H(60*n)} l${H(150*n)} ${H(210*n)} h${H(-40*n)} z" fill="#f59e0b" ${U(e)}/>`}function ef(e,t){let n=e.unit,r=e.floorY+10*n;return`<ellipse cx="${H(t)}" cy="${H(r)}" rx="${H(180*n)}" ry="${H(30*n)}" fill="#7dd3fc" ${U(e)}/><path d="M${H(t-150*n)} ${H(r-10*n)} q${H(-6*n)} ${H(-50*n)} ${H(6*n)} ${H(-70*n)} M${H(t-140*n)} ${H(r-6*n)} q${H(10*n)} ${H(-40*n)} ${H(20*n)} ${H(-56*n)}" fill="none" stroke="#4d7c0f" stroke-width="${H(e.sw)}"/>`}function tf(e,t,n){let r=e.unit,i=``;for(let a=0;a<e.width;a+=(60+e.rng()*50)*r){let o=(120+e.rng()*180)*r,s=(50+e.rng()*40)*r;i+=`<rect x="${H(a)}" y="${H(t-o)}" width="${H(s)}" height="${H(o)}" fill="${n?`#3b4a7a`:`#b8c7dd`}"/>`}return i}function nf(e,t,n){let r=e.unit;return W(e,t-5*r,n-360*r,10*r,360*r,`#4b5563`)+`<path d="M${H(t)} ${H(n-355*r)} q${H(30*r)} ${H(-20*r)} ${H(60*r)} 0" fill="none" ${U(e)}/><path d="M${H(t+40*r)} ${H(n-355*r)} h${H(40*r)} l${H(-8*r)} ${H(18*r)} h${H(-24*r)} z" fill="#fde68a" ${U(e)}/>`}function rf(e,t,n){let r=e.unit;return W(e,t-5*r,n-300*r,10*r,300*r,`#4b5563`)+W(e,t-24*r,n-420*r,48*r,124*r,`#1f2937`,8*r)+`<circle cx="${H(t)}" cy="${H(n-396*r)}" r="${H(13*r)}" fill="#ef4444"/><circle cx="${H(t)}" cy="${H(n-358*r)}" r="${H(13*r)}" fill="#facc15"/><circle cx="${H(t)}" cy="${H(n-320*r)}" r="${H(13*r)}" fill="#22c55e"/>`}function af(e,t,n,r){let i=e.unit,a=G(e,[`#f4c27a`,`#e9967a`,`#a8c8e8`,`#c9a7e0`,`#9fd3b0`,`#f0b6c8`]),o=(200+e.rng()*80)*i;return W(e,t,n-o,r,o,a)+`<path d="M${H(t-20*i)} ${H(n-o)} L${H(t+r/2)} ${H(n-o-110*i)} L${H(t+r+20*i)} ${H(n-o)} Z" fill="${G(e,[`#b45309`,`#7c2d12`,`#475569`,`#991b1b`])}" ${U(e)}/>`+W(e,t+r/2-30*i,n-110*i,60*i,110*i,`#8b5a2b`)+id(e,t+20*i,n-o+30*i,60*i,50*i,null)+id(e,t+r-80*i,n-o+30*i,60*i,50*i,null)}function of(e,t){let n=e.unit,r=e.floorY-70*n;return W(e,t-130*n,r-230*n,260*n,230*n,`#b45309`,4*n)+W(e,t-150*n,r-250*n,300*n,24*n,`#78350f`,4*n)+W(e,t-80*n,r-150*n,160*n,150*n,`#1f2937`,40*n)+`<path d="M${H(t-40*n)} ${H(r)} q${H(-10*n)} ${H(-60*n)} ${H(20*n)} ${H(-100*n)} q0 ${H(50*n)} ${H(20*n)} ${H(40*n)} q${H(20*n)} ${H(30*n)} ${H(10*n)} ${H(60*n)} z" fill="#f97316" ${U(e,e.sw*.7)}/>`}function sf(e,t){let n=e.unit;return`<line x1="${H(t)}" y1="0" x2="${H(t)}" y2="${H(e.floorY-560*n)}" ${U(e)}/><path d="M${H(t-80*n)} ${H(e.floorY-540*n)} q${H(80*n)} ${H(40*n)} ${H(160*n)} 0" fill="none" ${U(e)}/>`+[-80,-40,0,40,80].map(r=>`<circle cx="${H(t+r*n)}" cy="${H(e.floorY-530*n+Math.abs(r)*-.1*n)}" r="${H(10*n)}" fill="#fde68a" ${U(e,e.sw*.7)}/>`).join(``)}function cf(e){let t=e.unit,n=e.floorY-70*t,r=``;for(let i=0;i<4;i++){let a=e.width*(.12+i*.26);r+=W(e,a-110*t,n-170*t,220*t,170*t,`#cbd5e1`,4*t)+W(e,a-40*t,n-240*t,80*t,56*t,`#1f2937`,4*t)+W(e,a-34*t,n-234*t,68*t,44*t,`#60a5fa`)}return r}function lf(e,t){let n=e.unit,r=e.floorY-70*n;return W(e,t-40*n,r-180*n,80*n,180*n,`#e5e7eb`,6*n)+`<path d="M${H(t-36*n)} ${H(r-180*n)} q0 ${H(-90*n)} ${H(36*n)} ${H(-90*n)} q${H(36*n)} 0 ${H(36*n)} ${H(90*n)} z" fill="#93c5fd" ${U(e)}/>`}function uf(e){let t=e.unit,n=e.floorY-560*t,r=`<path d="M0 ${H(n)} Q${H(e.width/4)} ${H(n+60*t)} ${H(e.width/2)} ${H(n)} T${e.width} ${H(n)}" fill="none" ${U(e,e.sw*.7)}/>`;for(let i=1;i<16;i++){let a=e.width*i/16,o=i%8/8;r+=`<circle cx="${H(a)}" cy="${H(n+Math.sin(o*Math.PI)*30*t+12*t)}" r="${H(8*t)}" fill="${[`#fde047`,`#f87171`,`#60a5fa`,`#4ade80`][i%4]}" ${U(e,e.sw*.5)}/>`}return r}function df(e,t){let n=``;for(let r=0;r<26;r++){let r=e.rng()*e.width,i=e.rng()*(e.floorY-120*e.unit),a=(6+e.rng()*6)*e.unit;n+=`<path d="M${H(r)} ${H(i-a)} L${H(r+a*.3)} ${H(i-a*.3)} L${H(r+a)} ${H(i)} L${H(r+a*.3)} ${H(i+a*.3)} L${H(r)} ${H(i+a)} L${H(r-a*.3)} ${H(i+a*.3)} L${H(r-a)} ${H(i)} L${H(r-a*.3)} ${H(i-a*.3)} Z" fill="${t}" opacity="0.7"/>`}return n}function ff(e,t,n,r,i){let a=e.unit,o=(r.length*22+40)*a;return W(e,t-o/2,n,o,54*a,i,6*a)+`<text x="${H(t)}" y="${H(n+38*a)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${H(30*a)}" fill="#ffffff">${r}</text>`}var pf=[`#b8e0a0`,`#a7d68f`,`#c5e4a5`];function mf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg+`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="${i.night?`#4d6b49`:G(e,pf)}"/><line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`;a+=Zd(e,r-10*n),a+=e.rng()<.5?Qd(e,t*.14)+$d(e,t*.8):$d(e,t*.06)+Qd(e,t*.88),a+=ad(e,t*(.45+e.rng()*.1),.55,`#8bcf74`);for(let r=0;r<5;r++)a+=Sd(e,t*e.rng(),e.floorY+(10+e.rng()*30)*n);return a}function hf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg+`<path d="M0 ${H(r-80*n)} Q${H(t*.3)} ${H(r-160*n)} ${H(t*.6)} ${H(r-90*n)} T${t} ${H(r-100*n)} V${e.height} H0 Z" fill="${i.night?`#5b7b5a`:`#c5e4a5`}" ${U(e)}/>`;return a+=`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="${i.night?`#4d6b49`:`#9fd07f`}"/><line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`,a+=ef(e,t*(e.rng()<.5?.18:.82)),a+=ad(e,t*.5,.7,G(e,[`#7cc36b`,`#5fae55`,`#e6a23c`]))+nf(e,t*.32,r),a}function gf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg+tf(e,r-60*n,i.night);return a+=`<rect x="0" y="${H(r-60*n)}" width="${t}" height="${H(e.height-r+60*n)}" fill="${i.night?`#4d6b49`:`#a8d88a`}"/>`,a+=`<path d="M0 ${H(r+20*n)} Q${H(t/2)} ${H(r-30*n)} ${t} ${H(r+20*n)} V${e.height} H0 Z" fill="#e7d3b5" ${U(e,e.sw*.7)}/>`,a+=nf(e,t*.1,r)+nf(e,t*.9,r),a+=`<ellipse cx="${H(t*.5)}" cy="${H(r-60*n)}" rx="${H(110*n)}" ry="${H(22*n)}" fill="#cbd5e1" ${U(e)}/>`+W(e,t*.5-12*n,r-160*n,24*n,100*n,`#cbd5e1`)+`<path d="M${H(t*.5)} ${H(r-160*n)} q${H(-50*n)} ${H(-30*n)} ${H(-80*n)} ${H(90*n)} M${H(t*.5)} ${H(r-160*n)} q${H(50*n)} ${H(-30*n)} ${H(80*n)} ${H(90*n)}" fill="none" stroke="#7dd3fc" stroke-width="${H(e.sw*2)}"/>`,a}function _f(e){let{width:t,unit:n}=e,r=e.floorY-60*n,i=xd(e).svg,a=260*n;for(let o=-e.rng()*80*n;o<t;o+=a+60*n)i+=af(e,o,r-30*n,a);return i+=Zd(e,r),i+=`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="#d6d3d1"/><line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`,i}function vf(e){let{width:t,unit:n}=e,r=e.floorY-60*n,i=xd(e),a=i.svg+tf(e,r-120*n,i.night);for(let i=20*n;i<t;i+=330*n){let t=G(e,[`#ef4444`,`#3b82f6`,`#f59e0b`,`#10b981`,`#ec4899`]);a+=W(e,i,r-260*n,8*n,260*n,`#6b7280`)+W(e,i+290*n,r-260*n,8*n,260*n,`#6b7280`);let o=`M${H(i-10*n)} ${H(r-260*n)} h${H(320*n)} v${H(30*n)}`;for(let e=0;e<8;e++)o+=` q${H(-20*n)} ${H(24*n)} ${H(-40*n)} 0`;a+=`<path d="${o} z" fill="${t}" ${U(e)}/>`,a+=Jd(e,i+20*n,i+290*n)}return a+=`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="#d4c5b0"/><line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`,a}function yf(e){let{width:t,unit:n}=e,r=e.floorY-60*n,i=xd(e),a=i.svg+tf(e,r-40*n,i.night);a+=`<rect x="0" y="${H(r-40*n)}" width="${t}" height="${H(40*n)}" fill="#9ca3af"/>`,a+=`<rect x="0" y="${H(r)}" width="${t}" height="${H(e.height-r)}" fill="#4b5563"/>`;for(let i=0;i<t;i+=70*n)a+=`<rect x="${H(i)}" y="${H(r+30*n)}" width="${H(40*n)}" height="${H(e.height-r-40*n)}" fill="#f5f5f5" opacity="0.9"/>`;return a+=`<line x1="0" y1="${H(r)}" x2="${t}" y2="${H(r)}" ${U(e)}/>`,a+=rf(e,t*.08,r-40*n)+nf(e,t*.9,r-40*n),a+=ff(e,t*.75,r-330*n,`BUS STOP`,`#2563eb`),a}function bf(e){let{width:t,unit:n}=e,r=rd(e,G(e,vd),G(e,yd));r+=Bd(e,t*(e.rng()<.5?.08:.92)),r+=id(e,t*.5-160*n,e.floorY-480*n,320*n,180*n,G(e,bd));for(let i=0;i<3;i++)r+=Dd(e,t*(.22+i*.07),e.floorY-470*n+i%2*40*n);return r+=Td(e,t*.78),r}function xf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#f3ead0`,`#fbe3e8`,`#ece4f7`,`#e3f0e6`]),G(e,yd));return r+=of(e,t*.5)+cd(e,t*.5,e.floorY-440*n),r+=wd(e,t*.1)+sd(e,t*.92)+Ed(e),r}function Sf(e){let{width:t,unit:n}=e,r=rd(e,G(e,vd),G(e,yd));r+=sf(e,t*.5)+Bd(e,t*.9),r+=W(e,t*.06,e.floorY-400*n,200*n,330*n,e.wood,6*n);for(let i=0;i<3;i++)for(let a=0;a<3;a++)r+=`<circle cx="${H(t*.06+40*n+a*60*n)}" cy="${H(e.floorY-360*n+i*80*n)}" r="${H(22*n)}" fill="#ffffff" ${U(e,e.sw*.7)}/>`;return r+=id(e,t*.5-100*n,e.floorY-430*n,200*n,140*n,G(e,bd)),r}function Cf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#eef2f7`,`#e7efe9`,`#f3f0e8`]),G(e,[`#9aa7b4`,`#a3a3a3`]));for(let i=0;i<t;i+=220*n)r+=id(e,i+20*n,e.floorY-520*n,180*n,150*n,null);return r+=cf(e)+lf(e,t*.95),r}function wf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e5e7eb`,`#f5f5f4`,`#e0f2fe`]),G(e,[`#7c4f2c`,`#8b5e3c`]));return r+=W(e,t*.2,e.floorY-540*n,t*.6,240*n,`#bfdbfe`),r+=tf(e,e.floorY-300*n,!1).replace(/<rect /g,`<rect clip-path="none" `),r+=`<rect x="${H(t*.2)}" y="${H(e.floorY-540*n)}" width="${H(t*.6)}" height="${H(240*n)}" fill="none" ${U(e,e.sw*2)}/>`,r+=W(e,0,e.floorY-300*n,t*.2,230*n,G(e,vd))+W(e,t*.8,e.floorY-300*n,t*.2,230*n,G(e,vd)),r+=wd(e,t*.08)+sd(e,t*.94),r+=`<path d="M${H(t*.9-20*n)} ${H(e.floorY-470*n)} h${H(40*n)} v${H(30*n)} q0 ${H(30*n)} ${H(-20*n)} ${H(30*n)} q${H(-20*n)} 0 ${H(-20*n)} ${H(-30*n)} z" fill="#fbbf24" ${U(e)}/>`,r}function Tf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#f3ead0`,`#e6eefb`,`#e3f0e6`,`#fff2cc`]),G(e,yd)),i=e.rng()<.5;return r+=W(e,t*(i?.05:.45),e.floorY-500*n,460*n,190*n,G(e,[`#2f5d50`,`#1f3b2c`,`#ffffff`]),6*n),r+=Bd(e,t*(i?.9:.08),G(e,[`#a0704a`,`#5b84b1`])),r+=Vd(e,t*(i?.72:.3),e.floorY-360*n),r+=Hd(e,e.floorY-70*n,6,.7),r}function Ef(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e0f2fe`,`#ecfccb`,`#f5f5f4`]),G(e,[`#9aa7b4`,`#c4ab84`]));r+=W(e,t*.5-230*n,e.floorY-500*n,460*n,190*n,`#ffffff`,6*n),r+=`<circle cx="${H(t*.5-120*n)}" cy="${H(e.floorY-405*n)}" r="${H(40*n)}" fill="none" ${U(e)}/><circle cx="${H(t*.5-120*n)}" cy="${H(e.floorY-405*n)}" r="${H(10*n)}" fill="#ef4444"/><path d="M${H(t*.5)} ${H(e.floorY-340*n)} l${H(60*n)} ${H(-120*n)} l${H(60*n)} ${H(120*n)} z" fill="none" stroke="#2563eb" stroke-width="${H(e.sw)}"/>`;let i=``;for(let r=0;r<18;r++)for(let a=0;a<4;a++)i+=`<rect x="${H(t*.04+r*11*n)}" y="${H(e.floorY-480*n+a*13*n)}" width="${H(9*n)}" height="${H(11*n)}" fill="${bd[(r+a)%bd.length]}"/>`;r+=W(e,t*.035,e.floorY-490*n,210*n,70*n,`#ffffff`)+i,r+=W(e,t*.8,e.floorY-330*n,220*n,10*n,e.wood);for(let i=0;i<4;i++)r+=`<path d="M${H(t*.8+20*n+i*50*n)} ${H(e.floorY-380*n)} v${H(20*n)} l${H(-14*n)} ${H(30*n)} h${H(40*n)} l${H(-14*n)} ${H(-30*n)} v${H(-20*n)} z" fill="${G(e,[`#86efac`,`#93c5fd`,`#fca5a5`,`#fde047`])}" ${U(e,e.sw*.7)}/>`;return r}function Df(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e5e7eb`,`#f3ead0`,`#e0f2fe`]),G(e,[`#d6d3d1`,`#9aa7b4`]));return r+=Ud(e,0,t*.42)+Bd(e,t*.55)+Ud(e,t*.66,t),r+=ff(e,t*.55,e.floorY-520*n,`CLASS 7-B`,`#16a34a`),r}function Of(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#fff7ed`,`#eef2ff`,`#f0fdf4`,`#fef2f2`]),G(e,[`#c9c2b8`,`#d6d3d1`,`#b8b2a7`])),i=e.rng()<.5;return r+=Wd(e,t*(i?.08:.92)),r+=id(e,t*.5-100*n,e.floorY-470*n,200*n,140*n,G(e,bd)),r+=qd(e,t*.18,t*.82,G(e,[`#f2c38b`,`#cbd5e1`,`#a7f3d0`])),r+=Gd(e,t*(i?.75:.25)),r}function kf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e4f2ec`,`#fff7ed`,`#fef9c3`]),G(e,yd));for(let i=t*.15;i<t*.9;i+=t*.18)r+=`<line x1="${H(i)}" y1="${H(e.floorY-560*n)}" x2="${H(i)}" y2="${H(e.floorY-500*n)}" ${U(e)}/>`,r+=`<path d="M${H(i-30*n)} ${H(e.floorY-500*n)} q${H(30*n)} ${H(40*n)} ${H(60*n)} 0 z" fill="#9ca3af" ${U(e)}/>`;return r+=Wd(e,t*.06)+Gd(e,t*.9),r}function Af(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#dbeafe`,`#fce7f3`,`#ecfccb`,`#ede9fe`]),G(e,yd))+df(e,G(e,[`#fbbf24`,`#60a5fa`,`#f472b6`]));return r+=id(e,t*.42,e.floorY-470*n,180*n,140*n,G(e,bd)),r+=W(e,t*.04,e.floorY-420*n,170*n,350*n,G(e,[`#a0704a`,`#60a5fa`,`#f472b6`]),6*n),r+=W(e,t*.8,e.floorY-350*n,200*n,10*n,e.wood),r+=`<circle cx="${H(t*.83)}" cy="${H(e.floorY-375*n)}" r="${H(22*n)}" fill="#ef4444" ${U(e)}/>`+W(e,t*.86,e.floorY-400*n,40*n,50*n,`#22c55e`,4*n)+`<path d="M${H(t*.92)} ${H(e.floorY-350*n)} l${H(20*n)} ${H(-50*n)} l${H(20*n)} ${H(50*n)} z" fill="#fbbf24" ${U(e)}/>`,r}function jf(e){let{width:t,unit:n}=e,r=rd(e,G(e,vd),G(e,yd));return r+=Bd(e,t*.07)+md(e,t*.88,!0)+Cd(e,t*.95),r+=W(e,t*.5-60*n,e.floorY-480*n,120*n,170*n,`#cfe8ff`,60*n)+Dd(e,t*.25,e.floorY-460*n),r}function Mf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#fef9c3`,`#ecfccb`,`#ffedd5`]),G(e,yd));r+=ff(e,t*.5,e.floorY-540*n,G(e,[`FRESH FRUIT`,`SABZI MANDI`,`FRUIT SHOP`]),`#16a34a`);for(let i=0;i<2;i++)r+=Jd(e,20*n,t-20*n).replace(/(y="|cy=")(-?[\d.]+)/g,(e,t,r)=>`${t}${H(Number(r)-i*120*n)}`);return r+=qd(e,t*.72,t*.98,`#c08552`),r}function Nf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#fce7f3`,`#f5f5f4`,`#ede9fe`]),G(e,[`#d6c2a3`,`#c4ab84`]));return r+=Yd(e,t*.15)+Yd(e,t*.85),r+=W(e,t*.5-50*n,e.floorY-470*n,100*n,200*n,`#cfe8ff`,50*n)+ff(e,t*.5,e.floorY-560*n,`SALE 50%`,`#e11d48`),r}function Pf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e0f2fe`,`#eef2f7`,`#f5f5f4`]),G(e,[`#9aa7b4`,`#a3a3a3`]));return r+=Xd(e)+qd(e,t*.05,t*.3,`#64748b`),r}function Ff(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#fde68a`,`#e7d3b5`,`#d1fae5`]),G(e,yd));return r+=Kd(e,t*.5,e.floorY-540*n,G(e,[`MENU`,`CAFE`,`TODAY`])),r+=qd(e,t*.02,t*.28,G(e,[`#7c4f2c`,`#475569`]))+W(e,t*.08,e.floorY-330*n,70*n,90*n,`#9ca3af`,6*n),r+=id(e,t*.78,e.floorY-450*n,200*n,150*n,G(e,bd)),r}function If(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#f59e0b`,`#fbbf24`,`#f97316`]),`#b45309`)+uf(e);return r+=ff(e,t*.5,e.floorY-500*n,G(e,[`CHAI DHABA`,`DESI DHABA`,`TIKKA HOUSE`]),`#7c2d12`),r+=Gd(e,t*.1)+Kd(e,t*.85,e.floorY-470*n,`MENU`),r}function Lf(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#dbeafe`,`#e5e7eb`]),`#9aa5b1`);r+=ff(e,t*.5,e.floorY-540*n,`POLICE`,`#1d4ed8`);for(let i=0;i<3;i++)r+=W(e,t*(.08+i*.09),e.floorY-470*n,90*n,120*n,`#fef3c7`)+`<circle cx="${H(t*(.08+i*.09)+45*n)}" cy="${H(e.floorY-430*n)}" r="${H(20*n)}" fill="#e5e7eb" ${U(e)}/><text x="${H(t*(.08+i*.09)+45*n)}" y="${H(e.floorY-370*n)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${H(16*n)}" fill="#991b1b">WANTED</text>`;return r+=Bd(e,t*.9,`#1e3a8a`),r}function Rf(e){let{width:t,unit:n}=e,r=rd(e,`#4b5563`,`#374151`);return r+=`<path d="M${H(t*.5)} 0 V${H(e.floorY-560*n)}" ${U(e)}/>`,r+=`<path d="M${H(t*.5-50*n)} ${H(e.floorY-560*n)} h${H(100*n)} l${H(20*n)} ${H(40*n)} h${H(-140*n)} z" fill="#fde68a" ${U(e)}/>`,r+=`<path d="M${H(t*.5-70*n)} ${H(e.floorY-520*n)} L${H(t*.15)} ${H(e.floorY)} H${H(t*.85)} L${H(t*.5+70*n)} ${H(e.floorY-520*n)} Z" fill="#fde68a" opacity="0.18"/>`,r+=W(e,t*.06,e.floorY-470*n,260*n,160*n,`#1f2937`,4*n),r}function zf(e,t,n){return`<rect x="0" y="${H(t)}" width="${e.width}" height="${H(e.height-t)}" fill="${n}"/><line x1="0" y1="${H(t)}" x2="${e.width}" y2="${H(t)}" ${U(e)}/>`}function Bf(e,t,n=1){let r=e.unit*n,i=e.floorY-40*e.unit,a=`<path d="M${H(t)} ${H(i)} q${H(20*r)} ${H(-150*r)} ${H(-10*r)} ${H(-300*r)}" fill="none" stroke="#8b5a2b" stroke-width="${H(22*r)}" stroke-linecap="round"/>`;a+=`<path d="M${H(t)} ${H(i)} q${H(20*r)} ${H(-150*r)} ${H(-10*r)} ${H(-300*r)}" fill="none" stroke="${ed}" stroke-width="${H(e.sw)}" opacity="0.4"/>`;let o=t-10*r,s=i-300*r;for(let[t,n]of[[-130,20],[130,30],[-90,-50],[100,-40],[0,-70],[-150,70],[150,80]])a+=`<path d="M${H(o)} ${H(s)} Q${H(o+t*.5*r)} ${H(s+(n-60)*r)} ${H(o+t*r)} ${H(s+n*r)} Q${H(o+t*.5*r)} ${H(s+(n-20)*r)} ${H(o)} ${H(s)} Z" fill="#3f9d4a" ${U(e,e.sw*.8)}/>`;return a}function Vf(e,t,n,r,i,a){let o=e.unit*r;return`<g transform="rotate(${i} ${H(t)} ${H(n)})"><path d="M${H(t)} ${H(n)} q${H(60*o)} ${H(-70*o)} ${H(150*o)} 0 q${H(-80*o)} ${H(60*o)} ${H(-150*o)} 0 z" fill="${a}" ${U(e,e.sw*.8)}/><path d="M${H(t)} ${H(n)} l${H(150*o)} 0" stroke="${hd(a)}" stroke-width="${H(e.sw*.7)}"/></g>`}function Hf(e){let t=``;for(let n=0;n<7;n++){let n=e.width*(.05+e.rng()*.9),r=e.height*(.2+e.rng()*.3);t+=`<path d="M${H(n)} 0 q${H(30*e.unit)} ${H(r/2)} 0 ${H(r)}" fill="none" stroke="#2f7d3a" stroke-width="${H(e.sw*1.6)}"/>`;for(let i=1;i<5;i++)t+=`<ellipse cx="${H(n+(i%2?12:-12)*e.unit)}" cy="${H(r*i/5)}" rx="${H(12*e.unit)}" ry="${H(6*e.unit)}" fill="#5fae55" ${U(e,e.sw*.6)}/>`}return t}function Uf(e,t,n,r,i=`#9ca3af`){let a=e.unit*r;return`<path d="M${H(t-80*a)} ${H(n)} q${H(-10*a)} ${H(-60*a)} ${H(40*a)} ${H(-80*a)} q${H(60*a)} ${H(-20*a)} ${H(100*a)} ${H(30*a)} q${H(30*a)} ${H(30*a)} ${H(20*a)} ${H(50*a)} z" fill="${i}" ${U(e)}/>`}function Wf(e,t,n=1){let r=e.unit*n,i=e.floorY-40*e.unit;return W(e,t-20*r,i-220*r,40*r,220*r,`#4d9e55`,20*r)+`<path d="M${H(t-20*r)} ${H(i-120*r)} h${H(-40*r)} v${H(-60*r)}" fill="none" stroke="#4d9e55" stroke-width="${H(26*r)}" stroke-linecap="round"/><path d="M${H(t+20*r)} ${H(i-150*r)} h${H(40*r)} v${H(-50*r)}" fill="none" stroke="#4d9e55" stroke-width="${H(26*r)}" stroke-linecap="round"/>`}function Gf(e,t,n=1,r=`#2f7d4a`,i=!1){let a=e.unit*n,o=e.floorY-40*e.unit,s=W(e,t-10*a,o-60*a,20*a,60*a,`#7c4f2c`);for(let n=0;n<3;n++){let c=o-60*a-(n+1)*80*a,l=(130-n*30)*a;s+=`<path d="M${H(t-l)} ${H(c+110*a)} L${H(t)} ${H(c)} L${H(t+l)} ${H(c+110*a)} Z" fill="${r}" ${U(e)}/>`,i&&(s+=`<path d="M${H(t-l*.4)} ${H(c+44*a)} L${H(t)} ${H(c)} L${H(t+l*.4)} ${H(c+44*a)} Z" fill="#ffffff"/>`)}return s}function Kf(e,t,n,r){let i=``;for(let a=0;a<4;a++){let o=e.width*(a/3)+(e.rng()-.5)*120*e.unit,s=(220+e.rng()*200)*e.unit,c=(260+e.rng()*140)*e.unit;i+=`<path d="M${H(o-c)} ${H(t)} L${H(o)} ${H(t-s)} L${H(o+c)} ${H(t)} Z" fill="${n}" ${U(e)}/>`,r&&(i+=`<path d="M${H(o-c*.22)} ${H(t-s*.78)} L${H(o)} ${H(t-s)} L${H(o+c*.22)} ${H(t-s*.78)} q${H(-c*.1)} ${H(16*e.unit)} ${H(-c*.22)} 0 z" fill="#ffffff" ${U(e,e.sw*.7)}/>`)}return i}function qf(e,t){let n=e.unit,r=e.floorY-70*n;return W(e,t-140*n,r-120*n,280*n,40*n,`#e5e7eb`,6*n)+W(e,t-140*n,r-80*n,280*n,20*n,`#93c5fd`)+W(e,t-130*n,r-60*n,10*n,60*n,`#9ca3af`)+W(e,t+120*n,r-60*n,10*n,60*n,`#9ca3af`)}function Jf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg,o=i.night?`#1f4d2c`:G(e,[`#2f7d3a`,`#3a8f45`,`#2d6e3e`]);for(let i=0;i<9;i++)a+=`<circle cx="${H(t*i/8)}" cy="${H(r-(200+e.rng()*140)*n)}" r="${H((150+e.rng()*80)*n)}" fill="${o}" ${U(e,e.sw*.6)}/>`;a+=`<rect x="0" y="${H(r-200*n)}" width="${t}" height="${H(200*n)}" fill="${o}"/>`;for(let i=0;i<5;i++)a+=W(e,t*(.05+i*.22+e.rng()*.05),r-380*n,34*n,380*n,`#6b4423`);a+=Hf(e),a+=zf(e,r,i.night?`#3b5a2e`:`#6aa84f`);for(let i=0;i<10;i++)a+=Vf(e,t*e.rng(),r+(5+e.rng()*40)*n,.6+e.rng()*.5,-20-e.rng()*140,G(e,[`#4caf50`,`#3f9d4a`,`#66bb6a`,`#2e7d32`]));e.rng()<.5&&(a+=Bf(e,t*(e.rng()<.5?.08:.92),.9));for(let r=0;r<4;r++)a+=Sd(e,t*e.rng(),e.floorY+(10+e.rng()*30)*n);return a}function Yf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg+Kf(e,r-120*n,i.night?`#4b5a7a`:`#a5b4cb`,!1);for(let r=0;r<9;r++)a+=Gf(e,r/8*t+(e.rng()-.5)*60*n,.7+e.rng()*.6,G(e,[`#2f7d4a`,`#3a8f55`,`#256b3d`]));return a+=zf(e,r,i.night?`#4d6b49`:`#7cb36b`),a+=Uf(e,t*(.2+e.rng()*.6),r+30*n,.6)+od(e,t*.85,r+10*n,.8),a}function Xf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg,o=i.night?`#1e3a8a`:G(e,[`#38bdf8`,`#0ea5e9`,`#22d3ee`]);a+=`<rect x="0" y="${H(r-220*n)}" width="${t}" height="${H(220*n)}" fill="${o}"/>`;for(let i=0;i<6;i++)a+=`<path d="M${H(t*e.rng())} ${H(r-(40+e.rng()*160)*n)} q${H(15*n)} ${H(-10*n)} ${H(30*n)} 0 q${H(15*n)} ${H(-10*n)} ${H(30*n)} 0" fill="none" stroke="#ffffff" stroke-width="${H(e.sw)}"/>`;a+=`<path d="M0 ${H(r-10*n)} Q${H(t/4)} ${H(r-40*n)} ${H(t/2)} ${H(r-10*n)} T${t} ${H(r-10*n)} V${e.height} H0 Z" fill="#fde68a" ${U(e)}/>`,a+=Bf(e,t*(e.rng()<.5?.07:.93),1);let s=t*(.2+e.rng()*.6);return a+=`<line x1="${H(s)}" y1="${H(r+20*n)}" x2="${H(s-30*n)}" y2="${H(r-200*n)}" ${U(e)}/><path d="M${H(s-150*n)} ${H(r-170*n)} Q${H(s-30*n)} ${H(r-300*n)} ${H(s+90*n)} ${H(r-200*n)} Z" fill="${G(e,[`#ef4444`,`#f59e0b`,`#8b5cf6`])}" ${U(e)}/>`,a+=`<circle cx="${H(t*(.3+e.rng()*.4))}" cy="${H(r+50*n)}" r="${H(22*n)}" fill="#f472b6" ${U(e)}/>`,a}function Zf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e).svg;return i+=`<path d="M0 ${H(r-120*n)} Q${H(t*.25)} ${H(r-220*n)} ${H(t*.5)} ${H(r-120*n)} T${t} ${H(r-140*n)} V${e.height} H0 Z" fill="#f4c27a" ${U(e)}/>`,e.rng()<.6&&(i+=`<path d="M${H(t*.6)} ${H(r-130*n)} L${H(t*.7)} ${H(r-300*n)} L${H(t*.8)} ${H(r-130*n)} Z" fill="#e2a65a" ${U(e)}/>`),i+=zf(e,r,`#f9d48c`),i+=Wf(e,t*(.06+e.rng()*.08),1)+Wf(e,t*(.86+e.rng()*.08),.8),i+=Uf(e,t*(.3+e.rng()*.4),r+40*n,.5,`#c2a07a`),i}function Qf(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=`<rect width="${t}" height="${e.height}" fill="#3f3a4a"/>`;i+=`<path d="M0 0 H${t} V${H(120*n)} ${Array.from({length:12},(r,i)=>`L${H(t-(i+.5)*t/12)} ${H((160+i%2*80+e.rng()*40)*n)} L${H(t-(i+1)*t/12)} ${H(120*n)}`).join(` `)} Z" fill="#2a2633" ${U(e)}/>`;for(let a=0;a<5;a++)i+=Uf(e,t*(.1+a*.2),r-20*n,1.2+e.rng(),G(e,[`#4b4558`,`#56506a`]));i+=zf(e,r,`#2f2b38`);for(let a=0;a<4;a++){let a=t*e.rng(),o=r-(100+e.rng()*200)*n;i+=`<path d="M${H(a)} ${H(o)} l${H(14*n)} ${H(-40*n)} l${H(14*n)} ${H(40*n)} z M${H(a+22*n)} ${H(o)} l${H(10*n)} ${H(-28*n)} l${H(10*n)} ${H(28*n)} z" fill="${G(e,[`#67e8f9`,`#c084fc`,`#86efac`])}" ${U(e,e.sw*.6)}/>`}return i+=`<radialGradient id="cavelight"><stop offset="0" stop-color="#fde68a" stop-opacity="0.35"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient><ellipse cx="${H(t/2)}" cy="${H(r-150*n)}" rx="${H(t*.45)}" ry="${H(300*n)}" fill="url(#cavelight)"/>`,i}function $f(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e),a=i.svg+Kf(e,r-40*n,i.night?`#4b5a7a`:`#94a3b8`,!0);return a+=zf(e,r,i.night?`#4d6b49`:`#8fbf6f`),a+=Gf(e,t*.08,.8)+Gf(e,t*.92,.9)+Uf(e,t*.5,r+30*n,.7),a}function ep(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e).svg+Kf(e,r-60*n,`#cbd5e1`,!0);i+=zf(e,r,`#f8fafc`),i+=Gf(e,t*.06,.9,`#2f6b4a`,!0)+Gf(e,t*.94,.8,`#2f6b4a`,!0);let a=t*(.25+e.rng()*.5);i+=`<circle cx="${H(a)}" cy="${H(r-40*n)}" r="${H(50*n)}" fill="#ffffff" ${U(e)}/><circle cx="${H(a)}" cy="${H(r-120*n)}" r="${H(36*n)}" fill="#ffffff" ${U(e)}/><path d="M${H(a)} ${H(r-120*n)} l${H(30*n)} ${H(6*n)} l${H(-30*n)} ${H(6*n)} z" fill="#f97316"/><circle cx="${H(a-10*n)}" cy="${H(r-130*n)}" r="${H(4*n)}" fill="#1b1b1b"/>`;for(let r=0;r<40;r++)i+=`<circle cx="${H(t*e.rng())}" cy="${H(e.height*e.rng()*.8)}" r="${H((2+e.rng()*3)*n)}" fill="#ffffff" opacity="0.9"/>`;return i}function tp(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e).svg;i+=`<path d="M0 ${H(r-90*n)} Q${H(t*.3)} ${H(r-150*n)} ${H(t*.6)} ${H(r-90*n)} T${t} ${H(r-100*n)} V${e.height} H0 Z" fill="#b8e0a0" ${U(e)}/>`;let a=t*(e.rng()<.5?.14:.8);i+=W(e,a-110*n,r-220*n,220*n,220*n,`#b91c1c`)+`<path d="M${H(a-130*n)} ${H(r-220*n)} L${H(a)} ${H(r-320*n)} L${H(a+130*n)} ${H(r-220*n)} Z" fill="#7f1d1d" ${U(e)}/>`+W(e,a-50*n,r-120*n,100*n,120*n,`#fef3c7`)+`<path d="M${H(a-50*n)} ${H(r-120*n)} L${H(a+50*n)} ${H(r)} M${H(a+50*n)} ${H(r-120*n)} L${H(a-50*n)} ${H(r)}" ${U(e)}/>`,i+=Zd(e,r),i+=zf(e,r,`#a3d977`);for(let a=0;a<3;a++)i+=`<ellipse cx="${H(t*(.4+a*.12))}" cy="${H(r-120*n)}" rx="${H(40*n)}" ry="${H(30*n)}" fill="#fbbf24" ${U(e)}/>`;return i}function np(e){let{width:t,unit:n}=e,r=e.floorY-50*n,i=xd(e),a=i.svg+Kf(e,r-100*n,i.night?`#4b5a7a`:`#b6c6a8`,!1);for(let i=-e.rng()*60*n;i<t;i+=300*n){let t=G(e,[`#e7c9a0`,`#d9b38c`,`#f1d9b5`]),o=(150+e.rng()*60)*n;a+=W(e,i,r-o,220*n,o,t)+W(e,i+80*n,r-100*n,60*n,100*n,`#7c4f2c`)+`<path d="M${H(i-20*n)} ${H(r-o)} h${H(260*n)} l${H(-30*n)} ${H(-40*n)} h${H(-200*n)} z" fill="#a16207" ${U(e)}/>`}return a+=zf(e,r,`#c9a36b`),a+=ad(e,t*(.1+e.rng()*.8),.7,`#6fb35e`),a}function rp(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=`<rect width="${t}" height="${e.height}" fill="#0b1026"/>`;for(let r=0;r<90;r++)i+=`<circle cx="${H(t*e.rng())}" cy="${H(e.height*e.rng())}" r="${H((1+e.rng()*2.5)*n)}" fill="#ffffff" opacity="${(.5+e.rng()*.5).toFixed(2)}"/>`;i+=`<circle cx="${H(t*.8)}" cy="${H(e.height*.2)}" r="${H(90*n)}" fill="${G(e,[`#f97316`,`#a78bfa`,`#38bdf8`])}" ${U(e)}/><ellipse cx="${H(t*.8)}" cy="${H(e.height*.2)}" rx="${H(150*n)}" ry="${H(26*n)}" fill="none" stroke="#fde68a" stroke-width="${H(e.sw*2)}"/>`,i+=`<path d="M0 ${H(r)} Q${H(t*.25)} ${H(r-40*n)} ${H(t*.5)} ${H(r)} T${t} ${H(r)} V${e.height} H0 Z" fill="#9ca3af" ${U(e)}/>`;for(let a=0;a<6;a++)i+=`<ellipse cx="${H(t*e.rng())}" cy="${H(r+(20+e.rng()*40)*n)}" rx="${H(30*n)}" ry="${H(8*n)}" fill="#6b7280" ${U(e,e.sw*.6)}/>`;return i}function ip(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=`<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><rect width="${t}" height="${e.height}" fill="url(#sea)"/>`;for(let r=0;r<5;r++)i+=`<path d="M${H(t*e.rng())} 0 l${H(80*n)} ${H(e.height*.7)} l${H(60*n)} 0 z" fill="#ffffff" opacity="0.08"/>`;i+=zf(e,r,`#fcd34d`);for(let a=0;a<6;a++){let a=t*e.rng();i+=`<path d="M${H(a)} ${H(r)} q${H(-20*n)} ${H(-60*n)} 0 ${H(-120*n)} q${H(20*n)} ${H(-60*n)} 0 ${H(-120*n)}" fill="none" stroke="#16a34a" stroke-width="${H(e.sw*2.5)}" stroke-linecap="round"/>`}for(let a=0;a<3;a++)i+=`<path d="M${H(t*(.15+a*.35))} ${H(r)} q${H(-30*n)} ${H(-80*n)} ${H(10*n)} ${H(-90*n)} q${H(10*n)} ${H(40*n)} ${H(30*n)} ${H(10*n)} q${H(30*n)} ${H(-60*n)} ${H(40*n)} ${H(-20*n)} q${H(10*n)} ${H(60*n)} ${H(-30*n)} ${H(100*n)} z" fill="${G(e,[`#fb7185`,`#f472b6`,`#fb923c`])}" ${U(e)}/>`;for(let r=0;r<12;r++)i+=`<circle cx="${H(t*e.rng())}" cy="${H(e.height*e.rng()*.8)}" r="${H((5+e.rng()*8)*n)}" fill="none" stroke="#e0f2fe" stroke-width="${H(e.sw*.6)}"/>`;return i}function ap(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e0f2fe`,`#ecfdf5`,`#f8fafc`]),G(e,[`#cbd5e1`,`#d1d5db`]));return r+=ff(e,t*.5,e.floorY-540*n,`HOSPITAL`,`#dc2626`),r+=W(e,t*.5-30*n,e.floorY-470*n,60*n,60*n,`#ffffff`)+W(e,t*.5-8*n,e.floorY-462*n,16*n,44*n,`#dc2626`)+W(e,t*.5-22*n,e.floorY-448*n,44*n,16*n,`#dc2626`),r+=qf(e,t*.12)+Bd(e,t*.9,`#94a3b8`),r+=W(e,t*.25,e.floorY-330*n,10*n,260*n,`#9ca3af`)+W(e,t*.25-20*n,e.floorY-340*n,50*n,70*n,`#bfdbfe`,8*n),r}function op(e,t){let{width:n,unit:r}=e,i={bus:G(e,[`#fde68a`,`#fef3c7`,`#e0f2fe`]),train:G(e,[`#e2e8f0`,`#fee2e2`]),car:`#334155`,plane:`#f1f5f9`}[t],a=e.floorY-(t===`car`?520:480)*r,o=(t===`plane`?120:190)*r,s=[],c=t===`car`?2:t===`plane`?6:4;for(let e=0;e<c;e++){let i=n/c-40*r,l=n/c*e+20*r;if(t===`plane`){let e=l+i/2,t=50*r,n=70*r,c=a+o/2;s.push(`M${H(e-t)} ${H(c)} a${H(t)} ${H(n)} 0 1 0 ${H(2*t)} 0 a${H(t)} ${H(n)} 0 1 0 ${H(-2*t)} 0 Z`)}else s.push(`M${H(l)} ${H(a)} h${H(i)} v${H(o)} h${H(-i)} Z`)}let l=`<path d="M0 0 H${n} V${e.height} H0 Z ${s.join(` `)}" fill="${i}" fill-rule="evenodd" ${U(e)}/>`;if(l+=`<path d="M${s.join(` `)}" fill="none" stroke="${ed}" stroke-width="${H(e.sw*2.5)}"/>`,l+=`<rect x="0" y="${H(e.floorY-70*r)}" width="${n}" height="${H(e.height)}" fill="${t===`car`?`#1f2937`:`#64748b`}"/>`,t===`bus`||t===`train`){l+=`<line x1="0" y1="${H(a-50*r)}" x2="${n}" y2="${H(a-50*r)}" stroke="#9ca3af" stroke-width="${H(e.sw*2)}"/>`;for(let t=60*r;t<n;t+=150*r)l+=`<path d="M${H(t)} ${H(a-50*r)} v${H(30*r)}" ${U(e)}/><circle cx="${H(t)}" cy="${H(a-8*r)}" r="${H(12*r)}" fill="none" ${U(e)}/>`;l+=ff(e,n*.5,20*r,t===`bus`?G(e,[`CITY BUS`,`EXPRESS`,`JUNGLE BUS`]):`EXPRESS TRAIN`,`#1f2937`)}return t===`car`&&(l+=`<circle cx="${H(n*.15)}" cy="${H(e.floorY-250*r)}" r="${H(90*r)}" fill="none" stroke="#111827" stroke-width="${H(18*r)}"/>`),t===`plane`&&(l+=ff(e,n*.5,30*r,`FASTEN SEAT BELT`,`#0f172a`)),l}function sp(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#f3ead0`,`#ede9fe`,`#fef3c7`]),G(e,yd));for(let n=0;n<4;n++)r+=wd(e,t*(.08+n*.28));return r+=ff(e,t*.5,e.floorY-560*n,`QUIET PLEASE`,`#7c3aed`),r}function cp(e){let{width:t,unit:n}=e,r=e.floorY-40*n,i=G(e,[`#b91c1c`,`#7c3aed`,`#1d4ed8`]),a=`<rect width="${t}" height="${e.height}" fill="#1f1b2e"/>`;a+=`<path d="M${H(t*.5-70*n)} 0 L${H(t*.25)} ${H(r)} H${H(t*.75)} L${H(t*.5+70*n)} 0 Z" fill="#fde68a" opacity="0.18"/>`;for(let n of[0,1]){let o=n?`M${t} 0 H${H(t*.82)}`:`M0 0 H${H(t*.18)}`;o+=n?` Q${H(t*.86)} ${H(r/2)} ${H(t*.8)} ${H(r)} H${t} Z`:` Q${H(t*.14)} ${H(r/2)} ${H(t*.2)} ${H(r)} H0 Z`,a+=`<path d="${o}" fill="${i}" ${U(e)}/>`}let o=`M0 0 H${t} V${H(70*n)}`;for(let e=0;e<10;e++)o+=` q${H(-t/20)} ${H(40*n)} ${H(-t/10)} 0`;return a+=`<path d="${o} Z" fill="${i}" ${U(e)}/>`,a+=zf(e,r,`#8b5a2b`),a}function lp(e){let{width:t,unit:n}=e,r=rd(e,G(e,[`#e5e7eb`,`#dbeafe`,`#fee2e2`]),`#475569`);r+=ff(e,t*.5,e.floorY-560*n,`GYM`,`#ef4444`);for(let i of[.12,.88])r+=W(e,t*i-90*n,e.floorY-260*n,180*n,12*n,`#374151`)+W(e,t*i-110*n,e.floorY-300*n,24*n,90*n,`#111827`,4*n)+W(e,t*i+86*n,e.floorY-300*n,24*n,90*n,`#111827`,4*n);return r+=W(e,t*.06,e.floorY-470*n,200*n,140*n,`#cfe8ff`),r}function up(e,t){if(t){let{width:t,unit:n}=e,r=e.floorY-40*n,i=xd(e);return i.svg+Kf(e,r-80*n,i.night?`#4b5a7a`:G(e,[`#a5b4cb`,`#b6c6a8`,`#d6c2a3`]),e.rng()<.3)+zf(e,r,G(e,[`#9fd07f`,`#d6c2a3`,`#c9a36b`,`#a8d88a`]))}let{width:n,unit:r}=e;return rd(e,G(e,vd),G(e,yd))+id(e,n*.5-110*r,e.floorY-480*r,220*r,160*r,G(e,bd))+(e.rng()<.5?Bd(e,n*.9):Bd(e,n*.08))}var dp={jungle:Jf,forest:Yf,beach:Xf,desert:Zf,cave:Qf,mountain:$f,snow:ep,farm:tp,village:np,space:rp,underwater:ip,hospital:ap,library:sp,stage:cp,gym:lp,bus:e=>op(e,`bus`),train:e=>op(e,`train`),car:e=>op(e,`car`),plane:e=>op(e,`plane`)},fp=new Set([`bus`,`train`,`car`,`plane`]),pp={park:[mf,hf,gf],street:[_f,vf,yf],home:[bf,xf,Sf],office:[Cf,wf],classroom:[Tf,Ef,Df],kitchen:[Of,kf],bedroom:[Af,jf],shop:[Mf,Nf,Pf],restaurant:[Ff,If],police:[Lf,Rf]},mp={park:kd,street:Ad,home:jd,office:Md,classroom:Nd,kitchen:Pd,bedroom:Fd,shop:Id,restaurant:Ld,police:Rd,plain:zd};function hp(e,t){let n=gd((e.seed??7)*2654435761),r={...t,sw:Math.max(2,3*t.unit),rng:n,wood:[`#b9825a`,`#a86b3c`,`#8b5e3c`,`#c08552`,`#6b4f3a`][Math.floor(n()*5)],sofaCol:[`#5b84b1`,`#b15b5b`,`#5bb18a`,`#8a5bb1`,`#c49a3a`,`#64748b`][Math.floor(n()*6)],blanket:[`#e07a8f`,`#7aa6e0`,`#8fd19e`,`#f2cc8f`,`#b39ddb`][Math.floor(n()*5)]},i=e.kind,a=dp[i]?[dp[i]]:i===`custom`?[t=>up(t,e.outdoor??!0)]:[mp[e.kind]??zd,...pp[e.kind]??[]],o=gd(((e.seed??7)^2654435769)*40503+12345);o(),o();let s=a[Math.floor(o()*a.length)],c=e.transparent?``:s(r);for(let t of e.props){let e=t.x*r.width,n=(t.x2??t.x)*r.width;t.type===`bench`?c+=ud(r,e,n):t.type===`sofa`?c+=dd(r,e,n):t.type===`bed`?c+=fd(r,e,n):t.type===`chair`?c+=pd(r,e):t.type===`table`?c+=md(r,e,!1):t.type===`desk`&&(c+=md(r,e,!0))}return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.width} ${r.height}" width="${r.width}" height="${r.height}">${c}</svg>`}var K=`stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`,gp={samosa:`<path d="M50 12 L88 82 Q50 92 12 82 Z" fill="#e8a84a" ${K}/><path d="M50 12 L50 86" fill="none" stroke="#c98a2e" stroke-width="3"/><circle cx="38" cy="64" r="3" fill="#c98a2e"/><circle cx="62" cy="58" r="3" fill="#c98a2e"/><circle cx="56" cy="74" r="3" fill="#c98a2e"/>`,phone:`<rect x="28" y="8" width="44" height="84" rx="8" fill="#374151" ${K}/><rect x="33" y="18" width="34" height="58" rx="3" fill="#7dd3fc"/><circle cx="50" cy="84" r="3.5" fill="#e5e7eb"/>`,cat:`<path d="M22 40 L18 12 L40 28 Q50 25 60 28 L82 12 L78 40 Q86 70 50 84 Q14 70 22 40 Z" fill="#f59e0b" ${K}/><circle cx="38" cy="48" r="5" fill="#1a1a1a"/><circle cx="62" cy="48" r="5" fill="#1a1a1a"/><path d="M46 60 L54 60 L50 65 Z" fill="#f472b6" ${K}/><path d="M50 65 Q44 72 38 68 M50 65 Q56 72 62 68 M14 56 L32 58 M14 66 L32 62 M86 56 L68 58 M86 66 L68 62" fill="none" ${K}/>`,dog:`<ellipse cx="50" cy="54" rx="30" ry="30" fill="#d4a373" ${K}/><path d="M22 36 Q8 50 16 74 Q26 66 28 50 Z M78 36 Q92 50 84 74 Q74 66 72 50 Z" fill="#8b5e3c" ${K}/><circle cx="40" cy="48" r="5" fill="#1a1a1a"/><circle cx="60" cy="48" r="5" fill="#1a1a1a"/><ellipse cx="50" cy="64" rx="8" ry="6" fill="#1a1a1a"/><path d="M50 70 Q50 80 58 80" fill="none" ${K}/>`,money:`<rect x="10" y="26" width="80" height="48" rx="6" fill="#86efac" ${K}/><circle cx="50" cy="50" r="14" fill="#bbf7d0" ${K}/><text x="50" y="58" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="22" fill="#166534">$</text><circle cx="22" cy="38" r="3" fill="#166534"/><circle cx="78" cy="62" r="3" fill="#166534"/>`,book:`<path d="M50 24 Q30 14 10 20 V82 Q30 76 50 86 Q70 76 90 82 V20 Q70 14 50 24 Z" fill="#60a5fa" ${K}/><path d="M50 24 V86" fill="none" ${K}/><path d="M18 34 Q30 30 42 36 M18 46 Q30 42 42 48 M58 36 Q70 30 82 34 M58 48 Q70 42 82 46" fill="none" stroke="#e0f2fe" stroke-width="3"/>`,pizza:`<path d="M14 22 Q50 6 86 22 L50 92 Z" fill="#fcd34d" ${K}/><path d="M14 22 Q50 6 86 22 Q50 14 14 22 Z" fill="#d97706" ${K}/><circle cx="40" cy="36" r="6" fill="#dc2626"/><circle cx="60" cy="40" r="6" fill="#dc2626"/><circle cx="50" cy="60" r="5" fill="#dc2626"/>`,burger:`<path d="M14 46 Q14 16 50 16 Q86 16 86 46 Z" fill="#f59e0b" ${K}/><rect x="10" y="46" width="80" height="8" rx="4" fill="#4ade80" ${K}/><rect x="12" y="54" width="76" height="12" rx="5" fill="#7c2d12" ${K}/><path d="M14 66 H86 V76 Q86 86 76 86 H24 Q14 86 14 76 Z" fill="#f59e0b" ${K}/><circle cx="36" cy="28" r="2" fill="#fff"/><circle cx="58" cy="24" r="2" fill="#fff"/>`,cake:`<rect x="16" y="46" width="68" height="40" rx="4" fill="#f9a8d4" ${K}/><path d="M16 56 Q24 64 33 56 Q42 64 50 56 Q58 64 67 56 Q76 64 84 56" fill="none" stroke="#fff" stroke-width="4"/><rect x="46" y="24" width="8" height="22" fill="#93c5fd" ${K}/><path d="M50 8 Q58 16 50 22 Q42 16 50 8 Z" fill="#fbbf24" ${K}/>`,tea:`<path d="M18 34 H70 V64 Q70 84 44 84 Q18 84 18 64 Z" fill="#fde68a" ${K}/><path d="M70 42 Q88 42 86 56 Q84 68 70 66" fill="none" ${K}/><path d="M32 24 Q28 16 34 8 M46 24 Q42 16 48 8" fill="none" stroke="#9ca3af" stroke-width="4" stroke-linecap="round"/><rect x="22" y="38" width="44" height="8" fill="#b45309" opacity="0.6"/>`,clock:`<circle cx="50" cy="52" r="36" fill="#fff" ${K}/><path d="M50 52 V30 M50 52 L66 60" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/><path d="M24 14 L12 26 M76 14 L88 26" fill="none" ${K}/><circle cx="50" cy="52" r="3" fill="#dc2626"/>`,heart:`<path d="M50 86 Q12 60 12 36 Q12 14 32 14 Q44 14 50 28 Q56 14 68 14 Q88 14 88 36 Q88 60 50 86 Z" fill="#ef4444" ${K}/><path d="M28 30 Q30 24 36 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,car:`<path d="M8 64 L12 48 L28 44 L38 28 H66 L78 44 L92 48 V64 Z" fill="#ef4444" ${K}/><path d="M40 32 H64 L72 44 H34 Z" fill="#bae6fd" ${K}/><circle cx="28" cy="66" r="10" fill="#374151" ${K}/><circle cx="72" cy="66" r="10" fill="#374151" ${K}/>`,gift:`<rect x="14" y="40" width="72" height="46" fill="#a78bfa" ${K}/><rect x="10" y="28" width="80" height="14" fill="#c4b5fd" ${K}/><rect x="44" y="28" width="12" height="58" fill="#fbbf24" ${K}/><path d="M50 28 Q34 6 26 18 Q22 28 50 28 Q78 28 74 18 Q66 6 50 28 Z" fill="#fbbf24" ${K}/>`,bomb:`<circle cx="44" cy="58" r="30" fill="#374151" ${K}/><rect x="52" y="22" width="16" height="12" rx="2" fill="#6b7280" ${K} transform="rotate(35 60 28)"/><path d="M66 22 Q74 10 84 14" fill="none" ${K}/><path d="M86 6 L88 14 L96 14 L90 19 L92 27 L86 22 L80 27 L82 19 L76 14 L84 14 Z" fill="#fbbf24"/><circle cx="32" cy="48" r="5" fill="#9ca3af"/>`,ice:`<path d="M32 46 L50 92 L68 46 Z" fill="#fbbf24" ${K}/><path d="M38 56 L62 56 M42 68 L58 68" stroke="#b45309" stroke-width="3"/><circle cx="50" cy="34" r="20" fill="#f9a8d4" ${K}/><circle cx="58" cy="14" r="6" fill="#dc2626" ${K}/>`,ball:`<circle cx="50" cy="50" r="36" fill="#dc2626" ${K}/><path d="M24 26 Q40 50 24 74 M76 26 Q60 50 76 74" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="5 5"/>`,star:`<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#fbbf24" ${K}/>`,trophy:`<path d="M28 12 H72 V38 Q72 62 50 62 Q28 62 28 38 Z" fill="#fbbf24" ${K}/><path d="M28 20 H14 Q12 40 30 44 M72 20 H86 Q88 40 70 44" fill="none" ${K}/><rect x="44" y="62" width="12" height="14" fill="#fbbf24" ${K}/><rect x="30" y="76" width="40" height="12" rx="2" fill="#92400e" ${K}/>`,key:`<circle cx="30" cy="40" r="18" fill="#fbbf24" ${K}/><circle cx="30" cy="40" r="6" fill="#fff" ${K}/><path d="M46 48 L88 74 M74 66 L68 76 M82 70 L76 80" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/><path d="M46 48 L88 74" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>`,bed:`<rect x="8" y="50" width="84" height="22" rx="4" fill="#93c5fd" ${K}/><rect x="12" y="38" width="26" height="14" rx="6" fill="#fff" ${K}/><path d="M8 72 V86 M92 72 V86 M8 30 V72" fill="none" ${K}/><text x="66" y="38" font-family="Arial" font-weight="bold" font-size="22" fill="#6366f1">Zz</text>`,fire:`<path d="M50 92 Q18 88 20 58 Q22 40 36 26 Q36 42 46 46 Q42 22 60 8 Q60 30 74 42 Q86 56 80 72 Q74 90 50 92 Z" fill="#f97316" ${K}/><path d="M50 88 Q36 84 38 68 Q40 58 48 52 Q50 64 58 66 Q64 76 58 84 Z" fill="#fde047"/>`};Object.keys(gp);function _p(e){let t=gp[e];return t?`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">${t}</svg>`:null}var vp=[70,160],yp=[130,160],bp=[100,256],xp=[84,256],Sp=[116,256],Cp=[80,364],wp=[120,364],Tp=52,Ep=50,Dp=54.5,Op=54.5;function kp(e,t,n,r,i){let a=t[0]-e[0],o=t[1]-e[1],s=Math.hypot(a,o),c=(n+r)*.999,l=Math.abs(n-r)+.5;if(s>c&&(a*=c/s,o*=c/s,s=c),s<l){let e=l/Math.max(s,.001);a*=e,o*=e,s=l}let u=[e[0]+a,e[1]+o],d=Math.atan2(o,a),f=Math.acos(Math.max(-1,Math.min(1,(n*n+s*s-r*r)/(2*n*s)))),p=[e[0]+Math.cos(d+f)*n,e[1]+Math.sin(d+f)*n],m=[e[0]+Math.cos(d-f)*n,e[1]+Math.sin(d-f)*n],h=(e[0]+u[0])/2;return[(p[0]-h)*i>=(m[0]-h)*i?p:m,u]}function Ap(e,t){let n=e.slice(1).map((t,n)=>Math.hypot(t[0]-e[n][0],t[1]-e[n][1])),r=n.reduce((e,t)=>e+t,0)*t,i=[e[0]];for(let t=0;t<n.length;t++){let a=e[t],o=e[t+1],s=n[t];if(r>=s){i.push(o),r-=s;continue}let c=r/Math.max(s,1e-4);i.push([a[0]+(o[0]-a[0])*c,a[1]+(o[1]-a[1])*c]);break}return i}var jp=(e,t,n)=>e+(t-e)*n,Mp=(e,t,n)=>[jp(e[0],t[0],n),jp(e[1],t[1],n)];function Np(e,t,n,r,i=0){let a=e.stance===`sit`,s=e.stance.startsWith(`walk`),c=a?`sit`:`stand`,l=o(e.pose,c),u=[...l.left],d=[...l.right],f=[...Cp],p=[...wp],m=0,h=a?56:0,g=0,_=0,v=0,y=0,b=e.look===`right`?.75:e.look===`left`?-.75:0,x=e.facing===`left`?-b:b;if(s){let n=t/16*Math.PI*2,r=Math.sin(n);f=[Cp[0]+3*Math.cos(n),Cp[1]-15*Math.max(0,r)],p=[wp[0]-3*Math.cos(n),wp[1]-15*Math.max(0,-r)],h=3*Math.abs(r)-2,e.pose===`idle`&&(u=[56+6*r,252-6*Math.abs(r)],d=[144+6*r,252-6*Math.abs(r)]),g=2*r}switch(e.pose){case`belly`:_=.35,v=4;break;case`cover`:_=.25,y=4;break;case`facepalm`:v=-8,y=3;break;case`think`:v=9;break;case`shrug`:y=-2,v=-4;break;case`point`:g=4;break;case`hips`:g=-2;break;case`read`:case`page`:y=6,v=2;break;case`phone`:v=8;break;case`eat`:case`drink`:v=-3}e.expr===`sad`&&(y+=4,_=Math.max(_,.12)),e.expr===`surprised`&&(y-=5),e.expr===`angry`&&(_=Math.max(_,.1),g+=2),e.expr===`suspicious`&&(v+=6);let S=t/24;if(y+=Math.sin(S*2.2+n)*.8,!s&&e.stance!==`lie`&&(m+=Math.sin(S*.9+n*2)*1.6,g+=Math.sin(S*.7+n)*1.2,v+=Math.sin(S*.5+n*3)*1.5),(e.pose===`idle`||e.pose===`talk`)&&!s&&e.stance!==`lie`&&i>.25){let e=Math.floor(t/36),o=Math.floor(Math.abs(Math.sin(e*12.9898+n*78.233))*43758.5453)%5,s=Math.min(1,(i-.25)*2.5),c=Math.sin(t/4.2+n)*6*r,l=x>=0?1:-1,f=l>0?d:u,p=(e,t)=>[e[0]+(t[0]-e[0])*s,e[1]+(t[1]-e[1])*s];if(o===0||o===1){let e=[100+l*78,f[1]-48+c];l>0?d=p(d,e):u=p(u,e),g+=l*2*s}else if(o===2)u=p(u,[40,u[1]-42+c]),d=p(d,[160,d[1]-42-c]);else if(o===3){let e=[104-l*6,196+(a?56:0)+c*.4];l>0?u=p(u,e):d=p(d,e)}}return r===0&&i<.1&&b!==0&&!s&&(g+=(b>0?1:-1)*1.5,v+=(b>0?1:-1)*3),r>0&&(y-=r*2.5,v+=Math.sin(t/3.1+n)*3*r,g+=(b>=0?1:-1)*2*r),{lh:u,rh:d,lf:f,rf:p,px:m,py:h,sit:+!!a,lean:g,bow:_,neck:v,headY:y,turn:x}}function Pp(e,t,n){if(!e||n)return t;let r=.32;return{lh:Mp(e.lh,t.lh,r),rh:Mp(e.rh,t.rh,r),lf:Mp(e.lf,t.lf,.55),rf:Mp(e.rf,t.rf,.55),px:jp(e.px,t.px,r),py:jp(e.py,t.py,.3),sit:jp(e.sit,t.sit,.3),lean:jp(e.lean,t.lean,.16),bow:jp(e.bow,t.bow,.2),neck:jp(e.neck,t.neck,.22),headY:jp(e.headY,t.headY,.3),turn:jp(e.turn,t.turn,.14)}}async function Fp(e,t,n){let r=e.replace(`width="100%" height="100%"`,`width="${Math.round(t)}" height="${Math.round(n)}"`),i=new Image;return await new Promise((e,t)=>{i.onload=()=>e(),i.onerror=()=>t(Error(`Could not draw a character part.`)),i.src=`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(r)}),createImageBitmap(i)}var Ip=e=>Math.round(e*2)/2,Lp=class{configs;scale;cache=new Map;pending=new Map;constructor(e,t){this.configs=e,this.scale=t}load(e,t){let n=this.cache.get(e);if(n)return Promise.resolve(n);let r=this.pending.get(e);if(!r){let[n,i,a]=t();r=Fp(n,i,a).then(t=>(this.cache.set(e,t),this.pending.delete(e),t)),this.pending.set(e,r)}return r}px(e){return e*this.scale*1.6}headKey(e,t,n){let r=t.flags??{},i=t.facing===`left`?t.look===`left`?`right`:t.look===`right`?`left`:`center`:t.look;return`h|${e}|${t.expr}|${t.mouth??``}|${+!!t.blink}|${i}|${Ip(n)}|${+!!r.tears}${+!!r.sweat}${+!!r.smell}`}async need(e){let t=[];for(let n of e){let e=n.split(`|`),o=e[0];if(o===`h`){let[,r,i,a,o,s,c,l]=e,u=this.configs.get(r);if(!u)continue;t.push(this.load(n,()=>[d(u,{expression:i,mouth:a||void 0,blink:o===`1`,look:s,turn:Number(c),flags:{tears:l[0]===`1`,sweat:l[1]===`1`,smell:l[2]===`1`}}),this.px(200),this.px(190)]))}else if(o===`t`){let i=this.configs.get(e[1]);i&&t.push(this.load(n,()=>[r(i,e[2]===`1`,`t${e[1]}`),this.px(200),this.px(210)]))}else o===`i`?t.push(this.load(n,()=>[i(e[1]),this.px(200),this.px(200)])):o===`e`?t.push(this.load(n,()=>[f(e[1],Number(e[2])),this.px(110),this.px(110)])):o===`b`&&t.push(this.load(n,()=>[a(),this.px(200),this.px(250)]))}await Promise.all(t)}get(e){return this.cache.get(e)}};function Rp(e,t,n){let r=[e.headKey(t.cid,t,n.turn),`t|${t.cid}|${+(n.sit>.5)}`];return l.includes(t.pose)&&r.push(`i|${t.pose}`),t.emote&&r.push(`e|${t.emote[0]}|${t.emote[1]}`),t.flags?.blanket&&r.push(`b`),r}function zp(e,t,n,r,i=`round`){if(!(t.length<2)){e.beginPath(),e.moveTo(t[0][0],t[0][1]);for(let n of t.slice(1))e.lineTo(n[0],n[1]);e.strokeStyle=n,e.lineWidth=r,e.lineCap=i,e.lineJoin=`round`,e.stroke()}}function Bp(e,t,n,r=3,i=s){let a=new Path2D(t);e.fillStyle=n,e.fill(a),r&&(e.strokeStyle=i,e.lineWidth=r,e.lineJoin=`round`,e.stroke(a))}function Vp(e,t,n,r,i){let a=n===`left`?Cp:wp;e.save(),e.translate(r[0]-a[0],r[1]-a[1]);let o=t.shoeColor;if(t.shoes===`slippers`){let t=o===`#ffffff`?`#8b5a2b`:o,r=n===`left`?76:124,a=n===`left`?78:122;Bp(e,`M${r-17} 374 a17 4 0 1 0 34 0 a17 4 0 1 0 -34 0`,t,2),Bp(e,`M${a-12} 368 a12 5 0 1 0 24 0 a12 5 0 1 0 -24 0`,i,2),zp(e,n===`left`?[[70,368],[78,362],[86,368]]:[[114,368],[122,362],[130,368]],s,4)}else Bp(e,n===`left`?`M60 376 Q58 360 78 360 L96 362 L98 376 Z`:`M140 376 Q142 360 122 360 L104 362 L102 376 Z`,o,3),t.shoes===`sneakers`&&zp(e,n===`left`?[[58,376],[98,376]]:[[102,376],[142,376]],s,3,`butt`);e.restore()}function Hp(e,t,r,i){let a=[xp[0]+r.px,xp[1]+r.py],o=[Sp[0]+r.px,Sp[1]+r.py],[c,l]=kp(a,r.lf,Dp,Op,-1),[u,d]=kp(o,r.rf,Dp,Op,1),f=[a,c,l],p=[o,u,d],m=t.bottomColor,h=n(m,-35);if(t.bottom===`skirt`){let n=Math.min(l[0],d[0])-30,a=Math.max(l[0],d[0])+30;zp(e,[c,l],i,7),zp(e,[u,d],i,7),Vp(e,t,`left`,l,i),Vp(e,t,`right`,d,i),Bp(e,`M${70+r.px} ${256+r.py} L${130+r.px} ${256+r.py} L${a} 356 L${n} 356 Z`,m,3),zp(e,[[84+r.px,270+r.py],[n+20,352]],h,2),zp(e,[[116+r.px,270+r.py],[a-20,352]],h,2);return}t.bottom===`shorts`&&(zp(e,f,i,7),zp(e,p,i,7)),Vp(e,t,`left`,l,i),Vp(e,t,`right`,d,i);let g=t.bottom===`shalwar`?9:0,_=t.bottom===`shorts`?.42:1;for(let n of[f,p]){let r=Ap(n,_);zp(e,r,s,31+g,_<1?`butt`:`round`),zp(e,r,m,25+g,_<1?`butt`:`round`),t.bottom!==`shorts`&&zp(e,Ap(n,.97).slice(1),h,2)}Bp(e,`M${68+r.px} ${250+r.py} H${132+r.px} L${134+r.px} ${282+r.py} Q${100+r.px} ${292+r.py} ${66+r.px} ${282+r.py} Z`,m,3),zp(e,[[68+r.px,262+r.py],[132+r.px,262+r.py]],h,2),t.bottom===`jeans`&&(zp(e,[[76+r.px,264+r.py],[80+r.px,276+r.py],[92+r.px,274+r.py]],n(m,45),2),zp(e,[[124+r.px,264+r.py],[120+r.px,276+r.py],[108+r.px,274+r.py]],n(m,45),2))}function Up(e,t,r){let i=t.bottomColor,a=n(i,-35);if(Vp(e,t,`left`,Cp,r),Vp(e,t,`right`,wp,r),t.bottom===`skirt`){Bp(e,`M62 304 L138 304 L146 362 L54 362 Z`,i,3);return}if(t.bottom===`shorts`)zp(e,[[80,336],[82,366]],r,7),zp(e,[[120,336],[118,366]],r,7);else{let n=t.bottom===`shalwar`?5:0;Bp(e,`M${66-n} 334 L94 334 L95 364 L${70-n} 364 Z`,i,3),Bp(e,`M106 334 L${134+n} 334 L${130+n} 364 L105 364 Z`,i,3)}Bp(e,`M64 306 L136 306 Q150 324 144 342 L56 342 Q50 324 64 306 Z`,i,3),zp(e,[[100,318],[100,342]],a,2)}function Wp(e,n,r,i,a,o){let[c,l]=kp(r,i,Tp,Ep,a),u=[r,c,l];zp(e,u,o,7);let d=Ap(u,t(n));return zp(e,d,s,23),zp(e,d,n.topColor,17),l}function Gp(e,t,n){e.beginPath(),e.arc(t[0],t[1],8,0,Math.PI*2),e.fillStyle=n,e.fill(),n!==`#151515`&&(e.strokeStyle=s,e.lineWidth=2,e.stroke())}function Kp(t,n,r,i){let a=n.configs.get(r.cid);if(!a)return;let o=u(a),s=e(o);r.facing===`left`&&(t.translate(200,0),t.scale(-1,1));let d=i.sit>.5;d?Up(t,o,s):Hp(t,o,i,s),t.save();let f=[bp[0]+i.px,bp[1]+i.py];t.translate(f[0],f[1]),t.rotate(i.lean*Math.PI/180),t.scale(1,1-.16*i.bow),t.translate(-bp[0],-bp[1]);let p=n.get(`t|${r.cid}|${+!!d}`);p&&t.drawImage(p,0,120,200,210);let m=c.includes(r.pose),h=l.includes(r.pose)?n.get(`i|${r.pose}`):void 0,g=()=>{let e=Wp(t,o,vp,i.lh,-1,s),n=Wp(t,o,yp,i.rh,1,s);h&&t.drawImage(h,0,60,200,200),Gp(t,e,s),Gp(t,n,s)};if(m||g(),r.flags?.blanket){let e=n.get(`b`);e&&t.drawImage(e,0,150,200,250)}let _=n.get(n.headKey(r.cid,r,i.turn));_&&(t.save(),t.translate(100,140+i.headY+12*i.bow),t.rotate(i.neck*Math.PI/180),t.translate(-100,-140),t.drawImage(_,0,-10,200,190),t.restore()),m&&g(),t.restore()}function qp(e,t,n,r,i,a,o,s){e.save(),e.translate(i,a),s&&e.rotate(-s*Math.PI/180),e.scale(o,o),e.translate(-100,-190),Kp(e,t,n,r),e.restore()}function Jp(e,t){let n=7;for(let t of e.toLowerCase())n=n*31+t.charCodeAt(0)>>>0;let r=e=>(n=n*1103515245+12345>>>0,e[(n>>>8)%e.length]),i=e.toLowerCase(),a={skin:r([`#ffffff`,`#fde7d1`,`#f1c9a5`,`#d9a066`,`#a8714a`]),hair:r(t?[`long`,`bun`,`curly`]:[`short`,`side`,`spiky`,`curly`,`none`]),hairColor:r([`#1b1b1b`,`#5b3a1e`,`#8b5a2b`,`#3f3f46`]),hat:`none`,hatColor:`#222831`,top:r([`tshirt`,`shirt`,`checks`,`kurta`,`jacket`]),topColor:r([`#e8643c`,`#3d84c6`,`#81b29a`,`#9b8bd4`,`#e76f51`,`#2a9d8f`,`#c0392b`,`#f2cc8f`,`#ec4899`]),top2Color:`#ffffff`,bottom:r(t?[`skirt`,`shalwar`,`jeans`]:[`jeans`,`trousers`,`shorts`,`shalwar`]),bottomColor:r([`#2f3640`,`#1e3a8a`,`#57534e`,`#7c2d12`,`#374151`]),shoes:r([`sneakers`,`shoes`,`slippers`]),shoeColor:r([`#ffffff`,`#1b1b1b`,`#7c4f2c`]),accessories:[]},o=a.accessories;return/police|inspector|cop|officer|guard|soldier/.test(i)&&Object.assign(a,{hat:`police`,top:`police`,bottom:`trousers`}),/doctor|nurse|dentist|scientist/.test(i)&&(Object.assign(a,{top:`shirt`,topColor:`#ffffff`}),o.push(`glasses`)),/teacher|sir|professor|principal|madam/.test(i)&&o.push(`glasses`),/grand|old|nana|dada|uncle|baba|grandpa/.test(i)&&!t&&(Object.assign(a,{hair:`none`,hairColor:`#d1d5db`}),o.push(`mustache`)),/grandma|granny|nani|dadi/.test(i)&&(Object.assign(a,{hair:`bun`,hairColor:`#d1d5db`}),o.push(`glasses`)),/king|boss|rich|chief/.test(i)&&(o.push(`chain`),o.push(`sunglasses`)),/chef|cook/.test(i)&&Object.assign(a,{top:`shirt`,topColor:`#ffffff`,hat:`beanie`,hatColor:`#ffffff`}),u(a)}var Yp=e=>`/api/assets/file/${encodeURIComponent(e)}`,Xp=e=>e.startsWith(`om:`)||e.startsWith(`lib:`);async function Zp(e,t,n){let r=new Image;await new Promise((t,n)=>{r.onload=()=>t(),r.onerror=()=>n(Error(`Could not load a picture.`)),r.src=e});let i=Math.min(t/(r.naturalWidth||t),n/(r.naturalHeight||n));return createImageBitmap(r,{resizeWidth:Math.max(1,Math.round((r.naturalWidth||t)*i)),resizeHeight:Math.max(1,Math.round((r.naturalHeight||n)*i)),resizeQuality:`high`})}var Qp=12,$p=[`whip`,`zoom`,`iris`,`spin`,`flash`,`slide`],em=[[`#fde047`,`#ef4444`],[`#7dd3fc`,`#2563eb`],[`#f9a8d4`,`#a21caf`]],tm=56;async function nm(e,t,n){let r=new Image;return await new Promise((t,n)=>{r.onload=()=>t(),r.onerror=()=>n(Error(`Could not draw a scene.`)),r.src=`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(e)}),createImageBitmap(r,{resizeWidth:t,resizeHeight:n})}async function rm(e,t,n){let r=await fetch(e);if(!r.ok)throw Error(`Could not load a scene picture.`);return createImageBitmap(await r.blob(),{resizeWidth:t,resizeHeight:n,resizeQuality:`high`})}var im=class{tl;bgUrl;W;H;poses=[];backgrounds=[];scenery=[];stage;prevStage;assets;cardBase=null;popIcons=new Map;finalPrev;finalCur;creatures=new Map;constructor(e,t,n){this.tl=e,this.bgUrl=n,this.W=e.width,this.H=e.height;for(let n of e.auto_chars??[])n.species?this.creatures.set(n.id,Iu(n.species)??Iu(n.name)??Lu(n.name)):t.has(n.id)||t.set(n.id,Jp(n.name,n.female));this.assets=new Lp(t,e.size[1]/400),this.stage=document.createElement(`canvas`),this.stage.width=this.W,this.stage.height=this.H,this.prevStage=document.createElement(`canvas`),this.prevStage.width=this.W,this.prevStage.height=this.H,this.finalPrev=document.createElement(`canvas`),this.finalPrev.width=this.W,this.finalPrev.height=this.H,this.finalCur=document.createElement(`canvas`),this.finalCur.width=this.W,this.finalCur.height=this.H,this.computeTracks()}get frameCount(){return this.tl.frames.length}get duration(){return this.tl.frames.length/this.tl.fps}computeTracks(){let e=new Map,t=new Map,n=new Map,r=-1;this.tl.frames.forEach((i,a)=>{let o=new Map,s=i.scene!==r;for(let r of i.chars){e.has(r.cid)||e.set(r.cid,e.size*1.7+.4);let i=r.mouth===`talk-open`?1:r.mouth===`talk-half`?.5:0,c=Math.max(i,(t.get(r.cid)??0)*.93);t.set(r.cid,c);let l=Np(r,a,e.get(r.cid),i,c);o.set(r.cid,Pp(n.get(r.cid)??null,l,s||!n.has(r.cid)))}this.poses.push(o),n=o,r=i.scene})}async prepare(e){e?.(`Drawing the places…`);let{W:t,H:n}=this;for(let e=0;e<this.tl.scenes;e++){let r=this.tl.layouts[e];if(this.backgrounds[e]=r?r.image||r.decor?.length?await this.ownBackground(r):await nm(hp(r,this.tl.geometry),t,n):await rm(this.bgUrl(e),t,n),this.scenery[e]=null,r&&fp.has(r.kind)){let i=r.kind===`plane`?[`mountain`,`snow`]:[`village`,`forest`,`farm`,`street`,`jungle`,`desert`,`park`],a=i[(r.seed??e)%i.length];this.scenery[e]=await nm(hp({kind:a,props:[],seed:(r.seed??1)+7},this.tl.geometry),t,n)}}await this.preparePictures(),await this.prepareRig(e)}async preparePictures(){let e=[...(this.tl.pops??[]).filter(e=>e.kind===`icon`).map(e=>e.value),...(this.tl.extras??[]).map(e=>e.src)];for(let t of e)if(!this.popIcons.has(t))try{if(Xp(t))this.popIcons.set(t,await Zp(Yp(t),320,320));else{let e=_p(t);e&&this.popIcons.set(t,await nm(e,256,256))}}catch{}}async prepareRig(e){e?.(`Drawing the characters…`);let t=new Set;this.tl.frames.forEach((e,n)=>{for(let r of e.chars){let e=this.poses[n].get(r.cid);if(e)for(let n of Rp(this.assets,r,e))t.add(n)}});let n=[...t];for(let t=0;t<n.length;t+=24)await this.assets.need(n.slice(t,t+24)),e?.(`Drawing the characters… ${Math.min(n.length,t+24)} of ${n.length}`)}drawScene(e,t){let n=this.tl.frames[t],{W:r,H:i}=this,[,a]=this.tl.size,o=a/400,s=this.tl.feetY,c=this.tl.geometry,l=this.backgrounds[n.scene],u=this.scenery[n.scene];if(u){let n=t*22%r;e.drawImage(u,-n,0,r,i),e.drawImage(u,r-n,0,r,i),l&&e.drawImage(l,0,Math.sin(t*.9)*2*o,r,i)}else l?e.drawImage(l,0,0,r,i):(e.fillStyle=`#e2e8f0`,e.fillRect(0,0,r,i));this.tl.layouts[n.scene]?.night&&(e.fillStyle=`rgba(12,20,60,0.5)`,e.fillRect(0,0,r,i)),this.drawFires(e,t,n.scene,s,o,!1),this.drawExtras(e,t,n.scene,s);let d=[],f=[...n.chars].sort((e,t)=>(e.stance===`lie`||e.rot?0:1)-(t.stance===`lie`||t.rot?0:1));for(let i of f){let l=this.poses[t].get(i.cid);if(!l)continue;let u=i.x*r+i.dx*o,f=s-a/2+i.dy*o,p=i.rot;if(i.stance===`lie`){p=-90;let e=this.tl.lie[n.scene]??{sitting:!1,seat_end:null};f=(e.sitting?c.seatY:c.floorY-4*o)-40*o,e.sitting&&e.seat_end!==null&&(u=e.seat_end*r-110*o)}else if(p){let e=Math.min(1,Math.abs(p)/90);f+=(c.floorY-40*o-f)*e}i.flags?.ladder&&this.drawLadder(e,i.x*r+i.dx*o,s,a);let m=(i.form?Iu(i.form)??Lu(i.form):null)??this.creatures.get(i.cid);if(i.morph&&i.morph.t>=i.morph.swap-3&&i.morph.t<i.morph.swap+20){let t=(i.morph.t-i.morph.swap+3)/23;e.save(),e.globalAlpha=t<.4?1:1-(t-.4)/.6,e.fillStyle=`#ffffff`;for(let n=0;n<9;n++){let c=n*.7,l=(40+120*Math.sqrt(t))*o;e.beginPath(),e.arc(i.x*r+Math.cos(c)*l*.8,s-a*.35+Math.sin(c)*l*.6,(50+n%3*30)*o*(.6+t),0,Math.PI*2),e.fill()}e.restore()}if(m){let n=i.mouth===`talk-open`?1:i.mouth===`talk-half`?.5:0;qu(e,m,{n:t,walking:i.stance.startsWith(`walk`),talk:n,blink:i.blink,expr:i.expr},i.x*r+i.dx*o,s+i.dy*o,m.h*a*.94,i.facing===`left`?-1:1)}else qp(e,this.assets,i,l,u,f,o,p);if(typeof i.flags?.rope==`number`&&this.drawRope(e,u,s+i.dy*o,a,i.flags.rope),i.flags?.match&&this.drawMatch(e,u+(i.facing===`left`?-1:1)*70*o,f+40*o,t,o),i.emote){let e=this.assets.get(`e|${i.emote[0]}|${i.emote[1]}`);if(e){let t=i.stance===`sit`?tm:0,n=p*Math.PI/180,r=(78+t+l.headY-190)*o,a=r*Math.sin(n),s=r*Math.cos(n),c=i.facing===`right`?1:-1,[m,h]=Math.abs(p)>45?[u+a,f+s-80*o]:[u+a+c*50*o,f+s-95*o];d.push([e,m,h])}}}let p=this.tl.size[0]*.55;this.drawAfterFx(e,t,n.scene,s,o);for(let[t,n,r]of d)e.drawImage(t,n-p/2,r-p/2,p,p)}drawLadder(e,t,n,r){let i=n-r*1.55,a=r*.16;e.save(),e.lineCap=`round`;for(let[o,s]of[[`#1b1b1b`,r*.03],[`#b45309`,r*.018]]){e.strokeStyle=o,e.lineWidth=s,e.beginPath(),e.moveTo(t-a,n),e.lineTo(t-a,i),e.moveTo(t+a,n),e.lineTo(t+a,i);for(let o=n-r*.1;o>i;o-=r*.13)e.moveTo(t-a,o),e.lineTo(t+a,o);e.stroke()}e.restore()}drawRope(e,t,n,r,i){let a=i*Math.PI*2,o=r*.55,s=n-r*.5;e.save(),e.strokeStyle=`#dc2626`,e.lineWidth=Math.max(3,r*.012),e.beginPath(),e.ellipse(t,s+Math.cos(a)*o*.05,r*.32,o,0,Math.PI*(1+Math.cos(a)*.5),Math.PI*(2-Math.cos(a)*.5)),e.stroke(),e.restore()}drawMatch(e,t,n,r,i){e.save(),e.strokeStyle=`#a16207`,e.lineWidth=4*i,e.beginPath(),e.moveTo(t,n),e.lineTo(t+14*i,n-18*i),e.stroke(),this.flame(e,t+16*i,n-20*i,12*i,r),e.restore()}flame(e,t,n,r,i){let a=1+Math.sin(i*1.7)*.12+Math.sin(i*3.1)*.08;for(let[i,o]of[[`#ef4444`,1],[`#f97316`,.75],[`#fde047`,.45]])e.fillStyle=i,e.beginPath(),e.moveTo(t,n-r*2.2*o*a),e.quadraticCurveTo(t+r*o,n-r*.6*o,t,n),e.quadraticCurveTo(t-r*o,n-r*.6*o,t,n-r*2.2*o*a),e.fill()}drawFires(e,t,n,r,i,a){let{W:o}=this;for(let s of this.tl.effects??[]){if(s.type!==`fire`||s.scene!==n||t<s.frame)continue;let c=s.x*o,l=t-s.frame,u=Math.min(1,l/14);if(a)for(let t=0;t<8;t++){let n=(l+t*11)%88/88;l<t*11||(e.fillStyle=`rgba(120,120,130,${(.45*(1-n)).toFixed(3)})`,e.beginPath(),e.arc(c+Math.sin(n*6+t)*30*i,r-90*i-n*420*i,(14+n*46)*i,0,Math.PI*2),e.fill())}else{let n=e.createRadialGradient(c,r-40*i,0,c,r-40*i,260*i*u);n.addColorStop(0,`rgba(253,186,116,0.45)`),n.addColorStop(1,`rgba(253,186,116,0)`),e.fillStyle=n,e.fillRect(c-300*i,r-330*i,600*i,400*i),e.save(),e.lineCap=`round`;for(let t of[-.35,.35])e.strokeStyle=`#1b1b1b`,e.lineWidth=22*i,e.beginPath(),e.moveTo(c-Math.cos(t)*50*i,r-6*i+Math.sin(t)*10*i),e.lineTo(c+Math.cos(t)*50*i,r-6*i-Math.sin(t)*10*i),e.stroke(),e.strokeStyle=`#8b5a2b`,e.lineWidth=15*i,e.stroke();e.restore();for(let n=0;n<4;n++)this.flame(e,c+(n-1.5)*18*i,r-10*i,(20+n%2*10)*i*u,t+n*7)}}}drawAfterFx(e,t,n,r,i){let{W:a,H:o}=this;this.drawFires(e,t,n,r,i,!0);for(let o of this.tl.effects??[]){if(o.scene!==n||o.type===`fire`)continue;let s=t-o.frame;if(s<0||s>16)continue;let c=o.x*a,l=s/16;if(o.type===`dust`)for(let t=0;t<4;t++)e.fillStyle=`rgba(160,140,110,${(.5*(1-l)).toFixed(3)})`,e.beginPath(),e.arc(c+(t-1.5)*16*i*(1+l*2),r-8*i-l*20*i,(8+l*18)*i,0,Math.PI*2),e.fill();else if(o.type===`hit`&&s<8){let t=r-this.tl.size[1]*.6;e.save(),e.translate(c,t),e.rotate(s*.2),e.fillStyle=s%2?`#fde047`:`#ffffff`,e.strokeStyle=`#1b1b1b`,e.lineWidth=3,e.beginPath();for(let t=0;t<16;t++){let n=t/16*Math.PI*2,r=(t%2?26:60)*i*(1+s*.08);e.lineTo(Math.cos(n)*r,Math.sin(n)*r)}e.closePath(),e.fill(),e.stroke(),e.fillStyle=`#dc2626`,e.font=`900 ${Math.round(34*i)}px Arial Black, Arial`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText([`POW!`,`BAM!`,`WHACK!`][Math.round(o.x*100+o.frame)%3],0,0),e.restore()}else if(o.type===`sparkle`)for(let t=0;t<8;t++){let n=t/8*Math.PI*2,a=30*i+l*90*i;e.fillStyle=t%2?`#fde047`:`#f472b6`,e.beginPath(),e.arc(c+Math.cos(n)*a,r-this.tl.size[1]*.75+Math.sin(n)*a,7*i*(1-l),0,Math.PI*2),e.fill()}}let s=this.tl.layouts[n];if(s?.weather===`rain`){e.strokeStyle=`rgba(180,200,255,0.65)`,e.lineWidth=2,e.beginPath();for(let n=0;n<140;n++){let r=(n*97.13+t*6)%(a+60)-30,i=(n*57.7+t*28)%(o+40)-20;e.moveTo(r,i),e.lineTo(r-6,i+22)}e.stroke()}else if(s?.weather===`snow`){e.fillStyle=`rgba(255,255,255,0.9)`;for(let n=0;n<110;n++){let r=((n*97.13+Math.sin(t/20+n)*30)%a+a)%a,i=(n*57.7+t*3)%(o+20)-10;e.beginPath(),e.arc(r,i,2+n%3,0,Math.PI*2),e.fill()}}}drawCard(e,t){let{W:n,H:r}=this;if(!this.cardBase){let e=document.createElement(`canvas`);e.width=n,e.height=r;let t=e.getContext(`2d`),i=t.createLinearGradient(0,0,0,r);i.addColorStop(0,`#1e293b`),i.addColorStop(1,`#334155`),t.fillStyle=i,t.fillRect(0,0,n,r),this.cardBase=e}e.drawImage(this.cardBase,0,0);let i=Math.min(n,r)*.17*(.6+.4*Math.min(1,t.i/6)),a=n/2,o=r*.4;e.lineWidth=6,e.strokeStyle=`#141414`,e.beginPath(),e.arc(a,o,i+8,0,Math.PI*2),e.fillStyle=`#f59e0b`,e.fill(),e.stroke(),e.beginPath(),e.arc(a,o,i,0,Math.PI*2),e.fillStyle=`#ffffff`,e.fill(),e.stroke();for(let t=0;t<12;t++){let n=Math.PI*2*t/12;e.beginPath(),e.moveTo(a+Math.sin(n)*i*.82,o-Math.cos(n)*i*.82),e.lineTo(a+Math.sin(n)*i*.95,o-Math.cos(n)*i*.95),e.lineWidth=5,e.stroke()}let s=t.i/Math.max(1,t.n);for(let[t,n,r]of[[.75,s*Math.PI*6,6],[.5,s*Math.PI*.5+1,9]])e.beginPath(),e.moveTo(a,o),e.lineTo(a+Math.sin(n)*i*t,o-Math.cos(n)*i*t),e.lineWidth=r,e.lineCap=`round`,e.stroke();if(e.beginPath(),e.arc(a,o,9,0,Math.PI*2),e.fillStyle=`#ef4444`,e.fill(),t.i>6){let i=t.text.slice(0,Math.max(1,Math.floor(t.text.length*Math.min(1,(t.i-6)/18))));this.text(e,i,n/2,r*.72,Math.round(Math.min(n,r)*.075))}}text(e,t,n,r,i){e.font=`bold ${i}px Arial, "Segoe UI", sans-serif`,e.textAlign=`center`,e.textBaseline=`middle`,e.lineJoin=`round`,e.lineWidth=Math.max(4,i/6),e.strokeStyle=`#111111`,e.strokeText(t,n,r),e.fillStyle=`#ffffff`,e.fillText(t,n,r)}subtitles(e,t){if(!this.tl.subtitles)return;let n=t/this.tl.fps,r=this.tl.cues.find(e=>n>=e.start&&n<=e.end+.15);if(!r)return;let{W:i,H:a}=this,o=this.tl.format===`long`?44:50;e.font=`bold ${o}px Arial, "Segoe UI", sans-serif`;let s=r.text.split(/\s+/),c=[],l=``;for(let t of s){let n=l?`${l} ${t}`:t;e.measureText(n).width>i*.86&&l?(c.push(l),l=t):l=n}l&&c.push(l);let u=this.tl.format===`long`?a*.07:a*.84;c.forEach((t,n)=>this.text(e,t,i/2,u+n*o*1.15,o))}renderPlain(e,t){let n=this.tl.frames[t],{W:r,H:i}=this;if(n.card){this.drawCard(e,n.card);return}let a=this.stage.getContext(`2d`);this.drawScene(a,t);let o=n.cam,s=o?Math.max(o.z,o.sx||o.sy?1.04:1):1;s<1.005&&(s=1);let c=r/s,l=i/s,u=o?Math.min(Math.max(o.x+o.sx-c/2,0),r-c):0,d=o?Math.min(Math.max(o.y+o.sy-l/2,0),i-l):0;e.drawImage(this.stage,u,d,c,l,0,0,r,i),this.drawPops(e,t,u,d,s)}async ownBackground(e){let{W:t,H:n}=this,r=document.createElement(`canvas`);r.width=t,r.height=n;let i=r.getContext(`2d`);if(!e.image){i.drawImage(await nm(hp({...e,props:[]},this.tl.geometry),t,n),0,0);for(let r of e.decor??[])try{let e=await Zp(Yp(r.src),512,512),a=r.size*n,o=a*(e.width/Math.max(e.width,e.height)),s=a*(e.height/Math.max(e.width,e.height)),c=this.tl.geometry.floorY-40*this.tl.geometry.unit,l=r.y>=.75?c-s+a*.04:r.y*n-s/2;i.drawImage(e,r.x*t-o/2,l,o,s)}catch{}return e.props.length&&i.drawImage(await nm(hp({...e,transparent:!0},this.tl.geometry),t,n),0,0),createImageBitmap(r)}try{let r=await Zp(Yp(e.image),t*2,n*2),a=this.tl.geometry.floorY-40*this.tl.geometry.unit,o=Math.max(t/r.width,n/r.height),s=r.width*o,c=r.height*o,l=a-(e.floor??.82)*c;l=Math.min(0,Math.max(n-c,l)),i.drawImage(r,(t-s)/2,l,s,c)}catch{i.drawImage(await nm(hp({...e,image:void 0,transparent:!1},this.tl.geometry),t,n),0,0)}return e.props.length&&i.drawImage(await nm(hp(e,this.tl.geometry),t,n),0,0),createImageBitmap(r)}drawExtras(e,t,n,r){let{W:i,H:a}=this;for(let o of this.tl.extras??[]){if(o.scene!==n||t<o.enter)continue;let s=t-o.enter,c=o.word??o.name,l=this.tl.size[1]*.94,u=Iu(c)??Iu(o.name)??(o.kind===`animal`?Lu(c):null),d=u?null:Xu(c)??Xu(o.name);if(u||d){let n=o.x*i,a=o.from===`left`,c=u?u.h*l*u.len*.6:3*l,f=a?-c:i+c,p=Math.min(1,s/(d?36:40)),m=1-(1-p)**2,h=f+(n-f)*m,g=p>=1,_=g?n<i/2?1:-1:a?1:-1;if(d)Qu(e,d,h,r,l,a?1:-1,t,!g,[`#facc15`,`#ef4444`,`#3b82f6`,`#10b981`,`#f97316`][Math.round(o.x*10)%5]);else{let n=g?Math.sin((t-o.enter)/60)*i*.03:0;qu(e,u,{n:t,walking:!g||Math.abs(Math.cos((t-o.enter)/60))>.6,talk:0,blink:t%90<4,expr:`happy`,flying:o.motion===`fly`},h+n,r,u.h*l,_)}continue}let f=this.popIcons.get(o.src);if(!f)continue;let p=o.size*a,m=p*(f.width/Math.max(f.width,f.height)),h=p*(f.height/Math.max(f.width,f.height)),g=o.x*i,_=o.from===`left`?-p:i+p,v=e=>1-(1-Math.min(1,e))**3,y=g,b=r,x=0,S=1,C=o.from===`left`;if(o.motion===`walk`){let e=s/30;if(y=_+(g-_)*v(e),e<1)b-=Math.abs(Math.sin(s*.55))*p*.12;else{let e=(t+Math.round(o.x*97))%70;e<8&&(b-=Math.sin(e/8*Math.PI)*p*.18),x=Math.sin(t/9)*.05,S=1+Math.sin(t/7)*.02,C=g<i/2}}else if(o.motion===`drive`){let e=s/26;y=_+(g-_)*v(e),b-=Math.abs(Math.sin(t*1.7))*2}else if(o.motion===`fly`){let e=Math.min(1,s/30);y=_+(g-_)*v(e)+Math.sin(t/23)*p*.8*e,b=r-p*2.6+Math.sin(t/6)*p*.25,x=Math.sin(t/5)*.12,C=Math.cos(t/23)>0}else{let e=Math.min(1,s/8);S=e<1?1+2.4*(e-1)**3+1.4*(e-1)**2:1+Math.sin(t/8)*.02}e.save(),e.translate(y,b),o.motion!==`fly`&&(e.fillStyle=`rgba(0,0,0,0.15)`,e.beginPath(),e.ellipse(0,0,m*.4,p*.05,0,0,Math.PI*2),e.fill()),e.rotate(x),e.scale(C?-S:S,S),e.drawImage(f,-m/2,-h*.95,m,h),e.restore()}}drawPops(e,t,n,r,i,a){let{W:o,H:s}=this,c=Math.min(o,s)*.24;for(let l of this.tl.pops??[]){let u=t-l.frame;if(u<0||u>=l.n)continue;let d=Math.min(1,u/6),f=1+2.4*(d-1)**3+1.4*(d-1)**2,p=u>l.n-6?(l.n-u)/6:1,m=Math.max(0,f*p),h=Math.sin(u/3)*.12*(1-d*.5),[g,_]=a?a(l):[(l.x-n)*i,(l.y-r)*i];_-=u*.6,g=Math.min(Math.max(g,c*.6),o-c*.6),_=Math.min(Math.max(_,c*.6),s-c*.9),e.save(),e.translate(g,_),e.rotate(h+(l.style-1)*.08),e.scale(m,m);let[v,y]=em[l.style%em.length],b=l.kind===`icon`?this.popIcons.get(l.value):void 0;if(b)e.fillStyle=v,this.burst(e,c*.62,12),e.fill(),e.lineWidth=Math.max(3,c*.025),e.strokeStyle=`#1a1a1a`,e.stroke(),e.drawImage(b,-c*.45,-c*.45,c*.9,c*.9);else{let t=Math.round(c*(l.value.length>7?.3:.4));e.font=`900 ${t}px "Arial Black", Arial, sans-serif`;let n=e.measureText(l.value).width;e.fillStyle=v,this.burst(e,Math.max(c*.5,n*.68),14),e.fill(),e.lineWidth=Math.max(3,c*.025),e.strokeStyle=`#1a1a1a`,e.stroke(),e.textAlign=`center`,e.textBaseline=`middle`,e.lineJoin=`round`,e.lineWidth=t*.18,e.strokeStyle=`#1a1a1a`,e.strokeText(l.value,0,0),e.fillStyle=`#ffffff`,e.fillText(l.value,0,0),e.lineWidth=t*.06,e.strokeStyle=y,e.strokeText(l.value,0,0)}e.restore()}}burst(e,t,n){e.beginPath();for(let r=0;r<n*2;r++){let i=r/(n*2)*Math.PI*2,a=r%2?t*.78:t;e.lineTo(Math.cos(i)*a*1.25,Math.sin(i)*a*.85)}e.closePath()}drawFrame(e,t){let n=this.tl.frames;t=Math.max(0,Math.min(n.length-1,t));let r=n[t],{W:i,H:a}=this,o=e=>`${n[e].card?`c`:`s`}${n[e].scene}`,s=t;for(;s>0&&o(s-1)===o(t);)s--;let c=t-s;if(s===0||c>=Qp)this.renderPlain(e,t);else{let n=this.finalPrev.getContext(`2d`),o=this.finalCur.getContext(`2d`);this.renderPlain(n,s-1),this.renderPlain(o,t);let l=$p[(r.scene+(r.card?3:0))%$p.length],u=(c+1)/Qp,d=u<.5?2*u*u:1-(-2*u+2)**2/2;if(e.save(),e.fillStyle=`#ffffff`,e.fillRect(0,0,i,a),l===`slide`||l===`whip`){let t=i*d,n=l===`whip`?4:1;for(let r=n-1;r>=0;r--){e.globalAlpha=r===0?1:.25;let n=r*i*.05*Math.sin(Math.PI*u);e.drawImage(this.finalPrev,-t+n,0),e.drawImage(this.finalCur,i-t+n,0)}}else if(l===`zoom`){let t=u<.5?this.finalPrev:this.finalCur,n=u<.5?1+1.6*(u*2)**2:1+.8*(1-(u-.5)*2)**2;e.translate(i/2,a/2),e.scale(n,n),e.drawImage(t,-i/2,-a/2),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1-Math.abs(u-.5)*2,e.fillRect(0,0,i,a)}else if(l===`iris`)e.drawImage(this.finalPrev,0,0),e.beginPath(),e.arc(i/2,a/2,Math.hypot(i,a)*.55*d,0,Math.PI*2),e.lineWidth=10,e.strokeStyle=`#1a1a1a`,e.stroke(),e.clip(),e.drawImage(this.finalCur,0,0);else if(l===`spin`){let t=u<.5?this.finalPrev:this.finalCur,n=u<.5?u*2:(1-u)*2;e.translate(i/2,a/2),e.rotate((u<.5?1:-1)*n*Math.PI*.6),e.scale(1-n*.85,1-n*.85),e.drawImage(t,-i/2,-a/2)}else e.drawImage(u<.45?this.finalPrev:this.finalCur,0,0),e.globalAlpha=Math.max(0,1-Math.abs(u-.45)*3),e.fillRect(0,0,i,a);e.restore()}r.card||this.subtitles(e,t)}};async function am(e,t){if(typeof VideoEncoder>`u`)throw Error(`This browser cannot make videos. Please use Google Chrome or Microsoft Edge.`);let{W:n,H:r}=e,i=e.tl.fps,a=null;for(let e of[`avc1.42001f`,`avc1.4d401f`,`avc1.640028`,`avc1.42002a`]){let t={codec:e,width:n,height:r,bitrate:6e6,framerate:i,avc:{format:`annexb`}};try{if((await VideoEncoder.isConfigSupported(t)).supported){a=t;break}}catch{}}if(!a)throw Error(`This browser's video encoder is not available. Please update Chrome.`);let o=[],s=null,c=new VideoEncoder({output:e=>{let t=new Uint8Array(e.byteLength);e.copyTo(t),o.push(t)},error:e=>{s=e instanceof Error?e:Error(String(e))}});c.configure(a);let l=document.createElement(`canvas`);l.width=n,l.height=r;let u=l.getContext(`2d`),d=e.frameCount;for(let n=0;n<d;n++){if(s)throw s;e.drawFrame(u,n);let r=new VideoFrame(l,{timestamp:Math.round(n*1e6/i),duration:Math.round(1e6/i)});if(c.encode(r,{keyFrame:n%(i*2)==0}),r.close(),n%6==0){for(t(n,d);c.encodeQueueSize>6;)await new Promise(e=>setTimeout(e,2));await new Promise(e=>setTimeout(e,0))}}if(await c.flush(),c.close(),s)throw s;return t(d,d),new Blob(o,{type:`video/h264`})}var om=1776411,sm=null;function cm(){return sm||(sm=new Hi(new Uint8Array([150,150,150,255,210,210,210,255,255,255,255,255]),3,1,ce),sm.minFilter=v,sm.magFilter=v,sm.needsUpdate=!0,sm)}var lm=new Map;function um(e,t={}){let n=`${e}|${t.emissive??``}|${t.opacity??``}`,r=lm.get(n);return r||(r=new oo({color:new z(e),gradientMap:cm()}),t.emissive&&(r.emissive=new z(t.emissive)),t.transparent&&(r.transparent=!0,r.opacity=t.opacity??.6),lm.set(n,r)),r}var dm=new Oi({color:om,side:1});function fm(e,t,n=.045,r=!0){let i=new B(e,um(t));if(i.castShadow=r,i.receiveShadow=!0,n>0){let t=new B(e,dm);t.scale.setScalar(1+n),t.userData.outline=!0,i.add(t)}return i}function pm(e,t,n,r=.018){let i=new Aa(e,Math.max(.001,t),4,10);i.translate(0,-t/2,0);let a=new B(i,um(n));a.castShadow=!0;let o=new Aa(e+r,Math.max(.001,t),4,10);o.translate(0,-t/2,0);let s=new B(o,dm);return s.userData.outline=!0,a.add(s),a}function q(e,t,n,r,i=.02){return fm(new ka(e,t,n),r,i)}function J(e,t,n=.06,r=20){return fm(new Ja(e,r,Math.round(r*.75)),t,n)}function Y(e,t,n,r,i=.04,a=16){return fm(new Ma(e,t,n,a),r,i)}function mm(e,t,n,r=.05,i=14){return fm(new Na(e,t,i),n,r)}function X(e,t,n,r){return e.position.set(t,n,r),e}function hm(e){let t=e>>>0||1;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}var Z=(e,t)=>t[Math.floor(e()*t.length)];function gm(e,t){let n=parseInt(e.replace(`#`,``),16),r=e=>Math.max(0,Math.min(255,Math.round(e+t)));return`#${(r(n>>16&255)<<16|r(n>>8&255)<<8|r(n&255)).toString(16).padStart(6,`0`)}`}function _m(e,t,n,r=512,i=128,a=`bold 64px Arial`){let o=document.createElement(`canvas`);o.width=r,o.height=i;let s=o.getContext(`2d`);s.fillStyle=t,s.fillRect(0,0,r,i),s.fillStyle=n,s.font=a,s.textAlign=`center`,s.textBaseline=`middle`,s.fillText(e,r/2,i/2);let c=new Ta(o);return c.colorSpace=rt,c}function vm(e,t,n){let r=document.createElement(`canvas`);r.width=e,r.height=t,n(r.getContext(`2d`));let i=new Ta(r);return i.colorSpace=rt,i}var ym=null;function bm(){return ym||(ym=vm(128,128,e=>{let t=e.createRadialGradient(64,64,4,64,64,62);t.addColorStop(0,`rgba(255,255,255,1)`),t.addColorStop(1,`rgba(255,255,255,0)`),e.fillStyle=t,e.fillRect(0,0,128,128)}),ym)}function xm(e,t){let n=e.image,r=new xi(new si({map:e,transparent:!0,depthWrite:!1})),i=n?n.width/n.height:1;return r.scale.set(t*i,t,1),r.center.set(.5,0),r}var Sm=1.7,Cm=.62,wm=.47,Tm=[`x`,`y`,`z`,`yaw`,`roll`,`spine`,`spineZ`,`headX`,`headY`,`headZ`,`lsx`,`lsz`,`lex`,`lez`,`rsx`,`rsz`,`rex`,`rez`,`lhx`,`lk`,`rhx`,`rk`],Em={idle:[[.05,.12,-.15,0],[.05,-.12,-.15,0]],talk:[[.05,.12,-.2,0],[-.55,-.28,-.95,0]],wave:[[.05,.12,-.15,0],[-.15,-2.65,-.35,0]],hips:[[.12,.85,-.2,-1.9],[.12,-.85,-.2,1.9]],point:[[.05,.12,-.15,0],[-1.5,-.12,0,0]],think:[[-.55,-.45,-1.35,0],[-.95,.35,-2.1,0]],shrug:[[-.35,.6,-1.55,0],[-.35,-.6,-1.55,0]],read:[[-.75,-.18,-.95,0],[-.75,.18,-.95,0]],page:[[-.75,-.18,-.95,0],[-.85,.05,-1.2,0]],phone:[[.05,.12,-.15,0],[-.55,-.12,-2.45,0]],eat:[[-.45,-.2,-1.2,0],[-1,.25,-2.3,0]],drink:[[.05,.12,-.15,0],[-1.05,.25,-2.25,0]],facepalm:[[.05,.12,-.15,0],[-1.25,.32,-2.5,0]],clap:[[-.95,-.08,-.55,0],[-.95,.08,-.55,0]],clap2:[[-.95,.28,-.55,0],[-.95,-.28,-.55,0]],belly:[[-.3,-.25,-1.35,0],[-.3,.25,-1.35,0]],cover:[[-1.15,-.25,-2.55,0],[-1.15,.25,-2.55,0]]};function Dm(e){return e.hairColor||`#1b1b1b`}function Om(e){let t=e.skin||`#ffffff`,n=e.topColor||`#e8643c`,r=e.top2Color||`#ffffff`,i=e.bottomColor||`#2f3640`,a=[`shirt`,`checks`,`kurta`,`jacket`,`police`].includes(e.top),o=e.top===`police`?`#3b5b8c`:n,s=new R,c=X(new R,0,Cm,0);s.add(c);let l=new R;c.add(l);let u=new Aa(.16,.24,6,16);u.translate(0,.2,0);let d=fm(u,o,.06);if(d.scale.set(1.05,1,.68),l.add(d),e.top===`jacket`){let e=fm(new ka(.1,.34,.05),r,0);l.add(X(e,0,.22,.105))}if(e.top===`checks`)for(let e of[.1,.2,.3])l.add(X(q(.36,.015,.25,gm(o,-45),0),0,e,0));if(e.top===`kurta`||e.top===`police`)for(let e of[.32,.24,.16])l.add(X(J(.012,r,0,6),0,e,.115));if(e.top===`kurta`){let e=fm(new Ma(.19,.24,.3,16,1,!0),o,.03);e.material.side=2,c.add(X(e,0,-.1,0))}let f=X(new R,0,.44,0);l.add(f),f.add(X(Y(.045,.05,.08,t,.08),0,.03,0));let p=X(new R,0,.33,0);f.add(p);let m=J(.3,t,.035,32);m.scale.set(1,.98,.95),p.add(m),p.add(X(J(.045,gm(t,-20),.08,10),0,-.06,.285));for(let e of[-1,1])p.add(X(J(.055,t,.08,10),e*.29,-.02,0));let h=[];for(let e of[-1,1]){let t=X(new R,e*.105,.04,.24);p.add(t);let n=J(.075,`#ffffff`,.08,16);n.scale.set(1,1.15,.55),t.add(n);let r=X(J(.036,om,0,12),0,-.005,.04);t.add(r);let i=X(J(.011,`#ffffff`,0,6),.015,.02,.07);r.add(i);let a=X(q(.17,.02,.06,om,0),0,0,.03);a.visible=!1,t.add(a),h.push({white:n,pupil:r,lid:a})}let g=[];for(let t of[-1,1]){let n=X(q(.12,.025,.03,Dm(e)===`#ffffff`?om:Dm(e),0),t*.105,.155,.255);p.add(n),g.push(n)}let _=X(new R,0,-.15,.255);p.add(_);let v=new Ya(.07,.012,6,16,Math.PI),y=new B(v,um(om));y.rotation.z=Math.PI,_.add(y);let b=new B(v,um(om));b.position.y=-.04,_.add(b);let x=q(.1,.016,.02,om,0);_.add(x);let S=new B(new Ja(.07,16,12),um(`#7f1d1d`));S.scale.set(1,.6,.35),_.add(S);let C=X(new B(new Ja(.035,10,8),um(`#f87171`)),0,-.025,.012);S.add(C);let w=[-1,1].map(e=>{let t=X(new B(new Ja(.022,8,8),um(`#60a5fa`,{transparent:!0,opacity:.85})),e*.105,-.03,.27);return p.add(t),t}),T=X(new B(new Ja(.03,8,8),um(`#93c5fd`)),.27,.13,.12);T.scale.set(.8,1.3,.8),p.add(T);let E=Dm(e),D=(e=1.04,t=1.25)=>{let n=fm(new Ja(.3*e,28,18,0,Math.PI*2,0,t),E,.03);return n.rotation.x=-.25,n};if(e.hair===`spiky`){for(let e=0;e<9;e++){let t=e/9*Math.PI*2,n=mm(.05,.16,E,.06,6);n.position.set(Math.cos(t)*.12,.29,Math.sin(t)*.12-.02),n.rotation.set(Math.sin(t)*.5,0,-Math.cos(t)*.5),p.add(n)}p.add(X(mm(.05,.18,E,.06,6),0,.33,0))}else if(e.hair===`short`||e.hair===`side`){if(p.add(D(1.04,1.1)),e.hair===`side`){let e=J(.1,E,.06,12);e.scale.set(1.6,.6,1),p.add(X(e,-.12,.25,.14))}}else if(e.hair===`curly`){p.add(D(1.02,1.15));for(let e=0;e<16;e++){let t=e/16*Math.PI*2,n=.24+e%2*.04;p.add(X(J(.07,E,.06,10),Math.cos(t)*n,.2+e%3*.03,Math.sin(t)*n-.03))}}else if(e.hair===`long`||e.hair===`bun`)if(p.add(D(1.05,1.35)),e.hair===`long`){let e=fm(new Ma(.3,.33,.55,20,1,!0,Math.PI*.55,Math.PI*.9),E,.03);e.material.side=2,e.position.set(0,-.12,-.02),p.add(e)}else p.add(X(J(.11,E,.06,14),0,.26,-.2));let O=e.hatColor||`#222831`;if(e.hat===`cap`){let e=D(1.07,1.05);e.material=um(O),p.add(e),p.add(X(q(.3,.025,.2,O),0,.17,.3))}else if(e.hat===`police`)p.add(X(Y(.3,.28,.14,`#1e3a8a`),0,.3,0)),p.add(X(q(.3,.02,.16,om),0,.24,.27)),p.add(X(J(.035,`#fbbf24`,.08,8),0,.31,.29));else if(e.hat===`beanie`){let e=D(1.09,1.3);e.material=um(O),p.add(e),p.add(X(J(.06,gm(O,40),.06,10),0,.36,-.05))}else e.hat===`topi`&&p.add(X(Y(.24,.26,.1,O),0,.29,0));let k=new Set(e.accessories??[]);if(k.has(`glasses`)||k.has(`sunglasses`)){let e=k.has(`sunglasses`);for(let t of[-1,1]){let n=new B(new Ya(.075,.012,6,18),um(om));if(n.position.set(t*.105,.04,.29),p.add(n),e){let e=new B(new ja(.075,18),um(`#111827`));e.position.set(t*.105,.04,.295),p.add(e)}}p.add(X(q(.06,.012,.012,om,0),0,.05,.3))}if(k.has(`mustache`)){let e=J(.06,E,.06,10);e.scale.set(1.6,.45,.6),p.add(X(e,0,-.1,.27))}if(k.has(`beard`)){let e=fm(new Ja(.27,20,12,0,Math.PI*2,Math.PI*.55,Math.PI*.45),E,.03);p.add(X(e,0,-.02,.03))}if(k.has(`chain`)){let e=new B(new Ya(.12,.012,6,20),um(`#fbbf24`));e.rotation.x=Math.PI/2.4,e.position.set(0,.4,.04),l.add(e)}let A=n=>{let i=X(new R,n*.21,.38,0);l.add(i);let s=pm(.055,.2,o);i.add(s);let c=X(new R,0,-.23,0);i.add(c),c.add(pm(.05,.19,a?o:t));let u=X(new R,0,-.23,0);return c.add(u),u.add(J(.06,t,.08,12)),a&&c.add(X(Y(.062,.062,.03,e.top===`jacket`?r:gm(o,-30),.05,12),0,-.2,0)),{shoulder:i,elbow:c,hand:u}},ee=A(1),te=A(-1),ne=e.bottom===`skirt`,re=(e.bottom,i),ie=n=>{let r=X(new R,n*.085,.02,0);c.add(r);let i=e.bottom===`shalwar`?.085:.07;r.add(pm(i,.24,ne?t:re));let a=X(new R,0,-.3,0);r.add(a),a.add(pm(e.bottom===`shalwar`?.08:.062,.22,e.bottom===`shorts`||ne?t:re));let o=X(new R,0,-.29,0);a.add(o);let s=e.shoeColor||`#ffffff`,l=J(.07,e.shoes===`slippers`?`#7c4f2c`:s,.08,14);return l.scale.set(.95,.55,1.6),l.position.set(0,-.015,.05),o.add(l),e.shoes===`sneakers`&&o.add(X(q(.11,.02,.2,gm(s,-60),0),0,-.045,.05)),{hip:r,knee:a,foot:o}},ae=ie(1),oe=ie(-1);{let e=X(J(.155,ne?o:re,.05,16),0,.02,0);e.scale.set(1,.6,.7),c.add(e)}if(ne){let e=fm(new Na(.3,.55,18,1,!0),re,.03);e.material.side=2,c.add(X(e,0,-.2,0))}let se=X(new R,0,-.07,.04);se.add(q(.2,.26,.04,`#2563eb`),X(q(.18,.24,.045,`#ffffff`,0),0,0,.003));let ce=X(q(.06,.12,.015,`#1f2937`),0,-.06,.03),le=X(Y(.035,.03,.08,`#f8fafc`),0,-.04,.05);te.hand.add(se,ce,le);let ue=new L;return{root:s,apply:(e,t,n)=>{s.position.set(e.x,e.y,e.z),s.rotation.set(0,e.yaw,e.roll),l.rotation.set(e.spine,0,e.spineZ),p.rotation.set(e.headX,e.headY,e.headZ),ee.shoulder.rotation.set(e.lsx,0,e.lsz),ee.elbow.rotation.set(e.lex,0,e.lez),te.shoulder.rotation.set(e.rsx,0,e.rsz),te.elbow.rotation.set(e.rex,0,e.rez),ae.hip.rotation.set(e.lhx,0,.03),ae.knee.rotation.set(e.lk,0,0),oe.hip.rotation.set(e.rhx,0,-.03),oe.knee.rotation.set(e.rk,0,0),ae.foot.rotation.x=-(e.lhx+e.lk)*.5,oe.foot.rotation.x=-(e.rhx+e.rk)*.5;let r=t.expr,i=t.look===`left`?-1:+(t.look===`right`);for(let e=0;e<2;e++){let n=h[e],a=t.blink||t.lie;n.white.visible=!a,n.pupil.visible=!a,n.lid.visible=a;let o=r===`surprised`?1.2:r===`suspicious`?.75:1;n.white.scale.set(o,1.15*(r===`suspicious`?.55:o),.55),n.pupil.position.set(i*.025,r===`sad`?-.02:0,.04),n.pupil.scale.setScalar(r===`surprised`?.75:1);let s=g[e],c=e===0?-1:1,l=r===`angry`?.45:r===`sad`?-.4:r===`suspicious`?e?.25:-.1:0;s.rotation.z=-c*l,s.position.y=.155+(r===`surprised`?.04:r===`angry`?-.02:0)}let a=t.mouth??(r===`happy`?`grin`:r===`sad`||r===`angry`?`frown`:r===`surprised`?`o`:r===`suspicious`?`flat`:`smile`);t.talk>.05&&(a=`talk`),y.visible=a===`smile`||a===`grin`,y.scale.set(a===`grin`?1.3:1,a===`grin`?1.3:.8,1),b.visible=a===`frown`,x.visible=a===`flat`,S.visible=a===`talk`||a===`o`||a===`talk-open`||a===`talk-half`;let o=a===`talk`?t.talk:a===`o`?.8:a===`talk-open`?1:.5;S.scale.set(a===`o`?.6:1,.25+o*.75,.35),w.forEach((e,r)=>{e.visible=t.tears;let i=(n+r*9)%18/18;e.position.y=-.03-i*.18}),T.visible=t.sweat,T.position.y=.13-n%30/30*.08,se.visible=t.hold===`book`,ce.visible=t.hold===`phone`,le.visible=t.hold===`cup`},headWorld:e=>p.getWorldPosition(e),handWorld:(e,t)=>(e===`l`?ee.hand:te.hand).getWorldPosition(t??ue),hand:e=>e===`l`?ee.hand:te.hand}}function km(e){let t=Em[e.pose]??Em.idle,[n,r]=[[...t[0]],[...t[1]]],i=0,a=0,o=0,s=0,c=0,l=0,u=0,d=0,f=0,p=e.n;if(i+=Math.sin(p/22+e.seed)*.015,c+=Math.sin(p/37+e.seed)*.03,e.expr===`sad`&&(i+=.16,o+=.18),e.expr===`angry`&&(i+=.1,o+=.05),e.expr===`surprised`&&(i-=.1,o-=.08),e.expr===`happy`&&(c+=Math.sin(p/9)*.05),e.expr===`suspicious`&&(c+=.12,o+=.05),(e.pose===`facepalm`||e.pose===`cover`)&&(o+=.25),e.pose===`think`&&(c+=.15,o-=.05),(e.pose===`read`||e.pose===`page`)&&(o+=.25),e.pose===`wave`&&(r[1]+=Math.sin(p/2.5)*.25,r[2]+=Math.sin(p/2.5)*.3),e.pose===`shrug`&&(a+=Math.sin(p/6)*.02),e.pose===`page`&&(r[1]+=Math.sin(p/4)*.3),e.talk>0&&(o+=-.05+e.talk*.08,s+=Math.sin(p/5+e.seed)*.06),(e.pose===`idle`||e.pose===`talk`)&&!e.walking&&e.stance!==`lie`&&e.energy>.25){let t=Math.floor(p/36),i=Math.floor(Math.abs(Math.sin(t*12.9898+e.seed*78.233))*43758.5453)%5,a=Math.min(1,(e.energy-.25)*2.5),o=Math.sin(p/4.2)*.15*e.talk,s=(e,t)=>e.map((e,n)=>e+(t[n]-e)*a);i===0?r=s(r,[-1+o,-.55,-.55,0]):i===1?n=s(n,[-1-o,.55,-.55,0]):i===2?(n=s(n,[-.75+o,.45,-1.1,0]),r=s(r,[-.75-o,-.45,-1.1,0])):i===3&&(r=s(r,[-.55,.25,-1.9,0]))}if(e.stance===`sit`)l=d=-1.5,u=f=1.5,i-=.05;else if(e.walking){let t=e.walkPhase;l=Math.sin(t)*.55,d=Math.sin(t+Math.PI)*.55,u=Math.max(0,Math.sin(t+1.6))*.95,f=Math.max(0,Math.sin(t+Math.PI+1.6))*.95,(e.pose===`idle`||e.pose===`talk`)&&(n[0]=Math.sin(t+Math.PI)*.5,r[0]=Math.sin(t)*.5,n[2]=r[2]=-.35),i+=.06}else{let t=Math.sin(p/50+e.seed)*.03;l=t,d=-t}return{spine:i,spineZ:a,headX:o,headY:s,headZ:c,lsx:n[0],lsz:n[1],lex:n[2],lez:n[3],rsx:r[0],rsz:r[1],rex:r[2],rez:r[3],lhx:l,lk:u,rhx:d,rk:f}}function Am(e,t,n,r,i=.05){let a=J(1,r,i,24);return a.scale.set(e,t,n),a}function jm(e,t,n,r){let i=[];for(let a of[-1,1]){let o=X(new R,n,r,a*t*.42);e.add(o);let s=J(t*.3,`#ffffff`,.08,14);s.scale.set(.6,1.1,1),o.add(s);let c=X(J(t*.15,om,0,10),t*.14,0,a*t*.08);o.add(c);let l=X(q(t*.08,t*.06,t*.55,om,0),t*.12,0,0);l.visible=!1,o.add(l);let u=X(q(t*.08,t*.07,t*.45,om,0),t*.1,t*.38,0);o.add(u),i.push({white:s,pupil:c,lid:l,brow:u})}return e=>{for(let t of i)t.white.visible=t.pupil.visible=!e.blink,t.lid.visible=e.blink,t.white.scale.y=e.expr===`surprised`?1.35:1.1,t.brow.visible=e.expr===`angry`||e.expr===`sad`||e.expr===`suspicious`,t.brow.rotation.x=e.expr===`angry`?.5:e.expr===`sad`?-.5:0}}function Mm(e){let t=e.h*Sm,n=new R,r=new R;n.add(r);let i=e.color,a=gm(e.color,-35),o=e.belly??gm(e.color,40),s=[],c=[],l=new R,u=null,d=null,f=()=>{},p=[],m=[],h=[],g=(t,n,a,o,s)=>{let l=r,u=s===`long`?4:3,d=a/u;for(let e=0;e<u;e++){let r=new R;e===0?(r.position.set(t,n,0),r.rotation.z=s===`long`?-Math.PI/2+.12:-Math.PI/2-.65):(r.position.set(0,-d,0),r.rotation.z=s===`curly`?-.7:s===`long`?.05:-.25),r.add(pm(Math.max(.012,o*(1-e*.2)),d*.9,i)),l.add(r),c.push(r),l=r}s===`fluffy`&&l.add(X(J(o*2.4,e.ears===`mane`?`#b45309`:gm(i,25),.06,12),0,-d,0))};if(e.form===`quad`){let n=e.legs*t,c=t*(e.name===`giraffe`?.2:.34),u=e.len*t*.55,d=n+c/2,f=Am(u/2,c/2,c*.45,i);if(f.position.y=d,r.add(f),e.belly){let e=Am(u*.38,c*.25,c*.4,o,0);e.position.set(0,d-c*.2,0),r.add(e)}if(e.pattern===`stripes`)for(let t=-3;t<=3;t++){let n=q(u*.035,c*.9,c*.92,e.patternColor??1776411,0);n.position.set(t*u*.12,d+c*.05,0),n.scale.y=Math.cos(t/4*1.2)*.9,r.add(n)}else if(e.pattern===`spots`)for(let t=0;t<10;t++){let n=t*2.4,i=Math.sin(n*1.7)*u*.38,a=Math.cos(n)>0?1:-1,o=Am(c*.12,c*.1,c*.03,e.patternColor??1776411,0);o.position.set(i,d+Math.sin(n)*c*.2,a*c*.43),r.add(o)}for(let[e,o,l]of[[u*.32,1,0],[u*.32,-1,Math.PI],[-u*.32,1,Math.PI],[-u*.32,-1,0]]){let u=X(new R,e,d-c*.1,o*c*.26);r.add(u),u.add(pm(Math.max(.02,t*.045),n-c*.2,o>0?i:a)),u.add(X(Am(t*.055,t*.03,t*.045,gm(i,-15),.08),t*.01,-(n-c*.1),0)),s.push({pivot:u,phase:l})}let p=e.head*t,m=u*.5+e.neck*t*.35+(e.snout===`croc`?-p*.1:p*.25),h=d+c*.25+e.neck*t+(e.snout===`croc`?-c*.2:0);if(e.neck>.02){let e=u*.36,n=d+c*.1,a=X(new R,e,n,0),o=m-e,s=h-n;a.rotation.z=Math.atan2(o,-s),a.add(pm(Math.max(t*.06,p*.5),Math.hypot(o,s),i)),r.add(a)}l=X(new R,m,h,0),r.add(l),g(-u*.48,d+c*.1,e.tail===`long`?e.snout===`croc`?t*1.4:t*.6:t*.38,e.tail===`long`?e.snout===`croc`?t*.12:t*.04:t*(e.tail===`fluffy`?.035:.025),e.tail)}else if(e.form===`biped`){let n=e.legs*t,c=t*.45,u=t*.3,d=n+c/2;if(r.add(X(Am(u*.55,c/2,u*.5,i),0,d,0)),e.belly&&r.add(X(Am(u*.4,c*.34,u*.3,o,0),u*.22,d,0)),e.name===`panda`)for(let e of[-1,1])r.add(X(Am(u*.18,c*.3,u*.2,om,.03),0,d+c*.05,e*u*.42));for(let[o,l]of[[1,0],[-1,Math.PI]]){let f=X(new R,0,n+c*.08,o*u*.22);r.add(f),f.add(pm(t*.055,n*.9,o>0?i:a)),f.add(X(Am(t*.07,t*.035,t*.05,gm(i,-20),.08),t*.03,-n,0)),s.push({pivot:f,phase:l});let m=X(new R,0,d+c*.3,o*u*.52);r.add(m),m.add(pm(t*.045,t*(e.name===`penguin`?.16:.3),e.name===`panda`?om:i)),m.userData.arm=l,p.push(m)}let f=e.head*t;l=X(new R,u*.1,d+c/2+f*.7,0),r.add(l),e.tail!==`none`&&g(-u*.5,n+c*.2,t*.45,t*.03,e.tail)}else if(e.form===`bird`){let n=e.legs*t,a=t*.32,c=n+a;r.add(X(Am(a*1.05,a,a*.85,i),0,c,0)),e.belly&&r.add(X(Am(a*.6,a*.65,a*.6,o,0),a*.3,c-a*.15,0));for(let o of[-1,1]){let l=X(new R,-a*.1,c+a*.2,o*a*.75);r.add(l);let u=Am(a*.65,a*.12,a*.35,gm(i,-30));u.position.set(-a*.2,0,o*a*.25),l.add(u),l.userData.side=o,p.push(l);let d=X(new R,0,n+a*.1,o*a*.25);r.add(d),d.add(pm(t*.015,n,e.beak??`#f59e0b`,.01)),s.push({pivot:d,phase:o>0?0:Math.PI})}r.add(X(Am(a*.5,a*.12,a*.35,gm(i,-25)),-a*1.1,c+a*.1,0)),l=X(new R,a*.6,c+a*.95,0),r.add(l)}else if(e.form===`snake`){m=[];for(let n=0;n<16;n++){let a=J(t*.22*(1-n*.03),n%3==0&&e.patternColor?e.patternColor:i,.06,12);r.add(a),m.push(a)}l=new R,r.add(l)}else{let n=e.len*t*.5;r.add(X(Am(n,t*.45,t*.32,i),0,t*1.5,0)),e.belly&&r.add(X(Am(n*.7,t*.2,t*.3,o,0),0,t*1.35,0));let a=X(new R,-n*.9,t*1.5,0);r.add(a);let s=mm(t*.45,n*.6,gm(i,-20),.05,4);if(s.rotation.z=Math.PI/2,s.scale.set(1,1,.25),s.position.x=-n*.25,a.add(s),c.push(a),e.name!==`fish`){let e=mm(t*.25,t*.5,i,.05,4);e.scale.z=.3,e.position.set(-n*.1,t*1.95,0),r.add(e)}l=X(new R,n*.55,t*1.5,0),r.add(l)}let _=e.form===`snake`?t*.32:e.form===`fish`?t*.4:e.head*t;e.form!==`fish`&&(e.ears===`mane`&&l.add(X(Am(_*1.55,_*1.55,_*1.2,`#b45309`),-_*.2,0,0)),l.add(Am(_,_*.95,_*.9,i)));let v=o;if(e.snout===`short`||e.snout===`pig`){let t=Am(_*.35,_*.28,_*.42,e.snout===`pig`?gm(i,-20):v);t.position.set(_*.85,-_*.25,0),l.add(t),l.add(X(Am(_*.08,_*.07,_*.12,om,0),_*1.18,-_*.18,0)),d=X(Am(_*.1,_*.12,_*.22,`#7f1d1d`,0),_*1.05,-_*.48,0)}else if(e.snout===`long`){let e=Am(_*.6,_*.3,_*.38,v);e.position.set(_*1.1,-_*.25,0),l.add(e),l.add(X(Am(_*.1,_*.09,_*.12,om,0),_*1.7,-_*.12,0)),d=X(Am(_*.25,_*.1,_*.22,`#7f1d1d`,0),_*1.3,-_*.5,0)}else if(e.snout===`trunk`){let e=l,t=-_*.1,n=_*.75;h=[];for(let r=0;r<4;r++){let a=X(new R,n,t,0);e.add(a),a.add(pm(_*(.26-r*.04),_*.38,i)),h.push(a),e=a,n=0,t=-_*.4}d=X(Am(_*.12,_*.12,_*.25,`#7f1d1d`,0),_*.55,-_*.6,0)}else if(e.snout===`beak`||e.snout===`duck`){let t=mm(_*.32,_*(e.snout===`duck`?1:.75),e.beak??`#f59e0b`,.06,10);t.rotation.z=-Math.PI/2,t.scale.z=e.snout===`duck`?.55:1,t.position.set(_*1.15,0,0),l.add(t);let n=new R;n.position.set(_*.8,-_*.12,0);let r=mm(_*.22,_*.6,gm(e.beak??`#f59e0b`,-20),.06,10);r.rotation.z=-Math.PI/2,r.position.x=_*.3,n.add(r),l.add(n),u=n}else if(e.snout===`croc`){let e=q(_*2.2,_*.45,_*.9,i,.03);e.position.set(_*1.3,_*.05,0),l.add(e);for(let e=0;e<6;e++){let t=X(mm(_*.06,_*.16,`#ffffff`,0,4),_*(.5+e*.32),-_*.24,_*.4);t.rotation.x=Math.PI,l.add(t)}let t=new R;t.position.set(_*.25,-_*.2,0);let n=q(_*2.1,_*.3,_*.85,o,.03);n.position.set(_*1.05,-_*.1,0),t.add(n),l.add(t),u=t}else d=X(Am(_*.12,_*.12,_*.3,`#7f1d1d`,0),_*.85,-_*.4,0);d&&(l.add(d),d.userData.base=d.scale.y);let y=gm(i,-25);for(let t of[-1,1])if(e.ears===`pointy`){let e=mm(_*.25,_*.55,i,.06,4);e.position.set(-_*.05,_*.85,t*_*.5),e.rotation.x=t*.25,l.add(e)}else if(e.ears===`round`)l.add(X(Am(_*.12,_*.3,_*.3,y),-_*.1,_*.75,t*_*.6));else if(e.ears===`long`){let e=Am(_*.15,_*.65,_*.2,i);e.position.set(-_*.15,_*1.35,t*_*.35),e.rotation.x=t*.2,l.add(e)}else if(e.ears===`floppy`){let n=e.snout===`trunk`?1.8:.9,r=Am(_*.12*n,_*.55*n,_*.4*n,y);r.position.set(-_*.15,-_*.05,t*_*(.85+n*.1)),l.add(r)}else if(e.ears===`horns`||e.ears===`antlers`){let n=mm(_*.1,_*(e.ears===`antlers`?1:.55),`#f5f5f4`,.08,8);if(n.position.set(-_*.1,_*1.05,t*_*.35),n.rotation.x=t*.4,l.add(n),e.ears===`antlers`){let e=mm(_*.07,_*.5,`#f5f5f4`,.08,8);e.position.set(_*.15,_*1.25,t*_*.55),e.rotation.set(t*.5,0,-.6),l.add(e)}}f=e.form===`fish`?jm(l,_,_*.4,_*.1):jm(l,_,_*.55,_*.25);let b=e.form===`fish`?t*2:t,x=n=>{let i=n.walking?n.n*.42:0;for(let e of s)e.pivot.rotation.z=Math.sin(i+e.phase)*(n.walking?.5:0);c.forEach((t,r)=>{t.rotation.y=Math.sin(n.n/5-r*.6)*(e.form===`fish`?.5:.35)}),l.rotation.z=Math.sin(n.n/10)*.05+n.talk*.15,r.position.y=n.walking?Math.abs(Math.sin(i))*t*.03:Math.sin(n.n/18)*t*.01,u&&(u.rotation.z=-Math.max(n.talk,n.expr===`angry`?.3:0)*.6),d&&(d.scale.y=d.userData.base*(.4+n.talk*2.2)),h.forEach((e,t)=>{e.rotation.z=Math.sin(n.n/11+t*.5)*.25+n.talk*.3*(t?.5:1)});for(let e of p)e.userData.side?e.rotation.x=e.userData.side*(n.flying?Math.sin(n.n*.9)*.9:n.talk*.4+Math.sin(n.n/12)*.05):e.rotation.z=n.walking?Math.sin(i+e.userData.arm)*.6:Math.sin(n.n/14)*.1+n.talk*.5;if(e.form===`bird`&&(r.position.y+=n.flying?t*1.6+Math.sin(n.n/5)*t*.2:0),m.length){let r=e.len*t;m.forEach((e,i)=>{let a=i/m.length;e.position.set(-r/2+a*r*.85,t*.25,Math.sin(a*9-n.n*.25)*t*.6*(1-a*.4))});let i=m[m.length-1].position;l.position.set(i.x+t*.35,t*.9+Math.sin(n.n/8)*t*.1,i.z)}f(n)};return x({n:0,walking:!1,talk:0,blink:!1,expr:`normal`}),{root:n,animate:x,height:b}}function Nm(e,t){let[n,r]=Ju[e],i=n*Sm,a=r*Sm,o=Math.min(a*.85,Sm*1.2),s=new R,c=new R;s.add(c);let l=[],u=(e,t,n)=>{let r=X(new R,e,t,n),i=Y(t,t,t*.5,`#1f2937`,.04,20);i.rotation.x=Math.PI/2,r.add(i);let a=Y(t*.5,t*.5,t*.52,`#d1d5db`,.04,12);a.rotation.x=Math.PI/2,r.add(a);let o=q(t*.9,t*.12,t*.55,`#6b7280`,0);r.add(o),s.add(r),l.push(r)},d=`#bfe3ff`;if(e===`bike`){let e=a*.42;for(let t of[-i*.32,i*.32]){let n=X(new R,t,e,0),r=new B(new Ya(e,e*.08,8,24),um(`#1f2937`));n.add(r,q(e*1.8,e*.05,e*.05,`#9ca3af`,0)),s.add(n),l.push(n)}let n=(n,r,i,a)=>{let o=Math.hypot(i-n,a-r),s=Y(e*.07,e*.07,o,t,.08,8);s.position.set((n+i)/2,(r+a)/2,0),s.rotation.z=Math.atan2(n-i,a-r),c.add(s)};n(-i*.32,e,0,e*1.9),n(0,e*1.9,i*.28,e*1.9),n(i*.32,e,i*.25,e*2.3),n(0,e,0,e*1.9),n(-i*.32,e,0,e),c.add(X(q(e*.5,e*.12,e*.3,om),-i*.02,e*2,0))}else{let n=a*.17,r=e===`taxi`?`#facc15`:t;if(e===`car`||e===`taxi`||e===`jeep`){c.add(X(q(i,a*.42,o,r),0,n+a*.25,0)),c.add(X(q(i*.55,a*.4,o*.9,r),-i*.05,n+a*.62,0));for(let e of[-1,1])c.add(X(q(i*.48,a*.28,.02,d,0),-i*.05,n+a*.62,e*o*.46));c.add(X(q(.02,a*.3,o*.8,d,0),i*.225,n+a*.62,0)),e===`taxi`&&c.add(X(q(i*.15,a*.1,o*.3,om),-i*.05,n+a*.86,0))}else if(e===`boat`){let e=q(i,a*.45,o,r);e.position.y=a*.22,c.add(e),c.add(X(q(i*.3,a*.5,o*.7,`#ffffff`),-i*.1,a*.7,0))}else{let t=q(e===`truck`?i*.68:i,a-n,o,r);t.position.set(e===`truck`?-i*.16:0,n+(a-n)/2,0),c.add(t),e===`truck`&&c.add(X(q(i*.3,a*.65,o,gm(r,-30)),i*.35,n+a*.3,0));let s=e===`bus`?5:e===`train`?7:+(e===`rickshaw`);for(let e=0;e<s;e++)for(let t of[-1,1])c.add(X(q(i*.8/s-.08,a*.32,.03,d,0),-i*.42+(e+.5)*(i*.8/s),n+a*.62,t*(o/2+.01)));if(e===`bus`||e===`train`){c.add(X(q(.03,a*.4,o*.85,d,0),i/2+.01,n+a*.6,0));for(let e of[-1,1])c.add(X(q(i,a*.06,.03,gm(r,-45),0),0,n+a*.38,e*(o/2+.01)))}}for(let e of[-1,1])c.add(X(J(a*.05,`#fde047`,.08,8),i/2,n+a*.25,e*o*.35));let s=e===`train`?[-.38,-.2,.2,.38]:e===`boat`?[]:[-.32,.3];for(let e of s)for(let t of[-1,1])u(i*e,n,t*o*.5)}return{root:s,animate:(e,t)=>{for(let n of l)n.rotation.z=t?-e*.45:0;c.position.y=t?Math.abs(Math.sin(e*.7))*.015:0},length:i}}var Pm=[`#f6e7d2`,`#e3f0e6`,`#e6eefb`,`#fbe3e8`,`#f3ead0`,`#ece4f7`,`#fff2cc`,`#e0f2f1`],Fm=[`#c99a6b`,`#b98b5e`,`#a8744f`,`#c4ab84`,`#9aa7b4`,`#d6c2a3`],Im=[`#e07a5f`,`#3d84c6`,`#81b29a`,`#f2cc8f`,`#9b8bd4`,`#e76f51`,`#2a9d8f`,`#c0392b`],Lm=[`#6fbf5a`,`#5fae55`,`#7cc36b`,`#4caf50`,`#8bcf74`];function Rm(e,t,n=120){let r=new B(new Ka(n,n),um(t));return r.rotation.x=-Math.PI/2,r.receiveShadow=!0,e.g.add(r),r}function zm(e,t,n){let r=new Ja(140,32,16),i=[],a=new z(t),o=new z(n),s=new z,c=r.getAttribute(`position`);for(let e=0;e<c.count;e++){let t=Math.max(0,Math.min(1,c.getY(e)/80));s.copy(o).lerp(a,t),i.push(s.r,s.g,s.b)}r.setAttribute(`color`,new Rr(i,3));let l=new B(r,new Oi({vertexColors:!0,side:1,fog:!1}));e.g.add(l)}function Bm(e,t,n){let r=new B(new Ja(n?4:6,20,16),new Oi({color:t,fog:!1}));if(r.position.set((e.r()-.5)*80,45,-110),e.g.add(r),n){let t=[];for(let n=0;n<400;n++){let n=e.r()*Math.PI*2,r=.15+e.r()*1.2;t.push(Math.cos(n)*Math.cos(r)*130,Math.sin(r)*130,Math.sin(n)*Math.cos(r)*130)}let n=new Xr;n.setAttribute(`position`,new Rr(t,3)),e.g.add(new Sa(n,new _a({color:16777215,size:.8,fog:!1})))}}function Vm(e,t){for(let n=0;n<t;n++){let t=new R;for(let n=0;n<5;n++)t.add(X(J(1.6+e.r()*1.4,`#ffffff`,0,12),n*1.8-3.6,Math.sin(n)*.8,e.r()));t.position.set((e.r()-.5)*120,22+e.r()*14,-60-e.r()*40),e.g.add(t);let n=.01+e.r()*.02,r=t.position.x;e.updates.push(e=>{t.position.x=(r+e*n+70)%140-70})}}function Hm(e,t,n,r=1,i){let a=new R;a.add(X(Y(.18*r,.26*r,2.2*r,`#8b5a2b`),0,1.1*r,0));let o=i??Z(e.r,Lm);return a.add(X(J(1.25*r,o,.04,14),0,2.9*r,0)),a.add(X(J(.9*r,gm(o,15),.05,12),.8*r,2.4*r,.2)),a.add(X(J(.9*r,gm(o,-15),.05,12),-.8*r,2.5*r,-.2)),a.position.set(t,0,n),a.rotation.y=e.r()*6,e.g.add(a),a}function Um(e,t,n,r=1,i=!1){let a=new R;a.add(X(Y(.15*r,.2*r,.8*r,`#7c4f2c`),0,.4*r,0));for(let e=0;e<3;e++)a.add(X(mm((1.3-e*.3)*r,1.5*r,`#2f7d4a`,.03,10),0,(1.3+e*.85)*r,0)),i&&a.add(X(mm((.55-e*.12)*r,.6*r,`#ffffff`,0,10),0,(1.8+e*.85)*r,0));a.position.set(t,0,n),e.g.add(a)}function Wm(e,t,n,r=1){let i=new R,a=0,o=0;for(let e=0;e<6;e++)i.add(X(Y(.16*r,.2*r,.6*r,`#a0704a`),o,a+.3*r,0)),a+=.55*r,o+=.06*r;for(let e=0;e<7;e++){let t=fm(new Ja(1,12,8),`#3f9d4a`,.04);t.scale.set(1.5*r,.12*r,.4*r);let n=e/7*Math.PI*2;t.position.set(o+Math.cos(n)*1.1*r,a+.1*r-.2*r,Math.sin(n)*1.1*r),t.rotation.set(0,-n,-.35),i.add(t)}i.add(X(J(.18*r,`#7c4f2c`,.06,8),o+.15*r,a-.15*r,.1)),i.position.set(t,0,n),e.g.add(i)}function Gm(e,t,n,r=1){let i=Z(e.r,Lm);for(let a=0;a<3;a++)e.g.add(X(J((.45+e.r()*.2)*r,i,.05,12),t+(a-1)*.45*r,.35*r,n+e.r()*.2))}function Km(e,t,n,r=1,i=`#9ca3af`){let a=fm(new Fa(.6*r,0),i,.04);a.scale.set(1.3,.7,1),a.position.set(t,.3*r,n),a.rotation.y=e.r()*6,e.g.add(a)}function qm(e,t,n,r){for(let i=0;i<t;i++){let t=(e.r()-.5)*e.span*2,i=n+e.r()*(r-n);e.g.add(X(Y(.015,.015,.3,`#4d7c0f`,0),t,.15,i)),e.g.add(X(J(.07,Z(e.r,[`#ef4444`,`#f59e0b`,`#ec4899`,`#a855f7`,`#ffffff`]),.1,8),t,.32,i))}}function Jm(e,t,n){e.g.add(X(Y(.06,.08,3.6,`#374151`),t,1.8,n)),e.g.add(X(J(.25,`#fde68a`,.06,12),t,3.7,n))}function Ym(e,t,n,r,i,a,o){let s=new R;s.add(X(q(r,i,3,a),0,i/2,0));let c=e.r()<.5;for(let e=1.6;e<i-.8;e+=1.4)for(let t of[-r*.28,r*.28])s.add(X(q(.8,.8,.05,c?`#fde68a`:`#cfe8ff`,.02),t,e+.6,1.52));if(s.add(X(q(.9,1.6,.05,`#8b5a2b`),0,.8,1.52)),o){let t=new B(new Ka(r*.8,.5),new Oi({map:_m(o,`#ffffff`,`#1f2937`)}));t.position.set(0,2.05,1.6),s.add(t);let n=q(r*.9,.12,.8,Z(e.r,[`#e74c3c`,`#2a9d8f`,`#f59e0b`,`#3b82f6`]));n.position.set(0,1.75,1.9),n.rotation.x=.35,s.add(n)}s.position.set(t,0,n),e.g.add(s)}function Xm(e,t,n){let r=3+e.r(),i=2.4+e.r()*.8,a=Z(e.r,[`#f4c27a`,`#e9967a`,`#a8c8e8`,`#c9a7e0`,`#9fd3b0`,`#f0b6c8`]),o=new R;o.add(X(q(r,i,3,a),0,i/2,0));let s=fm(new Na(r*.78,1.4,4),Z(e.r,[`#b45309`,`#7c2d12`,`#475569`,`#991b1b`]),.03);s.position.y=i+.7,s.rotation.y=Math.PI/4,s.scale.z=.75,o.add(s),o.add(X(q(.8,1.4,.05,`#8b5a2b`),0,.7,1.52));for(let e of[-r*.3,r*.3])o.add(X(q(.7,.6,.05,`#cfe8ff`),e,i*.62,1.52));o.position.set(t,0,n),e.g.add(o)}function Zm(e,t,n=`#f5f5f4`){for(let r=-e.span*1.5;r<e.span*1.5;r+=.45)e.g.add(X(q(.12,.9,.06,n,.04),r,.45,t));for(let r of[.35,.7])e.g.add(X(q(e.span*3,.1,.05,n,.02),0,r,t+.05))}function Qm(e,t,n){for(let r=0;r<7;r++){let i=14+e.r()*14,a=12+e.r()*8,o=(r-3)*16+(e.r()-.5)*8;e.g.add(X(mm(a,i,t,0,7),o,i/2,-60-e.r()*15)),n&&e.g.add(X(mm(a*.32,i*.32,`#ffffff`,0,7),o,i*.84+.1,-59.9))}}function $m(e,t,n){let r=new B(new Ka(200,60,40,10),um(n));r.rotation.x=-Math.PI/2,r.position.set(0,.05,t-30),e.g.add(r);let i=r.geometry.getAttribute(`position`);e.updates.push(e=>{for(let t=0;t<i.count;t++)i.setZ(t,Math.sin(i.getX(t)*.4+e*.08)*.12+Math.cos(i.getY(t)*.5+e*.05)*.1);i.needsUpdate=!0})}function eh(e,t,n,r=1){let i=new R;i.add(X(Y(.25*r,.28*r,2.4*r,`#4d9e55`),0,1.2*r,0));let a=(e,t)=>{{let n=X(Y(.16*r,.16*r,.6*r,`#4d9e55`),e*.45*r,t,0);n.rotation.z=Math.PI/2,i.add(n)}i.add(X(Y(.16*r,.16*r,.8*r,`#4d9e55`),e*.7*r,t+.35*r,0))};a(1,1.1*r),a(-1,1.5*r),i.position.set(t,0,n),e.g.add(i)}function th(e,t,n,r={}){let i=e.span*2.6,a=r.depth??7,o=r.height??9,s=new B(new Ka(i,a+6),um(n));s.rotation.x=-Math.PI/2,s.position.z=-a/2+3,s.receiveShadow=!0,e.g.add(s);for(let t=-a+.5;t<5;t+=.8)e.g.add(X(q(i,.005,.02,gm(n,-18),0),0,.003,t));let c=new B(new Ka(i,o),um(t));c.position.set(0,o/2,-a/2-.5),c.receiveShadow=!0,e.g.add(c);for(let n of[-1,1]){let r=new B(new Ka(a+4,o),um(gm(t,-12)));r.position.set(n*i/2,o/2,-.5),r.rotation.y=-n*Math.PI/2,e.g.add(r)}return e.g.add(X(q(i,.18,.06,`#ffffff`,.02),0,.09,-a/2-.47)),{backZ:-a/2-.5,h:o}}function nh(e,t,n,r,i=1.6,a=1.2,o=!0){e.g.add(X(q(i+.16,a+.16,.06,`#ffffff`),t,n,r+.02));let s=new B(new Ka(i,a),new Oi({color:`#cfe8ff`}));if(s.position.set(t,n,r+.06),e.g.add(s),e.g.add(X(q(.05,a,.04,`#ffffff`,0),t,n,r+.08),X(q(i,.05,.04,`#ffffff`,0),t,n,r+.08)),o){let o=Z(e.r,Im);for(let s of[-1,1])e.g.add(X(q(.45,a+.5,.08,o,.03),t+s*(i/2+.1),n-.1,r+.12))}}function rh(e,t,n,r){let i=r??Z(e.r,[`#a0704a`,`#8b5e3c`,`#5b84b1`,`#b15b5b`,`#2a9d8f`]);e.g.add(X(q(1.2,2.3,.08,`#e7d3b5`),t,1.15,n+.02)),e.g.add(X(q(1,2.15,.1,i),t,1.08,n+.06)),e.g.add(X(J(.06,`#fbbf24`,.1,8),t+.38,1.05,n+.14))}function ih(e,t,n,r){let i=.7+e.r()*.4,a=.9+e.r()*.3;e.g.add(X(q(i+.1,a+.1,.04,`#d9a066`),t,n,r+.02));let o=Z(e.r,Im),s=vm(128,160,e=>{e.fillStyle=o,e.fillRect(0,0,128,160),e.fillStyle=`#ffffff`,e.beginPath(),e.arc(64,60,30,0,Math.PI*2),e.fill(),e.fillRect(24,110,80,10),e.fillRect(34,128,60,8)}),c=new B(new Ka(i,a),new Oi({map:s}));c.position.set(t,n,r+.05),e.g.add(c)}function ah(e,t,n,r){let i=Y(.3,.3,.06,`#ffffff`,.06,24);i.rotation.x=Math.PI/2,i.position.set(t,n,r+.04),e.g.add(i);let a=q(.03,.22,.02,om,0);a.geometry.translate(0,.11,0),a.position.set(t,n,r+.09),e.g.add(a),e.updates.push(e=>{a.rotation.z=-e*.02})}function oh(e,t,n){let r=new R;r.add(X(q(1.4,2.4,.45,`#a0704a`),0,1.2,0));for(let t=0;t<4;t++){let n=.35+t*.55;r.add(X(q(1.3,.05,.42,`#7c4f2c`,0),0,n-.05,.03));for(let t=-.58;t<.55;t+=.12){let i=.3+e.r()*.15;r.add(X(q(.1,i,.3,Z(e.r,Im),.03),t,n+i/2,.06))}}r.position.set(t,0,n),e.g.add(r)}function sh(e,t,n){e.g.add(X(Y(.22,.17,.4,`#c8693c`),t,.2,n));for(let r=0;r<6;r++){let i=mm(.08,.7,`#5fae55`,.06,6);i.position.set(t+Math.cos(r)*.1,.7,n+Math.sin(r)*.1),i.rotation.set(Math.sin(r)*.5,0,Math.cos(r)*.5),e.g.add(i)}}function ch(e,t=.3){let n=Y(e.span*.55,e.span*.55,.02,Z(e.r,Im),0,32);n.scale.z=.35,n.position.set(0,.01,t),e.g.add(n)}function lh(e,t,n){e.g.add(X(q(1.6,.6,.5,`#8b5a2b`),t,.3,n)),e.g.add(X(q(1.5,.9,.08,`#111827`),t,1.2,n));let r=new B(new Ka(1.35,.75),new Oi({color:Z(e.r,[`#60a5fa`,`#34d399`,`#fbbf24`])}));r.position.set(t,1.2,n+.05),e.g.add(r),e.updates.push(e=>{r.material.color.setHSL(e/90%1,.6,.6)})}function uh(e,t,n){e.g.add(X(Y(.04,.04,1.9,`#4b5563`),t,.95,n)),e.g.add(X(Y(.18,.32,.4,Z(e.r,[`#fde68a`,`#fecaca`,`#bfdbfe`])),t,2,n));let r=new qo(16769704,4,6,1.5);r.position.set(t,1.8,n+.2),e.g.add(r)}function dh(e,t,n,r,i,a,o,s,c){e.g.add(X(q(i+.15,a+.15,.06,`#8b5a2b`),t,n,r+.02));let l=vm(512,Math.round(512*a/i),e=>{e.fillStyle=o,e.fillRect(0,0,512,512),e.strokeStyle=c,e.fillStyle=c,e.lineWidth=6,e.lineCap=`round`,e.font=`bold 54px Arial`,e.fillText(s,40,80);for(let t=0;t<3;t++)e.beginPath(),e.moveTo(40,130+t*50),e.lineTo(180+Math.random()*250,130+t*50),e.stroke()}),u=new B(new Ka(i,a),new Oi({map:l}));u.position.set(t,n,r+.06),e.g.add(u)}function fh(e,t,n,r,i,a){let o=.35*i.length+.6,s=new B(new Ka(o,.6),new Oi({map:_m(i,a,`#ffffff`,512,96,`bold 60px Arial`)}));s.position.set(t,n,r+.06),e.g.add(s,X(q(o+.08,.68,.04,om,0),t,n,r+.02))}function ph(e,t,n,r,i){e.g.add(X(q(n-t,1,.7,i),(t+n)/2,.5,r)),e.g.add(X(q(n-t+.1,.08,.8,gm(i,-30)),(t+n)/2,1.04,r))}function mh(e,t,n){let r=Z(e.r,[`#e5e7eb`,`#fca5a5`,`#bfdbfe`,`#d1fae5`]);e.g.add(X(q(.9,2.2,.7,r),t,1.1,n)),e.g.add(X(q(.92,.02,.72,om,0),t,1.45,n)),e.g.add(X(q(.05,.4,.05,`#9ca3af`,0),t+.32,1.75,n+.37),X(q(.05,.4,.05,`#9ca3af`,0),t+.32,1.1,n+.37))}function hh(e,t,n){e.g.add(X(q(1,1,.7,`#d1d5db`),t,.5,n)),e.g.add(X(q(.8,.5,.02,`#1f2937`,0),t,.45,n+.36)),e.g.add(X(Y(.25,.22,.3,`#9ca3af`),t-.2,1.15,n));let r=[];for(let t=0;t<3;t++){let t=new B(new Ja(.08,8,6),um(`#ffffff`,{transparent:!0,opacity:.5}));e.g.add(t),r.push(t)}e.updates.push(e=>r.forEach((r,i)=>{let a=(e+i*20)%60/60;r.position.set(t-.2+Math.sin(a*6)*.05,1.35+a*.8,n),r.scale.setScalar(.6+a*1.5)}))}function gh(e,t,n,r){let i=Z(e.r,[`#60a5fa`,`#f87171`,`#34d399`,`#fbbf24`,`#a78bfa`]);for(let a=t;a<n;a+=.62){e.g.add(X(q(.58,2.1,.5,i),a,1.05,r));for(let t=0;t<3;t++)e.g.add(X(q(.3,.025,.02,om,0),a,1.8-t*.07,r+.26))}}function _h(e,t,n,r){for(let i=0;i<3;i++){let a=.5+i*.7;e.g.add(X(q(n-t,.06,.5,`#a0704a`),(t+n)/2,a,r));for(let i=t+.2;i<n-.2;i+=.3+e.r()*.15){let t=.25+e.r()*.2;e.g.add(X(q(.22,t,.25,Z(e.r,[`#e74c3c`,`#3b82f6`,`#22c55e`,`#eab308`,`#a855f7`,`#f97316`]),.04),i,a+t/2+.03,r))}}}function vh(e,t){for(let n=-3;n<=3;n++){let r=n*e.span*.32;e.g.add(X(q(1,.06,.6,`#c08552`),r,.75,t));for(let n of[-.42,.42])e.g.add(X(q(.06,.75,.06,`#7c4f2c`,0),r+n,.37,t));e.g.add(X(q(.3,.2,.22,Z(e.r,Im)),r-.2,.88,t))}}function yh(e,t,n){e.g.add(X(Y(.2,.25,.1,`#6b4f3a`),t,1.05,n));let r=J(.32,`#7dd3fc`,.05,16);r.position.set(t,1.5,n),e.g.add(r),e.updates.push(e=>{r.rotation.y=e*.02})}function bh(e,t,n,r){let i=n-t+1.4,a=(t+n)/2,o=Z(e.r,[`#b9825a`,`#a86b3c`,`#8b5e3c`]);e.g.add(X(q(i,.08,.55,o),a,wm,r)),e.g.add(X(q(i,.45,.07,o),a,wm+.35,r-.27));for(let t of[-i/2+.15,i/2-.15])e.g.add(X(q(.08,wm,.5,`#4b5563`),a+t,wm/2,r))}function xh(e,t,n,r){let i=n-t+1.6,a=(t+n)/2,o=Z(e.r,[`#5b84b1`,`#b15b5b`,`#5bb18a`,`#8a5bb1`,`#c49a3a`,`#64748b`]);e.g.add(X(q(i,wm,.8,gm(o,-15)),a,wm/2,r-.05)),e.g.add(X(q(i,.9,.25,o),a,wm+.35,r-.45));for(let t of[-1,1])e.g.add(X(q(.25,.75,.85,o),a+t*i/2,.38,r-.05))}function Sh(e,t,n,r){let i=n-t+2,a=(t+n)/2+.2;e.g.add(X(q(i,.4,1.3,`#a0704a`),a,.2,r-.2)),e.g.add(X(q(i-.1,.2,1.2,`#ffffff`),a,.5,r-.2)),e.g.add(X(q(.12,1.2,1.35,`#7c4f2c`),a+i/2,.6,r-.2)),e.g.add(X(q(.6,.18,.8,`#ffffff`),a+i/2-.45,.68,r-.2))}function Ch(e,t,n){let r=Z(e.r,[`#b9825a`,`#a86b3c`,`#8b5e3c`]);e.g.add(X(q(.6,.06,.55,r),t,wm,n)),e.g.add(X(q(.6,.6,.06,r),t,wm+.33,n-.27));for(let i of[-.25,.25])for(let a of[-.22,.22])e.g.add(X(q(.05,wm,.05,r,0),t+i,wm/2,n+a))}function wh(e,t,n,r){e.g.add(X(q(1.4,.07,.7,`#c08552`),t,.78,n));for(let r of[-.6,.6])e.g.add(X(q(.07,.78,.6,`#7c4f2c`,0),t+r,.39,n));if(r){e.g.add(X(q(.5,.03,.35,`#9ca3af`),t,.83,n));let r=q(.5,.33,.02,`#374151`);r.position.set(t,1,n-.17),r.rotation.x=-.25,e.g.add(r)}else e.g.add(X(Y(.05,.04,.12,`#ffffff`),t-.25,.88,n),X(Y(.18,.18,.02,`#ffffff`),t+.2,.83,n))}function Th(e,t){let n=t.night?3:Math.floor(e.r()*10),r=n===3||n===9?`night`:n===2||n===8?`sunset`:`day`,i={day:{top:`#5aaeff`,bottom:`#d9f0ff`,sun:`#fff3c4`,sunI:2.6,hemi:1.5,fog:`#cfe9ff`},sunset:{top:`#ff8a4c`,bottom:`#ffe3b8`,sun:`#ffb27a`,sunI:2,hemi:1.2,fog:`#ffd9b0`},night:{top:`#0b1640`,bottom:`#2b3a67`,sun:`#a5b4fc`,sunI:.7,hemi:.45,fog:`#1e2a50`}}[r];return zm(e,i.top,i.bottom),Bm(e,r===`night`?`#f8f4d7`:r===`sunset`?`#ff7b3a`:`#ffe066`,r===`night`),r!==`night`&&Vm(e,7),{skyTop:i.top,skyBottom:i.bottom,fog:i.fog,fogNear:30,fogFar:130,hemiSky:i.top,hemiGround:`#556b3a`,hemi:i.hemi,sun:i.sun,sunI:i.sunI,sunPos:[8,14,10],night:r===`night`,indoor:!1}}var Eh={skyTop:`#000000`,skyBottom:`#000000`,fog:`#000000`,fogNear:60,fogFar:200,hemiSky:`#ffffff`,hemiGround:`#b9a58a`,hemi:1.5,sun:`#fff6e0`,sunI:1.8,sunPos:[3,8,9],night:!1,indoor:!0};function Dh(e,t){let n=e.seed??7,r={g:new R,r:hm(n*2654435761),span:t,seed:n,updates:[]},i=r.r,a=Eh,o=e.kind,s=(e={})=>{a={...Eh,...e}};switch(o){case`park`:{a=Th(r,e),Rm(r,a.night?`#3b5a2e`:Z(i,[`#8cc66b`,`#9fd07f`,`#a8d88a`])),Qm(r,a.night?`#3b4a6b`:`#a5b4cb`,!1);for(let e=0;e<9;e++)Hm(r,(e-4)*4+(i()-.5)*2,-8-i()*10,.9+i()*.5);Hm(r,-t*.75,-2.5,1.1),Hm(r,t*.8,-3,1),Gm(r,-t*.4,-2.2),Gm(r,t*.35,-2.4),Jm(r,t*.55,-1.8);let n=new B(new Ka(200,1.6),um(`#e7d3b5`));n.rotation.x=-Math.PI/2,n.position.set(0,.01,-.8),r.g.add(n),qm(r,30,-6,4),i()<.5&&(r.g.add(X(Y(.9,1,.5,`#cbd5e1`),-t*.2,.25,-5)),r.g.add(X(Y(.12,.12,1.4,`#cbd5e1`),-t*.2,.9,-5)));break}case`street`:{a=Th(r,e),Rm(r,`#9ca3af`);let n=new B(new Ka(200,4),um(`#4b5563`));n.rotation.x=-Math.PI/2,n.position.set(0,.01,4),r.g.add(n);for(let e=-40;e<40;e+=3)r.g.add(X(q(1.4,.01,.15,`#f5f5f4`,0),e,.02,4));r.g.add(X(q(200,.15,.3,`#d1d5db`,.01),0,.07,1.9));let o=[`CHAI`,`TAILOR`,`MOBILE`,`BAKERY`,`PHARMACY`,`BOOKS`,`PIZZA`,`HOTEL`];for(let e=-t*1.6;e<t*1.6;e+=4.2)Ym(r,e,-5.5,4,4+i()*4,Z(i,[`#f4c27a`,`#e9967a`,`#a8c8e8`,`#c9a7e0`,`#f2e394`,`#9fd3b0`,`#f0b6c8`]),i()<.6?Z(i,o):void 0);Jm(r,-t*.6,1.5),Jm(r,t*.6,1.5),i()<.6&&Hm(r,t*.2,-1.5,.7);break}case`plain`:a=Th(r,e),Rm(r,`#e5e7eb`);break;case`jungle`:case`forest`:a=Th(r,e),o===`jungle`&&(a={...a,fog:a.night?`#14301c`:`#a9d8a0`,fogNear:12,fogFar:60}),Rm(r,a.night?`#2f4a26`:o===`jungle`?`#5e9e45`:`#7cb36b`),o===`forest`&&Qm(r,`#8796ad`,!1);for(let e=0;e<40;e++){let e=(i()-.5)*50,t=-3-i()*30;o===`forest`?Um(r,e,t,.9+i()*.8):i()<.3?Wm(r,e,t,1+i()*.5):Hm(r,e,t,1+i()*.7,Z(i,[`#2f7d3a`,`#3a8f45`,`#2d6e3e`,`#4caf50`]))}if(o===`jungle`){for(let e=0;e<18;e++){let e=(i()-.5)*t*2.4,n=-1.5-i()*4,a=Y(.03,.03,4+i()*2,`#2f7d3a`,.1,6);a.position.set(e,6,n),r.g.add(a)}for(let e=0;e<26;e++){let e=fm(new Ja(1,10,6),Z(i,[`#4caf50`,`#3f9d4a`,`#66bb6a`,`#2e7d32`]),.04);e.scale.set(.9,.08,.35),e.position.set((i()-.5)*t*2.4,.3,-1-i()*3+(i()<.3?4:0)),e.rotation.set(0,i()*6,.5),r.g.add(e)}Gm(r,-t*.7,-1.5,1.4),Gm(r,t*.65,-1.8,1.3),qm(r,20,-5,3)}else Km(r,t*.3,-2,1.2),Gm(r,-t*.5,-2);break;case`beach`:{a=Th(r,e),Rm(r,`#fde68a`),$m(r,-4,a.night?`#1e3a8a`:Z(i,[`#38bdf8`,`#0ea5e9`,`#22d3ee`])),Wm(r,-t*.7,-2.5,1.2),Wm(r,t*.75,-3,1);let n=(i()-.5)*t;r.g.add(X(Y(.04,.04,2.4,`#ffffff`),n,1.2,-1.5));let o=fm(new Na(1.4,.6,12,1,!0),Z(i,[`#ef4444`,`#f59e0b`,`#8b5cf6`]),.03);o.position.set(n,2.5,-1.5),r.g.add(o),r.g.add(X(J(.3,`#f472b6`,.06,14),(i()-.5)*t,.3,1.2));for(let e=0;e<6;e++)r.g.add(X(J(.12,`#fbcfe8`,.1,8),(i()-.5)*t*2,.06,i()*3-1));break}case`desert`:{a=Th(r,e),Rm(r,`#f9d48c`);for(let e=0;e<8;e++){let t=J(8+i()*6,`#f4c27a`,0,16);t.scale.y=.25,t.position.set((e-4)*14,0,-25-i()*15),r.g.add(t)}let n=mm(9,10,`#e2a65a`,.01,4);n.position.set(18,5,-45),n.rotation.y=.6,r.g.add(n),eh(r,-t*.65,-2,1),eh(r,t*.7,-3,.8),Km(r,t*.2,-1.5,.8,`#c2a07a`);break}case`cave`:{a={...Eh,hemi:.35,hemiSky:`#7c6aa8`,hemiGround:`#2a2633`,sun:`#ffd28a`,sunI:.6,night:!0,indoor:!0},Rm(r,`#3a3445`);let e=new B(new Ja(16,24,16,0,Math.PI*2,0,Math.PI/2),um(`#4b4558`));e.material.side=1,e.scale.set(1.4,.5,.7),e.position.z=-4,r.g.add(e);for(let e=0;e<26;e++){let e=mm(.25+i()*.3,1+i()*1.5,`#56506a`,.04,7);e.rotation.x=Math.PI,e.position.set((i()-.5)*30,7-i()*1.5,-2-i()*10),r.g.add(e)}for(let e=0;e<12;e++)Km(r,(i()-.5)*30,-4-i()*8,1.5+i()*2,Z(i,[`#4b4558`,`#56506a`]));for(let e=0;e<8;e++){let e=mm(.15,.6,Z(i,[`#67e8f9`,`#c084fc`,`#86efac`]),.06,5);e.material=um(Z(i,[`#67e8f9`,`#c084fc`,`#86efac`]),{emissive:3359829}),e.position.set((i()-.5)*t*2,.3,-2-i()*4),r.g.add(e)}let n=new qo(16761466,10,14,1.4);n.position.set(0,3,2),r.g.add(n);break}case`mountain`:case`snow`:{a=Th(r,e);let n=o===`snow`;Rm(r,n?`#f8fafc`:a.night?`#3b5a2e`:`#8fbf6f`),Qm(r,n?`#cbd5e1`:`#94a3b8`,!0);for(let e=0;e<16;e++)Um(r,(i()-.5)*40,-4-i()*18,.8+i()*.7,n);if(Km(r,t*.4,-1.8,1),n){let e=(i()-.5)*t;r.g.add(X(J(.55,`#ffffff`,.05,16),e,.5,-1.8),X(J(.38,`#ffffff`,.06,14),e,1.25,-1.8),X(J(.27,`#ffffff`,.06,14),e,1.8,-1.8));let n=mm(.05,.3,`#f97316`,0,8);n.rotation.x=Math.PI/2,n.position.set(e,1.8,-1.5),r.g.add(n)}break}case`farm`:case`village`:if(a=Th(r,e),Rm(r,o===`farm`?`#a3d977`:`#c9a36b`),Qm(r,`#b6c6a8`,!1),o===`farm`){let e=i()<.5?-t*.6:t*.6;r.g.add(X(q(4,3.2,3.5,`#b91c1c`),e,1.6,-6));let n=fm(new Na(3.2,1.8,4),`#7f1d1d`,.03);n.position.set(e,4.1,-6),n.rotation.y=Math.PI/4,n.scale.z=.8,r.g.add(n),r.g.add(X(q(1.4,1.9,.06,`#fef3c7`),e,.95,-4.24)),Zm(r,-1.6,`#d6b98c`);for(let e=0;e<4;e++){let n=Y(.5,.5,.9,`#fbbf24`,.04,16);n.rotation.z=Math.PI/2,n.position.set(-t*.2+e*1.3,.5,-7),r.g.add(n)}for(let e=-8;e>-22;e-=1.2)r.g.add(X(q(40,.25,.4,`#65a30d`,.02),0,.12,e))}else{for(let e=-t*1.5;e<t*1.5;e+=5)Xm(r,e+(i()-.5),-6-i()*2);Hm(r,t*.3,-2.4,.8),r.g.add(X(Y(.6,.6,.8,`#9ca3af`),-t*.35,.4,-2))}break;case`space`:{a={skyTop:`#000000`,skyBottom:`#0b1026`,fog:`#000000`,fogNear:200,fogFar:300,hemiSky:`#9ca3af`,hemiGround:`#111827`,hemi:.9,sun:`#ffffff`,sunI:2.4,sunPos:[10,8,6],night:!0,indoor:!1},zm(r,`#000000`,`#0b1026`),Bm(r,`#ffffff`,!0),Rm(r,`#9ca3af`);for(let e=0;e<14;e++){let e=Y(.6+i(),.8+i(),.12,`#6b7280`,.04,16);e.position.set((i()-.5)*30,.02,-2-i()*14),r.g.add(e)}let e=J(9,Z(i,[`#f97316`,`#a78bfa`,`#38bdf8`]),0,32);e.position.set(25,18,-70),r.g.add(e);let t=new B(new Ya(14,.6,8,48),um(`#fde68a`));t.position.copy(e.position),t.rotation.x=1.2,r.g.add(t);break}case`underwater`:{a={skyTop:`#0e7490`,skyBottom:`#22d3ee`,fog:`#0e7490`,fogNear:6,fogFar:40,hemiSky:`#a5f3fc`,hemiGround:`#1e3a8a`,hemi:1.3,sun:`#e0f2fe`,sunI:1.4,sunPos:[2,15,4],night:!1,indoor:!1},zm(r,`#0e7490`,`#22d3ee`),Rm(r,`#fcd34d`);let e=[];for(let t=0;t<30;t++){let t=mm(.12,2+i()*2,`#16a34a`,.05,6);t.position.set((i()-.5)*30,1.2,-1.5-i()*10),r.g.add(t),e.push(t)}for(let e=0;e<10;e++)r.g.add(X(J(.4+i()*.3,Z(i,[`#fb7185`,`#f472b6`,`#fb923c`]),.05,10),(i()-.5)*20,.3,-1.5-i()*6));let t=[];for(let e=0;e<20;e++){let e=new B(new Ja(.06+i()*.08,8,6),um(`#e0f2fe`,{transparent:!0,opacity:.6}));r.g.add(e),t.push(e)}r.updates.push(n=>{e.forEach((e,t)=>{e.rotation.z=Math.sin(n/20+t)*.15}),t.forEach((e,t)=>{e.position.set(t*7.3%20-10,(n*.03+t*.7)%8,-1-t%5)})});break}case`bus`:case`train`:case`car`:case`plane`:{s({sunPos:[2,6,8]});let e=new R;r.g.add(e);let a=t*2.6,c=-2.2,l=o===`car`?1.7:1.9,u=o===`plane`?.7:1.1,d=o===`bus`?Z(i,[`#fde68a`,`#fef3c7`,`#e0f2fe`]):o===`car`?`#334155`:`#e2e8f0`,f=new B(new Ka(a,12),um(`#64748b`));f.rotation.x=-Math.PI/2,f.position.set(0,.01,2.8),e.add(f);let p=o===`car`?2:o===`plane`?6:4,m=a/p;e.add(X(q(a,l-u/2,.15,d,.01),0,(l-u/2)/2,c)),e.add(X(q(a,4-(l+u/2),.15,d,.01),0,(l+u/2+4)/2,c));for(let t=0;t<=p;t++)e.add(X(q(o===`plane`?m-1:.35,u,.15,d,.01),-a/2+t*m,l,c));if(o===`bus`||o===`train`){{let t=X(Y(.035,.035,a,`#9ca3af`,.1,8),0,3.2,-.6);t.rotation.z=Math.PI/2,e.add(t)}for(let t=-a/2+.5;t<a/2;t+=1.3)e.add(X(new B(new Ya(.1,.02,6,12),um(`#9ca3af`)),t,2.95,-.6));for(let t=-a/2+1;t<a/2;t+=1.6)e.add(X(q(1.3,.12,.6,`#2563eb`),t,wm,-1.6)),e.add(X(q(1.3,.7,.12,`#1d4ed8`),t,wm+.4,-1.9));fh(r,0,3.6,-2.12,o===`bus`?Z(i,[`CITY BUS`,`EXPRESS`,`JUNGLE BUS`]):`EXPRESS TRAIN`,`#1f2937`)}o===`plane`&&fh(r,0,3.3,-2.12,`FASTEN SEAT BELT`,`#0f172a`);let h=new R;r.g.add(h),hm(n+99);let g=new B(new Ka(400,40),um(o===`plane`?`#cfe8ff`:`#8cc66b`));g.rotation.x=-Math.PI/2,g.position.set(0,o===`plane`?-6:-.4,-24),h.add(g);let _=new R;h.add(_);let v={g:_,r:hm(n+7),span:t,seed:n,updates:[]};for(let e=-60;e<60;e+=4+v.r()*3){let t=v.r();o===`plane`?_.add(X(J(1.5+v.r()*2,`#ffffff`,0,12),e,-1+v.r()*3,-12-v.r()*8)):t<.45?Hm(v,e,-6-v.r()*6,.8+v.r()*.6):t<.75?Xm(v,e,-10-v.r()*4):_.add(X(Y(.08,.08,4,`#6b7280`),e,2,-4.5))}let y=new B(new Ka(400,60),new Oi({color:`#9fd4ff`,fog:!1}));y.position.set(0,20,-30),h.add(y),r.updates.push(t=>{_.position.x=-(t*.18%60),e.position.y=Math.sin(t*.9)*.012,e.rotation.z=Math.sin(t*.13)*.004});break}default:{if(!(![`custom`].includes(o)||!(e.outdoor??!0))){a=Th(r,e),Rm(r,Z(i,[`#9fd07f`,`#d6c2a3`,`#c9a36b`,`#a8d88a`])),Qm(r,Z(i,[`#a5b4cb`,`#b6c6a8`,`#d6c2a3`]),i()<.3),Hm(r,-t*.8,-4,1),Hm(r,t*.85,-5,1.1);break}s();let{backZ:n}=th(r,o===`hospital`?Z(i,[`#e0f2fe`,`#ecfdf5`,`#f8fafc`]):o===`police`?Z(i,[`#dbeafe`,`#e5e7eb`]):o===`office`?Z(i,[`#eef2f7`,`#e7efe9`,`#f3f0e8`]):o===`stage`?`#1f1b2e`:Z(i,Pm),o===`office`||o===`police`||o===`hospital`?Z(i,[`#9aa7b4`,`#cbd5e1`]):o===`stage`?`#8b5a2b`:Z(i,Fm)),c=n+.05,l=-t*.95,u=t*.95;if(o===`stage`){a={...Eh,hemi:.5};let e=Z(i,[`#b91c1c`,`#7c3aed`,`#1d4ed8`]);for(let n of[-1,1])for(let i=0;i<6;i++)r.g.add(X(Y(.25,.25,4.4,e,.03,10),n*(t*.9+i*.35),2.2,-1.5-i*.2));r.g.add(X(q(t*2.8,.8,.3,e),0,4,-1.2));let n=new Go(16773569,60,20,.45,.5,1);n.position.set(0,7,4),n.target.position.set(0,0,0),r.g.add(n,n.target);break}let d=o===`classroom`?(i()<.5?-1:1)*t*.78:(i()-.5)*t*.6;if(o!==`police`&&o!==`library`&&nh(r,d,2.3,c,1.8,1.3,o!==`office`),o===`home`)i()<.5?oh(r,l,c+.3):lh(r,l,c+.4),i()<.5?uh(r,u,c+.6):sh(r,u,c+.5),rh(r,i()<.5?d-3:d+3,c),ih(r,d+(d>0?-2.2:2.2),2.5,c),ch(r),ah(r,d,3.5,c);else if(o===`office`)dh(r,d+(d>0?-2.6:2.6),2.4,c,2,1.1,`#ffffff`,`SALES ↗`,`#16a34a`),vh(r,c+1.4),sh(r,u,c+.4),ah(r,l*.6,3.4,c),r.g.add(X(q(.5,1.2,.5,`#e5e7eb`),l,.6,c+.4),X(Y(.22,.22,.6,`#93c5fd`),l,1.5,c+.4));else if(o===`classroom`)dh(r,0,2.4,c,3.6,1.4,Z(i,[`#2f5d50`,`#1f3b2c`,`#334155`]),Z(i,[`A+B=C`,`2+2=4`,`ABC`,`E=mc²`,`x+y=?`]),`#f5f5f4`),vh(r,c+1.6),yh(r,l*.8,c+.9),r.g.add(X(q(.8,1,.5,`#c08552`),l*.8,.5,c+.9)),ah(r,u*.7,3.3,c),ih(r,l*.6,2.4,c),rh(r,u,c),i()<.5&&gh(r,u-.4,u+1.5,c+.3);else if(o===`kitchen`){ph(r,l-1,u+1,c+.4,Z(i,[`#f2c38b`,`#cbd5e1`,`#fca5a5`,`#a7f3d0`])),mh(r,l*.95,c+1),hh(r,u*.6,c+1);for(let e=l;e<u;e+=1.3)r.g.add(X(q(1.2,.8,.4,Z(i,[`#f2c38b`,`#e7b98c`])),e,3.3,c+.2))}else if(o===`bedroom`)r.g.add(X(q(1.2,2.4,.6,Z(i,[`#a0704a`,`#8b5e3c`,`#d6c2a3`])),u,1.2,c+.35)),ih(r,l*.7,2.5,c),uh(r,l,c+.5),ch(r);else if(o===`shop`)_h(r,l-1,u+1,c+.3),ph(r,u*.55,u*1.15,.9,`#c08552`),fh(r,0,3.6,c,Z(i,[`SUPER STORE`,`GENERAL STORE`,`SALE 50%`]),`#16a34a`);else if(o===`restaurant`){for(let e of[l*.6,0,u*.6]){r.g.add(X(Y(.01,.01,1.2,om,0),e,3.6,0));let t=fm(new Na(.35,.3,14,1,!0),Z(i,[`#ffd54a`,`#fca5a5`,`#93c5fd`]),.04);t.position.set(e,2.95,0),r.g.add(t);let n=new qo(16769704,3,5,1.6);n.position.set(e,2.7,0),r.g.add(n)}dh(r,l*.8,2.5,c,1.6,1.1,`#1f2937`,`MENU`,`#fde68a`);for(let e of[l*.9,u*.9])wh(r,e,-1.2,!1),Ch(r,e-.8,-1.2)}else if(o===`police`){fh(r,0,3.6,c,`POLICE`,`#1d4ed8`);for(let e=0;e<3;e++)ih(r,l*.8+e*1.1,2.4,c);for(let e=u*.6;e<u+1.5;e+=.3)r.g.add(X(Y(.04,.04,3.2,`#6b7280`,.1,8),e,1.6,c+.6));rh(r,.5,c,`#1e3a8a`)}else if(o===`hospital`)fh(r,0,3.6,c,`HOSPITAL`,`#dc2626`),r.g.add(X(q(2,.5,1,`#e5e7eb`),l*.8,.55,c+.8),X(q(2,.2,1,`#93c5fd`),l*.8,.85,c+.8)),r.g.add(X(Y(.03,.03,1.8,`#9ca3af`),l*.3,.9,c+.6),X(q(.25,.35,.1,`#bfdbfe`),l*.3,1.8,c+.6)),rh(r,u*.8,c,`#94a3b8`);else if(o===`library`){for(let e=l-.6;e<u+1;e+=1.5)oh(r,e,c+.3);fh(r,0,3.6,c,`QUIET PLEASE`,`#7c3aed`)}else if(o===`gym`){fh(r,0,3.6,c,`GYM`,`#ef4444`);for(let e of[l*.8,u*.8]){{let t=X(Y(.04,.04,1.4,`#374151`),e,.2,c+1);t.rotation.z=Math.PI/2,r.g.add(t)}for(let t of[-.6,.6]){let n=X(Y(.22,.22,.15,`#111827`),e+t,.22,c+1);n.rotation.z=Math.PI/2,r.g.add(n)}}}else rh(r,u*.8,c),ih(r,l*.6,2.4,c),sh(r,l,c+.4)}}let c=.62;for(let n of e.props??[]){let e=(n.x-.5)*t,i=((n.x2??n.x)-.5)*t;n.type===`bench`?bh(r,e,i,-.12):n.type===`sofa`?xh(r,e,i,-.1):n.type===`bed`?(Sh(r,e,i,0),c=.62):n.type===`chair`?Ch(r,e,-.12):n.type===`table`?wh(r,e,.6,!1):n.type===`desk`&&wh(r,e,.6,!0)}return{group:r.g,light:a,update:e=>{for(let t of r.updates)t(e)},seatY:wm,bedY:c}}var Q=(e,t,n,r={})=>({shape:`box`,size:e,pos:t,color:n,...r}),Oh=(e,t,n,r,i={})=>({shape:`cylinder`,radius:e,height:t,pos:n,color:r,...i}),kh=(e,t,n,r=n)=>Oh(n,.2,[e,r,t],`#111827`,{rot:[90,0,0],wheel:!0}),Ah=(e,t,n,r=1,i=.8)=>Q([r,i,.05],[e,t,n],`#bae6fd`,{glass:!0}),jh={rail_track:{label:`railway track`,aliases:[`track`,`rail`,`railway`,`line`,`patri`],parts:[Q([2,.04,3.2],[0,.02,0],`#9ca3af`),Q([.25,.1,2.6],[-.5,.07,0],`#6b4f3a`),Q([.25,.1,2.6],[.5,.07,0],`#6b4f3a`),Q([2,.12,.1],[0,.18,-.72],`#6b7280`),Q([2,.12,.1],[0,.18,.72],`#6b7280`)]},train:{label:`steam train with coaches`,aliases:[`train`,`engine`,`locomotive`,`rail gari`,`railgari`,`coach`],abilities:[`solid`,`enterable`],parts:[Q([6,1.6,2.6],[.5,1.5,0],`#166534`),Oh(1,4,[1.5,2.2,0],`#15803d`,{rot:[0,0,90]}),Q([2.2,2.6,2.8],[-1.9,2.3,0],`#14532d`),Q([2.6,.25,3.1],[-1.9,3.7,0],`#7f1d1d`),Ah(-1.9,2.8,1.42,.9,.8),Ah(-1.9,2.8,-1.42,.9,.8),Oh(.45,1.2,[2.9,3.4,0],`#1f2937`,{radiusTop:.45,smoke:!0}),{shape:`sphere`,radius:.25,pos:[3.6,2.3,0],color:`#fde68a`,glow:!0},Q([.3,.6,2.8],[3.6,.8,0],`#b91c1c`),{shape:`cone`,radius:.6,height:.5,pos:[3.7,.5,0],rot:[0,0,-90],color:`#374151`},kh(2.2,1.35,.55),kh(.6,1.35,.55),kh(-1,1.35,.55),kh(2.2,-1.35,.55),kh(.6,-1.35,.55),kh(-1,-1.35,.55),Q([11,2.6,2.8],[-9.3,2,0],`#b91c1c`),Q([11.4,.25,3.1],[-9.3,3.4,0],`#7f1d1d`),Ah(-5.6,2.4,1.42),Ah(-7.6,2.4,1.42),Ah(-9.6,2.4,1.42),Ah(-11.6,2.4,1.42),Q([.9,1.9,.05],[-13.8,1.7,1.42],`#7f1d1d`),{shape:`text`,text:`PAKISTAN RAILWAYS`,size:[5,.45],color:`#b91c1c`,textColor:`#fde047`,pos:[-9.3,1.25,1.43]},kh(-5.5,1.35,.45),kh(-13,1.35,.45),kh(-5.5,-1.35,.45),kh(-13,-1.35,.45),Q([.6,.3,.3],[-3.6,.9,0],`#374151`),Q([11,2.6,2.8],[-21,2,0],`#1d4ed8`),Q([11.4,.25,3.1],[-21,3.4,0],`#1e3a8a`),Ah(-17.3,2.4,1.42),Ah(-19.3,2.4,1.42),Ah(-21.3,2.4,1.42),Ah(-23.3,2.4,1.42),kh(-17.2,1.35,.45),kh(-24.7,1.35,.45),kh(-17.2,-1.35,.45),kh(-24.7,-1.35,.45),Q([.6,.3,.3],[-15.3,.9,0],`#374151`)]},platform:{label:`railway platform`,aliases:[`platform`,`station platform`],floor:!0,parts:[Q([30,.55,3.6],[0,.275,0],`#cbbba0`),Q([30,.06,.3],[0,.56,-1.65],`#facc15`),Q([30,.5,.12],[0,.25,1.82],`#a8a29e`)]},station_building:{label:`railway station building`,aliases:[`station`,`station building`,`station house`,`booking office`,`ticket office`],abilities:[`solid`,`enterable`,`hide_behind`],parts:[Q([8.4,.3,4.4],[0,.15,0],`#9ca3af`),Q([8,3.2,4],[0,1.6,0],`#f3e3c3`),Q([8.8,.3,5.4],[0,3.35,.5],`#9a3412`),Oh(.1,3.1,[-3.6,1.55,2.7],`#7c2d12`),Oh(.1,3.1,[-1.2,1.55,2.7],`#7c2d12`),Oh(.1,3.1,[1.2,1.55,2.7],`#7c2d12`),Oh(.1,3.1,[3.6,1.55,2.7],`#7c2d12`),Q([1.1,2.2,.08],[0,1.1,2.02],`#7c2d12`,{door:!0}),Q([1.35,1.15,.04],[-2.6,1.9,2.01],`#ffffff`),Ah(-2.6,1.9,2.04,1.2,1),Q([1.35,1.15,.04],[2.6,1.9,2.01],`#ffffff`),Ah(2.6,1.9,2.04,1.2,1),{shape:`text`,text:`TICKETS`,size:[1.3,.3],color:`#166534`,textColor:`#ffffff`,pos:[-2.6,2.7,2.06]},{shape:`text`,text:`RAILWAY STATION`,size:[5,.6],color:`#ffffff`,textColor:`#166534`,pos:[0,2.95,2.07]},Q([1.6,1.5,1.2],[0,4.2,1],`#f3e3c3`),{shape:`cone`,radius:1.2,height:.9,pos:[0,5.4,1],color:`#9a3412`},Oh(.5,.08,[0,4.25,1.62],`#ffffff`,{rot:[90,0,0]}),Q([.05,.4,.03],[0,4.4,1.68],`#111827`),Q([.3,.05,.03],[.13,4.25,1.68],`#111827`)]},water_tank:{label:`water tank on legs`,aliases:[`water tank`,`tank`,`tanki`,`water tower`],abilities:[`solid`,`climbable`],climb_height:4,parts:[Oh(.09,4,[.9,2,.9],`#4b5563`),Oh(.09,4,[-.9,2,.9],`#4b5563`),Oh(.09,4,[.9,2,-.9],`#4b5563`),Oh(.09,4,[-.9,2,-.9],`#4b5563`),Q([1.9,.08,.08],[0,2,.9],`#4b5563`),Q([1.9,.08,.08],[0,2,-.9],`#4b5563`),Oh(1.35,1.8,[0,4.9,0],`#64748b`),{shape:`cone`,radius:1.5,height:.6,pos:[0,6.1,0],color:`#334155`},Q([.15,.15,1.4],[1.3,4.1,.5],`#334155`,{rot:[0,45,0]}),Q([.06,4,.06],[-.25,2,1.2],`#78350f`),Q([.06,4,.06],[.25,2,1.2],`#78350f`),...[.5,1.1,1.7,2.3,2.9,3.5].map(e=>Q([.5,.05,.05],[0,e,1.2],`#78350f`))]},lamp_post:{label:`lamp post`,aliases:[`lamp`,`street light`,`light pole`,`lamp post`],parts:[Oh(.15,.3,[0,.15,0],`#1f2937`),Oh(.06,3.2,[0,1.6,0],`#374151`),Q([.6,.06,.06],[.25,3.2,0],`#374151`),{shape:`sphere`,radius:.2,pos:[.5,3.05,0],color:`#fef9c3`,glow:!0}]},clock:{label:`station clock on a pole`,aliases:[`clock`,`ghanta`,`ghari`,`watch tower`],parts:[Oh(.08,3,[0,1.5,0],`#374151`),Oh(.45,.12,[0,3.2,0],`#ffffff`,{rot:[90,0,0]}),{shape:`torus`,radius:.45,tube:.05,pos:[0,3.2,0],color:`#1f2937`},Q([.05,.35,.03],[0,3.33,.08],`#111827`),Q([.28,.05,.03],[.12,3.2,.08],`#111827`)]},road:{label:`road piece`,aliases:[`road`,`street`,`sarak`,`highway`],parts:[Q([4,.03,6],[0,.015,0],`#4b5563`),Q([1.8,.035,.15],[0,.03,0],`#f8fafc`),Q([4,.04,.2],[0,.02,2.9],`#d1d5db`),Q([4,.04,.2],[0,.02,-2.9],`#d1d5db`)]},car:{label:`car`,aliases:[`car`,`gari`,`taxi`,`jeep`],abilities:[`solid`],parts:[Q([4,.9,1.8],[0,.75,0],`#dc2626`),Q([2.2,.8,1.6],[-.3,1.55,0],`#b91c1c`),Ah(-.3,1.55,.81,1.9,.6),Ah(-.3,1.55,-.81,1.9,.6),Q([.05,.6,1.4],[.82,1.55,0],`#bae6fd`,{glass:!0}),{shape:`sphere`,radius:.12,pos:[2,.85,.6],color:`#fef9c3`,glow:!0},{shape:`sphere`,radius:.12,pos:[2,.85,-.6],color:`#fef9c3`,glow:!0},kh(1.3,.9,.38),kh(-1.3,.9,.38),kh(1.3,-.9,.38),kh(-1.3,-.9,.38)]},bus:{label:`bus`,aliases:[`bus`,`coach bus`,`van`],abilities:[`solid`,`enterable`],parts:[Q([9,2.6,2.5],[0,1.7,0],`#f59e0b`),Q([9.1,.2,2.6],[0,3.05,0],`#ffffff`),...[3.2,1.6,0,-1.6,-3.2].map(e=>Ah(e,2.1,1.26,1.3,.8)),Q([.05,1.2,2.1],[4.52,2.1,0],`#bae6fd`,{glass:!0}),Q([.9,2,.05],[3.6,1.4,1.27],`#92400e`,{door:!0}),kh(3,1.25,.5),kh(-3,1.25,.5),kh(3,-1.25,.5),kh(-3,-1.25,.5),{shape:`sphere`,radius:.15,pos:[4.55,1,.9],color:`#fef9c3`,glow:!0},{shape:`sphere`,radius:.15,pos:[4.55,1,-.9],color:`#fef9c3`,glow:!0}]},stall:{label:`tea stall (khokha)`,aliases:[`stall`,`khokha`,`tea stall`,`chai stall`,`shop`,`dukan`,`kiosk`],abilities:[`solid`,`hide_behind`],parts:[Q([2.6,1,1.2],[0,.5,.3],`#a16207`),Q([2.8,.08,1.4],[0,1.04,.3],`#d6a96b`),Q([2.6,2.4,.1],[0,1.2,-.3],`#92400e`),Oh(.05,2.5,[-1.25,1.25,.9],`#78350f`),Oh(.05,2.5,[1.25,1.25,.9],`#78350f`),Q([3,.1,1.8],[0,2.5,.3],`#dc2626`,{rot:[-8,0,0]}),{shape:`text`,text:`CHAI`,size:[1.2,.4],color:`#fde047`,textColor:`#7c2d12`,pos:[0,2.2,.95]},Oh(.15,.25,[-.6,1.2,.3],`#e5e7eb`),Oh(.12,.3,[.5,1.2,.3],`#9ca3af`)]},chair:{label:`chair`,aliases:[`chair`,`kursi`,`stool`],abilities:[`sittable`],seat_height:.48,parts:[Q([.5,.06,.5],[0,.46,0],`#a16207`),Q([.5,.55,.06],[0,.76,-.22],`#a16207`),...[[-.21,-.21],[.21,-.21],[-.21,.21],[.21,.21]].map(([e,t])=>Q([.05,.46,.05],[e,.23,t],`#78350f`))]},table:{label:`table`,aliases:[`table`,`mez`,`dining table`],abilities:[`solid`,`hide_behind`],parts:[Q([1.6,.08,.9],[0,.76,0],`#92400e`),...[[-.7,-.35],[.7,-.35],[-.7,.35],[.7,.35]].map(([e,t])=>Q([.07,.76,.07],[e,.38,t],`#78350f`))]},sofa:{label:`sofa`,aliases:[`sofa`,`couch`,`settee`],abilities:[`sittable`,`hide_behind`],seat_height:.48,parts:[Q([2.2,.42,.85],[0,.25,0],`#2563eb`),Q([2.2,.55,.22],[0,.72,-.34],`#1d4ed8`),Q([.22,.6,.85],[-1,.45,0],`#1d4ed8`),Q([.22,.6,.85],[1,.45,0],`#1d4ed8`),Q([.85,.1,.6],[-.45,.5,.05],`#3b82f6`),Q([.85,.1,.6],[.45,.5,.05],`#3b82f6`)]},bed:{label:`bed`,aliases:[`bed`,`charpai`,`palang`],abilities:[`sittable`],seat_height:.55,parts:[Q([1.6,.35,2.1],[0,.2,0],`#92400e`),Q([1.5,.18,2],[0,.46,0],`#f8fafc`),Q([1.6,.9,.08],[0,.6,-1.05],`#78350f`),Q([.6,.12,.35],[-.35,.6,-.75],`#ffffff`),Q([.6,.12,.35],[.35,.6,-.75],`#ffffff`),Q([1.52,.06,1.2],[0,.57,.35],`#f472b6`)]},cupboard:{label:`cupboard`,aliases:[`cupboard`,`almari`,`wardrobe`,`cabinet`,`fridge`],abilities:[`solid`,`hide_behind`,`openable`],parts:[Q([1.2,2,.6],[0,1,0],`#a16207`),Q([.58,1.9,.04],[-.3,1,.31],`#b45309`,{door:!0}),Q([.58,1.9,.04],[.3,1,.31],`#b45309`),{shape:`sphere`,radius:.04,pos:[.06,1,.35],color:`#fbbf24`}]},tv:{label:`TV on a stand`,aliases:[`tv`,`television`,`screen`],parts:[Q([1.4,.5,.45],[0,.25,0],`#57534e`),Q([1.3,.75,.06],[0,.95,0],`#111827`),Q([1.2,.65,.02],[0,.95,.035],`#38bdf8`,{glow:!0})]},train_seat:{label:`train seat for two`,aliases:[`train seat`,`bus seat`,`seat`,`berth`],abilities:[`sittable`],seat_height:.48,parts:[Q([1.1,.12,.55],[0,.45,0],`#1d4ed8`),Q([1.1,.75,.12],[0,.85,-.25],`#1e40af`),Q([.08,.45,.5],[-.5,.22,0],`#374151`),Q([.08,.45,.5],[.5,.22,0],`#374151`)]},school_desk:{label:`school desk with bench`,aliases:[`desk`,`school desk`,`bench desk`],abilities:[`sittable`],seat_height:.45,parts:[Q([1.2,.05,.5],[0,.75,.15],`#b45309`),Q([1.2,.05,.35],[0,.45,-.35],`#92400e`),...[-.55,.55].map(e=>Q([.05,.75,.05],[e,.37,.3],`#374151`)),...[-.55,.55].map(e=>Q([.05,.45,.05],[e,.22,-.35],`#374151`))]},blackboard:{label:`blackboard`,aliases:[`blackboard`,`board`,`chalkboard`,`whiteboard`],parts:[Q([3,1.4,.08],[0,1.6,0],`#14532d`),Q([3.2,1.6,.05],[0,1.6,-.03],`#92400e`),Q([3,.06,.12],[0,.88,.06],`#92400e`)]}};function Mh(e,t=!1){let n=e.toLowerCase().replace(/[_-]+/g,` `).trim(),r=n.split(` `).filter(Boolean),i=null,a=0;for(let[e,o]of Object.entries(jh))for(let s of[e.replace(/_/g,` `),...o.aliases]){let e=s.split(` `);(n===s||(t?r.length<=e.length+1&&e.every(e=>r.includes(e))&&r.every(t=>e.includes(t)||[`engine`,`big`,`old`,`small`,`main`,`steam`,`pakistani`].includes(t)):e.every(e=>r.includes(e))))&&s.length>a&&(i=o,a=s.length)}return i}var Nh=[{id:`sway`,label:`Sways in the wind`,help:`Leaves, branches and grass move with the wind.`},{id:`climbable`,label:`Can be climbed`,help:`Characters climb it (facing it) and sit up on top.`},{id:`fruits`,label:`Has fruits`,help:`Fruits hang on it; they can be picked or fall down.`},{id:`shakeable`,label:`Shake → fruits fall`,help:`Shaking it makes fruits / leaves fall.`},{id:`branches_cut`,label:`Branches can be cut`,help:`A branch can be cut off and falls down.`},{id:`choppable`,label:`Can be chopped down`,help:`Chopped with an axe it falls over (TIMBER!).`},{id:`pickable`,label:`Can be picked up`,help:`Characters pick it up and carry it in their hand.`},{id:`eatable`,label:`Can be eaten`,help:`Bitten until it is gone.`},{id:`throwable`,label:`Can be thrown`,help:`Flies through the air, bounces, splashes in water.`},{id:`kickable`,label:`Can be kicked`,help:`Flies off when kicked.`},{id:`pushable`,label:`Can be pushed`,help:`Rolls / slides when pushed.`},{id:`sittable`,label:`Can be sat on`,help:`Characters sit on it.`},{id:`hide_behind`,label:`Hide behind it`,help:`Characters crouch behind it to hide.`},{id:`swimmable`,label:`Swim in it`,help:`Characters jump in and swim.`},{id:`flowing`,label:`Water flows`,help:`The water moves; things in it drift away.`},{id:`fish`,label:`Has fish`,help:`Fish swim (and jump) in it; they can be caught.`},{id:`drinkable`,label:`Drink from it`,help:`Characters kneel and drink.`},{id:`openable`,label:`Door opens`,help:`The door opens and closes.`},{id:`enterable`,label:`Can go inside`,help:`Characters walk in through the door (and come out).`},{id:`burnable`,label:`Can be lit (fire)`,help:`A fire can be lit; it burns with smoke.`},{id:`floats`,label:`Floats on water`,help:`Bobs and drifts on water instead of sinking.`},{id:`solid`,label:`Solid (walk around it)`,help:`Characters walk around it, not through it.`},{id:`wander`,label:`Moves around by itself`,help:`Animals walk around on their own.`},{id:`flies`,label:`Flies`,help:`Birds / butterflies fly around.`}],$=e=>e.split(` `).filter(Boolean),Ph=$(`sway climbable fruits shakeable branches_cut choppable hide_behind solid`),Fh=[{type:`mango_tree`,label:`Mango tree`,cat:`Trees & plants`,icon:`🥭`,traits:Ph,on:Ph,words:[`mango tree`,`mango`,`mangoes`,`tree`],opts:{fruits:9}},{type:`apple_tree`,label:`Apple tree`,cat:`Trees & plants`,icon:`🍎`,traits:Ph,on:Ph,words:[`apple tree`,`apple`,`apples`],opts:{fruits:10}},{type:`orange_tree`,label:`Orange tree`,cat:`Trees & plants`,icon:`🍊`,traits:Ph,on:Ph,words:[`orange tree`,`orange`,`oranges`],opts:{fruits:9}},{type:`big_tree`,label:`Big shady tree`,cat:`Trees & plants`,icon:`🌳`,traits:Ph,on:$(`sway climbable shakeable branches_cut choppable hide_behind solid`),words:[`big tree`,`tree`,`oak`,`banyan`,`branch`],opts:{fruits:0}},{type:`bare_tree`,label:`Bare tree (winter)`,cat:`Trees & plants`,icon:`🪾`,traits:$(`sway climbable branches_cut choppable hide_behind solid`),on:$(`sway climbable branches_cut choppable hide_behind solid`),words:[`bare tree`,`dry tree`,`dead tree`,`winter tree`]},{type:`pine_tree`,label:`Pine tree`,cat:`Trees & plants`,icon:`🌲`,traits:$(`sway climbable choppable shakeable hide_behind solid`),on:$(`sway climbable choppable shakeable hide_behind solid`),words:[`pine`,`pine tree`,`fir`]},{type:`palm_tree`,label:`Coconut palm`,cat:`Trees & plants`,icon:`🌴`,traits:Ph,on:$(`sway climbable fruits shakeable choppable hide_behind solid`),words:[`palm`,`palm tree`,`coconut tree`,`coconut`,`coconuts`],opts:{fruits:4}},{type:`banana_plant`,label:`Banana plant`,cat:`Trees & plants`,icon:`🍌`,traits:$(`sway fruits shakeable choppable hide_behind`),on:$(`sway fruits shakeable choppable hide_behind`),words:[`banana`,`bananas`,`banana tree`,`banana plant`],opts:{fruits:1}},{type:`bush`,label:`Bush`,cat:`Trees & plants`,icon:`🌿`,traits:$(`sway hide_behind shakeable`),on:$(`sway hide_behind shakeable`),words:[`bush`,`bushes`,`shrub`,`leaves`]},{type:`berry_bush`,label:`Berry bush`,cat:`Trees & plants`,icon:`🫐`,traits:$(`sway hide_behind fruits shakeable`),on:$(`sway hide_behind fruits shakeable`),words:[`berry`,`berries`,`berry bush`],opts:{fruits:8}},{type:`flowers`,label:`Flowers`,cat:`Trees & plants`,icon:`🌼`,traits:$(`sway pickable`),on:$(`sway pickable`),words:[`flower`,`flowers`,`rose`,`roses`],opts:{count:14,radius:1.4}},{type:`tall_grass`,label:`Tall grass`,cat:`Trees & plants`,icon:`🌾`,traits:$(`sway hide_behind`),on:$(`sway hide_behind`),words:[`tall grass`,`reeds`,`crops`,`wheat`],opts:{radius:1.6}},{type:`mushroom`,label:`Mushrooms`,cat:`Trees & plants`,icon:`🍄`,traits:$(`pickable eatable`),on:$(`pickable eatable`),words:[`mushroom`,`mushrooms`]},{type:`river`,label:`River`,cat:`Water`,icon:`🏞️`,traits:$(`swimmable flowing fish drinkable`),on:$(`swimmable flowing fish drinkable`),words:[`river`,`stream`,`water`,`nadi`,`canal`],opts:{width:3.2,fish:6},line:!0},{type:`waterfall`,label:`Waterfall (with cliff)`,cat:`Water`,icon:`🌊`,traits:$(`solid sway`),on:$(`solid sway`),words:[`waterfall`,`falls`,`cascade`],opts:{height:5.5}},{type:`pond`,label:`Pond / lake`,cat:`Water`,icon:`💧`,traits:$(`swimmable fish drinkable`),on:$(`swimmable fish drinkable`),words:[`pond`,`lake`,`pool`,`water`],opts:{radius:3.2,fish:5}},{type:`bridge`,label:`Wooden bridge`,cat:`Water`,icon:`🌉`,traits:$(`solid`),on:[],words:[`bridge`],opts:{len:5}},{type:`boat`,label:`Boat`,cat:`Water`,icon:`🛶`,traits:$(`sittable floats`),on:$(`sittable floats`),words:[`boat`,`canoe`,`kashti`],opts:{moving:!1,rower:!1}},{type:`rock`,label:`Rock (sit / hide)`,cat:`Ground & rocks`,icon:`🪨`,traits:$(`sittable hide_behind solid pushable`),on:$(`sittable hide_behind solid`),words:[`rock`,`boulder`,`big stone`]},{type:`stones`,label:`Small stones`,cat:`Ground & rocks`,icon:`🥌`,traits:$(`pickable throwable`),on:$(`pickable throwable`),words:[`stone`,`stones`,`pebble`,`pebbles`],opts:{count:5}},{type:`log`,label:`Log`,cat:`Ground & rocks`,icon:`🪵`,traits:$(`sittable pushable floats solid`),on:$(`sittable pushable floats`),words:[`log`,`wood`,`timber`]},{type:`stump`,label:`Tree stump`,cat:`Ground & rocks`,icon:`🪵`,traits:$(`sittable`),on:$(`sittable`),words:[`stump`]},{type:`hill`,label:`Hill`,cat:`Ground & rocks`,icon:`⛰️`,traits:[],on:[],words:[`hill`,`mound`],opts:{radius:6,height:1.6}},{type:`path`,label:`Dirt path`,cat:`Ground & rocks`,icon:`🟫`,traits:[],on:[],words:[`path`,`road`,`track`],opts:{width:1.6},line:!0},{type:`hut`,label:`Hut (door, go inside)`,cat:`Buildings`,icon:`🛖`,traits:$(`openable enterable hide_behind solid`),on:$(`openable enterable hide_behind solid`),words:[`hut`,`house`,`home`,`cottage`,`door`,`inside`]},{type:`house`,label:`House`,cat:`Buildings`,icon:`🏠`,traits:$(`openable enterable hide_behind solid`),on:$(`openable enterable hide_behind solid`),words:[`house`,`home`,`building`,`door`]},{type:`tent`,label:`Tent`,cat:`Buildings`,icon:`⛺`,traits:$(`enterable hide_behind solid`),on:$(`enterable hide_behind solid`),words:[`tent`,`camp`]},{type:`fence`,label:`Fence`,cat:`Buildings`,icon:`🚧`,traits:$(`solid hide_behind`),on:$(`solid`),words:[`fence`],opts:{len:6}},{type:`well`,label:`Water well`,cat:`Buildings`,icon:`🪣`,traits:$(`drinkable solid`),on:$(`drinkable solid`),words:[`well`]},{type:`bench`,label:`Bench`,cat:`Buildings`,icon:`🪑`,traits:$(`sittable solid`),on:$(`sittable`),words:[`bench`,`seat`]},{type:`campfire`,label:`Campfire`,cat:`Buildings`,icon:`🔥`,traits:$(`burnable solid`),on:$(`burnable`),words:[`campfire`,`fire`,`bonfire`,`firewood`],opts:{lit:!0}},{type:`ladder`,label:`Ladder`,cat:`Buildings`,icon:`🪜`,traits:$(`climbable solid`),on:$(`climbable`),words:[`ladder`,`stairs`]},{type:`signpost`,label:`Sign post`,cat:`Buildings`,icon:`🪧`,traits:[],on:[],words:[`sign`,`signpost`,`board`],opts:{text:`JUNGLE`}},{type:`ball`,label:`Ball`,cat:`Things`,icon:`⚽`,traits:$(`pickable throwable kickable pushable floats`),on:$(`pickable throwable kickable pushable floats`),words:[`ball`,`football`]},{type:`basket`,label:`Basket of fruit`,cat:`Things`,icon:`🧺`,traits:$(`pickable`),on:$(`pickable`),words:[`basket`]},{type:`crate`,label:`Wooden box`,cat:`Things`,icon:`📦`,traits:$(`pushable sittable hide_behind solid`),on:$(`pushable sittable hide_behind`),words:[`box`,`crate`,`chest`]},{type:`axe`,label:`Axe`,cat:`Things`,icon:`🪓`,traits:$(`pickable`),on:$(`pickable`),words:[`axe`,`hatchet`]},{type:`fruit`,label:`Fruit (to pick & eat)`,cat:`Things`,icon:`🥭`,traits:$(`pickable eatable throwable`),on:$(`pickable eatable throwable`),words:[`mango`,`apple`,`orange`,`banana`,`coconut`,`fruit`],opts:{kind:`mango`,count:3}},{type:`item`,label:`Any thing (its picture)`,cat:`Things`,icon:`🎁`,traits:$(`pickable eatable throwable solid`),on:$(`pickable throwable`),words:[],opts:{word:`gift`,size:.42}},{type:`person`,label:`Person (walks, works, fishes…)`,cat:`Life`,icon:`🧑`,traits:$(`wander`),on:$(`wander`),words:[`person`,`man`,`woman`,`people`,`villager`,`boatman`,`mallah`,`farmer`,`fisherman`],opts:{who:`villager`,doing:`walk`,female:!1}},{type:`model`,label:`Designed thing`,cat:`Things`,icon:`🧩`,traits:$(`sittable enterable climbable pickable throwable pushable solid hide_behind openable burnable`),on:[],words:[],opts:{model:``}},{type:`birds`,label:`Birds flying`,cat:`Life`,icon:`🐦`,traits:$(`flies`),on:$(`flies`),words:[`birds`,`bird`],opts:{count:5}},{type:`butterflies`,label:`Butterflies`,cat:`Life`,icon:`🦋`,traits:$(`flies`),on:$(`flies`),words:[`butterfly`,`butterflies`],opts:{count:4}},{type:`animal`,label:`Animal (walks, swims, plays…)`,cat:`Life`,icon:`🐄`,traits:$(`wander`),on:$(`wander`),words:[],opts:{species:`cow`,doing:`walk`}}],Ih=new Map(Fh.map(e=>[e.type,e]));function Lh(e,t){let n=Ih.get(e.type);return e.traits&&t in e.traits?!!e.traits[t]&&!!n?.traits.includes(t):!!n?.on.includes(t)}function Rh(e,t,n){let r=e.opts?.[t]??Ih.get(e.type)?.opts?.[t];return typeof r==`number`?r:n}function zh(e,t,n){let r=e.opts?.[t]??Ih.get(e.type)?.opts?.[t];return typeof r==`string`?r:n}var Bh={mango_tree:{kind:`mango`,color:`#f59e0b`,r:.085,long:1.35},apple_tree:{kind:`apple`,color:`#dc2626`,r:.075},orange_tree:{kind:`orange`,color:`#f97316`,r:.08},palm_tree:{kind:`coconut`,color:`#7c4a21`,r:.12},banana_plant:{kind:`banana`,color:`#facc15`,r:.07,long:2.2},berry_bush:{kind:`berry`,color:`#7c3aed`,r:.035}};function Vh(){return Math.random().toString(36).slice(2,10)}var Hh={go:{n:48,a:48},return:{n:40,a:40},cross:{n:96,a:96},climb:{n:96,a:28},"climb-down":{n:60,a:0},pick:{n:56,a:26,hits:[40]},shake:{n:76,a:24,hits:[40,50,60]},cut:{n:90,a:26,hits:[40,54,68]},chop:{n:120,a:26,hits:[40,54,68,82]},eat:{n:56,a:24,hits:[34,42,50]},throw:{n:40,a:0,hits:[16]},give:{n:48,a:28,hits:[36]},swim:{n:144,a:24,hits:[30]},fish:{n:156,a:24,hits:[34,100,116]},drink:{n:72,a:24,hits:[38,50]},sit:{n:40,a:28},"stand-up":{n:18,a:0},open:{n:40,a:24,hits:[30]},close:{n:36,a:20,hits:[26]},enter:{n:64,a:24,hits:[26,56]},exit:{n:56,a:0,hits:[2,44]},light:{n:60,a:24,hits:[40]},push:{n:76,a:24},kick:{n:44,a:24,hits:[30]},hide:{n:44,a:36},look:{n:30,a:0},carry:{n:56,a:26,hits:[40]},drop:{n:24,a:0,hits:[10]}},Uh=[`#8b5a2b`,`#7a4b24`,`#946236`,`#6f4423`],Wh=[`#4caf50`,`#5fae55`,`#3f9d4a`,`#6fbf5a`,`#2e8b57`,`#57a845`],Gh=[`#2f7d3a`,`#2d6e3e`,`#3a8f45`,`#24703a`];function Kh(e,t,n){let r=new R,i=new R;return r.add(i),{root:r,pivot:i,sway:[],things:[],branches:[],radius:e,height:t,solid:n}}function qh(e,t,n,r){e.sway.push({o:t,amp:n,ph:r,bx:t.rotation.x,bz:t.rotation.z})}function Jh(e,t,n,r=1){let i=new R,a=J(n,t,.08,12);if(a.scale.set(1,r,1),a.position.y=-n*r,i.add(a),i.add(X(Y(.008,.008,.06,`#5b3a1a`,0,5),0,.01,0)),e===`mango`||e===`apple`||e===`orange`){let e=fm(new Ja(.035,6,4),`#3f9d4a`,0);e.scale.set(1.6,.3,.7),e.position.set(.03,.02,0),i.add(e)}if(e===`banana`){i.clear();for(let e=0;e<6;e++){let n=Y(.025,.02,.2,t,.08,6);n.position.set(Math.cos(e)*.06,-.12-e%3*.05,Math.sin(e)*.06),n.rotation.set(Math.sin(e)*.5,0,Math.cos(e)*.5),i.add(n)}}return i.userData.fruit=e,i}function Yh(e,t,n){let r=e.scale??1,i=Kh(.45*r,4.6*r,Lh(e,`solid`));i.vr=1.5*r*(e.type===`big_tree`?1.25:1);let a=3*r,o=.22*r,s=Z(t,Uh),c=(e.type,Z(t,n?Gh:Wh)),l=i.pivot;l.add(X(Y(o*.8,o*1.15,a,s,.06,12),0,a/2,0));for(let e=0;e<4;e++){let t=Y(.04*r,.09*r,.6*r,s,.08,6),n=e/4*Math.PI*2+.4;t.position.set(Math.cos(n)*o*1.2,.12,Math.sin(n)*o*1.2),t.rotation.set(Math.sin(n)*1.1,0,-Math.cos(n)*1.1),l.add(t)}let u=X(new R,0,a+.75*r,0);l.add(u);let d=e.type===`big_tree`?1.25:1;u.add(X(J(1.05*r*d,c,.035,16),0,.2*r,0)),u.add(X(J(.8*r*d,gm(c,18),.04,14),.75*r*d,-.15*r,.2*r)),u.add(X(J(.8*r*d,gm(c,-18),.04,14),-.8*r*d,-.05*r,-.25*r)),u.add(X(J(.7*r*d,gm(c,8),.04,14),.1*r,.55*r,-.5*r)),qh(i,u,.035,t()*6);let f=Bh[e.type],p=Lh(e,`fruits`)&&f?Math.round(Rh(e,`fruits`,8)):0,m=[{a:-.8,h:1.5,tilt:1.15,len:1.15,low:!0},{a:Math.PI/2,h:1.85,tilt:1.42,len:1.35,low:!1,perch:!0},{a:Math.PI*1.1,h:2.1,tilt:.95,len:1.1,low:!1},{a:-Math.PI*.6,h:2.3,tilt:.85,len:1,low:!1}],h=p;return m.forEach((e,n)=>{let a=X(new R,0,e.h*r,0);a.rotation.y=e.a-Math.PI/2;let u=new R;u.rotation.z=Math.PI/2-e.tilt,a.add(u);let d=e.len*r,m=Y(.045*r,(e.perch?.1:.075)*r,d,s,.07,8);m.rotation.z=-Math.PI/2,m.position.x=d/2,u.add(m);let g=X(new R,d,.1*r,0);u.add(g),g.add(J((e.perch||e.low?.45:.6)*r,gm(c,n%2?10:-10),.045,12)),g.rotation.z=-(Math.PI/2-e.tilt);let _=e.low?Math.ceil(p*.5):n===2?Math.ceil(h/2):h;for(let n=0;n<Math.min(_,h)&&f;n++){let a=Jh(f.kind,f.color,f.r*r,f.long??1),o=n/Math.max(1,_)*Math.PI*2+t();a.position.set(Math.cos(o)*.3*r,(e.low?-.34:-.42)*r-t()*.1*r,Math.sin(o)*.3*r),g.add(a),i.things.push({obj:a,kind:f.kind,words:[f.kind,f.kind+`s`,`fruit`],size:f.r*r,floats:!0,edible:!0,reach:e.low?`low`:`high`})}if(h-=Math.min(_,h),l.add(a),qh(i,a,.05+t()*.03,t()*6),qh(i,g,.06,t()*6),i.branches.push({group:a,low:e.low,leaves:g}),e.perch){let t=.55*r,n=Math.cos(Math.PI/2-e.tilt)*t,s=e.h*r+Math.sin(Math.PI/2-e.tilt)*t+.1*r;i.climb={top:(e.h-.95)*r,perch:new L(n,s,0).applyAxisAngle(new L(0,1,0),a.rotation.y),trunkR:o}}}),Lh(e,`climbable`)||(i.climb=void 0),i}function Xh(e,t){let n=e.scale??1,r=Kh(.4*n,4.5*n,Lh(e,`solid`));r.vr=1.4*n;let i=e.opts?.snow===!0;r.pivot.add(X(Y(.16*n,.24*n,1.6*n,`#6f4423`,.06,10),0,.8*n,0));for(let e=0;e<4;e++){let a=X(new R,0,(1.5+e*.75)*n,0);a.add(mm((1.35-e*.27)*n,1.4*n,Z(t,[`#2f7d4a`,`#2a6e42`,`#347f4f`]),.03,12)),i&&a.add(X(mm((.6-e*.1)*n,.55*n,`#ffffff`,0,12),0,.45*n,0)),r.pivot.add(a),qh(r,a,.03+e*.012,t()*6+e*.4)}return Lh(e,`climbable`)&&(r.climb={top:1.4*n,trunkR:.2*n}),r}function Zh(e,t){let n=e.scale??1,r=Kh(.35*n,5*n,Lh(e,`solid`));r.vr=2*n;let i=0,a=0,o=.05+t()*.05;for(let e=0;e<8;e++){let t=X(Y(.15*n,.19*n,.56*n,e%2?`#a0704a`:`#8f6240`,.06,10),a,i+.28*n,0);t.rotation.z=-o*e*.3,r.pivot.add(t),i+=.53*n,a+=o*e*.09*n}let s=X(new R,a,i,0);r.pivot.add(s);for(let e=0;e<8;e++){let i=new R;i.rotation.y=e/8*Math.PI*2;let a=fm(new Ja(1,12,6),e%2?`#3f9d4a`:`#4caf50`,.04);a.scale.set(1.5*n,.1*n,.38*n),a.position.set(1.15*n,-.25*n,0),a.rotation.z=-.45,i.add(a),s.add(i),qh(r,i,.08,t()*6)}qh(r,s,.04,t()*6);let c=Bh.palm_tree,l=Lh(e,`fruits`)?Math.round(Rh(e,`fruits`,4)):0;for(let e=0;e<l;e++){let t=Jh(c.kind,c.color,c.r*n),i=e/l*Math.PI*2;t.position.set(Math.cos(i)*.17*n,-.08*n,Math.sin(i)*.17*n),s.add(t),r.things.push({obj:t,kind:`coconut`,words:[`coconut`,`coconuts`,`fruit`],size:c.r*n,floats:!0,edible:!0,reach:`high`})}return Lh(e,`climbable`)&&(r.climb={top:2.9*n,trunkR:.18*n}),r}function Qh(e,t){let n=e.scale??1,r=Kh(.3*n,3*n,!1);r.vr=1.8*n,r.pivot.add(X(Y(.11*n,.15*n,1.9*n,`#7fa650`,.06,10),0,.95*n,0));for(let e=0;e<6;e++){let i=X(new R,0,1.85*n,0);i.rotation.y=e/6*Math.PI*2+t();let a=fm(new Ja(1,12,6),e%2?`#5fae55`:`#4caf50`,.04);a.scale.set(1*n,.06*n,.32*n),a.position.set(.85*n,.25*n,0),a.rotation.z=.35,i.add(a),r.pivot.add(i),qh(r,i,.09,t()*6)}if(Lh(e,`fruits`)){let e=Jh(`banana`,`#facc15`,.07*n,2.2);e.position.set(0,1.62*n,.22*n),e.scale.setScalar(1.4*n),r.pivot.add(e),r.things.push({obj:e,kind:`banana`,words:[`banana`,`bananas`,`fruit`],size:.15,floats:!0,edible:!0,reach:`low`})}return r}function $h(e,t,n){let r=e.scale??1,i=Kh(.75*r,1.1*r,!1),a=Z(t,Wh),o=new R;i.pivot.add(o);for(let e=0;e<5;e++){let n=e/5*Math.PI*2;o.add(X(J((.42+t()*.15)*r,gm(a,(e%3-1)*14),.05,12),Math.cos(n)*.35*r,(.4+t()*.2)*r,Math.sin(n)*.3*r))}if(o.add(X(J(.5*r,a,.05,12),0,.65*r,0)),qh(i,o,.035,t()*6),n&&Lh(e,`fruits`)){let n=Math.round(Rh(e,`fruits`,8));for(let e=0;e<n;e++){let a=Jh(`berry`,`#7c3aed`,.04*r),s=e/n*Math.PI*2+t()*.4;a.position.set(Math.cos(s)*.62*r,(.45+t()*.45)*r,Math.sin(s)*.55*r+.1*r),o.add(a),i.things.push({obj:a,kind:`berry`,words:[`berry`,`berries`,`fruit`],size:.04,floats:!0,edible:!0,reach:`low`})}}return i}function eg(e,t){let n=Kh(0,.5,!1),r=Math.round(Rh(e,`count`,14)),i=Rh(e,`radius`,1.4),a=[`#f43f5e`,`#facc15`,`#ffffff`,`#a855f7`,`#fb923c`,`#38bdf8`];for(let o=0;o<r;o++){let r=new R,o=.25+t()*.2;r.add(X(Y(.008,.01,o,`#3f9d4a`,0,4),0,o/2,0));let s=X(new R,0,o,0),c=Z(t,a);for(let e=0;e<5;e++){let t=e/5*Math.PI*2,n=J(.035,c,.1,6);n.scale.set(1,.4,1),s.add(X(n,Math.cos(t)*.04,0,Math.sin(t)*.04))}s.add(J(.022,`#fde047`,.1,6)),r.add(s);let l=t()*Math.PI*2,u=Math.sqrt(t())*i;r.position.set(Math.cos(l)*u,0,Math.sin(l)*u),n.pivot.add(r),qh(n,r,.12,t()*6),Lh(e,`pickable`)&&n.things.push({obj:r,kind:`flower`,words:[`flower`,`flowers`,`rose`],size:.06,floats:!0,edible:!1,reach:`ground`})}return n}function tg(e,t){let n=Kh(Rh(e,`radius`,1.6),1.1,!1),r=Rh(e,`radius`,1.6),i=Math.round(r*r*22),a=new Na(.035,1,3);a.translate(0,.5,0);for(let e=0;e<i;e++){let i=new B(a,um(Z(t,[`#9ab65a`,`#b5c96b`,`#86a84a`,`#c9b458`]))),o=t()*Math.PI*2,s=Math.sqrt(t())*r;i.position.set(Math.cos(o)*s,0,Math.sin(o)*s),i.scale.set(1,.7+t()*.6,1),i.rotation.set((t()-.5)*.3,0,(t()-.5)*.3),n.pivot.add(i),e%3==0&&qh(n,i,.14,i.position.x*.8)}return n}function ng(e,t){let n=Kh(.3,.3,!1);for(let r=0;r<3;r++){let i=new R,a=.1+t()*.08;i.add(X(Y(.025,.03,a,`#fef3c7`,.08,8),0,a/2,0));let o=fm(new Ja(.08,12,8,0,Math.PI*2,0,Math.PI/2),`#dc2626`,.08);o.position.y=a,i.add(o);for(let e=0;e<4;e++)i.add(X(J(.012,`#ffffff`,0,5),Math.cos(e*1.7)*.045,a+.055,Math.sin(e*1.7)*.045));i.position.set((r-1)*.16,0,(t()-.5)*.15),n.pivot.add(i),Lh(e,`pickable`)&&n.things.push({obj:i,kind:`mushroom`,words:[`mushroom`,`mushrooms`],size:.08,floats:!0,edible:Lh(e,`eatable`),reach:`ground`})}return n}function rg(e,t){let n=e.scale??1,r=Kh(.75*n,.75*n,Lh(e,`solid`)),i=fm(new Fa(.7*n,1),Z(t,[`#9ca3af`,`#a8a29e`,`#8b8f97`]),.035);return i.scale.set(1.15,.62,.95),i.position.y=.3*n,i.rotation.y=t()*6,r.pivot.add(i),r.pivot.add(X(J(.18*n,`#6b8f4e`,.06,8),.4*n,.62*n,-.2*n)),r.seatH=.68*n,Lh(e,`pushable`)&&r.things.push({obj:r.pivot,kind:`rock`,words:[`rock`,`boulder`],size:.7*n,floats:!1,edible:!1,big:!0}),r}function ig(e,t){let n=Kh(0,.1,!1),r=Math.round(Rh(e,`count`,5));for(let e=0;e<r;e++){let e=fm(new Wa(.06+t()*.04,0),Z(t,[`#9ca3af`,`#78716c`,`#a8a29e`]),.08),r=t()*Math.PI*2,i=.2+t()*.9;e.position.set(Math.cos(r)*i,.05,Math.sin(r)*i),n.pivot.add(e),n.things.push({obj:e,kind:`stone`,words:[`stone`,`stones`,`pebble`,`rock`],size:.08,floats:!1,edible:!1,reach:`ground`})}return n}function ag(e,t){let n=e.scale??1,r=Rh(e,`len`,1.7)*n,i=Kh(r/2,.45*n,Lh(e,`solid`)),a=new R,o=Y(.22*n,.22*n,r,Z(t,Uh),.05,14);o.rotation.z=Math.PI/2,a.add(o);for(let e of[-1,1]){let t=new B(new ja(.2*n,14),um(`#d6a96b`));t.position.x=e*(r/2+.001),t.rotation.y=e*Math.PI/2,a.add(t)}return a.position.y=.22*n,i.pivot.add(a),i.seatH=.44*n,i.things.push({obj:i.pivot,kind:`log`,words:[`log`,`wood`],size:.4*n,floats:!0,edible:!1,big:!0}),i}function og(e){let t=e.scale??1,n=Kh(.35*t,.42*t,!0);n.pivot.add(X(Y(.3*t,.36*t,.42*t,`#7a4b24`,.05,14),0,.21*t,0));let r=new B(new ja(.29*t,14),um(`#d6a96b`));return r.rotation.x=-Math.PI/2,r.position.y=.421*t,n.pivot.add(r),n.seatH=.44*t,n}function sg(e){let t=Kh(0,Rh(e,`height`,1.6),!1);return t.hill={r:Rh(e,`radius`,6)*(e.scale??1),h:Rh(e,`height`,1.6)*(e.scale??1)},t}function cg(e,t,n,r,i){let a=X(new R,-t/2,0,r+.02),o=q(t,n,.06,i,.02);o.position.set(t/2,n/2,0),a.add(o),a.add(X(J(.035,`#fbbf24`,.1,8),t-.12,n*.5,.05)),e.pivot.add(a),e.door={pivot:a,front:new L(0,0,r+.85),inside:new L(0,0,r-1)}}function lg(e,t){let n=e.scale??1,r=Kh(1.9*n,3.4*n,Lh(e,`solid`)),i=3*n,a=2.6*n,o=2.2*n,s=Z(t,[`#c08552`,`#d4a373`,`#b5835a`,`#e0b48a`]);r.pivot.add(X(q(i,o,.12,s),0,o/2,-a/2)),r.pivot.add(X(q(.12,o,a,s),-i/2,o/2,0),X(q(.12,o,a,s),i/2,o/2,0));let c=.9*n,l=1.75*n;r.pivot.add(X(q((i-c)/2,o,.12,s),-(i+c)/4,o/2,a/2),X(q((i-c)/2,o,.12,s),(i+c)/4,o/2,a/2)),r.pivot.add(X(q(c,o-l,.12,s),0,l+(o-l)/2,a/2));let u=new B(new Ka(i-.2,o),new Oi({color:2825492}));u.position.set(0,o/2,-a/2+.07),r.pivot.add(u);let d=new B(new Ka(i,a),um(`#5b4030`));d.rotation.x=-Math.PI/2,d.position.y=.01,r.pivot.add(d);let f=fm(new Na(Math.max(i,a)*.86,1.5*n,4),Z(t,[`#d9b26f`,`#c9a25e`,`#b8904e`]),.03);return f.rotation.y=Math.PI/4,f.scale.set(1,1,a/i+.1),f.position.y=o+.72*n,r.pivot.add(f),r.pivot.add(X(q(.6*n,.5*n,.05,`#3b2a1e`),i/2+.07,1.35*n,.2)),cg(r,c,l,a/2,Z(t,[`#7c4a21`,`#8b5a2b`,`#5b3a1a`])),r}function ug(e,t){let n=e.scale??1,r=Kh(2.4*n,4.6*n,Lh(e,`solid`)),i=4.2*n,a=3.2*n,o=2.8*n,s=Z(t,[`#fde68a`,`#fecaca`,`#bfdbfe`,`#d9f99d`,`#fbcfe8`,`#f5f5f4`]),c=1*n,l=2*n;r.pivot.add(X(q(i,o,.15,s),0,o/2,-a/2)),r.pivot.add(X(q(.15,o,a,s),-i/2,o/2,0),X(q(.15,o,a,s),i/2,o/2,0)),r.pivot.add(X(q((i-c)/2,o,.15,s),-(i+c)/4,o/2,a/2),X(q((i-c)/2,o,.15,s),(i+c)/4,o/2,a/2)),r.pivot.add(X(q(c,o-l,.15,s),0,l+(o-l)/2,a/2));let u=new B(new Ka(i-.3,o),new Oi({color:3813162}));u.position.set(0,o/2,-a/2+.09),r.pivot.add(u);let d=Z(t,[`#b91c1c`,`#9a3412`,`#475569`,`#7c2d12`]);for(let e of[-1,1]){let t=q(i/2+.5,.12,a+.6,d,.02);t.position.set(e*i/4.2,o+.75*n,0),t.rotation.z=-e*.62,r.pivot.add(t)}let f=fm(new Ma(.01,i/2,1.3*n,3),s,.02);f.rotation.set(Math.PI/2,0,0),f.scale.set(1,a/(1.3*n),1),r.pivot.add(X(q(.5*n,1*n,.5*n,`#78716c`),i/4,o+1.2*n,-a/5));for(let e of[-1,1]){let t=X(new R,e*i*.3,1.55*n,a/2+.09);t.add(q(.75*n,.65*n,.04,`#ffffff`),X(q(.65*n,.55*n,.05,`#7dd3fc`,0),0,0,.01)),r.pivot.add(t)}return cg(r,c,l,a/2,Z(t,[`#7c2d12`,`#1e3a8a`,`#14532d`,`#6b21a8`])),r.door.front.z+=.1,r}function dg(e,t){let n=e.scale??1,r=Kh(1.4*n,1.8*n,Lh(e,`solid`)),i=Z(t,[`#f97316`,`#16a34a`,`#2563eb`,`#dc2626`,`#eab308`]),a=1.05*n,o=2.3*n,s=fm(new Ma(a,a,o,3,1,!1),i,.03);s.rotation.x=-Math.PI/2,s.position.y=a*.5,r.pivot.add(s);let c=new B(new ja(a*.55,3),new Oi({color:2038295}));return c.rotation.z=Math.PI/2,c.position.set(0,a*.3,o/2+.01),r.pivot.add(c),r.pivot.add(X(Y(.025,.025,a*1.7,`#78350f`,.08,6),0,a*.75,o/2+.05)),r.flap=!0,r.door={pivot:new R,front:new L(0,0,o/2+.8),inside:new L(0,0,0)},r}function fg(e,t){let n=Rh(e,`len`,6)*(e.scale??1),r=Kh(n/2,1.1,Lh(e,`solid`)),i=Z(t,[`#f5f5f4`,`#a16207`,`#92400e`]);for(let e=-n/2;e<=n/2+.01;e+=1)r.pivot.add(X(q(.1,1.05,.1,i),e,.52,0));for(let e of[.4,.82])r.pivot.add(X(q(n,.09,.05,i),0,e,.05));return r}function pg(e,t){let n=e.scale??1,r=Rh(e,`height`,5.5)*n,i=Kh(4.2*n,r+1,Lh(e,`solid`));i.vr=1;let a=Z(t,[`#8b8f97`,`#9c8f80`,`#7d7f86`]);for(let e=0;e<26;e++){let o=(e%2?1:-1)*(1.5+t()*3.2)*n,s=t()*r,c=-.6-t()*1.4,l=fm(new Fa((1+t()*.8)*n,0),gm(a,Math.round((t()-.5)*30)),.03);l.position.set(o,s,c),l.rotation.set(t()*3,t()*3,t()*3),l.scale.y=1.2,i.pivot.add(l)}i.pivot.add(X(q(2.6*n,r,2.2*n,gm(a,-25),.02),0,r/2,-1.6*n));for(let e of[-1,1]){let a=J(1.3*n,`#5fae55`,.04,12);a.scale.y=.55,a.position.set(e*3.2*n,r+.35*n,-1*n),i.pivot.add(a),qh(i,a,.02,t()*6)}let o=vm(128,256,e=>{e.fillStyle=`#4fb3e8`,e.fillRect(0,0,128,256);let t=hm(11);for(let n=0;n<40;n++){e.strokeStyle=t()<.5?`rgba(255,255,255,0.75)`:`rgba(190,230,255,0.9)`,e.lineWidth=2+t()*4;let n=t()*128,r=t()*256;e.beginPath(),e.moveTo(n,r),e.lineTo(n+(t()-.5)*4,r+30+t()*60),e.stroke()}});o.wrapS=o.wrapT=h,o.repeat.set(1,r/3);let s=new B(new Ka(2.3*n,r),new Oi({map:o,transparent:!0,opacity:.93}));s.position.set(0,r/2,-.35*n),i.pivot.add(s);let c=new B(new Ka(2.3*n,1.6*n),new Oi({map:o}));c.rotation.x=-Math.PI/2,c.position.set(0,r+.02,-1.15*n),i.pivot.add(c);let l=[];for(let e=0;e<9;e++){let r=new B(new Ja((.35+t()*.25)*n,10,8),new Oi({color:16777215,transparent:!0,opacity:.85}));r.position.set((e/8-.5)*2.4*n,.1,(t()-.3)*.6*n),r.scale.y=.6,i.pivot.add(r),l.push(r)}return i.update=e=>{o.offset.y=e*.045%1,l.forEach((t,n)=>{let r=.8+.3*Math.sin(e*.35+n*1.7);t.scale.set(r,.6*r,r)})},i}function mg(e){let t=Kh(.75,2.2,!0);t.pivot.add(X(Y(.65,.7,.75,`#9ca3af`,.04,16),0,.37,0));let n=new B(new ja(.55,16),um(`#1d4ed8`));n.rotation.x=-Math.PI/2,n.position.y=.6,t.pivot.add(n);for(let e of[-1,1])t.pivot.add(X(Y(.05,.05,1.5,`#7c4a21`),e*.62,1.4,0));let r=fm(new Na(.95,.6,4),`#b91c1c`,.03);r.rotation.y=Math.PI/4,r.position.y=2.35,t.pivot.add(r);{let e=X(Y(.04,.04,1.3,`#7c4a21`),0,1.9,0);e.rotation.z=Math.PI/2,t.pivot.add(e)}return t.pivot.add(X(Y(.006,.006,.6,`#d6d3d1`,0,4),0,1.6,0),X(Y(.13,.1,.18,`#78716c`),0,1.25,0)),t}function hg(e,t){let n=Kh(.9,.9,Lh(e,`solid`)),r=Z(t,[`#a16207`,`#92400e`,`#7c4a21`]);n.pivot.add(X(q(1.8,.07,.45,r),0,.45,0),X(q(1.8,.35,.06,r),0,.7,-.22));for(let e of[-.8,.8])n.pivot.add(X(q(.07,.45,.4,`#374151`),e,.22,0));return n.seatH=.48,n}function gg(e){let t=Kh(.6,.8,Lh(e,`solid`));for(let e=0;e<9;e++){let n=e/9*Math.PI*2;t.pivot.add(X(J(.1,e%2?`#9ca3af`:`#78716c`,.08,8),Math.cos(n)*.48,.06,Math.sin(n)*.48))}for(let e of[.3,1.4,2.5]){let n=Y(.06,.06,.75,`#7c4a21`,.06,8);n.rotation.set(Math.PI/2-.35,e,0),n.position.y=.15,t.pivot.add(n)}let n=new R,r=[];for(let e=0;e<4;e++){let t=new B(new Na(.28-e*.05,.95-e*.16,10),new Oi({color:[`#ef4444`,`#f97316`,`#fb923c`,`#fde047`][e],transparent:!0,opacity:.92}));t.position.set((e%2?.06:-.06)*!!e,.5-e*.06,0),n.add(t),r.push(t)}let i=new qo(16752704,10,8,1.4);return i.position.y=.7,n.add(i),t.pivot.add(n),t.fire={group:n,flames:r,light:i},t}function _g(e){let t=e.scale??1,n=Kh(.45,2.3*t,!1),r=2.3*t,i=new R;i.rotation.x=-.18;for(let e of[-1,1])i.add(X(q(.06,r,.06,`#b45309`,.04),e*.27,r/2,0));for(let e=.35;e<r-.1;e+=.36)i.add(X(q(.56,.05,.12,`#d97706`,.04),0,e,0));i.position.z=.2;let a=new R;a.rotation.x=.2;for(let e of[-1,1])a.add(X(q(.05,r,.05,`#92400e`,.04),e*.25,r/2,0));return a.position.z=-.25,n.pivot.add(i,a),n.climb={top:r-.75,trunkR:.12,ladder:!0},n}function vg(e){let t=Kh(.2,2,!1);t.pivot.add(X(Y(.05,.05,1.8,`#7c4a21`),0,.9,0));let n=new B(new ka(1.3,.45,.05),[um(`#a16207`),um(`#a16207`),um(`#a16207`),um(`#a16207`),new Oi({map:_m(zh(e,`text`,`JUNGLE`).toUpperCase(),`#d6a96b`,`#3b2a1e`,512,176,`bold 92px Arial`)}),um(`#a16207`)]);return n.position.set(0,1.55,.03),t.pivot.add(n),t}function yg(e,t){let n=Kh(.15,.3,!1),r=new R;r.add(J(.13,Z(t,[`#ffffff`,`#ef4444`,`#3b82f6`,`#facc15`]),.08,16));for(let e=0;e<3;e++){let t=new B(new Ya(.131,.012,6,24),um(`#1f2937`));t.rotation.set(e*1.05,e*.7,0),r.add(t)}return r.position.y=.13,n.pivot.add(r),n.things.push({obj:r,kind:`ball`,words:[`ball`,`football`],size:.13,floats:!0,edible:!1,reach:`ground`}),n}function bg(e,t){let n=Kh(.3,.4,!1),r=new R,i=fm(new Ma(.25,.18,.28,14,1,!0),`#b45309`,.04);i.material.side=2,i.position.y=.14,r.add(i);for(let e=0;e<6;e++)r.add(X(J(.07,Z(t,[`#dc2626`,`#f59e0b`,`#f97316`,`#84cc16`]),.08,10),Math.cos(e)*.12,.26+e%2*.05,Math.sin(e)*.12));let a=new B(new Ya(.22,.015,6,20,Math.PI),um(`#92400e`));return a.position.y=.28,r.add(a),n.pivot.add(r),n.things.push({obj:r,kind:`basket`,words:[`basket`],size:.25,floats:!0,edible:!1,reach:`ground`}),n}function xg(e){let t=Kh(.45,.7,Lh(e,`solid`)),n=new R;n.add(X(q(.7,.7,.7,`#c08552`,.03),0,.35,0));for(let e of[.1,.6])n.add(X(q(.72,.08,.72,`#92400e`,.02),0,e,0));return t.pivot.add(n),t.seatH=.72,t.things.push({obj:t.pivot,kind:`box`,words:[`box`,`crate`,`chest`],size:.4,floats:!0,edible:!1,big:!0}),t}function Sg(){let e=new R;e.add(X(Y(.022,.025,.75,`#a16207`,.08,6),0,.37,0));let t=q(.2,.12,.035,`#9ca3af`,.06);return t.position.set(.07,.68,0),e.add(t),e}function Cg(){let e=new R;return e.add(X(Y(.012,.022,1.7,`#78350f`,.08,6),0,.85,0)),e.add(X(Y(.035,.035,.04,`#374151`,.08,8),0,.25,.03)),e}function wg(e){let t=Kh(.2,.8,!1),n=Sg();return n.rotation.z=.35,t.pivot.add(n),t.things.push({obj:n,kind:`axe`,words:[`axe`,`hatchet`],size:.3,floats:!0,edible:!1,reach:`ground`}),t}function Tg(e,t){let n=Kh(1.1,.6,!1),r=Z(t,[`#b45309`,`#dc2626`,`#2563eb`,`#f5f5f4`]),i=fm(new Ma(.55,.55,2.2,16,1,!0,Math.PI/2,Math.PI),r,.03);if(i.material.side=2,i.rotation.set(0,0,Math.PI/2),i.scale.set(1,1,.75),i.position.y=.35,n.pivot.add(i),n.pivot.add(X(q(.08,.06,.75,`#78350f`),.4,.28,0),X(q(.08,.06,.75,`#78350f`),-.4,.28,0)),n.seatH=.3,n.boat=!0,e.opts?.rower){let t=Om(Jp(zh(e,`who`,`boatman`),!1));t.root.position.set(0,.3+.04-.62,0),t.root.rotation.y=Math.PI/2,n.pivot.add(t.root);let r=[-1,1].map(e=>{let t=new R;t.position.set(.05,.55,e*.45);let r=Y(.02,.02,1.6,`#78350f`,.08,6);r.rotation.x=Math.PI/2,r.position.z=e*.6;let i=q(.12,.02,.35,`#a16207`,.06);return i.position.z=e*1.35,t.add(r,i),n.pivot.add(t),{g:t,sd:e}}),i={expr:`happy`,mouth:null,talk:0,blink:!1,look:`center`,tears:!1,sweat:!1,hold:``,lie:!1};n.rower=(e,n)=>{let a=e*.16,o=Math.sin(a)*n,s={x:0,y:.3+.04-.62,z:0,yaw:Math.PI/2,roll:0,spine:.15+o*.25,spineZ:0,headX:0,headY:0,headZ:0,lsx:-1.3-o*.5,lsz:.45,lex:-.5-o*.4,lez:0,rsx:-1.3-o*.5,rsz:-.45,rex:-.5-o*.4,rez:0,lhx:-1.5,lk:1.4,rhx:-1.5,rk:1.4};t.apply(s,{...i,blink:e%97<4},e);for(let e of r)e.g.rotation.set(-e.sd*(.25+Math.cos(a)*.25*n),Math.sin(a)*.6*n*e.sd,0)},n.rower(0,1)}return n}function Eg(e,t){let n=e.scale??1,r=Kh(.4*n,4.2*n,Lh(e,`solid`));r.vr=1.3*n;let i=Z(t,[`#5b4636`,`#6b5444`,`#4a3b30`]),a=e.opts?.snow===!0;r.pivot.add(X(Y(.16*n,.24*n,2.8*n,i,.06,10),0,1.4*n,0));let o=(e,n,r,s)=>{let c=s>1?3:2;for(let l=0;l<c;l++){let c=new R;c.position.y=n*(.55+l*.18),c.rotation.set((t()-.5)*1.4,t()*6,.5+t()*.5);let u=Y(r*.6,r,n*.7,i,.08,6);if(u.position.y=n*.35,c.add(u),a){let e=q(r*2.2,.03,r*2.2,`#ffffff`,0);e.position.y=n*.5,c.add(e)}e.add(c),s>0&&o(c,n*.7,r*.6,s-1)}},s=X(new R,0,1.6*n,0);r.pivot.add(s);for(let e=0;e<4;e++){let a=X(new R,0,e*.35*n,0);a.rotation.y=e*1.7+t();let c=new R;c.rotation.z=.7+t()*.3,a.add(c);let l=Y(.05*n,.09*n,1.2*n,i,.07,7);l.position.y=.6*n,c.add(l),o(c,1.1*n,.05*n,1),s.add(a),qh(r,a,.03,t()*6),r.branches.push({group:a,low:e===0,leaves:c})}return Lh(e,`climbable`)&&(r.climb={top:1.2*n,trunkR:.2*n}),r}function Dg(e,t){let n=Om(Jp(zh(e,`who`,`villager`),e.opts?.female===!0));n.root.traverse(e=>{e.castShadow=!e.userData.outline});let r=Kh(.3,1.7,!1);return r.pivot.add(n.root),r.person={h:n,ph:t()*6},r}function Og(e){let t=Rh(e,`len`,5)*(e.scale??1),n=Kh(t/2,1.2,!1),r=1.4;for(let e=-t/2;e<=t/2;e+=.3){let i=.32*(1-(2*e/t)**2)+.06;n.pivot.add(X(q(.26,.06,r,`#a16207`,.04),e,i,0))}for(let e of[-1,1]){for(let i=-t/2;i<=t/2+.01;i+=t/4){let a=.32*(1-(2*i/t)**2);n.pivot.add(X(q(.07,.9,.07,`#78350f`,.04),i,a+.45,e*r/2))}for(let i=0;i<12;i++){let a=-t/2+i/12*t,o=a+t/12,s=.32*(1-(2*a/t)**2)+.85,c=.32*(1-(2*o/t)**2)+.85,l=q(Math.hypot(o-a,c-s)+.02,.05,.05,`#92400e`,.04);l.position.set((a+o)/2,(s+c)/2,e*r/2),l.rotation.z=Math.atan2(c-s,o-a),n.pivot.add(l)}}return n.bridge={len:t,width:r},n}function kg(e,t){let n=Kh(.3,.2,!1),r=zh(e,`kind`,`mango`).toLowerCase(),i=Object.values(Bh).find(e=>e.kind===r)??{kind:r,color:Z(t,[`#f59e0b`,`#dc2626`,`#84cc16`]),r:.08},a=Math.max(1,Math.min(8,Math.round(Rh(e,`count`,3))));for(let e=0;e<a;e++){let r=Jh(i.kind,i.color,i.r,i.long??1);r.rotation.z=Math.PI/2,r.position.set((e-(a-1)/2)*i.r*2.4,i.r,(t()-.5)*.1),n.pivot.add(r),n.things.push({obj:r,kind:i.kind,words:[i.kind,i.kind+`s`,`fruit`],size:i.r,floats:!0,edible:!0,reach:`ground`})}return n}function Ag(e){let t=Rh(e,`size`,.42)*(e.scale??1),n=Kh(Math.max(.2,t*.4),t,t>1.2&&Lh(e,`solid`)),r=zh(e,`word`,`gift`).toLowerCase(),i=new R,a=new xi(new si({transparent:!0,depthWrite:!1,color:16777215}));return a.visible=!1,a.center.set(.5,.1),a.scale.set(t,t,1),a.userData.iconWord=r,i.add(a),n.pivot.add(i),t<=1.2&&Lh(e,`pickable`)&&n.things.push({obj:i,kind:r,words:[r,r+`s`],size:t*.43,floats:!0,edible:e.opts?.edible===!0,reach:`ground`}),n}function jg(e,t){let n=Kh(0,8,!1),r=Math.round(Rh(e,`count`,5)),i=[];for(let e=0;e<r;e++){let e=new R,r=Z(t,[`#1f2937`,`#f8fafc`,`#3b82f6`,`#ef4444`]),a=J(.09,r,.08,8);a.scale.set(.8,.8,1.6),e.add(a);let o=new R,s=new R;for(let[t,n]of[[o,1],[s,-1]]){let i=q(.26,.015,.12,r,.06);i.position.x=n*.13,t.add(i),e.add(t)}i.push({g:e,wl:o,wr:s,ph:t()*6,rad:4+t()*6,h:5+t()*4,sp:.006+t()*.006}),n.pivot.add(e)}return n.update=e=>{for(let t of i){let n=t.ph+e*t.sp;t.g.position.set(Math.cos(n)*t.rad,t.h+Math.sin(e/30+t.ph)*.4,Math.sin(n)*t.rad*.6),t.g.rotation.y=-n;let r=Math.sin(e*.9+t.ph)*.7;t.wl.rotation.z=r,t.wr.rotation.z=-r}},n}function Mg(e,t){let n=Kh(0,1.5,!1),r=Math.round(Rh(e,`count`,4)),i=[];for(let e=0;e<r;e++){let e=new R,r=Z(t,[`#f472b6`,`#facc15`,`#60a5fa`,`#fb923c`,`#a78bfa`]),a=new R,o=new R;for(let[t,n]of[[a,1],[o,-1]]){let i=new B(new ja(.06,8),new Oi({color:r,side:2}));i.position.x=n*.06,i.rotation.x=-Math.PI/2,t.add(i),e.add(t)}e.add(Y(.008,.008,.08,`#1f2937`,0,4)),e.children[e.children.length-1].rotation.x=Math.PI/2,i.push({g:e,wl:a,wr:o,ph:t()*6}),n.pivot.add(e)}return n.update=e=>{for(let t of i){let n=e/70+t.ph;t.g.position.set(Math.sin(n*1.3)*1.6+Math.sin(n*3.1)*.3,.7+Math.sin(n*2.3)*.4,Math.cos(n)*1.2),t.g.rotation.y=n*2;let r=Math.sin(e*1.4+t.ph)*1.1;t.wl.rotation.z=r,t.wr.rotation.z=-r}},n}function Ng(e,t){let n=zh(e,`species`,`cow`),r=Mm(Iu(n)??Lu(n)),i=Kh(.6,r.height,!1);i.pivot.add(r.root),i.creature=r;let a=t()*6,o=Rh(e,`radius`,2.5),s=Lh(e,`wander`);return i.update=e=>{let t=(e+a*100)%400,n=s&&t<220,i=s?(Math.floor((e+a*100)/400)*220+Math.min(t,220))/260:0,c=Math.sin(i+a)*o,l=Math.sin(i*1.7+a)*o*.5,u=Math.cos(i+a)*o,d=Math.cos(i*1.7+a)*o*.85;r.root.position.set(c,0,l),n&&(r.root.rotation.y=Math.atan2(u,d)-Math.PI/2),r.animate({n:e,walking:n,talk:0,blink:e%97<4,expr:`happy`})},i}function Pg(e){let t=Kh(0,0,!1);return t.water=e.type===`river`||e.type===`path`?{kind:e.type,pts:e.points??[[-30,-6],[30,-6]],width:Rh(e,`width`,e.type===`path`?1.6:3.2)}:{kind:`pond`,radius:Rh(e,`radius`,3.2)*(e.scale??1)},t}var Fg=e=>(e??0)*Math.PI/180,Ig=(e,t,n)=>{let r=Array.isArray(e)?e.slice(0,t).map(e=>typeof e==`number`&&Number.isFinite(e)?e:0):[];for(;r.length<t;)r.push(n[r.length]??0);return r},Lg=(e,t,n)=>Math.max(t,Math.min(n,e));function Rg(e,t){return typeof e==`string`&&/^#?[0-9a-fA-F]{3,8}$|^[a-z]+$/.test(e)?e.startsWith(`#`)||/^[a-z]+$/.test(e)?e:`#`+e:t}function zg(e,t,n){let r=e.scale??1,i=Kh(.5,1,!1);if(!t||!Array.isArray(t.parts)||!t.parts.length)return i.pivot.add(X(q(.6,.6,.6,`#a3a3a3`),0,.3,0)),i;let a=new R;a.scale.setScalar(r),i.pivot.add(a);let o=n=>e.traits&&n in e.traits&&e.traits[n]===!1?!1:!!t.abilities?.includes(n)||!!e.traits?.[n];i.abilities=[...t.abilities??[]],i.wheels=[],i.smokes=[];for(let e of t.parts.slice(0,160)){let t=Rg(e.color,`#9ca3af`),o,s=e.glass||e.glow||e.shape===`plane`||e.shape===`text`?0:.03;if(e.shape===`box`){let[n,r,i]=Ig(e.size,3,[1,1,1]);o=q(Lg(n,.01,200),Lg(r,.01,60),Lg(i,.01,200),t,s)}else if(e.shape===`cylinder`)o=Y(Lg(e.radiusTop??e.radius??.3,.005,40),Lg(e.radius??.3,.005,40),Lg(e.height??1,.01,80),t,s,18);else if(e.shape===`sphere`)o=J(Lg(e.radius??.4,.01,40),t,s,16);else if(e.shape===`cone`)o=mm(Lg(e.radius??.5,.01,40),Lg(e.height??1,.01,80),t,s,16);else if(e.shape===`torus`)o=fm(new Ya(Lg(e.radius??.5,.02,40),Lg(e.tube??.08,.005,10),10,28),t,s);else if(e.shape===`text`){let[t,n]=Ig(e.size,2,[2,.6]),r=String(e.text??``).slice(0,40)||` `;o=new B(new Ka(Lg(t,.1,60),Lg(n,.05,20)),new Oi({map:_m(r,Rg(e.color,`#ffffff`),Rg(e.textColor,`#111827`),1024,Math.max(64,Math.round(1024*n/t)),`bold ${Math.round(Math.min(220,1024*n/t*.62))}px Arial`),side:2}))}else{let[n,r]=Ig(e.size,2,[1,1]);o=new B(new Ka(Lg(n,.01,200),Lg(r,.01,200)),um(t)),o.material.side=2}if(e.glass){let e=o.material;o.material=new Oi({color:e.color??t,transparent:!0,opacity:.45,depthWrite:!1})}e.glow&&(o.material=new Oi({color:t}));let[c,l,u]=Ig(e.pos,3,[0,.5,0]),[d,f,p]=Ig(e.rot,3,[0,0,0]);if(e.wheel&&e.shape===`cylinder`&&!d&&!p&&(d=90),e.door){let t=Ig(e.size,3,[.9,2,.06])[0]??.9,n=new R;n.position.set(c-t/2,l,u),n.rotation.set(Fg(d),Fg(f),Fg(p)),o.position.set(t/2,0,0),n.add(o),a.add(n),i.door={pivot:n,front:new L(c,0,u+.85).multiplyScalar(r),inside:new L(c*r,0,(u-1.2)*r)};continue}if(o.position.set(c,l,u),o.rotation.set(Fg(d),Fg(f),Fg(p)),a.add(o),e.wheel&&i.wheels.push({o,q:o.quaternion.clone(),r:Math.max(.05,(e.radius??.4)*r)}),e.smoke&&i.smokes.push(o),e.sway&&qh(i,o,.12,n()*6),e.spin){let t=e.spin,n=o.quaternion.clone();i.update=(e=>(r,i)=>{e?.(r,i),o.quaternion.copy(n).multiply(new Yt().setFromAxisAngle(new L(0,1,0),r/24*t*Math.PI*2))})(i.update)}}a.updateMatrixWorld(!0);let s=new _r().setFromObject(a),c=s.getCenter(new L);a.position.set(-c.x,-s.min.y,-c.z),i.door&&(i.door.front.x-=c.x,i.door.front.z-=c.z,i.door.inside.x-=c.x,i.door.inside.z-=c.z),a.updateMatrixWorld(!0);let l=new _r().setFromObject(a),u=l.getSize(new L);if(i.height=Math.max(.2,l.max.y),i.radius=Math.max(.3,Math.min(Math.max(u.x,u.z)/2,3)),i.vr=i.height>1.3?Math.min(Math.max(u.x,u.z)/2,4):.01,i.length=u.x,i.solid=o(`solid`)&&Math.max(u.x,u.z)<7,o(`sittable`)&&(i.seatH=t.seat_height??Math.min(1.2,i.height)),o(`climbable`)&&(i.climb={top:Math.max(.5,(t.climb_height??i.height)-1),trunkR:Math.min(.6,u.z/2),ladder:!0}),t.floor&&i.height<1.6){let e=l.getCenter(new L);i.floorTop={w:u.x,d:u.z,h:l.max.y,cx:e.x,cz:e.z}}return o(`enterable`)&&!i.door&&(i.flap=!0,i.door={pivot:new R,front:new L(0,0,l.max.z+.8),inside:new L(0,0,(l.min.z+l.max.z)/2)}),o(`pickable`)&&i.height<1.2&&Math.max(u.x,u.z)<1.5&&i.things.push({obj:i.pivot,kind:e.opts?.model??`thing`,words:[String(e.opts?.model??`thing`),String(t.label??``)].filter(Boolean),size:Math.max(u.x,u.y,u.z)/2,floats:!0,edible:o(`eatable`),big:i.height>.6,reach:`ground`}),i}var Bg={mango_tree:Yh,apple_tree:Yh,orange_tree:Yh,big_tree:Yh,pine_tree:Xh,palm_tree:Zh,banana_plant:Qh,bush:(e,t)=>$h(e,t,!1),berry_bush:(e,t)=>$h(e,t,!0),flowers:eg,tall_grass:tg,mushroom:ng,rock:rg,stones:ig,log:ag,stump:e=>og(e),hill:e=>sg(e),hut:lg,house:ug,tent:dg,fence:fg,well:e=>mg(e),waterfall:pg,bench:hg,campfire:e=>gg(e),ladder:e=>_g(e),signpost:e=>vg(e),ball:yg,basket:bg,fruit:kg,crate:e=>xg(e),axe:e=>wg(e),boat:Tg,item:e=>Ag(e),bridge:e=>Og(e),birds:jg,butterflies:Mg,animal:Ng,bare_tree:Eg,person:Dg,river:e=>Pg(e),pond:e=>Pg(e),path:e=>Pg(e)};function Vg(e,t,n=!1,r){if(e.type===`model`){let n=String(e.opts?.model??``),i=r?.[n],a=Mh(n,!0);i&&a&&a.abilities&&(i={...i,abilities:[...new Set([...i.abilities??[],...a.abilities])]});let o=zg(e,i??a??void 0,t);return o.root.userData.objId=e.id,o}let i=Bg[e.type];if(!i)return null;let a=i(e,t,n);return a.root.userData.objId=e.id,a}var Hg=16/576,Ug=class{group=new R;content=new R;free=new R;light;objects=[];things=[];waters=[];solids=[];doc;hills=[];bridges=[];floors=[];updates=[];particles=[];sprites=[];rings=[];grassMat=null;grassU={uTime:{value:0},uWind:{value:.5},uPush:{value:Array.from({length:16},()=>new L(999,999,0))}};waterTex=[];stageM=new bn;stageInv=new bn;r;leafTex;dropTex;bare;n0=0;n1=0;constructor(e,t={}){this.doc=e,this.bare=!!t.bare,this.r=hm((t.seed??7)*7919+e.objects.length);let n=e.stage??{x:0,z:0,rot:0};this.stageM.makeRotationY(n.rot).setPosition(n.x,0,n.z).invert(),this.stageInv.copy(this.stageM).invert(),this.content.applyMatrix4(this.stageM),this.group.add(this.content,this.free),this.leafTex=vm(64,64,e=>{e.fillStyle=`#4caf50`,e.beginPath(),e.ellipse(32,32,26,12,.6,0,Math.PI*2),e.fill(),e.strokeStyle=`#1b1b1b`,e.lineWidth=3,e.stroke()}),this.dropTex=vm(64,64,e=>{let t=e.createRadialGradient(32,32,2,32,32,30);t.addColorStop(0,`rgba(255,255,255,1)`),t.addColorStop(1,`rgba(190,225,255,0)`),e.fillStyle=t,e.fillRect(0,0,64,64)}),this.light=this.buildSky(),this.buildObjects(),e.room?this.buildRoom():this.bare||(this.buildGround(),this.buildGrass()),this.buildFish(),this.attachLife(),this.buildParticles()}toScene(e,t){return new L(e,0,t).applyMatrix4(this.stageM)}buildSky(){let e=this.doc,t={g:this.group,r:this.r,span:9,seed:1,updates:this.updates},n=e.time===`night`,r=e.time===`sunset`,i=n?{top:`#0b1640`,bottom:`#2b3a67`,sun:`#a5b4fc`,sunI:.75,hemi:.5,fog:`#1e2a50`}:r?{top:`#ff8a4c`,bottom:`#ffe3b8`,sun:`#ffb27a`,sunI:2,hemi:1.2,fog:`#ffd9b0`}:{top:`#5aaeff`,bottom:`#d9f0ff`,sun:`#fff3c4`,sunI:2.6,hemi:1.5,fog:`#cfe9ff`},a=e.ground===`jungle`,o=e.season===`winter`;if(e.room)return{skyTop:`#1f2937`,skyBottom:`#2a2633`,fog:`#2a2633`,fogNear:40,fogFar:140,hemiSky:`#fff7ed`,hemiGround:`#a8a29e`,hemi:n?.9:1.35,sun:`#fff3c4`,sunI:n?.6:1.6,sunPos:[3,8,6],night:n,indoor:!0};this.bare||(zm(t,i.top,i.bottom),Bm(t,n?`#f8f4d7`:r?`#ff7b3a`:`#ffe066`,n),n||Vm(t,7),e.ground!==`moon`&&Qm(t,n?`#3b4a6b`:e.ground===`snow`?`#c7d2fe`:`#9fb0c8`,e.ground===`snow`));let s=Math.max(e.fog??0,o?.45:0),c=o&&!n?`#dfe7ef`:a?n?`#14301c`:`#a9d8a0`:i.fog;return{skyTop:i.top,skyBottom:o&&!n?`#e2e8f0`:i.bottom,fog:c,fogNear:(a?14:30)*(1-s*.7),fogFar:(a?70:130)*(1-s*.55),hemiSky:i.top,hemiGround:`#556b3a`,hemi:i.hemi,sun:i.sun,sunI:i.sunI,sunPos:[8,14,10],night:n,indoor:!1}}buildObjects(){let e=this.doc.ground===`jungle`;for(let t of this.doc.objects){let n=Vg(t,hm(qg(t.id)+3),e,this.doc.models);if(!n)continue;let r=Ih.get(t.type),i=!!r?.line;if(n.abilities?.length){let e={...t.traits??{}};for(let t of n.abilities)e[t]===void 0&&(e[t]=!0);t.traits=e}i?this.content.add(n.root):(n.root.position.set(t.x,0,t.z),n.root.rotation.y=t.rot??0,t.type!==`hill`&&this.content.add(n.root)),this.content.updateMatrixWorld(!0);let a=i?this.toScene(t.points?.[0]?.[0]??t.x,t.points?.[0]?.[1]??t.z):t.type===`hill`?this.toScene(t.x,t.z):n.root.getWorldPosition(new L),o=(t.rot??0)-(this.doc.stage?.rot??0),s=n.door?n.door.front.clone():new L(0,0,n.radius+.45),c=n.root.localToWorld(s.clone()),l=[...r?.words??[],...t.name?[t.name.toLowerCase()]:[]];if(t.type===`animal`&&l.push(String(t.opts?.species??`animal`)),t.type===`model`){let e=String(t.opts?.model??``);l.push(e,...e.split(/[ _-]/),String(this.doc.models?.[e]?.label??``).toLowerCase())}t.type===`item`&&l.push(String(t.opts?.word??``)),t.type===`person`&&l.push(String(t.opts?.who??`person`));let u={o:t,b:n,pos:a,yaw:o,front:c,words:l,shakes:[],doors:[],litAt:n.fire&&(t.opts?.lit??!0)!==!1?-1e9:null};if(this.objects.push(u),n.solid&&this.solids.push({x:a.x,z:a.z,r:Math.max(.35,n.radius*(n.door?.95:.7))}),n.hill&&this.hills.push({x:a.x,z:a.z,r:n.hill.r,h:n.hill.h}),n.bridge){let e=n.root.matrixWorld.clone();this.bridges.push({m:e,inv:e.clone().invert(),len:n.bridge.len,w:n.bridge.width})}n.water&&this.buildWater(u),n.floorTop&&!t.opts?.moves&&this.floors.push({inv:n.root.matrixWorld.clone().invert(),ft:n.floorTop}),this.updates.push(e=>u.b.update?.(e,this.doc.wind));for(let e of n.things){e.obj.updateMatrixWorld(!0);let n={...e,id:`${t.id}:${this.things.length}`,homeParent:e.obj.parent,homePos:e.obj.position.clone(),homeQuat:e.obj.quaternion.clone(),homeScale:e.obj.scale.clone(),owner:u,segs:[{f:-1e9,mode:`home`}],busyUntil:-1};n.obj.userData.thing=n.id,this.things.push(n)}}for(let e of this.objects){if(Ih.get(e.o.type)?.line||e.b.water||e.b.floorTop)continue;let t=this.heightAt(e.pos.x,e.pos.z,!0);t!==0&&(e.b.root.position.y+=t,e.pos.y=t,e.front.y=this.heightAt(e.front.x,e.front.z,!0)),e.b.boat&&(e.b.root.position.y=.02)}}waterTexture(e){let t=vm(256,128,t=>{t.fillStyle=e,t.fillRect(0,0,256,128),t.strokeStyle=gm(e,45),t.lineWidth=3,t.lineCap=`round`;let n=hm(5);for(let e=0;e<26;e++){let e=n()*128,r=n()*256,i=20+n()*40;t.beginPath(),t.moveTo(r,e),t.quadraticCurveTo(r+i/2,e-4,r+i,e),t.stroke()}t.fillStyle=`rgba(255,255,255,0.55)`;for(let e=0;e<30;e++)t.fillRect(n()*256,n()*128,3,2)});return t.wrapS=t.wrapT=h,this.waterTex.push(t),t}buildWater(e){let t=e.b.water,n=this.doc.time===`night`?`#1e3a8a`:this.doc.ground===`jungle`?`#2a9d8f`:`#3b9ae1`;if(t.kind===`river`||t.kind===`path`){let r=(t.pts??[]).map(([e,t])=>this.toScene(e,t));if(r.length<2)return;let i=new Ua(r),a=i.getLength(),o=Math.max(8,Math.ceil(a/.5)),s=[],c=[];for(let e=0;e<=o;e++)s.push(i.getPointAt(e/o)),c.push(i.getTangentAt(e/o));let l=(t.width??3)/2,u=(t,n,r,i)=>{let l=[],u=[],d=[];for(let e=0;e<=o;e++){let r=s[e],f=c[e],p=-f.z,m=f.x;if(l.push(r.x+p*t,n,r.z+m*t,r.x-p*t,n,r.z-m*t),u.push(e/o*a*i,0,e/o*a*i,1),e<o){let t=e*2;d.push(t,t+2,t+1,t+1,t+2,t+3)}}let f=new Xr;f.setAttribute(`position`,new Rr(l,3)),f.setAttribute(`uv`,new Rr(u,2)),f.setIndex(d),f.computeVertexNormals();let p=new B(f,r);return p.receiveShadow=!0,p.userData.objId=e.o.id,this.group.add(p),p};if(t.kind===`path`){u(l,.012,new oo({color:this.doc.ground===`snow`?`#e5e7eb`:`#c9a36b`}),1);return}u(l+.55,.008,new oo({color:this.doc.ground===`sand`?`#e8c77d`:`#b8955e`}),1);let d=this.waterTexture(n);u(l,.03,new Oi({map:d,transparent:!0,opacity:.86,depthWrite:!1}),1/6);let f=Lh(e.o,`flowing`)?.03:.004;this.updates.push(e=>{d.offset.x=-e*f/6*1});let p=(e,t)=>{let n=1e9,r=0;for(let i=0;i<=o;i++){let a=s[i],o=(a.x-e)**2+(a.z-t)**2;o<n&&(n=o,r=i)}return{i:r,d:Math.sqrt(n)}};this.waters.push({kind:`river`,obj:e,surface:.03,contains:(e,t)=>p(e,t).d<l,depthAt:(e,t)=>{let n=p(e,t).d;return n<l?.75*(1-(n/l)**2):0},nearest:(e,t)=>{let{i:n}=p(e,t),r=s[n],i=c[n],a=-i.z,o=i.x;return(e-r.x)*a+(t-r.z)*o<0&&(a=-a,o=-o),{x:r.x,z:r.z,bx:r.x+a*(l+.45),bz:r.z+o*(l+.45),tx:i.x,tz:i.z}},flow:(e,t)=>{let n=c[p(e,t).i];return[n.x*f,n.z*f]},half:l,along:(e,t,n,r)=>{let i=p(e,t).i,l=a/o,u=Math.max(0,Math.min(o-.001,i+n/l)),d=Math.floor(u),f=u-d,m=s[d],h=s[Math.min(o,d+1)],g=c[d],_=-g.z,v=g.x;return{x:m.x+(h.x-m.x)*f+_*r,z:m.z+(h.z-m.z)*f+v*r,dx:g.x,dz:g.z,nz:v}}})}else{let r=t.radius??3,i=e.pos.clone(),a=new B(new ja(r+.55,40),new oo({color:`#b8955e`}));a.rotation.x=-Math.PI/2,a.position.set(i.x,.008,i.z),this.group.add(a);let o=this.waterTexture(n);o.repeat.set(r/3,r/3);let s=new B(new ja(r,40),new Oi({map:o,transparent:!0,opacity:.86,depthWrite:!1}));s.rotation.x=-Math.PI/2,s.position.set(i.x,.03,i.z),s.userData.objId=e.o.id,this.group.add(s),this.updates.push(e=>{o.offset.set(Math.sin(e/90)*.05,e*6e-4)}),this.waters.push({kind:`pond`,obj:e,surface:.03,contains:(e,t)=>Math.hypot(e-i.x,t-i.z)<r,depthAt:(e,t)=>{let n=Math.hypot(e-i.x,t-i.z);return n<r?.8*(1-(n/r)**2):0},nearest:(e,t)=>{let n=Math.atan2(t-i.z,e-i.x);return{x:i.x+Math.cos(n)*r*.4,z:i.z+Math.sin(n)*r*.4,bx:i.x+Math.cos(n)*(r+.45),bz:i.z+Math.sin(n)*(r+.45),tx:-Math.sin(n),tz:Math.cos(n)}},flow:()=>[0,0],half:r,along:(e,t,n,a)=>{let o=r*.6+a,s=Math.atan2(t-i.z,e-i.x)+n/Math.max(.5,o);return{x:i.x+Math.cos(s)*o,z:i.z+Math.sin(s)*o,dx:-Math.sin(s),dz:Math.cos(s),nz:Math.sin(s)}}})}}heightAt(e,t,n=!1){let r=0;for(let n of this.hills){let i=Math.hypot(e-n.x,t-n.z);i<n.r&&(r+=n.h*.5*(1+Math.cos(Math.PI*i/n.r)))}for(let n of this.bridges){let r=new L(e,0,t).applyMatrix4(n.inv);if(Math.abs(r.x)<n.len/2&&Math.abs(r.z)<n.w/2)return .32*(1-(2*r.x/n.len)**2)+.09}for(let n of this.floors){let i=new L(e,0,t).applyMatrix4(n.inv);Math.abs(i.x-n.ft.cx)<n.ft.w/2&&Math.abs(i.z-n.ft.cz)<n.ft.d/2&&(r=Math.max(r,n.ft.h))}if(!n)for(let n of this.waters){let r=n.depthAt(e,t);if(r>0)return-r}return r}waterAt(e,t){for(let n of this.waters)if(n.contains(e,t))return n;return null}onBridge(e,t){for(let n of this.bridges){let r=new L(e,0,t).applyMatrix4(n.inv);if(Math.abs(r.x)<n.len/2&&Math.abs(r.z)<n.w/2)return!0}return!1}groundColor(){let e=this.doc.time===`night`;if(this.doc.season===`winter`&&this.doc.ground!==`snow`){let t={grass:`#a7b98c`,jungle:`#7f9c6a`,farm:`#b5b98a`,dirt:`#b49a76`,sand:`#d8c59a`,rock:`#a8a29e`,moon:`#9ca3af`,snow:`#f1f5f9`}[this.doc.ground]??`#a7b98c`;return e?gm(t,-70):t}if(this.doc.season===`autumn`&&this.doc.ground===`grass`)return e?gm(`#b5b55f`,-70):`#b5b55f`;let t={grass:`#8cc66b`,jungle:`#5e9e45`,sand:`#f2d48f`,snow:`#f1f5f9`,dirt:`#c9a36b`,rock:`#a8a29e`,farm:`#a3d977`,moon:`#9ca3af`}[this.doc.ground]??`#8cc66b`;return e?gm(t,-70):t}buildGround(){let e=new Ka(90,90,150,150);e.rotateX(-Math.PI/2);let t=e.getAttribute(`position`),n=new z(this.groundColor()),r=new z,i=[];for(let e=0;e<t.count;e++){let a=t.getX(e),o=t.getZ(e),s=this.onBridge(a,o);t.setY(e,s?this.heightAt(a,o,!0):this.heightAt(a,o)-(this.waterAt(a,o)?.02:0));let c=Math.sin(a*.35)*Math.cos(o*.41)+Math.sin(a*.11+o*.17);r.copy(n).offsetHSL(0,0,c*.025),this.waterAt(a,o)&&r.set(`#6b5a3e`),i.push(r.r,r.g,r.b)}for(let e of this.bridges);e.setAttribute(`color`,new Rr(i,3)),e.computeVertexNormals();let a=new B(e,new oo({vertexColors:!0}));a.receiveShadow=!0,this.group.add(a);let o=new B(new qa(90*.7,160,32),new oo({color:n}));o.rotation.x=-Math.PI/2,o.position.y=-.02,this.group.add(o);let s=hm(99+this.doc.objects.length);this.group,this.updates;let c=this.doc.ground;for(let e=0;e<46;e++){let e=s()*Math.PI*2,t=26+s()*22,n=Math.cos(e)*t,r=Math.sin(e)*t;if(r>8)continue;let i=1.2+s()*1.2;if(c===`sand`||c===`moon`){let e=J(3*i,gm(this.groundColor(),-10),0,12);e.scale.y=.3,e.position.set(n,0,r),this.group.add(e);continue}let a=new R,o=c===`snow`?`#2f7d4a`:Z(s,c===`jungle`?[`#2f7d3a`,`#2d6e3e`,`#3a8f45`]:[`#4caf50`,`#5fae55`,`#3f9d4a`,`#6fbf5a`]);a.add(X(new B(new Ma(.2*i,.28*i,2.4*i,6),new oo({color:`#7a4b24`})),0,1.2*i,0)),c===`snow`||s()<.3?a.add(X(new B(new Na(1.4*i,3.2*i,8),new oo({color:o})),0,3.4*i,0)):a.add(X(new B(new Ja(1.5*i,10,8),new oo({color:o})),0,3.3*i,0)),a.position.set(n,this.heightAt(n,r),r),this.group.add(a)}}buildGrass(){let e=this.doc.grass??+!![`grass`,`jungle`,`farm`].includes(this.doc.ground);if(e<=0)return;let t=[],n=[];for(let e=0;e<3;e++){let r=e/3*Math.PI+.3,i=Math.cos(r),a=Math.sin(r),o=(e-1)*.12;for(let[e,r]of[[-.045,0],[.045,0],[0,1]]){t.push(e*i+o*r,r,e*a+o*r*.5);let s=r;n.push(.55+s*.45,.6+s*.4,.5+s*.4)}}let r=new Xr;r.setAttribute(`position`,new Rr(t,3)),r.setAttribute(`color`,new Rr(n,3));let i=new Oi({vertexColors:!0,color:new z(this.groundColor()).offsetHSL(0,.05,.02),side:2}),a=this.grassU;i.onBeforeCompile=e=>{Object.assign(e.uniforms,a),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
uniform float uTime; uniform float uWind; uniform vec3 uPush[16];`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float hh = position.y;
  float kk = hh * hh;
  float wv = sin(uTime * 0.06 + ip.x * 0.45 + ip.z * 0.25) * 0.6 + sin(uTime * 0.17 + ip.x * 1.3) * 0.25;
  vec2 bend = vec2(wv * uWind * 0.45, wv * uWind * 0.18);
  for (int i = 0; i < 16; i++) {
    vec2 d = ip.xz - uPush[i].xy;
    float dist = length(d);
    float s = uPush[i].z * (1.0 - smoothstep(0.15, 0.7, dist));
    bend += normalize(d + vec2(0.0001)) * s * 1.6;
  }
  float sc = max(0.05, length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2])));
  transformed.xz += bend * kk / sc;
  transformed.y *= 1.0 - min(0.65, length(bend) * 0.55);
#endif`)},this.grassMat=i;let o=hm(1234+this.doc.objects.length),s=Math.round(5760*e),c=new Zi(r,i,s),l=new bn,u=new Yt,d=new L,f=new L,p=new z,m=0;for(let e=0;e<s*1.4&&m<s;e++){let e=-16+o()*32,t=-13+o()*20;if(this.waterAt(e,t)||this.onBridge(e,t)||this.solids.some(n=>Math.hypot(n.x-e,n.z-t)<n.r*.8))continue;let n=.14+o()*.22;f.set(e,this.heightAt(e,t),t),d.set(1+o()*.6,n,1+o()*.6),l.compose(f,u,d),c.setMatrixAt(m,l),p.setHSL(0,0,.82+o()*.3),c.setColorAt(m,p),m++}c.count=m,c.frustumCulled=!1,this.group.add(c)}buildFish(){for(let e of this.waters){if(!Lh(e.obj.o,`fish`))continue;let t=Math.round(Rh(e.obj.o,`fish`,5));for(let n=0;n<t;n++){let t=new R,n=Z(this.r,[`#f97316`,`#94a3b8`,`#facc15`,`#60a5fa`,`#ef4444`]),r=J(.09,n,.08,10);r.scale.set(.7,.9,1.8),t.add(r);let i=new B(new Na(.07,.12,4),new oo({color:gm(n,-30)}));i.rotation.x=-Math.PI/2,i.position.z=-.2,i.scale.set(.3,1,1),t.add(i),t.add(X(J(.018,`#111827`,0,6),.045,.03,.12),X(J(.018,`#111827`,0,6),-.045,.03,.12)),this.free.add(t);let a=this.r()*100,o=.6+this.r()*.6,s=e.nearest(0,-2),c=(this.r()-.5)*.8,l=180+Math.floor(this.r()*260),u=Math.floor(this.r()*200),d=(t,n)=>{let r,d,f,p;if(e.kind===`river`){let e=Math.sin(t*.01*o+a)*6,[n,i]=[s.tx,s.tz];r=s.x+n*e-i*c,d=s.z+i*e+n*c;let l=Math.cos(t*.01*o+a);f=n*l,p=i*l}else{let n=(e.obj.b.water?.radius??3)*.6,i=t*.012*o+a;r=e.obj.pos.x+Math.cos(i)*n*(.5+c),d=e.obj.pos.z+Math.sin(i)*n*(.5+c),f=-Math.sin(i),p=Math.cos(i)}let m=(t+u)%l,h=m<18?.02+Math.sin(m/18*Math.PI)*.7:-.16;n.position.set(r,h,d),n.rotation.set(m<18?-Math.cos(m/18*Math.PI)*.9:0,Math.atan2(f,p),0),i.rotation.y=Math.sin(t*.6+a)*.5},f={obj:t,kind:`fish`,words:[`fish`,`fishes`,`machhli`],size:.1,floats:!1,edible:!0,id:`fish:${this.things.length}`,homeParent:this.free,homePos:new L,homeQuat:new Yt,homeScale:new L(1,1,1),owner:e.obj,segs:[{f:-1e9,mode:`home`}],auto:d,busyUntil:-1};this.things.push(f);for(let e=-u;e<2e4;e+=l)e>=0&&(f.obj.userData.j=1,this.lazyJumps.push({th:f,f:e,swim:d}))}}}lazyJumps=[];roomBoxes=[];buildRoom(){let e=this.doc.room,t=Math.max(4,Math.min(40,e.width??10)),n=Math.max(3,Math.min(30,e.depth??7)),r=Math.max(2.2,Math.min(8,e.height??3.2)),i=2-n,a=new R,o=e=>new oo({color:e}),s=(e,t,n,r,i,s,c,l=!0)=>{let u=new B(new ka(e,t,n),o(c));return u.position.set(r,i,s),u.receiveShadow=!0,a.add(u),l&&this.roomBoxes.push(new _r().setFromObject(u)),u},c=e.wall??`#f5e6c8`,l=e.trim??gm(c,-40);s(t+.4,.1,n+.4,0,-.05,i+n/2,e.floor??`#c8a27a`,!1);{let s=new B(new Ka(t,n),o(e.ceiling??`#f8fafc`));s.rotation.x=Math.PI/2,s.position.set(0,r,i+n/2),a.add(s)}for(let e of[-1,1])s(.2,r,n,e*t/2,r/2,i+n/2,c);let u=Math.max(0,Math.min(10,Math.round(e.windows??(e.moving?Math.floor(t/2.2):2)))),d=e.moving?1:1.1,f=Math.min(r-.3,d+(e.moving?1.1:1.3));s(t,d,.2,0,d/2,i,c),s(t,r-f,.2,0,f+(r-f)/2,i,c);let p=u?Math.min(1.8,(t-.6)/u-.5):0,m=u?t/u:t,h=-t/2;for(let e=0;e<u;e++){let n=-t/2+m*(e+.5),r=n-p/2-h;r>.01&&s(r,f-d,.2,h+r/2,d+(f-d)/2,i,c),h=n+p/2;let o=new B(new Ka(p,f-d),new Oi({color:12248829,transparent:!0,opacity:.18,depthWrite:!1}));o.position.set(n,d+(f-d)/2,i+.02),a.add(o),s(p+.12,.08,.3,n,d,i+.1,l,!1)}let g=t/2-h;if(g>.01&&s(g,f-d,.2,h+g/2,d+(f-d)/2,i,c),s(t,.12,.05,0,.06,i+.12,l,!1),e.lamps!==!1)for(let e=-t/2+2.5;e<t/2-1;e+=5){let t=new B(new Ma(.35,.45,.12,16),new Oi({color:16776171}));t.position.set(e,r-.08,i+n/2),a.add(t);let o=new qo(16773590,6,9,1.5);o.position.set(e,r-.4,i+n/2),a.add(o)}this.group.add(a);let _=new R,v=e.outside??(e.moving?`fields`:`trees`),y=new B(new Ka(400,60),new Oi({color:v===`sky`?`#7cc4ff`:`#a5d8ff`}));y.position.set(0,10,i-40),this.group.add(y);let b=new B(new Ka(400,60),o(v===`sea`?`#3b9ae1`:v===`city`?`#9ca3af`:`#8cc66b`));b.rotation.x=-Math.PI/2,b.position.set(0,-.4,i-30),this.group.add(b);let x=hm(77+t);for(let t of[-60,0,60]){let n=new R;n.position.x=t;for(let e=0;e<16;e++){let e=(x()-.5)*60,t=i-4-x()*30;if(v===`city`)n.add(X(new B(new ka(3+x()*4,4+x()*12,3),o(Z(x,[`#cbd5e1`,`#fde68a`,`#fca5a5`,`#a5b4fc`]))),e,3,t));else if(v===`sky`)n.add(X(new B(new Ja(2+x()*3,10,8),new Oi({color:16777215})),e,1+x()*6,t));else if(v!==`sea`){let r=new R;r.add(X(new B(new Ma(.2,.3,2.4,6),o(`#7a4b24`)),0,1.2,0),X(new B(new Ja(1.4,10,8),o(Z(x,[`#4caf50`,`#5fae55`,`#3f9d4a`]))),0,3,0)),r.position.set(e,-.4,t),n.add(r)}}if(e.moving&&v!==`sky`)for(let e=-60/2;e<60/2;e+=6)n.add(X(new B(new Ma(.06,.06,3.2,6),o(`#57534e`)),e,1.2,i-2.5));_.add(n)}this.group.add(_),e.moving&&this.updates.push(e=>{_.position.x=-(e*.45%60),a.position.y=Math.sin(e*.9)*.008})}attachLife(){let e=this.doc.stage?.rot??0,t=this.waters.filter(e=>e.kind!==`well`),n=e=>{let n=null,r=1e9;for(let i of t){let t=i.nearest(e.x,e.z),a=Math.hypot(t.x-e.x,t.z-e.z);a<r&&(r=a,n=i)}return n},r={expr:`happy`,mouth:null,talk:0,blink:!1,look:`center`,tears:!1,sweat:!1,hold:``,lie:!1};for(let t of this.objects){let{o:i,b:a}=t,o=String(i.opts?.doing??`walk`).toLowerCase(),s=qg(i.id)%1e3/159,c=t.pos.clone(),l=Rh(i,`radius`,2.5),u=(t,n,r,i)=>{a.root.position.copy(new L(t,n,r).applyMatrix4(this.stageInv)),a.root.rotation.y=i+e};if((qg(i.id)>>4)%2,i.type===`model`&&i.opts?.moves){let t=String(i.opts.moves),n=c.x,r=c.z,o=Math.round(s*100),l=a.wheels??[],u=e=>{for(let t of l)t.o.quaternion.copy(t.q).multiply(new Yt().setFromAxisAngle(new L(0,1,0),-e/t.r))};a.update=s=>{let l=n,d=r,f=0,p=0;if(t===`loop`||t===`pass`){let e=Rh(i,`speed`,.12),t=(s+o)*e%140;l=n-70+t,p=(s+o)*e,f=0}else if(t===`around`){let e=(s+o)*.01;l=n+Math.cos(e)*3,d=r+Math.sin(e)*3,f=Math.atan2(-Math.cos(e),-Math.sin(e))+Math.PI/2,p=e*3}else{let e=Math.max(300,(this.n1||this.n0+1080)-this.n0),t=s-this.n0,r=Math.min(240,e*.3),i=e>700?240:0;if(t<r){let e=1-t/r;l=n+70*e*e,p=-70*e*e}else if(!i||t<e-i)l=n,p=0;else{let r=Math.min(1,(t-(e-i))/i);l=n-70*r*r,p=-70*r*r}f=Math.PI}a.root.visible=!0,a.root.position.copy(new L(l,c.y+Rh(i,`lift`,0),d).applyMatrix4(this.stageInv)),a.root.rotation.y=f+e,u(p)};continue}if(i.type===`boat`){let t=i.opts?.moving?n(c):null;if(!t){a.rower&&(a.update=e=>a.rower(e,.35));continue}let r=7+s%4,o=.0035+s%1*.002,l=((qg(i.id)>>3)%3-1)*Math.min(.8,t.half*.3);a.update=n=>{let i=n*o+s,d=Math.cos(i),f=t.along(c.x,c.z,Math.sin(i)*r,l),p=Math.max(0,Math.min(1,(d+.25)/.5)),m=Math.atan2(-f.dz,f.dx)+Math.PI*(1-p*p*(3-2*p));u(f.x,.02+Math.sin(n/18)*.03,f.z,m-e*0),a.root.rotation.z=Math.sin(n/23)*.04,a.rower?.(n,1)};continue}if(a.creature){let e=a.creature,t=e.height,r=o===`swim`?n(c):null,d=r?(r.along(c.x,c.z,0,0).nz>0?1:-1)*(i.opts?.bank===`far`?-1:1):1;a.update=n=>{let i=c.x,a=c.z,f=0,p=1,m=0,h=!1,g=!1,_=0,v=0;if(r){let e=n*.005+s,o=r.along(c.x,c.z,Math.sin(e)*6,d*Math.max(0,r.half-.7-s%1*.6)),l=Math.cos(e)>=0?1:-1;i=o.x,a=o.z,p=o.dx*l,m=o.dz*l,f=r.surface-t*.28+Math.sin(n/9+s)*.02,h=!0}else if(o===`play`||o===`run`||o===`chase`||o===`jump`){let e=n*.05+s;i=c.x+Math.cos(e)*l*.6+Math.sin(e*2.7)*.4,a=c.z+Math.sin(e*1.3)*l*.4,p=-Math.sin(e)*l*.6+Math.cos(e*2.7)*1.08,m=Math.cos(e*1.3)*l*.52,f=Math.abs(Math.sin(n*.28+s))*.22*t,h=!0,_=+((n+Math.round(s*10))%90<12)}else if(o===`fly`){let e=n*.02+s;i=c.x+Math.cos(e)*l*1.5,a=c.z+Math.sin(e)*l,f=3+Math.sin(e*2)*.5,p=-Math.sin(e),m=Math.cos(e),h=!0,g=!0}else if(o===`sleep`||o===`rest`||o===`sit`)p=Math.cos(s),m=Math.sin(s),v=0,_=0;else if(o===`graze`||o===`eat`||o===`drink`)p=Math.cos(s),m=Math.sin(s),_=n%40<20?.5:0;else{let e=(n+s*100)%400;h=e<220;let t=(Math.floor((n+s*100)/400)*220+Math.min(e,220))/260;i=c.x+Math.sin(t+s)*l,a=c.z+Math.sin(t*1.7+s)*l*.5,p=Math.cos(t+s),m=Math.cos(t*1.7+s)*.85}!r&&!g&&(f+=this.heightAt(i,a,!0)),u(i,f,a,Math.atan2(p,m)-Math.PI/2),e.root.position.set(0,0,0),e.root.rotation.set(0,0,v),e.animate({n,walking:h,talk:_,blink:n%97<4||o===`sleep`,expr:`happy`,flying:g})};continue}if(a.person){let{h:e}=a.person,t=o===`fish`||o===`wash`?n(c):null,i=c.clone(),d=0;if(t){let e=t.nearest(c.x,c.z);i=new L(e.bx,0,e.bz),d=Math.atan2(e.x-e.bx,e.z-e.bz)}let f=null;if(o===`fish`||o===`work`||o===`chop`){f=o===`fish`?Cg():Sg();let t=new L(0,-.7,.7).normalize();f.quaternion.setFromUnitVectors(new L(0,1,0),t),e.hand(`r`).add(f)}let p=s*3;a.update=n=>{let a=i.x,f=i.z,m=d,h=!1,g=`idle`,_=0;if(o===`walk`||o===`wander`){let e=(n+s*100)%360;h=e<240;let t=(Math.floor((n+s*100)/360)*240+Math.min(e,240))/300;a=c.x+Math.sin(t+s)*l,f=c.z+Math.sin(t*1.7+s)*l*.5,m=Math.atan2(Math.cos(t+s),Math.cos(t*1.7+s)*.85)}else o===`talk`?(g=`talk`,_=n%50<30?.6:0,m=s):o===`wave`?g=`wave`:o===`dance`?g=(n>>4)%2?`shrug`:`wave`:(o===`sit`||o===`rest`)&&(g=`idle`);!t&&o!==`walk`&&o!==`wander`&&(m||=Math.sin(s)*.8);let v=km({pose:g,stance:h?`walk-a`:o===`sit`?`sit`:`stand`,expr:`happy`,talk:_,energy:_,walkPhase:n*.36,walking:h,n,seed:p}),y=0;if((o===`sit`||o===`rest`)&&(v.lhx=v.rhx=-1.45,v.lk=v.rk=.1,y=-.47,v.spine=-.1),o===`dance`&&(y=Math.abs(Math.sin(n*.25))*.12,v.spineZ=Math.sin(n*.12)*.15),o===`fish`&&(v.rsx=-1.1+Math.sin(n/9)*.05,v.rsz=-.2,v.rex=-.45,v.lsx=-.95,v.lsz=.15,v.lex=-.9),o===`work`||o===`chop`){let e=Math.max(0,Math.sin(n*.18));v.rsx=-1.2-e*1.6,v.lsx=-1.1-e*1.6,v.rex=-.2-e*.6,v.lex=-.3-e*.6,v.spine=.25-e*.3}o===`wash`&&(v.spine=.8,v.lhx=v.rhx=.05,v.lk=v.rk=1.6,y=-.27,v.rsx=-.9+Math.sin(n*.3)*.3,v.lsx=-.9-Math.sin(n*.3)*.3),u(a,y+this.heightAt(a,f,!0),f,m),e.apply({x:0,y:0,z:0,yaw:0,roll:0,spine:0,spineZ:0,headX:0,headY:0,headZ:0,lsx:0,lsz:0,lex:0,lez:0,rsx:0,rsz:0,rex:0,rez:0,lhx:0,lk:0,rhx:0,rk:0,...v},{...r,talk:_,blink:n%89<4},n),e.root.position.y=0}}}}buildParticles(){let e=new si({map:bm(),transparent:!0,depthWrite:!1});for(let t=0;t<160;t++){let t=new xi(e.clone());t.visible=!1,this.group.add(t),this.sprites.push(t)}for(let e=0;e<10;e++){let e=new B(new qa(.85,1,32),new Oi({color:16777215,transparent:!0,depthWrite:!1}));e.rotation.x=-Math.PI/2,e.visible=!1,this.group.add(e),this.rings.push(e)}}addParticle(e){this.particles.push(e)}find(e,t,n){let r=Kg(e),i=e=>Math.hypot(e.x-t.x,e.z-t.z),a=e=>!n||Lh(e.o,n)||n===`swimmable`&&!!e.b.water&&e.b.water.kind!==`path`,o=e=>!!(!r||e.o.name&&Kg(e.o.name).includes(r)||e.words.some(e=>Kg(e)===r||Kg(e).split(` `).includes(r))||r===`tree`&&/tree|palm|pine|banana/.test(e.o.type)||r===`water`&&(e.b.water&&e.b.water.kind!==`path`||e.o.type===`well`));if(r&&(!n||[`pickable`,`eatable`,`throwable`,`kickable`,`pushable`].includes(n))){let e=this.things.filter(e=>e.words.some(e=>Kg(e)===r)||r===`fruit`&&e.edible&&e.kind!==`fish`);if(e.length)return{thing:e.sort((e,t)=>i(this.thingRest(e))-i(this.thingRest(t)))[0]}}let s=this.objects.filter(e=>a(e)&&o(e)),c=e=>i(e.pos)-(e.o.name&&r&&Kg(e.o.name).includes(r)?100:0)-(e.o.opts?.need?4:0)-((n===`shakeable`||n===`fruits`)&&this.things.some(t=>t.owner===e&&t.kind!==`branch`&&t.segs.length===1)?3:0);return s.length?{obj:s.sort((e,t)=>c(e)-c(t))[0]}:r?this.find(``,t,n):null}named(e){let t=Kg(e);return t.length<3||Gg.has(t)?null:this.objects.filter(e=>!Ih.get(e.o.type)?.line&&!e.b.creature&&!e.b.person&&e.b.height>=.6&&(e.o.name&&Kg(e.o.name).split(` `).includes(t)||e.words.some(e=>Kg(e)===t||Kg(e).split(` `).includes(t))))[0]??null}staticBoxes=null;blockers(e){if(!this.staticBoxes){this.poseStatic(0),this.group.updateMatrixWorld(!0),this.staticBoxes=[];for(let e of this.objects){let t=e.b;if(t.water||t.hill||Ih.get(e.o.type)?.line||e.o.opts?.moves||t.creature||t.person||t.height<.5||[`flowers`,`stones`,`mushroom`,`birds`,`butterflies`,`tall_grass`].includes(e.o.type))continue;let n=new _r().setFromObject(t.root);n.isEmpty()||this.staticBoxes.push({box:n,ro:e})}}let t=this.staticBoxes.slice();for(let e of this.roomBoxes)t.push({box:e,ro:null});for(let n of this.objects)n.o.opts?.moves&&(this.lastStatic=NaN,n.b.update?.(e,this.doc.wind),n.b.root.visible&&(n.b.root.updateMatrixWorld(!0),t.push({box:new _r().setFromObject(n.b.root),ro:n})));return t}has(e){let t=Kg(e);return t?this.things.some(e=>e.words.some(e=>Kg(e)===t))?!0:this.objects.some(e=>e.words.some(e=>Kg(e)===t||Kg(e).split(` `).includes(t))||Kg(String(e.o.opts?.species??``))===t||Kg(String(e.o.opts?.who??``))===t):!1}thingRest(e){let t=e.segs[e.segs.length-1];if(t.mode===`path`){let e=(t.len-1)*3;return new L(t.pos[e],t.pos[e+1],t.pos[e+2])}return e.obj.getWorldPosition(new L)}thingAt(e,t){this.poseStatic(t);let n=Wg(e.segs,t);if(n.mode===`path`){let e=Math.min(n.len-1,Math.max(0,t-n.f))*3;return new L(n.pos[e],n.pos[e+1],n.pos[e+2])}return n.mode===`home`?(e.auto&&e.auto(t,e.obj),this.setParent(e.obj,e.homeParent),e.obj.position.copy(e.homePos),e.obj.quaternion.copy(e.homeQuat),e.obj.updateMatrixWorld(!0),e.obj.getWorldPosition(new L)):e.obj.getWorldPosition(new L)}isHome(e,t){return Wg(e.segs,t).mode===`home`}heldBy(e,t){let n=Wg(e.segs,t);return n.mode===`held`?n.cid:null}addSeg(e,t){e.segs=e.segs.filter(e=>e.f<t.f),e.segs.push(t)}hold(e,t,n,r){this.addSeg(e,{f:t,mode:`held`,cid:n,side:r})}eat(e,t,n,r,i){this.addSeg(e,{f:t,mode:`held`,cid:n,side:r,eatFrom:t,bites:i}),this.addSeg(e,{f:i[i.length-1]+2,mode:`gone`})}gone(e,t){this.addSeg(e,{f:t,mode:`gone`})}fling(e,t,n,r,i=.25){let a=this.simulate(e,n,r,i,t);this.addSeg(e,{f:t,mode:`path`,pos:a.pos,quat:a.quat,len:a.len}),a.sink>=0&&this.addSeg(e,{f:t+a.sink,mode:`gone`})}fall(e,t,n){let r=this.thingAt(e,t),i=n??new L((this.r()-.5)*.03,.02,(this.r()-.5)*.03);this.fling(e,t,r,i,.15)}throwTo(e,t,n,r,i=20){let a=new L((r.x-n.x)/i,0,(r.z-n.z)/i);a.y=(r.y-n.y)/i+.5*Hg*i,this.fling(e,t,n,a,.35)}pushAlong(e,t,n,r,i){let a=n-t+40,o=new Float32Array(a*3),s=new Float32Array(a*4),c=new Yt,l=new L(i.z-r.z,0,-(i.x-r.x)).normalize(),u=e.obj.getWorldQuaternion(new Yt),d=0,f=e.kind===`log`||e.kind===`ball`||e.kind===`rock`;for(let p=0;p<a;p++){let a=p<n-t?p/(n-t):1+(1-Math.exp(-(p-(n-t))/10))*.25,m=r.x+(i.x-r.x)*a,h=r.z+(i.z-r.z)*a;o.set([m,this.heightAt(m,h,!0)+r.y,h],p*3),p>0&&f&&(d+=Math.hypot(o[p*3]-o[p*3-3],o[p*3+2]-o[p*3-1])/Math.max(.15,e.size)),c.setFromAxisAngle(l,-d).multiply(u),s.set([c.x,c.y,c.z,c.w],p*4)}this.addSeg(e,{f:t,mode:`path`,pos:o,quat:s,len:a})}cutBranch(e,t,n=-1){let r=e.b.branches;if(!r.length)return null;let i=new Set(this.things.filter(t=>t.kind===`branch`&&t.owner===e).map(e=>e.obj)),a=n>=0?r[n]:r.find(e=>e.low&&!i.has(e.group))??r.find(e=>!i.has(e.group));if(!a||i.has(a.group))return null;let o={obj:a.group,kind:`branch`,words:[`branch`,`stick`,`wood`],size:.5,floats:!0,edible:!1,id:`${e.o.id}:branch:${r.indexOf(a)}`,homeParent:a.group.parent,homePos:a.group.position.clone(),homeQuat:a.group.quaternion.clone(),homeScale:a.group.scale.clone(),owner:e,segs:[{f:-1e9,mode:`home`}],busyUntil:-1};this.things.push(o),e.b.sway=e.b.sway.filter(e=>e.o!==a.group);let s=this.thingAt(o,t);o.obj.getWorldQuaternion(new Yt);let c=new L(s.x-e.pos.x,0,s.z-e.pos.z).normalize().multiplyScalar(.02);return this.fling(o,t,s,c.setY(.01),.12),this.leaves(t,s.x,s.y+.3,s.z,10),o}chop(e,t,n){e.chop={f:t,dir:n};let r=new L(Math.sin(n),0,Math.cos(n)),i=e.pos.clone().addScaledVector(r,e.b.height*.6);this.particles.push({f:t+22,kind:`dust`,x:i.x,y:.2,z:i.z,n:10,big:1.6}),this.particles.push({f:t+22,kind:`leaves`,x:i.x,y:1.2,z:i.z,n:16})}shake(e,t,n){e.shakes.push([t,n]),this.particles.push({f:t+4,kind:`leaves`,x:e.pos.x,y:e.b.height*.75,z:e.pos.z,n:12})}door(e,t,n){e.doors.push({f:t,open:n}),e.doors.sort((e,t)=>e.f-t.f)}lightFire(e,t){e.litAt=t,this.particles.push({f:t,kind:`sparkle`,x:e.pos.x,y:.4,z:e.pos.z,n:8})}splash(e,t,n,r=1){this.particles.push({f:e,kind:`splash`,x:t,y:.05,z:n,n:12,big:r}),this.particles.push({f:e,kind:`ripple`,x:t,y:.05,z:n,n:1,big:r})}dust(e,t,n,r=1){this.particles.push({f:e,kind:`dust`,x:t,y:.1,z:n,n:6,big:r})}leaves(e,t,n,r,i=8){this.particles.push({f:e,kind:`leaves`,x:t,y:n,z:r,n:i})}simulate(e,t,n,r,i){let a=new Float32Array(1008),o=new Float32Array(1344),s=t.clone(),c=n.clone(),l=e.obj.getWorldQuaternion(new Yt),u=new L(this.r()-.5,this.r()-.5,this.r()-.5).normalize(),d=new Yt,f=!1,p=!1,m=-1,h=336,g=!1,_=Math.max(.03,e.size*.8);for(let t=0;t<336;t++){if(!f&&!p){c.y-=Hg,s.add(c);let n=this.heightAt(s.x,s.z)+_,a=this.waterAt(s.x,s.z);if(a&&s.y<a.surface+_*.3)p=!0,this.splash(i+t,s.x,s.z,Math.min(1.6,.5+e.size*3)),e.floats||(m=t+6),c.multiplyScalar(.2);else if(s.y<n)if(s.y=n,g||(g=!0,this.dust(i+t,s.x,s.z,Math.min(1.5,e.size*4))),Math.abs(c.y)>.04)c.y=-c.y*.38,c.x*=.7,c.z*=.7;else{c.y=0,c.x*=.9,c.z*=.9;let e=Math.hypot(c.x,c.z);e>.002?(u.set(c.z,0,-c.x).normalize(),d.setFromAxisAngle(u,e/_),l.premultiply(d)):f=!0}!f&&s.y>n+.01&&(d.setFromAxisAngle(u,r),l.premultiply(d))}else if(p){let e=this.waterAt(s.x,s.z);if(m>=0)s.y-=.02;else if(e){let[n,r]=e.flow(s.x,s.z);c.x+=(n-c.x)*.05,c.z+=(r-c.z)*.05,s.x+=c.x,s.z+=c.z,s.y=e.surface+Math.sin((i+t)/9)*.02-_*.3,d.setFromAxisAngle(new L(0,1,0),.01),l.premultiply(d)}else p=!1,f=!0}if(a.set([s.x,s.y,s.z],t*3),o.set([l.x,l.y,l.z,l.w],t*4),f&&t>2){h=t+1;break}}return{pos:a,quat:o,len:h,sink:m}}setParent(e,t){e.parent!==t&&t.add(e)}lastStatic=NaN;poseStatic(e){if(e===this.lastStatic)return;this.lastStatic=e;let t=(this.doc.wind??.5)*(.75+.25*Math.sin(e/70)+.15*Math.sin(e/23));for(let n of this.objects){let r=n.b,i=0;for(let[t,r]of n.shakes)e>=t&&e<=r&&(i=Math.max(i,Math.min(1,(e-t)/4,(r-e)/6)));for(let n of r.sway){let r=n.amp*(t*1.6+i*5);n.o.rotation.z=n.bz+r*(Math.sin(e*.055+n.ph)+.4*Math.sin(e*.15+n.ph*2))+(i?Math.sin(e*1.9+n.ph)*n.amp*3*i:0),n.o.rotation.x=n.bx+r*.6*Math.sin(e*.047+n.ph*1.3)}if(r.pivot.quaternion.identity(),i&&r.pivot.rotation.set(Math.sin(e*1.7)*.025*i,0,Math.sin(e*2.1)*.03*i),n.chop&&e>=n.chop.f){let t=e-n.chop.f,i=Math.PI/2-.12,a=i*Math.min(1,(t/22)**2);t>22&&(a=i-.1*Math.abs(Math.sin((t-22)/2.5))*Math.exp(-(t-22)/7));let o=n.chop.dir-n.yaw,s=new L(Math.cos(o),0,-Math.sin(o));r.pivot.quaternion.setFromAxisAngle(s,a)}if(r.door&&!r.flap){let t=0,i=null,a=!1;for(let t of n.doors)t.f<=e&&(a=i?i.open:!1,i=t);if(i){let n=Math.min(1,(e-i.f)/10),r=a?-1.75:0;t=r+((i.open?-1.75:0)-r)*(1-(1-n)**2)}r.door.pivot.rotation.y=t}if(r.fire){let t=n.litAt!==null&&e>=n.litAt;if(r.fire.group.visible=t,t){let t=Math.min(1,(e-(n.litAt??0))/16);r.fire.flames.forEach((n,r)=>n.scale.set(t,t*(1+Math.sin(e*1.7+r)*.2+Math.sin(e*3.3+r)*.1),t)),r.fire.light.intensity=(9+Math.sin(e*2.3)*2.5)*t}}r.boat&&!n.o.opts?.moving&&(r.root.position.y=.02+Math.sin(e/18)*.03,r.root.rotation.z=Math.sin(e/23)*.04)}for(let t of this.updates)t(e)}update(e,t){this.poseStatic(e);let n=new L;for(let r of this.things){let i=Wg(r.segs,e);if(r.obj.visible=i.mode!==`gone`,i.mode===`home`)this.setParent(r.obj,r.homeParent),r.auto?r.auto(e,r.obj):(r.obj.position.copy(r.homePos),r.obj.quaternion.copy(r.homeQuat)),r.obj.scale.copy(r.homeScale);else if(i.mode===`path`){this.setParent(r.obj,this.free);let t=Math.min(i.len-1,e-i.f);r.obj.position.set(i.pos[t*3],i.pos[t*3+1],i.pos[t*3+2]),r.obj.quaternion.set(i.quat[t*4],i.quat[t*4+1],i.quat[t*4+2],i.quat[t*4+3]),r.obj.scale.copy(r.homeScale)}else if(i.mode===`held`){this.setParent(r.obj,this.free),t.hand(i.cid,i.side,n)&&(r.obj.position.copy(n),r.big||(r.obj.position.y-=r.size*.3),r.obj.rotation.set(0,t.yawOf(i.cid),0),r.kind===`fish`&&r.obj.rotation.set(Math.PI/2+Math.sin(e*.9)*.4,t.yawOf(i.cid),Math.sin(e*1.3)*.3));let a=1;if(i.bites)for(let t of i.bites)e>=t&&(a-=1/(i.bites.length+.3));r.obj.scale.copy(r.homeScale).multiplyScalar(Math.max(.15,a))}}if(this.grassMat){this.grassU.uTime.value=e,this.grassU.uWind.value=this.doc.wind??.5;let n=this.grassU.uPush.value;for(let e=0;e<16;e++){let r=t.walkers[e];n[e].set(r?r.x:999,r?r.z:999,r?r.s:0)}}this.drawParticles(e)}drawParticles(e){let t=0,n=0,r=()=>t<this.sprites.length?this.sprites[t++]:null,i=(e,t,n,r,i,a,o,s,c=0)=>{e.visible=!0,e.material.map!==t&&(e.material.map=t,e.material.needsUpdate=!0),e.material.color.set(n),e.position.set(r,i,a),e.scale.setScalar(o),e.material.opacity=s,e.material.rotation=c},a=this.particles.concat(this.lazyJumps.filter(t=>e-t.f>=15&&e-t.f<40).map(e=>{let t=new qn;return e.swim(e.f+16,t),{f:e.f+16,kind:`splash`,x:t.position.x,y:.05,z:t.position.z,n:6,big:.5}}));for(let t of a){let a=e-t.f;if(a<0)continue;let o=hm(t.f*31+Math.round(t.x*100));if(t.kind===`splash`&&a<22)for(let e=0;e<t.n;e++){let e=r();if(!e)break;let n=o()*Math.PI*2,s=(.03+o()*.04)*(t.big??1),c=(.09+o()*.07)*Math.sqrt(t.big??1),l=t.y+c*a-.5*Hg*1.2*a*a;l<0||i(e,this.dropTex,14412542,t.x+Math.cos(n)*s*a,l,t.z+Math.sin(n)*s*a,.12*(t.big??1),1)}else if(t.kind===`ripple`&&a<40&&n<this.rings.length){let e=this.rings[n++];e.visible=!0,e.position.set(t.x,.045,t.z),e.scale.setScalar(.2+a*.05*(t.big??1)),e.material.opacity=.7*(1-a/40)}else if(t.kind===`leaves`&&a<70)for(let e=0;e<t.n;e++){let e=r();if(!e)break;let n=(o()-.5)*2.2,s=(o()-.5)*1.6,c=.025+o()*.02,l=o()*6,u=t.y+(o()-.3)*.8-c*a;u<.02||i(e,this.leafTex,o()<.5?10215773:16777215,t.x+n+Math.sin(a/6+l)*.25,u,t.z+s,.13,1,a/5+l)}else if(t.kind===`dust`&&a<20)for(let e=0;e<t.n;e++){let e=r();if(!e)break;let n=o()*Math.PI*2,s=a/20;i(e,bm(),11903619,t.x+Math.cos(n)*s*.7*(t.big??1),t.y+s*.25,t.z+Math.sin(n)*s*.5,(.25+s*.6)*(t.big??1),.6*(1-s))}else if(t.kind===`sparkle`&&a<18)for(let e=0;e<t.n;e++){let n=r();if(!n)break;let s=o()*Math.PI*2,c=a/18;i(n,bm(),e%2?16638023:16486972,t.x+Math.cos(s)*c*.5,t.y+c*.6,t.z+Math.sin(s)*c*.5,.12*(1-c)+.03,1-c)}}for(let t of this.objects)if(!(!t.b.fire||t.litAt===null||e<t.litAt||!t.b.fire.group.visible))for(let n=0;n<8;n++){let a=r();if(!a)break;let o=(e+n*11)%88/88;if(e-t.litAt<n*11&&t.litAt>-1e8){a.visible=!1;continue}i(a,bm(),9079446,t.pos.x+Math.sin(o*6+n)*.2+o*.4,t.pos.y+.9+o*3.2,t.pos.z-.05,.3+o*1.1,.5*(1-o))}let o=new L;for(let t of this.objects)if(!(!t.b.smokes?.length||!t.b.root.visible))for(let n of t.b.smokes){n.getWorldPosition(o);for(let t=0;t<6;t++){let n=r();if(!n)break;let a=(e+t*9)%54/54;i(n,bm(),13751771,o.x+a*.8,o.y+.2+a*2.4,o.z,.35+a*1.2,.65*(1-a))}}for(let e=t;e<this.sprites.length;e++)this.sprites[e].visible=!1;for(let e=n;e<this.rings.length;e++)this.rings[e].visible=!1}cores(){return this.objects.filter(e=>{let t=e.b;return!(t.water||t.hill||t.bridge||t.creature||t.person||e.o.opts?.moves||Ih.get(e.o.type)?.line)&&t.height>=.8&&t.radius>=.12}).map(e=>({ro:e,r:Math.max(.25,e.b.radius),h:e.b.height}))}blocking(e,t){let n=[],r=t.x-e.x,i=t.z-e.z,a=r*r+i*i;if(a<1e-6)return n;let o=Math.sqrt(a);for(let{ro:s,r:c,h:l}of this.cores()){let u=s.pos.x,d=s.pos.z;if(Math.hypot(t.x-u,t.z-d)<c)continue;let f=e.x-u,p=e.z-d,m=(f*r+p*i)/a,h=(f*f+p*p-c*c)/a,g=m*m-h;if(g<=0)continue;let _=-m-Math.sqrt(g);_<=0||_>=1-.05/o||e.y+(t.y-e.y)*_<s.pos.y+l&&n.push(s)}return n}eyeInside(e){return this.cores().some(({ro:t,r:n,h:r})=>Math.hypot(e.x-t.pos.x,e.z-t.pos.z)<n+.35&&e.y<t.pos.y+r)}clearView(e,t,n=[]){let r=new Set;for(let t of n)for(let n of this.blocking(e,t))r.add(n);for(let{ro:t,r:n,h:i}of this.cores())Math.hypot(e.x-t.pos.x,e.z-t.pos.z)<n+.35&&e.y<t.pos.y+i&&r.add(t);let i=new L().subVectors(t,e),a=i.lengthSq(),o=new L;for(let n of this.objects){let s=n.b;if(s.water||s.hill||s.bridge||Ih.get(n.o.type)?.line)continue;if(r.has(n)){s.root.visible=!1;continue}let c=!1,l=s.vr??Math.max(.5,s.radius,s.height*.3);if(Math.hypot(n.pos.x-t.x,n.pos.z-t.z)>l+1.2){o.set(n.pos.x,Math.min(s.height*.5,Math.max(.5,t.y)),n.pos.z);let r=Math.max(0,Math.min(1,o.clone().sub(e).dot(i)/a));r<.85&&(c=e.clone().addScaledVector(i,r).distanceTo(o)<l*.95),Math.hypot(e.x-n.pos.x,e.z-n.pos.z)<l*1.15&&e.y<n.pos.y+s.height+.5&&(c=!0)}s.root.visible=!c}}async loadIcons(){let e=[];this.group.traverse(t=>{t.isSprite&&t.userData.iconWord&&e.push(t)});for(let t of e)try{let e=await(await fetch(`/api/assets/search?q=${encodeURIComponent(t.userData.iconWord)}&limit=1`)).json(),n=e?.mine?.[0]?.src??e?.openmoji?.[0]?.src;if(!n)continue;let r=await new Promise((e,t)=>{let r=new Image;r.onload=()=>e(r),r.onerror=t,r.src=`/api/assets/file/${encodeURIComponent(n)}`});t.material.map=vm(256,256,e=>e.drawImage(r,0,0,256,256)),t.material.needsUpdate=!0,t.visible=!0}catch{}}dispose(){this.group.traverse(e=>{let t=e;t.geometry&&t.geometry.dispose()});for(let e of this.waterTex)e.dispose()}setGrassLight(e){this.grassMat&&this.grassMat.color.multiplyScalar(e)}};function Wg(e,t){let n=e[0];for(let r of e)if(r.f<=t)n=r;else break;return n}var Gg=new Set([`thing`,`way`,`time`,`place`,`here`,`there`,`one`,`big`,`small`,`look`,`come`,`water`]);function Kg(e){let t=e.toLowerCase().replace(/[^a-z ]/g,` `).replace(/\b(the|a|an|my|your|that|this|big|small|old)\b/g,` `).replace(/\s+/g,` `).trim();return t.length>3&&t.endsWith(`es`)&&/(oes|ches|shes)$/.test(t)?t=t.slice(0,-2):t.length>3&&t.endsWith(`s`)&&!t.endsWith(`ss`)&&(t=t.slice(0,-1)),t}function qg(e){let t=2166136261;for(let n=0;n<e.length;n++)t=Math.imul(t^e.charCodeAt(n),16777619);return t>>>0}var Jg=new Set([`jungle`,`forest`,`park`,`farm`,`village`,`beach`,`mountain`,`snow`,`desert`,`plain`,`garden`,`river`,`lake`,`camp`,`field`]),Yg={jungle:[`mango_tree`,`big_tree`,`palm_tree`,`banana_plant`],forest:[`pine_tree`,`big_tree`,`pine_tree`],park:[`apple_tree`,`orange_tree`,`big_tree`],farm:[`apple_tree`,`mango_tree`,`big_tree`],village:[`mango_tree`,`big_tree`,`palm_tree`],beach:[`palm_tree`],mountain:[`pine_tree`,`big_tree`],snow:[`pine_tree`],desert:[`palm_tree`],plain:[`big_tree`,`apple_tree`]},Xg={jungle:`jungle`,forest:`grass`,park:`grass`,farm:`farm`,village:`dirt`,beach:`sand`,mountain:`grass`,snow:`snow`,desert:`sand`,plain:`grass`,space:`moon`},Zg={farm:[`cow`,`goat`,`chicken`,`sheep`],village:[`goat`,`chicken`,`dog`],forest:[`deer`,`rabbit`],jungle:[`monkey`,`parrot`,`deer`],park:[`dog`,`duck`],mountain:[`goat`],snow:[`penguin`],desert:[`camel`]};function Qg(e,t,n=``){let r=Kg(e);if(!r)return null;if(r===`tree`||r===`branch`||r===`trees`)return n===`pick`||n===`shake`?Yg[t]?.[0]===`pine_tree`?`apple_tree`:Yg[t]?.[0]??`mango_tree`:t===`forest`||t===`snow`?`big_tree`:Yg[t]?.[0]===`palm_tree`?`palm_tree`:`big_tree`;if(r===`fruit`)return Yg[t]?.find(e=>e!==`big_tree`&&e!==`pine_tree`)??`mango_tree`;if(r===`water`)return t===`village`||t===`farm`?n===`drink`?`well`:`river`:t===`park`?`pond`:`river`;if(r===`fish`||r===`sea`||r===`ocean`)return`river`;if(r===`door`||r===`inside`||r===`home`||r===`room`)return t===`park`||t===`plain`?`house`:`hut`;if(r===`fire`||r===`campfire`||r===`bonfire`)return`campfire`;for(let e of Fh)if(e.words.some(e=>Kg(e)===r))return e.type;for(let e of Fh)if(e.words.some(e=>Kg(e).split(` `).includes(r)))return e.type;return null}function $g(e){let t=hm(e.seed*7907+13),n=Jg.has(e.kind)?e.kind===`garden`?`park`:e.kind===`river`||e.kind===`lake`||e.kind===`field`?`plain`:e.kind===`camp`?`mountain`:e.kind:`plain`,r=e.span/9,i=[],a=0,o=(t,n,r,o={})=>{let s={id:`${t}-${e.seed}-${a++}`,type:t,x:n,z:r,rot:0,scale:1,...o};return i.push(s),s},s=[],c=(e,t,n)=>s.every(r=>Math.hypot(r.x-e,r.z-t)>r.r+n),l=(e,t,n,r,i={})=>(s.push({x:t,z:n,r}),o(e,t,n,i)),u=e=>(e.opts={...e.opts??{},need:!0},e),d=Xg[n]??`grass`,f=e.night?`night`:t()<.15?`sunset`:`day`,p=[],m=` ${(e.location??``).toLowerCase()} `,h=[],g=new Set([`inside`,`home`,`seat`,`board`,`sign`,`wood`,`track`,`road`,`fire`,`door`,`box`,`chest`,`water`]);for(let e of Fh)for(let t of e.words)if(!(t.length<3||g.has(t))&&RegExp(`[^a-z]${t}[^a-z]`).test(m)){h.push({verb:``,word:t});break}/\b(lake|pond)\b/.test(m)&&h.push({verb:``,word:`pond`}),/\b(river|stream|riverside|river bank|nadi)\b/.test(m)&&h.push({verb:``,word:`river`}),/\b(campfire|bonfire|camp)\b/.test(m)&&h.push({verb:``,word:`campfire`});for(let t of[...e.needs,...h]){let e=Qg(t.word,n,t.verb)??(t.verb===`swim`||t.verb===`fish`||t.verb===`drink`?`river`:t.verb===`climb`?Yg[n]?.[0]??`big_tree`:t.verb===`sit`?`log`:t.verb===`light`?`campfire`:t.verb===`enter`||t.verb===`exit`||t.verb===`open`||t.verb===`close`?`hut`:t.verb===`hide`?`bush`:t.verb===`chop`||t.verb===`cut`||t.verb===`shake`?`big_tree`:t.word?`item`:null);e&&!p.some(n=>n.type===e&&(e!==`item`||n.word===t.word))&&p.push({type:e,verb:t.verb,word:t.word})}let _=e=>p.some(t=>t.type===e),v=_(`waterfall`)||/waterfall|\bfalls\b|cascade/.test(m),y=v||/\bhills?\b|valley|between the|slope/.test(m),b=[];if(v){u(o(`waterfall`,0,-14,{opts:{height:5.5+t()*1.5}})),s.push({x:0,z:-14,r:5}),u(l(`pond`,0,-10.2,3.6,{opts:{radius:3.4,fish:6}}));let e=t()<.5?-1:1;o(`river`,0,-10,{points:[[0,-10.2],[e*4,-8.6],[e*10,-8.2],[e*18,-9.5],[e*34,-11]],opts:{width:2.6,fish:3}}),b.push({x:5,z0:-17,z1:-2})}if(y){let e=v?7.5:10;for(let n of[-1,1])o(`hill`,n*(e+t()*2),v?-15:-13,{opts:{radius:8+t()*2,height:v?5.5:3.5+t()*1.5}});for(let n of[-1,1])o(`hill`,n*(e+9+t()*4),-20,{opts:{radius:9,height:4+t()*2}})}let x=!v&&(_(`river`)||_(`bridge`)||_(`boat`)||n===`beach`||[`jungle`,`forest`,`village`,`mountain`,`plain`].includes(n)&&t()<.4),S=_(`hut`)||_(`house`)||_(`tent`)||_(`well`),C=n===`beach`?-12:(S?-9.5:-6.2)-t()*1.2,w=n===`beach`?0:.8+t()*1.2,T=t()*6,E=e=>C+Math.sin(e/9+T)*w;if(x){let e=[];for(let t=-44;t<=44;t+=4)e.push([t,E(t)]);o(`river`,0,C,{points:e,opts:{width:n===`beach`?14:3.2+t()*1.2,fish:n===`beach`?8:6}}),s.push({x:0,z:C,r:0})}let D=C+(n===`beach`?7:2.4),O=[{x:-3.3,z:-2.7},{x:3.4,z:-2.9},{x:-1.4,z:-3.8},{x:1.7,z:-4},{x:-5.6,z:-3.2},{x:5.7,z:-3.4}].map(e=>({x:e.x*Math.max(.62,r),z:e.z})),k=[{x:2,z:-1.1},{x:-2.1,z:-1.2},{x:.6,z:-1.5},{x:-.9,z:-1.6}].map(e=>({x:e.x*Math.max(.6,r),z:e.z})),A=0,ee=0,te=new Set([`mango_tree`,`apple_tree`,`orange_tree`,`big_tree`,`pine_tree`,`palm_tree`,`banana_plant`,`bush`,`berry_bush`,`rock`,`log`,`stump`,`ladder`,`campfire`,`well`,`bench`,`tent`,`crate`,`tall_grass`,`fence`,`signpost`]);for(let e of p){let n=e.type;if(n===`river`&&v||n===`river`||n===`waterfall`)continue;if(n===`pond`){u(l(`pond`,4.5*r,-6.5,3.4));continue}if(n===`bridge`){o(`bridge`,2.6*r,C,{rot:Math.PI/2,opts:{len:6}});continue}if(n===`boat`){o(`boat`,-2.2*r,C+.2,{rot:0});continue}if(n===`hut`||n===`house`){u(l(n,(t()<.5?-1:1)*4.6*Math.max(.7,r),-4.8,2.4));continue}if(te.has(n)){let t=O[A++%O.length];x&&t.z<D+1&&n.endsWith(`tree`)&&(t={x:t.x,z:Math.max(t.z,D+1.2)});let r=u(l(n,t.x,t.z,1.2));n===`campfire`&&(r.z=-1.6,r.x=t.x*.6,r.opts={lit:e.verb!==`light`,need:!0}),(n===`log`||n===`stump`||n===`bench`||n===`rock`)&&(r.z=-1.7);continue}let i=k[ee++%k.length],a=l(n,i.x,i.z,.6);n===`item`&&(a.opts={word:e.word||`gift`,edible:e.verb===`eat`}),n===`flowers`&&(a.opts={count:10,radius:.8}),u(a)}let ne=Yg[n]??Yg.plain,re=(r,i,a,o,s,u,d=()=>{})=>{for(let f=0,p=0;f<i&&p<i*12;p++){let i=(t()-.5)*2*s,p=a+t()*(o-a),m=r===`flowers`||r===`stones`||r===`mushroom`;Math.abs(i)<e.span*.62&&p>-2.2||!m&&Math.abs(i)<Math.max(4.5,e.span*.55)&&p>-4.6||!m&&b.some(e=>Math.abs(i)<e.x&&p>e.z0&&p<e.z1)||x&&Math.abs(p-E(i))<(n===`beach`?8:2.4+u)||c(i,p,u)&&(d(l(r,i,p,u,{rot:t()*6,scale:.85+t()*.4})),f++)}},ie={jungle:22,forest:26,park:9,farm:6,village:7,beach:7,mountain:12,snow:14,desert:2,plain:6}[n]??8;for(let e=0;e<ie;e++)re(ne[e%ne.length],1,-24,-3,22,1.6,e=>{e.type===`pine_tree`&&n===`snow`&&(e.opts={snow:!0}),e.rot=0});if([`jungle`,`forest`,`park`,`plain`,`mountain`,`village`].includes(n)&&re(`bush`,n===`jungle`?8:4,-12,-2.5,16,1),n===`jungle`&&(re(`tall_grass`,4,-12,-4,16,1.6),re(`berry_bush`,1,-6,-2.5,9,1)),[`forest`,`mountain`,`jungle`].includes(n)&&(re(`log`,2,-9,-2.5,12,1),re(`stump`,2,-9,-2.5,12,.6),re(`mushroom`,2,-6,-1,8,.4)),[`park`,`plain`,`farm`,`village`,`jungle`,`mountain`].includes(n)&&re(`flowers`,n===`park`?5:3,-8,1,14,1.4),re(`rock`,n===`mountain`||n===`desert`?5:2,-12,-2.5,15,1),re(`stones`,1,-3,1,6,.5),n===`farm`&&(o(`fence`,-6*r-2,-5.5,{opts:{len:8}}),o(`fence`,7,-5.5,{opts:{len:6}}),re(`tall_grass`,4,-16,-7,16,2),!_(`hut`)&&!_(`house`)&&l(`house`,7.5,-9,3),re(`well`,1,-9,-4,10,1.2)),n===`village`&&(re(`hut`,3,-14,-5,15,2.6),re(`well`,1,-8,-4,10,1.2),re(`bench`,1,-6,-3,9,1),!_(`campfire`)&&t()<.4&&re(`campfire`,1,-6,-3,8,1)),n===`park`&&(re(`bench`,2,-6,-3,10,1.2),o(`path`,0,-2.6,{points:[[-40,-2.6],[40,-2.6]],opts:{width:1.5}}),t()<.4&&!_(`pond`)&&l(`pond`,(t()<.5?-1:1)*7,-9,3.5)),n===`mountain`&&!y){for(let e=0;e<4;e++)o(`hill`,(e-1.5)*13+(t()-.5)*5,-18-t()*6,{opts:{radius:7+t()*4,height:2.5+t()*2.5}});t()<.6&&re(`tent`,1,-8,-4,10,1.6)}if(n===`desert`)for(let e=0;e<5;e++)o(`hill`,(e-2)*12+(t()-.5)*6,-12-t()*10,{opts:{radius:6+t()*4,height:1.2+t()*1.4}});n===`beach`&&!_(`boat`)&&t()<.6&&o(`boat`,6*r,C+5.5,{}),n===`jungle`&&t()<.5&&re(`signpost`,1,-4,-2.5,8,.5,e=>{e.opts={text:[`JUNGLE`,`DANGER!`,`THIS WAY`,`SAFARI`][Math.floor(t()*4)]},e.rot=.2}),!e.night&&n!==`snow`&&o(`birds`,0,-10,{opts:{count:3+Math.floor(t()*4)}}),!e.night&&[`park`,`jungle`,`plain`,`farm`,`village`].includes(n)&&o(`butterflies`,(t()-.5)*6,-3,{opts:{count:3}});let ae=new Set((e.avoid??[]).map(e=>e.toLowerCase())),oe=(Zg[n]??[]).filter(e=>!ae.has(e));for(let e=0;e<Math.min(oe.length,2);e++){let e=oe[Math.floor(t()*oe.length)];re(`animal`,1,-11,-5.5,12,2.5,n=>{n.opts={species:e,radius:2+t()*1.5},n.rot=0,n.scale=1})}return{version:1,name:`${n} ${e.seed}`,kind:n,ground:d,time:f,wind:.35+t()*.5,weather:e.weather??``,grass:d===`sand`||d===`snow`||d===`dirt`||d===`moon`?0:1,objects:i,stage:{x:0,z:0,rot:0}}}function e_(e,t,n,r){let i=[],a=[{x:2.4,z:-2.2},{x:-2.4,z:-2.3},{x:1.2,z:-1.4},{x:-1.2,z:-1.4}],o=0,s=new Set;for(let c of e){let e=Qg(c.word,t,c.verb);if(!e&&c.word&&(e=`item`),!e||s.has(e+c.word)||[`river`,`pond`,`hut`,`house`,`bridge`,`boat`,`hill`,`path`].includes(e))continue;s.add(e+c.word);let l=a[o++%a.length];i.push({id:`x-${r}-${o}`,type:e,x:l.x*(n/9),z:l.z,rot:0,opts:e===`item`?{word:c.word,edible:c.verb===`eat`}:e===`campfire`?{lit:c.verb!==`light`}:void 0})}return i.length?{version:1,name:`extras`,ground:`grass`,time:`day`,wind:.1,objects:i,stage:{x:0,z:0,rot:0},grass:0}:null}var t_=[{id:`jungle`,label:`Jungle with river`,make:e=>$g({kind:`jungle`,seed:e,span:9,needs:[{verb:`swim`,word:`river`},{verb:`climb`,word:`mango tree`},{verb:`hide`,word:`bush`}]})},{id:`forest`,label:`Pine forest camp`,make:e=>$g({kind:`forest`,seed:e,span:9,needs:[{verb:`sit`,word:`log`},{verb:`light`,word:`campfire`},{verb:`chop`,word:`tree`}]})},{id:`village`,label:`Village`,make:e=>$g({kind:`village`,seed:e,span:9,needs:[{verb:`enter`,word:`hut`},{verb:`drink`,word:`well`},{verb:`pick`,word:`mango`}]})},{id:`farm`,label:`Farm`,make:e=>$g({kind:`farm`,seed:e,span:9,needs:[{verb:`pick`,word:`apple`},{verb:`climb`,word:`ladder`}]})},{id:`park`,label:`Park`,make:e=>$g({kind:`park`,seed:e,span:9,needs:[{verb:`kick`,word:`ball`},{verb:`sit`,word:`bench`}]})},{id:`beach`,label:`Beach`,make:e=>$g({kind:`beach`,seed:e,span:9,needs:[{verb:`swim`,word:`sea`},{verb:`climb`,word:`palm`}]})},{id:`river`,label:`River with bridge & fish`,make:e=>$g({kind:`plain`,seed:e,span:9,needs:[{verb:`fish`,word:`river`},{verb:`cross`,word:`bridge`},{verb:`sit`,word:`boat`}]})},{id:`snow`,label:`Snowy hills`,make:e=>$g({kind:`snow`,seed:e,span:9,needs:[{verb:`light`,word:`campfire`},{verb:`enter`,word:`tent`}]})},{id:`empty`,label:`Empty grass field`,make:()=>({version:1,name:`My world`,kind:`plain`,ground:`grass`,time:`day`,wind:.5,grass:1,objects:[],stage:{x:0,z:0,rot:0}})}],n_=[`mango`,`apple`,`orange`,`banana`,`coconut`,`berry`,`fruit`],r_=new Set([`pick`,`eat`,`give`,`throw`,`drop`,`carry`,`kick`,``]);function i_(e,t,n,r){let i=[],a={},o=[[2.6,-1.6],[-2.6,-1.7],[1.3,-2.4],[-1.4,-2.5],[4,-2],[-4.1,-2.1]],s=[[5.2,-3.6],[-5.3,-3.7],[3,-4.6],[-3.2,-4.8]],c=0,l=0,u=new Set;for(let d of e){let e=Kg(d.word);if(!e||u.has(e)||t(e))continue;u.add(e);let f=Math.max(.6,n/9),p=r_.has(d.verb)||d.verb===`look`&&n_.some(t=>e.includes(t)),m;if(n_.some(t=>e.includes(t))&&d.verb!==`climb`&&d.verb!==`shake`&&d.verb!==`chop`){let t=n_.find(t=>e.includes(t))??`mango`,[n,a]=o[c++%o.length];m={id:`miss-${r}-${i.length}`,type:`fruit`,x:n*f,z:a,opts:{kind:t===`fruit`?`mango`:t,count:3}}}else{let t=Mh(e),n=Qg(e,`plain`,d.verb),[u,h]=p?o[c++%o.length]:s[l++%s.length];t&&!p?(a[e.replace(/\s+/g,`_`)]=t,m={id:`miss-${r}-${i.length}`,type:`model`,x:u*f,z:h,opts:{model:e.replace(/\s+/g,`_`)},traits:Object.fromEntries((t.abilities??[]).map(e=>[e,!0]))}):m=n&&![`river`,`pond`,`waterfall`,`hill`,`path`,`bridge`].includes(n)&&!(p&&/tree|palm|plant|hut|house|tent|well/.test(n))?{id:`miss-${r}-${i.length}`,type:n,x:u*f,z:h,rot:0}:{id:`miss-${r}-${i.length}`,type:`item`,x:u*f,z:h,opts:{word:e,size:p?.42:1.2,edible:d.verb===`eat`},traits:p?void 0:{pickable:!1}}}i.push(m)}return{objects:i,models:a}}var a_=[`stage`,`behind`,`back`,`far`,`left`,`right`,`front-left`,`front-right`,`everywhere`,`on-hills`,`river`,`river-banks`,`near-bank`,`far-bank`,`around-pond`,`near-waterfall`],o_=[`walk`,`play`,`run`,`swim`,`fly`,`graze`,`sleep`,`sit`],s_=[`walk`,`row`,`fish`,`work`,`talk`,`wave`,`dance`,`sit`,`wash`],c_={"back-left":[-34,-30],back:[0,-40],"back-right":[34,-30],left:[-40,-7],right:[40,-7],"front-left":[-34,9],"front-right":[34,9],front:[0,12]};function l_(e,t=[]){t=[...new Set([...Object.keys(jh),...t])];let n=Fh.filter(e=>![`animal`,`person`,`item`,`river`,`pond`,`waterfall`,`path`,`hill`].includes(e.type)).map(e=>e.type),r=Object.keys(Pu).filter(e=>![`kitty`,`bandar`,`hen`,`lamb`,`pony`,`cobra`].includes(e));return`You design 3D cartoon worlds for an animation tool. Read my description and turn it into a WORLD RECIPE in JSON — exactly the format below, nothing else.

MY DESCRIPTION (it may be in Urdu / Roman Urdu / English):
"""
${e.trim()||`(write your description here)`}
"""

FORMAT (reply with ONLY this JSON inside one code block):
{
  "name": "short name for this world",
  "place": one of "jungle","forest","mountain","village","farm","park","beach","desert","snow","plain",
  "ground": one of "grass","jungle","farm","sand","dirt","snow","rock","moon",
  "time": "day" | "sunset" | "night",
  "season": "spring" | "summer" | "autumn" | "winter",
  "weather": "clear" | "rain" | "snow" | "fog",
  "wind": 0.0-1.0,
  "terrain": { "hills": "none" | "few" | "many", "mountains": true|false },
  "water": [ { "type": "river", "from": DIR, "to": DIR, "width": 2-6, "fish": true },
             { "type": "pond", "where": WHERE, "size": "small"|"big", "fish": true },
             { "type": "waterfall", "where": "back" } ],
  "things": [ { "what": TYPE, "count": 1-30, "where": WHERE, "size": 0.5-2 } ],
  "animals": [ { "species": SPECIES, "count": 1-12, "where": WHERE, "doing": ANIMAL_DOING } ],
  "people": [ { "who": "boatman" | "farmer" | "fisherman" | "villager" | "old man" | "girl" | any short role, "count": 1-6, "where": WHERE, "doing": PEOPLE_DOING, "female": false } ]
}

INSIDE PLACES (a room, a kitchen, a classroom, a shop, a hospital ward, INSIDE a train / bus / plane…): add
  "room": { "width": 6-20, "depth": 4-10, "height": 2.6-4, "wall": "#hex", "floor": "#hex", "ceiling": "#hex", "windows": 0-8,
            "moving": true only for a vehicle on the move (the world outside the windows passes by), "outside": "fields" | "city" | "sky" | "trees" | "sea" }
  and leave "water" and "terrain" empty. The front (camera side) has no wall. Put the furniture in "things" (ready-made: chair, table, sofa, bed, cupboard, tv, train_seat, school_desk, blackboard, lamp_post, stall — or design your own); "x" from -width/2 to width/2, "z" from 2 - depth (the back wall) to about -1 (the characters stand at z = 0).
  Example — inside a moving train: "room": {"width":14,"depth":4,"height":2.8,"wall":"#e5e7eb","floor":"#6b7280","windows":6,"moving":true,"outside":"fields"}, things: train_seat in a row along the back wall (z = -1.6, x = -6, -3.5, -1, 1.5, 4, 6.5) facing the camera.

DIR (where a river comes from / goes to, seen from the camera; the characters stand in the middle, the camera looks at them from the front): ${Object.keys(c_).join(`, `)}.
WHERE: ${a_.join(`, `)}  ("stage" = right next to the characters, "behind" = just behind them, "back"/"far" = far behind, "near-bank" = the river bank near the camera, "far-bank" = the other bank, "river" = ON the water).
TYPE (things that exist and WORK — trees can be climbed/shaken/chopped, huts have doors, campfires burn, boats float…): ${n.join(`, `)}.
  - For a moving boat with someone rowing: { "what": "boat", "where": "river", "moving": true, "rower": true }.
  - For a campfire that is not burning yet: add "lit": false.
  - Anything else (a temple, a tower, a car, a statue…): { "what": "picture:<word>", "size": metres tall } — it is shown with its picture.
SPECIES: ${r.join(`, `)}.
ANIMAL_DOING: walk, play (runs and jumps around), run, swim (on the water — needs "where": "river"/"near-bank"/"far-bank"/"around-pond"), fly, graze, sleep, sit.
PEOPLE_DOING: walk, row (in a boat on the river), fish (at the water), work (chopping), talk, wave, dance, sit, wash (clothes at the water).

NEW 3D THINGS (very important): every "model:<name>" you use must EITHER be one of the ready-made ones listed here OR be designed by you in "models" in this same answer (otherwise it will be missing). If the place needs something that is NOT in TYPE (a train, railway track, platform, clock, water tank, shop, temple, car, bus, tower, stall, tractor, swing…), DESIGN it from simple shapes in "models" and use it as { "what": "model:<name>" }.${t.length?` Already designed (you can use these as model:<name> without designing again): ${t.join(`, `)}.`:``}
"models": {
  "<name>": {
    "label": "what it is",
    "abilities": [ any of: "solid", "sittable", "enterable", "climbable", "pickable", "hide_behind", "openable" ],
    "floor": true if characters can stand/walk on top of it (a platform, a stage, a deck),
    "seat_height": metres (if sittable),
    "parts": [ { "shape": "box", "size": [w,h,d], "pos": [x,y,z], "rot": [0,0,0], "color": "#hex" },
               { "shape": "cylinder", "radius": r, "radiusTop": r2, "height": h, "pos": [...], "rot": [90,0,0], "color": "#hex", "wheel": true },
               { "shape": "sphere", "radius": r, ... }, { "shape": "cone", "radius": r, "height": h, ... }, { "shape": "torus", "radius": r, "tube": t, ... },
               { "shape": "text", "text": "STATION", "size": [w,h], "color": "#background", "textColor": "#letters", "pos": [...] },
               { "shape": "box", ..., "glass": true }  (windows),  { ..., "glow": true } (lamps),  { "shape": "box", "size": [0.9,2,0.06], ..., "door": true },
               { "shape": "cylinder", ..., "smoke": true } (chimney: smoke comes out), { ..., "spin": 0.5 } (fan/windmill turning) ]
  }
}
Placing things exactly (optional): "x" (metres, + = right) and "z" (metres, negative = behind the characters; the characters stand around x = -4..4, z = 0; the camera is at z = +10), "turn" (degrees).
Long rows (railway track, road, fence, lamp posts, shops in a line): { "what": "model:rail_track", "row": true, "z": -6 } repeats it from far left to far right.
Moving: { "what": "model:train", "z": -6, "moves": "arrive" } (comes in from the right, stops in front of the characters, then leaves to the left — same z as its track), "loop" (keeps passing by, like cars on a road), "around" (drives in a circle).
A platform / stage / deck the characters stand on: a low wide box model with "floor": true placed at z = 0 (under the characters).

MODEL RULES (follow exactly, or the thing looks wrong):
1. Every "pos" is measured from the thing's OWN centre on the ground: x = 0, z = 0 is the middle of the thing, y = 0 is the ground under it. NEVER use world positions inside a model (no z = -7). Where the thing stands in the world is set ONLY in "things" (x / z / where).
2. Real sizes in metres (a person is 1.7 m, a door 0.9 x 2.1 m, a train coach 3 m tall and 12 m long). In "things" leave "size" out (or 1) for models.
3. pos is the CENTRE of each part: a box 2 m tall standing on the ground has y = 1.
4. A cylinder stands upright; for a wheel use "rot": [90, 0, 0] so it faces sideways, and put wheels on BOTH sides (z = +width/2 and -width/2).
5. The front faces +z (the camera). Vehicles are long along x with their FRONT (engine, headlight) at +x.
6. Make it detailed: vehicles and buildings 20-60 parts (body, roof, windows on the +z side, doors, wheels, lights, chimney, railings, signs). A thing with 5 parts looks like a plain box.
7. A row piece (track, road, fence, wall) is ONE short piece that continues along x: the rails / road / rails of a fence run along x.
8. Something that moves on a track or road: give it the SAME "z" as that row.

EXAMPLE of a good model and its use — only to show the STYLE (rail_track and train are already ready-made, you can just use them):
"models": {
 "rail_track": { "label": "railway track", "parts": [
  {"shape":"box","size":[2,0.04,3.2],"pos":[0,0.02,0],"color":"#9ca3af"},
  {"shape":"box","size":[0.25,0.1,2.6],"pos":[-0.5,0.07,0],"color":"#6b4f3a"},
  {"shape":"box","size":[0.25,0.1,2.6],"pos":[0.5,0.07,0],"color":"#6b4f3a"},
  {"shape":"box","size":[2,0.12,0.1],"pos":[0,0.18,-0.72],"color":"#6b7280"},
  {"shape":"box","size":[2,0.12,0.1],"pos":[0,0.18,0.72],"color":"#6b7280"} ] },
 "train": { "label": "steam train with a coach", "parts": [
  {"shape":"box","size":[6,1.6,2.6],"pos":[0.5,1.5,0],"color":"#166534"},
  {"shape":"cylinder","radius":1.0,"height":4,"pos":[1.5,2.2,0],"rot":[0,0,90],"color":"#15803d"},
  {"shape":"box","size":[2.2,2.6,2.8],"pos":[-1.9,2.3,0],"color":"#14532d"},
  {"shape":"box","size":[2.6,0.25,3.1],"pos":[-1.9,3.7,0],"color":"#7f1d1d"},
  {"shape":"box","size":[0.9,0.8,0.05],"pos":[-1.9,2.8,1.42],"color":"#bae6fd","glass":true},
  {"shape":"cylinder","radius":0.3,"radiusTop":0.45,"height":1.2,"pos":[2.9,3.4,0],"color":"#1f2937","smoke":true},
  {"shape":"sphere","radius":0.25,"pos":[3.6,2.3,0],"color":"#fde68a","glow":true},
  {"shape":"box","size":[0.3,0.6,2.8],"pos":[3.6,0.8,0],"color":"#b91c1c"},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[2.2,0.6,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[0.6,0.6,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[-1.0,0.6,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[2.2,0.6,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[0.6,0.6,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[-1.0,0.6,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"box","size":[11,2.6,2.8],"pos":[-9.3,2.0,0],"color":"#b91c1c"},
  {"shape":"box","size":[11.4,0.25,3.1],"pos":[-9.3,3.4,0],"color":"#7f1d1d"},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-5.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-7.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-9.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-11.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[0.9,1.9,0.05],"pos":[-13.8,1.7,1.42],"color":"#7f1d1d"},
  {"shape":"text","text":"PAKISTAN RAILWAYS","size":[5,0.45],"color":"#b91c1c","textColor":"#fde047","pos":[-9.3,1.3,1.42]},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-5.5,0.5,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-13,0.5,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-5.5,0.5,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-13,0.5,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true} ] }
}
"things": [ {"what":"model:rail_track","row":true,"z":-6}, {"what":"model:train","z":-6,"moves":"arrive"} ]

RULES:
- Put EVERYTHING the description mentions into the recipe, with the right counts, places and actions. Add natural details that fit (trees, rocks, flowers, birds…) so the place looks full and alive, 40-120 things in total.
- Never put big things on "stage" (the characters need room); small things (stones, flowers, a basket, a ball) are fine there.
- Winter: season "winter" (snow only if the description says snow); use pine_tree and bare_tree.
- Plural rivers ("nadiyan") = 2 or 3 rivers from different DIRs.`}function u_(e){let t=e.replace(/```(?:json)?/g,``),n=t.indexOf(`{`),r=t.lastIndexOf(`}`);if(n<0||r<=n)return null;try{return JSON.parse(t.slice(n,r+1))}catch{}try{return JSON.parse(t.slice(n,r+1).replace(/,\s*([}\]])/g,`$1`).replace(/[“”]/g,`"`))}catch{return null}}function d_(e){let t=1e9,n=-1e9,r=1e9,i=-1e9,a=1e9,o=-1e9,s=0,c=0,l=0,u=0;for(let d of e.parts??[]){let e=Array.isArray(d.pos)?d.pos:[0,.5,0],[f,p,m]=d.shape===`box`?Array.isArray(d.size)?d.size:[1,1,1]:d.shape===`text`||d.shape===`plane`?[...Array.isArray(d.size)?d.size.slice(0,2):[1,1],.05]:d.shape===`torus`?[(d.radius??.5)*2,(d.radius??.5)*2,(d.tube??.1)*2]:[(d.radius??.4)*2,d.shape===`sphere`?(d.radius??.4)*2:d.height??1,(d.radius??.4)*2],h=Array.isArray(d.rot)?d.rot:[0,0,0],g=e=>Math.abs((Math.round(Number(e??0)/90)%2+2)%2)===1;g(h[0])&&([p,m]=[m,p]),g(h[2])&&([f,p]=[p,f]),g(h[1])&&([f,m]=[m,f]),f=Math.abs(Number(f)||0),p=Math.abs(Number(p)||0),m=Math.abs(Number(m)||0);let _=Number(e[0])||0,v=Number(e[1])||0,y=Number(e[2])||0;t=Math.min(t,_-f/2),n=Math.max(n,_+f/2),r=Math.min(r,v-p/2),i=Math.max(i,v+p/2),a=Math.min(a,y-m/2),o=Math.max(o,y+m/2),f>4*Math.max(p,m)&&p<.6&&(s+=f,l=Math.max(l,f)),m>4*Math.max(p,f)&&p<.6&&(c+=m,u=Math.max(u,m))}return t>n&&(t=-.5,n=.5,r=0,i=1,a=-.5,o=.5),{w:n-t,d:o-a,top:i-r,alongZ:c>s,railLen:c>s?u:l}}var f_=(e,t)=>typeof e==`number`&&Number.isFinite(e)?e:t,p_=e=>typeof e==`number`?e*Math.PI/180:0;function m_(e,t,n=9,r={}){let i={};for(let[t,n]of Object.entries(e.models??{})){if(!n||!Array.isArray(n.parts))continue;let e=n.parts.length<8?Mh(t,!0):null;i[t.toLowerCase().trim()]=e?{...e,abilities:n.abilities?.length?n.abilities:e.abilities}:n}let a=hm(t*4099+17),o=[],s=0,c=(e,n,r,i={})=>{let a={id:`${e}-${t}-${s++}`,type:e,x:+n.toFixed(2),z:+r.toFixed(2),rot:0,scale:1,...i};return o.push(a),a},l=[],u=(e,t,r)=>!(Math.abs(e)<n*.62+r&&t>-2.3-r&&t<2.5+r),d=(e,t,n)=>l.every(r=>Math.hypot(r.x-e,r.z-t)>r.r+n),f=[],p=[],m=null,h=(e,t,n)=>f.some(r=>r.pts.some((i,a)=>{let o=r.pts[a+1];if(!o)return!1;let s=o[0]-i[0],c=o[1]-i[1],l=s*s+c*c,u=Math.max(0,Math.min(1,((e-i[0])*s+(t-i[1])*c)/l));return Math.hypot(i[0]+s*u-e,i[1]+c*u-t)<r.half+n})),g=(e,t,n)=>p.some(r=>Math.hypot(r.x-e,r.z-t)<r.r+n),_=[],v=[];(e.water??[]).slice(0,5).forEach((e,t)=>{if(e.type===`river`){let r=c_[e.from??``]??c_[[`left`,`back-left`,`back-right`][t%3]],i=c_[e.to??``]??c_[[`right`,`front-right`,`front-left`][t%3]];i[0]===r[0]&&i[1]===r[1]&&(i=[-r[0],r[1]]);let o=(r[0]+i[0])/2+(a()-.5)*8,s=(r[1]+i[1])/2,l=Math.hypot(o,s);((()=>{let e=i[0]-r[0],t=i[1]-r[1],n=Math.max(0,Math.min(1,-(r[0]*e+r[1]*t)/(e*e+t*t)));return Math.hypot(r[0]+e*n,r[1]+t*n)})()<8||l<8)&&(s=-7-t*3-a()*2,o*=.5);let u=[];for(let e=0;e<=14;e++){let n=e/14,a=(1-n)*(1-n)*r[0]+2*(1-n)*n*o+n*n*i[0],c=(1-n)*(1-n)*r[1]+2*(1-n)*n*s+n*n*i[1]+Math.sin(n*9+t)*.8;u.push([a,c])}for(let e of u)Math.abs(e[0])<n*.7+3&&e[1]>-6&&(e[1]=-6-a()*1.5);let d=Math.max(1.6,Math.min(8,f_(e.width,3.2+a()))),p=c(`river`,u[0][0],u[0][1],{points:u,name:e.name,opts:{width:d,fish:e.fish===!1?0:f_(e.fish,6)||6}});f.push({pts:u,half:d/2,id:p.id})}else if(e.type===`pond`){let t=e.size===`small`?2.4:e.size===`big`?4.6:3.4,n=x(e.where??`behind`,t+1,!0)??{x:8,z:-9},r=c(`pond`,n.x,n.z,{name:e.name,opts:{radius:t,fish:e.fish===!1?0:f_(e.fish,5)||5}});p.push({x:n.x,z:n.z,r:t,id:r.id}),l.push({x:n.x,z:n.z,r:t+.6})}else if(e.type===`waterfall`&&!m){m={x:0,z:-15},c(`waterfall`,0,-15,{opts:{height:5.5+a()*1.5}}),l.push({x:0,z:-15,r:5});let e=3.4;c(`pond`,0,-11.2,{opts:{radius:e,fish:5}}),p.push({x:0,z:-11.2,r:e,id:`fallpond`}),l.push({x:0,z:-11.2,r:3.9})}});let y=e.terrain?.hills===`many`?7:e.terrain?.hills===`few`?3:0;for(let t=0,r=0;t<y&&r<60;r++){let r=(t%2?1:-1)*(10+a()*18),i=-6-a()*26,o=6+a()*5,s=2+a()*(e.terrain?.hills===`many`?4:3);h(r,i,o*.5)||g(r,i,o*.6)||Math.hypot(r,i)<o+n*.6+2||(_.push({x:r,z:i,r:o,h:s}),c(`hill`,r,i,{opts:{radius:o,height:s}}),t++)}if(m)for(let e of[-1,1]){let t={x:e*8,z:-16,r:8,h:5.5};_.push(t),c(`hill`,t.x,t.z,{opts:{radius:t.r,height:t.h}})}if(e.terrain?.mountains)for(let e=0;e<5;e++)c(`hill`,(e-2)*22+(a()-.5)*8,-48-a()*10,{opts:{radius:14+a()*6,height:9+a()*7}});function b(e){if(!f.length)return null;let t=f[Math.floor(a()*f.length)],n=t.pts.map((e,t)=>({p:e,i:t})).filter(({p:e})=>Math.abs(e[0])<26&&e[1]>-30&&e[1]<6);if(!n.length)return null;let{p:r,i}=n[Math.floor(a()*n.length)],o=t.pts[Math.min(t.pts.length-1,i+1)],s=t.pts[Math.max(0,i-1)],c=o[0]-s[0],l=o[1]-s[1],u=Math.hypot(c,l)||1,d=-l/u,p=c/u;p<0&&(d=-d,p=-p);let m=(a()-.5)*.6;return{x:r[0]+c*m+d*e*t.half,z:r[1]+l*m+p*e*t.half,rot:Math.atan2(-l,c)}}function x(t,r,i){let o=t.toLowerCase();for(let t=0;t<40;t++){let t=0,s=0,c;if(e.room){let n=Math.max(4,e.room.width??10),r=Math.max(3,e.room.depth??7);t=(a()-.5)*(n-1.4),s=1.5-r+.7+a()*(r-1.6),o===`stage`&&(s=-1.2-a()*.8),o===`left`&&(t=-n/2+.8+a()*n*.3),o===`right`&&(t=n/2-.8-a()*n*.3),(o===`behind`||o===`back`||o===`far`)&&(s=2-r+.6+a()*1.2)}else if(o===`river`){let e=b((a()-.5)*.8);if(!e)break;({x:t,z:s,rot:c}=e)}else if(o===`near-bank`||o===`river-banks`||o===`far-bank`){let e=b((o===`far-bank`?-1:o===`near-bank`||a()<.5?1:-1)*(1+(r+.6+a()*2)/2));if(!e)break;({x:t,z:s}=e)}else if(o===`around-pond`&&p.length){let e=p[Math.floor(a()*p.length)],n=a()*Math.PI*2,i=e.r+r+.6+a()*2.5;t=e.x+Math.cos(n)*i,s=e.z+Math.sin(n)*i}else if(o===`near-waterfall`&&m)t=(a()-.5)*14,s=-13+(a()-.5)*5;else if(o===`on-hills`&&_.length){let e=_[Math.floor(a()*_.length)],n=a()*6.28,r=a()*e.r*.6;t=e.x+Math.cos(n)*r,s=e.z+Math.sin(n)*r}else o===`stage`?(t=(a()-.5)*n*1.4,s=-1.3-a()*1.4):o===`behind`?(t=(a()-.5)*18,s=-3-a()*6):o===`back`||o===`far`?(t=(a()-.5)*50,s=-10-a()*22):o===`left`?(t=-7-a()*18,s=-16+a()*(i?14.5:18)):o===`right`?(t=7+a()*18,s=-16+a()*(i?14.5:18)):o===`front-left`?(t=-8-a()*12,s=0+a()*5):o===`front-right`?(t=8+a()*12,s=0+a()*5):(t=(a()-.5)*54,s=-30+a()*(i?28:34));let l=o===`river`;if(!(!l&&(h(t,s,r*.8+.4)||g(t,s,r+.3)))&&!(i&&!u(t,s,r))&&!(!l&&v.some(e=>Math.abs(s-e)<r+1.9))&&!(i&&r>1.2&&v.length&&(o===`behind`||o===`back`||o===`far`||o===`everywhere`)&&s>Math.min(...v)-r-2)&&!(o!==`stage`&&!u(t,s,0))&&d(t,s,r)&&!(i&&r>.8&&s>0&&Math.abs(t)<9))return{x:t,z:s,rot:c}}return null}function S(t,n,r,i){if(e.room){let r=Math.max(4,e.room.width??10),i=Math.max(3,e.room.depth??7);return{x:Math.max(-r/2+.4,Math.min(r/2-.4,t)),z:Math.max(2-i+.35,Math.min(1.6,n))}}let a=(e,t)=>d(e,t,r)&&!v.some(e=>Math.abs(t-e)<r+1.7)&&(!i||u(e,t,r*.7)&&!(t>-1-r*.5&&Math.abs(e)<10))&&!h(e,t,r*.6)&&!g(e,t,r);if(a(t,n))return{x:t,z:n};let o=[];for(let e=1;e<=30;e++){let r=e*.7;for(let e=0;e<16;e++){let i=e/16*Math.PI*2,a=t+Math.cos(i)*r,s=n+Math.sin(i)*r;o.push({x:a,z:s,s:r+Math.max(0,s-n)*2.5})}}o.sort((e,t)=>e.s-t.s);for(let e of o)if(a(e.x,e.z))return{x:e.x,z:e.z};return{x:t,z:Math.min(n,-12)}}let C={signpost:.5,hut:2.2,house:2.6,tent:1.6,well:1,campfire:1,rock:.9,log:1,bench:1,fence:3,bridge:.5,boat:1},w={stage:-2.2,behind:-5.5,back:-12,far:-20,front:4},T=[];for(let t of e.things??[]){let e=String(t.what||``).toLowerCase().trim();if(!t.row||!e.startsWith(`model:`))continue;let n=i[e.slice(6).trim()]??r[e.slice(6).trim()]??Mh(e.slice(6).trim());n&&(T.push({z:typeof t.z==`number`?t.z:w[t.where??`behind`]??-5.5,name:e.slice(6),top:Math.min(.5,d_(n).top)}),d_(n).top<.6&&v.push(T[T.length-1].z))}let E=e=>{if(!T.length)return null;let t=T.filter(e=>/track|rail|road|lane|line|street|path/.test(e.name)),n=t.length?t:T;return typeof e==`number`?n.slice().sort((t,n)=>Math.abs(t.z-e)-Math.abs(n.z-e))[0]:n[0]};for(let t of(e.things??[]).slice(0,80)){let n=String(t.what||``).toLowerCase().trim(),o=``;if(n.startsWith(`model:`)){let e=n.slice(6).trim(),s=i[e]??r[e]??Mh(e);if(!s)o=e.replace(/_/g,` `),n=`item`;else{i[e]=s;let n={};for(let e of[...s.abilities??[],...t.abilities??[]])n[e]=!0;let r=d_(s),o=r.w<.4&&r.d<.4?Math.max(.5,Math.min(4,f_(t.size,1))):Math.max(.6,Math.min(1.6,f_(t.size,1))),u={opts:{model:e},traits:n,scale:o,name:t.name};t.moves&&(u.opts.moves=t.moves);let d=typeof t.z==`number`?t.z:w[t.where??`behind`]??-5.5;if(t.row){let e=r.alongZ?Math.PI/2:p_(t.turn),n=(r.alongZ?r.d:r.w)*o,i=Math.max(.3,f_(t.spacing,Math.max(.5,n)));r.railLen>0&&(i=Math.max(.3,r.railLen*o*.98));for(let t=-46;t<=46;t+=i)c(`model`,t,d,{...u,rot:e});continue}if(t.moves&&t.moves!==`around`){let e=E(typeof t.z==`number`?t.z:void 0);e&&(typeof t.z!=`number`||Math.abs(t.z-e.z)>.6||!0)&&(d=e.z,u.opts.lift=e.top)}let f=1;for(let e of s.parts){let[t,,n]=Array.isArray(e.pos)?e.pos:[0,0,0],[r,,i]=Array.isArray(e.size)?e.size:[(e.radius??.3)*2,0,(e.radius??.3)*2];f=Math.max(f,Math.abs(t??0)+(r??0)/2,Math.abs(n??0)+(i??0)/2)}f=Math.min(f*o,25);let p=Math.max(1,Math.min(30,Math.round(f_(t.count,1))));for(let e=0;e<p;e++){if(t.moves){c(`model`,typeof t.x==`number`?t.x:0,d,{...u,rot:p_(t.turn)});continue}if(typeof t.x==`number`||typeof t.z==`number`){let n=typeof t.x==`number`?t.x+e*(f*2+.5):(a()-.5)*20,r=typeof t.z==`number`?t.z:d;s.floor||({x:n,z:r}=S(n,r,f*.85,!0)),c(`model`,n,r,{...u,rot:p_(t.turn)}),s.floor||l.push({x:n,z:r,r:f*.85});continue}let n=x(t.where??`behind`,f,!s.floor)??x(`back`,f,!s.floor)??x(`far`,f,!s.floor);n&&(l.push({x:n.x,z:n.z,r:f}),c(`model`,n.x,n.z,{...u,rot:typeof t.turn==`number`?p_(t.turn):(a()-.5)*.5}))}continue}}if(n.startsWith(`picture:`)&&(o=n.slice(8).trim(),n=`item`),!Ih.has(n)){let t=Qg(n,e.place??`plain`);t?n=t:(o||=n,n=`item`)}if([`river`,`pond`,`waterfall`,`hill`,`path`].includes(n))continue;let s=Math.max(1,Math.min(40,Math.round(f_(t.count,1)))),u=Math.max(.4,Math.min(3,f_(t.size,1))),d=(C[n]??(/(tree|palm|plant)/.test(n)?1.3:.5))*(n===`item`?1:u);for(let r=0;r<s;r++){let i=t.where??(n.includes(`tree`)||n===`palm_tree`?`everywhere`:`behind`);if(n===`boat`&&!t.where&&(i=`river`),n===`bridge`){let e=b(0);if(!e)break;c(`bridge`,e.x,e.z,{rot:e.rot+Math.PI/2,opts:{len:(f[0]?.half??1.6)*2+2.5}});continue}let s=typeof t.x==`number`||typeof t.z==`number`?{...S((typeof t.x==`number`?t.x:(a()-.5)*16)+r*(d*2+.5),typeof t.z==`number`?t.z:-5,d,d>.6),rot:typeof t.turn==`number`?p_(t.turn):void 0}:x(i,d,d>.6)??x(`everywhere`,d,!0);if(!s)continue;l.push({x:s.x,z:s.z,r:d});let p={};if(n===`item`&&(p.word=o||`box`,p.size=f_(t.size,1)),n===`boat`&&(p.moving=!!t.moving||!!t.rower,p.rower=!!t.rower),n===`campfire`&&(p.lit=t.lit!==!1),n===`signpost`){let n=String(t.name||e.name||`WELCOME`).toUpperCase();p.text=/STATION/.test(n)?`STATION`:n.split(/\s+/).find(e=>e.length>2)?.slice(0,12)??`WELCOME`}(n===`pine_tree`||n===`bare_tree`)&&(e.weather===`snow`||e.ground===`snow`)&&(p.snow=!0);let m={};for(let e of t.abilities??[])m[e]=!0;c(n,s.x,s.z,{rot:s.rot??(/(tree|palm|plant|bush)/.test(n)?a()*6:(a()-.5)*.8),scale:n===`item`?1:u*(.85+a()*.3),name:t.name,opts:Object.keys(p).length?p:void 0,traits:Object.keys(m).length?m:void 0})}}for(let t of(e.animals??[]).slice(0,20)){let n=String(t.species||`dog`).toLowerCase(),r=o_.includes(String(t.doing))?String(t.doing):`walk`,i=Math.max(1,Math.min(12,Math.round(f_(t.count,1)))),o=t.where??(r===`swim`?`river`:`behind`);r===`swim`&&(o=p.length&&!f.length?`around-pond`:o===`river`?`near-bank`:o);for(let s=0;s<i;s++){let i=x(o===`river`?`near-bank`:o,.6,!1);if(r===`swim`){let e=f.length?b(o===`far-bank`?-.6:.6):p[0]?{x:p[0].x+p[0].r*.5,z:p[0].z}:null;e&&(i=e)}i&&c(`animal`,i.x,i.z,{name:t.name,opts:{species:n,doing:r,radius:e.room?.8:1.5+a()*2,bank:o===`far-bank`?`far`:`near`}})}}for(let t of(e.people??[]).slice(0,12)){let n=s_.includes(String(t.doing))?String(t.doing):`walk`,r=Math.max(1,Math.min(8,Math.round(f_(t.count,1))));for(let i=0;i<r;i++){if(n===`row`){let e=b((a()-.5)*.6)??(p[0]?{x:p[0].x,z:p[0].z,rot:0}:null);if(!e)continue;c(`boat`,e.x,e.z,{rot:e.rot,opts:{moving:!0,rower:!0,who:t.who||`boatman`}});continue}let r=x(t.where??(n===`fish`||n===`wash`?`near-bank`:`behind`),.6,!1);r&&c(`person`,r.x,r.z,{opts:{who:t.who||`villager`,doing:n,female:!!t.female,radius:e.room?.8:2+a()*2}})}}!e.room&&!(e.animals??[]).some(e=>/bird|parrot|owl/.test(e.species))&&e.time!==`night`&&c(`birds`,0,-12,{opts:{count:4}});let D=e.place??`plain`,O=e.ground??(e.weather===`snow`?`snow`:D===`jungle`?`jungle`:D===`desert`||D===`beach`?`sand`:D===`village`?`dirt`:`grass`);return{version:1,name:(e.name||`My world`).slice(0,60),kind:D,ground:O,time:e.time??`day`,wind:Math.max(0,Math.min(1,f_(e.wind,.5))),weather:e.weather===`rain`||e.weather===`snow`?e.weather:``,season:e.season??``,fog:e.weather===`fog`?.8:e.season===`winter`?.45:0,grass:O===`snow`||O===`sand`||O===`dirt`||O===`moon`||O===`rock`?0:f_(e.grass,e.season===`winter`?.5:1),objects:o,stage:{x:0,z:0,rot:0},recipe:e,models:i,...e.room?{room:e.room,grass:0}:{}}}export{jo as $,q as A,Iu as B,Cm as C,m as Ct,km as D,L as Dt,Om as E,I as Et,um as F,Ta as G,ju as H,im as I,vs as J,z as K,am as L,Y as M,vm as N,X as O,bm as P,R as Q,$u as R,Sm as S,si as St,wm as T,Ya as Tt,ka as U,Xu as V,Xr as W,Rr as X,Xo as Y,tr as Z,Vh as _,qa as _t,Jg as a,B as at,Mm as b,_s as bt,i_ as c,Uo as ct,Cg as d,qo as dt,fa as et,Fh as f,Sa as ft,Lh as g,ms as gt,Hh as h,Di as ht,t_ as i,Jt as it,mm as j,xm as k,Ug as l,ii as lt,Nh as m,Yt as mt,l_ as n,ga as nt,$g as o,Oi as ot,Ih as p,_a as pt,Na as q,m_ as r,p as rt,e_ as s,Ga as st,u_ as t,ia as tt,Sg as u,Ka as ut,jh as v,rt as vt,Tm as w,mn as wt,Nm as x,xi as xt,Dh as y,nr as yt,Lu as z};