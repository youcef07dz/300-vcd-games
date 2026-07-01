/* esm.sh - @nesjs/native@2.6.4 */
import{NESControllerButton as h,NES as B}from"./core.mjs";var C=class{canvas;ctx;scale;smoothing;clip8px;fillColor;NES_Width=256;NEX_Height=240;clipBounds=null;constructor(t,e){let i=Object.assign({scale:2,clip8px:!1},e);this.canvas=t,this.ctx=t.getContext("2d"),this.scale=i.scale,this.clip8px=i.clip8px,this.smoothing=i.smoothing??!1,this.fillColor=this.parseFillColor(i.fillColor),this.updateClipBounds(),this.updateCanvasSize(),this.setSmoothing(this.smoothing)}parseFillColor(t){if(!t)return new Uint8ClampedArray([0,0,0,255]);if(Array.isArray(t))return new Uint8ClampedArray(t);t.startsWith("#")&&(t=t.slice(1));let e=Number.parseInt(t,16);if(Number.isNaN(e))return new Uint8ClampedArray([0,0,0,255]);switch(t.length){case 3:return new Uint8ClampedArray([17*(e>>8&15),17*(e>>4&15),17*(15&e),255]);case 4:return new Uint8ClampedArray([17*(e>>12&15),17*(e>>8&15),17*(e>>4&15),17*(15&e)]);case 6:return new Uint8ClampedArray([e>>16&255,e>>8&255,255&e,255]);case 8:return new Uint8ClampedArray([e>>24&255,e>>16&255,e>>8&255,255&e]);default:return new Uint8ClampedArray([0,0,0,255])}}updateClipBounds(){this.clip8px?this.clipBounds={startX:8,startY:8,width:this.NES_Width-16,height:this.NEX_Height-16}:this.clipBounds=null}updateCanvasSize(){this.canvas.width=this.NES_Width,this.canvas.height=this.NEX_Height,this.canvas.style.width=this.NES_Width*this.scale+"px",this.canvas.style.height=this.NEX_Height*this.scale+"px"}renderFrame(t){let e=this.ctx.createImageData(256,240);if(this.clipBounds){let{startX:i,startY:a,width:s,height:r}=this.clipBounds,l=this.NES_Width,n=e.data;for(let u=0;u<a;u++){let p=u*l*4;for(let o=p;o<p+4*l;o+=4)n[o]=this.fillColor[0],n[o+1]=this.fillColor[1],n[o+2]=this.fillColor[2],n[o+3]=this.fillColor[3]}for(let u=a+r;u<this.NEX_Height;u++){let p=u*l*4;for(let o=p;o<p+4*l;o+=4)n[o]=this.fillColor[0],n[o+1]=this.fillColor[1],n[o+2]=this.fillColor[2],n[o+3]=this.fillColor[3]}for(let u=0;u<r;u++){let p=u+a,o=p*l*4,E=p*l*4;for(let d=o;d<o+4*i;d+=4)n[d]=this.fillColor[0],n[d+1]=this.fillColor[1],n[d+2]=this.fillColor[2],n[d+3]=this.fillColor[3];let f=E+4*i,x=f+4*s;n.set(t.subarray(f,x),f);let N=o+4*l;for(let d=o+4*(i+s);d<N;d+=4)n[d]=this.fillColor[0],n[d+1]=this.fillColor[1],n[d+2]=this.fillColor[2],n[d+3]=this.fillColor[3]}}else e.data.set(t);this.ctx.putImageData(e,0,0)}setScale(t){this.scale=t,this.updateCanvasSize()}setClip8px(t){this.clip8px=t,this.updateClipBounds()}setFillColor(t){this.fillColor=this.parseFillColor(t)}setSmoothing(t){this.smoothing=t,t?(this.ctx.imageSmoothingEnabled=!0,this.canvas.style.imageRendering="auto"):(this.ctx.imageSmoothingEnabled=!1,this.canvas.style.imageRendering="pixelated")}},b=class{sampleRate;bufferSize;audioContext;gainNode;audioWorkletNode;audiobuf;enableSAB;sab;sabControl;sabData;sabCapacity;ringCapacity;bufptr;isInitialized;isPlaying;volume;constructor(t){this.enableSAB=!!t?.enableSAB,this.sabCapacity=t?.sabCapacity||65536,this.ringCapacity=t?.ringCapacity||8192,this.sampleRate=t?.audioSampleRate||44100,this.bufferSize=t?.audioBufferSize||1024,this.audiobuf=new Float32Array(8*this.bufferSize),this.bufptr=0,this.sab=null,this.sabControl=null,this.sabData=null,this.isInitialized=!1,this.isPlaying=!1,this.volume=.5;let e=window.AudioContext;this.audioContext=new e({sampleRate:this.sampleRate,latencyHint:"interactive"}),this.gainNode=this.audioContext.createGain(),this.gainNode.gain.value=this.volume,this.gainNode.connect(this.audioContext.destination)}async initialize(){if(!this.isInitialized)try{if(!this.audioContext){let t=window.AudioContext;this.audioContext=new t({sampleRate:this.sampleRate,latencyHint:"interactive"}),this.gainNode=this.audioContext.createGain(),this.gainNode.gain.value=this.volume,this.gainNode.connect(this.audioContext.destination)}await this.setupAudioWorklet(),this.isInitialized=!0}catch(t){throw console.error("Failed to initialize WebAudio:",t),t}}async setupAudioWorklet(){let t=new Blob([`class NESAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.frameCount = 0
        this.lastLogTime = 0
        this.maxBufferSize = 8192

        // SAB views (if initialized)
        this.sab = null
        this.sabControl = null
        this.sabData = null
        this.sabCapacity = 0

        // internal ring buffer for non-SAB path
        this.ring = new Float32Array(this.maxBufferSize)
        this.rRead = 0
        this.rWrite = 0
        this.rCapacity = this.ring.length

        this.port.onmessage = event => {
            const d = event.data
            if (d && d.type === 'init-config') {
                try {
                    const rc = d.ringCapacity || this.maxBufferSize
                    this.maxBufferSize = rc
                    this.ring = new Float32Array(this.maxBufferSize)
                    this.rCapacity = this.ring.length
                    this.rRead = 0
                    this.rWrite = 0
                }
                catch {

                    // ignore
                }
            }
            else if (d && d.type === 'init-sab') {
                try {
                    this.sab = d.sab
                    this.sabControl = new Int32Array(this.sab, 0, 2)
                    const controlBytes = 2 * Int32Array.BYTES_PER_ELEMENT
                    this.sabData = new Float32Array(this.sab, controlBytes)
                    this.sabCapacity = d.capacity || this.sabData.length
                }
                catch {
                    this.sab = null
                    this.sabControl = null
                    this.sabData = null
                }
            }
            else if (d && d.type === 'samples') {
                this.lastDataTime = Date.now()
                if (d.buffer) {
                    try {
                        const arr = new Float32Array(d.buffer)
                        this._ringWrite(arr)
                    }
                    catch {

                        // ignore
                    }
                }
                else if (d.samples) {

                    // samples might be a normal JS array
                    const arr = new Float32Array(d.samples)
                    this._ringWrite(arr)
                }
            }
        }
    }

    _ringWrite(arr) {
        for (let i = 0; i < arr.length; i++) {

            // reserve next position; keep one slot empty to distinguish full/empty
            const next = (this.rWrite + 1) % this.rCapacity
            if (next === this.rRead) {

                // buffer full - drop oldest by advancing read
                this.rRead = (this.rRead + 1) % this.rCapacity
            }
            this.ring[this.rWrite] = arr[i]
            this.rWrite = next
        }
    }

    process(inputs, outputs) {
        const output = outputs[0]
        const left = output[0]
        const right = output[1]

        this.frameCount++

        if (this.sabData) {
            let read = Atomics.load(this.sabControl, 0)
            const write = Atomics.load(this.sabControl, 1)
            const capacity = this.sabCapacity || this.sabData.length
            let available = write >= read ? write - read : write + capacity - read

            for (let i = 0; i < left.length; i++) {
                if (available >= 2) {
                    left[i] = this.sabData[read]
                    right[i] = this.sabData[(read + 1) % capacity]
                    read = (read + 2) % capacity
                    available -= 2
                }
                else {
                    left[i] = 0
                    right[i] = 0
                }
            }

            Atomics.store(this.sabControl, 0, read)
        }
        else {
            for (let i = 0; i < left.length; i++) {
                if (this.rRead === this.rWrite) {
                    left[i] = 0
                    right[i] = 0
                }
                else {

                    // read two samples (stereo interleaved)
                    left[i] = this.ring[this.rRead]
                    right[i] = this.ring[(this.rRead + 1) % this.rCapacity]
                    this.rRead = (this.rRead + 2) % this.rCapacity
                }
            }
        }

        return true
    }
}

registerProcessor('nes-audio-processor', NESAudioProcessor)
`],{type:"application/javascript"}),e=URL.createObjectURL(t);try{await this.audioContext?.audioWorklet.addModule(e)}finally{URL.revokeObjectURL(e)}this.audioWorkletNode=new AudioWorkletNode(this.audioContext,"nes-audio-processor",{outputChannelCount:[2],numberOfOutputs:1}),this.audioWorkletNode.connect(this.gainNode);try{this.audioWorkletNode.port.postMessage({type:"init-config",ringCapacity:this.ringCapacity})}catch{}if(this.enableSAB)if(typeof SharedArrayBuffer>"u")console.warn("SharedArrayBuffer is not supported in this environment; falling back to non-SAB audio path.");else try{let i=2*Int32Array.BYTES_PER_ELEMENT,a=this.sabCapacity*Float32Array.BYTES_PER_ELEMENT,s=new SharedArrayBuffer(i+a),r=new Int32Array(s,0,2);r[0]=0,r[1]=0;let l=new Float32Array(s,i,this.sabCapacity);this.sab=s,this.sabControl=r,this.sabData=l,this.audioWorkletNode.port.postMessage({type:"init-sab",sab:s,capacity:this.sabCapacity})}catch{this.sab=null,this.sabControl=null,this.sabData=null}}outputSample(t){if(!this.isInitialized||!this.isPlaying)return;let e=t/32767;if(this.enableSAB&&this.sabData&&this.sabControl){let a=this.sabData.length,s=Atomics.load(this.sabControl,1),r=Atomics.load(this.sabControl,0);if((s>=r?a-(s-r)-1:r-s-1)>=2){this.sabData[s]=e;let l=(s+1)%a;this.sabData[l]=e;let n=(s+2)%a;return Atomics.store(this.sabControl,1,n),void Atomics.notify(this.sabControl,1,1)}}let i=this.bufptr+2;if(i>this.audiobuf.length){let a=this.audiobuf.length||8*this.bufferSize;for(;a<i;)a*=2;let s=new Float32Array(a);s.set(this.audiobuf.subarray(0,this.bufptr)),this.audiobuf=s}this.audiobuf[this.bufptr]=e,this.audiobuf[this.bufptr+1]=e,this.bufptr+=2}flushFrame(){if(this.bufptr>0){if(this.audioWorkletNode?.port&&!this.sab){let t=this.audiobuf.subarray(0,this.bufptr),e=new Float32Array(t.length);e.set(t),this.audioWorkletNode.port.postMessage({type:"samples",buffer:e.buffer},[e.buffer])}this.bufptr=0}}async start(){this.isInitialized||await this.initialize(),this.audioContext?.state==="suspended"&&await this.audioContext.resume(),this.isPlaying=!0}pause(){if(this.isPlaying=!1,this.audioContext&&this.audioContext.state==="running")return this.audioContext.suspend()}async resume(){this.isPlaying=!0,this.audioContext&&this.audioContext.state==="suspended"&&await this.audioContext.resume()}destroy(){this.isPlaying=!1,this.audiobuf=new Float32Array(0),this.sab=null,this.sabControl=null,this.sabData=null,this.audioWorkletNode&&(this.audioWorkletNode.disconnect(),this.audioWorkletNode=null),this.gainNode&&(this.gainNode.disconnect(),this.gainNode=null),this.audioContext&&(this.audioContext.close(),this.audioContext=null),this.isInitialized=!1}setVolume(t){this.volume=Math.max(0,Math.min(1,t)),this.gainNode&&(this.gainNode.gain.value=this.volume)}getVolume(){return this.volume}getAudioContext(){return this.audioContext}},y={A:0,B:1,SELECT:2,START:3,UP:4,DOWN:5,LEFT:6,RIGHT:7,C:8,D:9},v={0:h.A,1:h.A,2:h.B,3:h.B,8:h.SELECT,9:h.START,12:h.UP,13:h.DOWN,14:h.LEFT,15:h.RIGHT},m={HORIZONTAL:{LEFT:h.LEFT,RIGHT:h.RIGHT},VERTICAL:{UP:h.UP,DOWN:h.DOWN}},D={UP:"KeyW",DOWN:"KeyS",LEFT:"KeyA",RIGHT:"KeyD",A:"KeyK",B:"KeyJ",C:"KeyI",D:"KeyU",SELECT:"Digit2",START:"Digit1"},T={UP:"ArrowUp",DOWN:"ArrowDown",LEFT:"ArrowLeft",RIGHT:"ArrowRight",A:"Numpad2",B:"Numpad1",C:"Numpad5",D:"Numpad4",SELECT:"NumpadDecimal",START:"NumpadEnter"},A=class{controllers;_autoStates={1:{0:{id:0,on:!1,pressed:!0},1:{id:0,on:!1,pressed:!0}},2:{0:{id:0,on:!1,pressed:!0},1:{id:0,on:!1,pressed:!0}}};constructor(t){this.controllers=t}setAutoFire(t,e,i,a){let s=this._autoStates[t]?.[e];if(!s)return;let r=this.controllers[t];i?s.pressed&&(r.setButton(e,1),s.id=window.setInterval(()=>{r.setButton(e,s.on?1:0),s.on=!s.on},a),s.pressed=!1):(s.id&&(clearInterval(s.id),s.id=0),s.on=!1,s.pressed=!0,r.setButton(e,0))}stopAllAutoFire(){Object.values(this._autoStates).forEach(t=>{Object.values(t).forEach(e=>{e.id&&(clearInterval(e.id),e.id=0),e.on=!1,e.pressed=!0})})}supportsAutoFire(t){return t===h.A||t===h.B}};function g(c,t){return Array.from({length:t}).fill(c)}var S=class{controller;_events={};autoFireManager;constructor(t){this.controller=t,this.autoFireManager=new A(t)}addEvent(t,e){this._events[t]||(this._events[t]=[]),this._events[t].push(e)}trigger(t,e,i){let a=this._events[t];a&&a.forEach(s=>{let r=s.player,l=this.controller[r];if(s.index<=7)l.setButton(s.index,e);else{let n=s.index-8;this.autoFireManager.setAutoFire(r,n,e===1,i)}})}setAutoFire(t,e,i,a){this.autoFireManager.setAutoFire(t,e,i,a)}supportsAutoFire(t){return this.autoFireManager.supportsAutoFire(t)}getState(t){return this._events[t]}init(){this._events={}}destroy(){this.autoFireManager.stopAllAutoFire()}},F=class{THRESHOLD=.3;adapter;animationFrameID=null;autoFireButtonIndices=new Set([1,3]);axesHolding={1:g(!1,4),2:g(!1,4)};btnHolding={1:g(!1,20),2:g(!1,20)};mashingSpeed=31.25;controllers;p1KeyMap=D;p2KeyMap=T;constructor(t,e){this.controllers={1:t,2:e},this.setupKeyboadEvents(),this.setupGampad(),this.adapter=new S(this.controllers),this.setupKeyboadController(1,this.p1KeyMap),this.setupKeyboadController(2,this.p2KeyMap)}get gamepads(){return navigator.getGamepads().filter(Boolean)}connectHandler(t,e){t?this.gamepads[e.gamepad.index]=e.gamepad:this.gamepads.length===0&&this.close()}close(){this.btnHolding[1].fill(!1),this.btnHolding[2].fill(!1),this.axesHolding[1].fill(!1),this.axesHolding[2].fill(!1),this.animationFrameID&&(cancelAnimationFrame(this.animationFrameID),this.animationFrameID=null)}gamepadAxesHandler(t,e,i,a){let s=this.axesHolding[t]?.[i];e?s||(this.controllers[t].setButton(a,1),this.axesHolding[t][i]=!0):s&&(this.controllers[t].setButton(a,0),this.axesHolding[t][i]=!1)}gamepadBtnHandler(t,e,i){let a=this.btnHolding[t]?.[i],s=v[i];s!=null&&(e.pressed?a||(this.isAutoFireButton(i)?this.adapter.setAutoFire(t,s,!0,this.mashingSpeed):this.controllers[t].setButton(s,1),this.btnHolding[t][i]=!0):a&&(this.isAutoFireButton(i)?this.adapter.setAutoFire(t,s,!1,this.mashingSpeed):this.controllers[t].setButton(s,0),this.btnHolding[t][i]=!1))}frame(){for(let t=0;t<this.gamepads.length&&!(t>1);t++){let e=this.gamepads[t];if(!e)continue;let i=t+1;e.buttons.forEach((r,l)=>{this.gamepadBtnHandler(i,r,l)});let a=e.axes[0]??0,s=e.axes[1]??0;this.gamepadAxesHandler(i,a>this.THRESHOLD,0,m.HORIZONTAL.RIGHT),this.gamepadAxesHandler(i,a<-this.THRESHOLD,1,m.HORIZONTAL.LEFT),this.gamepadAxesHandler(i,s>this.THRESHOLD,2,m.VERTICAL.DOWN),this.gamepadAxesHandler(i,s<-this.THRESHOLD,3,m.VERTICAL.UP)}}run(){this.frame(),this.animationFrameID=requestAnimationFrame(this.run.bind(this))}setupKeyboadController(t,e){this.adapter.init(),t===1?this.p1KeyMap=e:t===2&&(this.p2KeyMap=e),Object.keys(y).forEach(i=>{i in this.p1KeyMap&&this.adapter.addEvent(this.p1KeyMap[i],{player:1,index:y[i]}),i in this.p2KeyMap&&this.adapter.addEvent(this.p2KeyMap[i],{player:2,index:y[i]})})}setupKeyboadEvents(){document.addEventListener("keydown",t=>{this.adapter.trigger(t.code,1,this.mashingSpeed)}),document.addEventListener("keyup",t=>{this.adapter.trigger(t.code,0,this.mashingSpeed)})}setupGampad(){window.addEventListener("gamepadconnected",this.connectHandler.bind(this,!0)),window.addEventListener("gamepaddisconnected",this.connectHandler.bind(this,!1)),this.run()}setMashingSpeed(t){this.mashingSpeed=1e3/(2*t)}setAutoFireForButton(t,e,i){i&&this.adapter.supportsAutoFire(e)?this.adapter.setAutoFire(t,e,!0,this.mashingSpeed):this.adapter.setAutoFire(t,e,!1,this.mashingSpeed)}stopAllAutoFire(){this.adapter.destroy()}setAutoFireButtons(t){this.autoFireButtonIndices=new Set(t)}isAutoFireButton(t){return this.autoFireButtonIndices.has(t)}},w=class c{static FPS_BY_TV={NTSC:1789773/29781,PAL:1662607/33252,DENDY:1773448/35469};nes;renderer;audioOutput;frameDuration;lastFrameTime=0;targetFPS=60;status=0;animationFrameId=null;romData=null;controller;constructor(t,e){this.nes=new B(e||{}),this.renderer=new C(t,e),this.audioOutput=new b(e),this.frameDuration=1e3/this.targetFPS,this.nes.setAudioInterface(this.audioOutput),this.nes.setRenderer(this.renderer),this.controller=new F(this.nes.getGamepad(1),this.nes.getGamepad(2)),e?.player1KeyMap&&this.controller.setupKeyboadController(1,e.player1KeyMap),e?.player2KeyMap&&this.controller.setupKeyboadController(2,e.player2KeyMap)}async loadROM(t){switch(this.romData=t,await this.nes.loadROM(t),this.nes.getTVType()){case"NTSC":default:this.targetFPS=c.FPS_BY_TV.NTSC;break;case"PAL":this.targetFPS=c.FPS_BY_TV.PAL;break;case"DENDY":this.targetFPS=c.FPS_BY_TV.DENDY}this.frameDuration=1e3/this.targetFPS}getNESInstance(){return this.nes}mainLoop=()=>{let t=performance.now(),e=t-this.lastFrameTime;for(e>1e3&&(this.lastFrameTime=t,e=0);e>=this.frameDuration;)this.nes.runFrame(),this.lastFrameTime+=this.frameDuration,e-=this.frameDuration;this.animationFrameId=requestAnimationFrame(this.mainLoop)};run(){this.animationFrameId=requestAnimationFrame(this.mainLoop)}async start(){switch(this.status){case 0:if(!this.romData)throw new Error("ROM not loaded");this.status=1,this.lastFrameTime=performance.now(),this.run(),await this.audioOutput.start();break;case 2:await this.resume()}}async pause(){if(this.status===1){try{await this.audioOutput.pause()}catch{}this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null),this.status=2}}async resume(){this.status===2&&(await this.audioOutput.resume(),this.status=1,this.lastFrameTime=performance.now(),this.run())}stop(){this.status!==0&&(this.audioOutput.destroy(),this.status=0,this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null))}reset(){this.nes.reset()}async enableAudio(){try{return await this.audioOutput.start(),!0}catch(t){return console.error(`Failed to enable audio: ${t}`),!1}}disableAudio(){this.audioOutput.pause()}setVolume(t){this.audioOutput.setVolume(t)}setScale(t){this.renderer.setScale(t)}setSmoothing(t){this.renderer.setSmoothing(t)}setClip8px(t){this.renderer.setClip8px(t)}setFillColor(t){this.renderer.setFillColor(t)}setFDSBIOS(t){this.nes.setFDSBIOS(t)}addCheat(t){let e=this.nes.getCheater();if(e)try{return e.addCheat(t),!0}catch(i){return console.error(i),!1}}toggleCheat(t){let e=this.nes.getCheater();if(!e)return;let i=e.getCheat(t);i&&e.setCheatEnabled(t,!i.enabled)}removeCheat(t){let e=this.nes.getCheater();e&&e.removeCheat(t)}clearAllCheats(){let t=this.nes.getCheater();t&&t.clearCheats()}setupKeyboadController(t,e){this.controller.setupKeyboadController(t,e)}saveState(){return this.nes.createBinarySaveState()}loadState(t){this.nes.loadBinarySaveState(t)}};export{w as NESEmulator};
//# sourceMappingURL=native.mjs.map