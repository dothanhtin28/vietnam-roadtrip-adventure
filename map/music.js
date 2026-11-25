'use strict';
globalThis.TripMusic=(()=>{
 const melody=[62,null,64,67,69,null,67,64,62,null,59,57,59,null,62,null,
  64,67,69,null,72,69,67,null,64,null,62,59,57,null,62,null];
 const bass=[50,55,53,50];
 let audio,bus,timer,next,index=0;
 function note(midi,when,volume,length,type){
  const voice=audio.createOscillator(),amp=audio.createGain();
  voice.type=type;voice.frequency.value=440*2**((midi-69)/12);
  amp.gain.setValueAtTime(.0001,when);
  amp.gain.exponentialRampToValueAtTime(volume,when+.035);
  amp.gain.exponentialRampToValueAtTime(.0001,when+length);
  voice.connect(amp).connect(bus);voice.start(when);voice.stop(when+length+.02);
 }
 function schedule(){
  if(next<audio.currentTime)next=audio.currentTime+.03;
  while(next<audio.currentTime+.23){
   const n=melody[index%melody.length];
   if(n!==null)note(n,next,.11,.72,'sine');
   if(index%4===0)note(bass[Math.floor(index/8)%bass.length],next,.073,1.45,'triangle');
   index++;next+=.36;
  }
 }
 async function toggle(){
  if(timer!==undefined){clearInterval(timer);timer=undefined;await audio.suspend();return false;}
  const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;
  if(!Audio)return false;
  if(!audio){
   audio=new Audio();bus=audio.createGain();bus.gain.value=.36;bus.connect(audio.destination);
  }
  await audio.resume();next=audio.currentTime+.04;
  schedule();timer=setInterval(schedule,95);return true;
 }
 return {toggle};
})();
