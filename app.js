const $ = (s) => document.querySelector(s);
const STORAGE = "voxnote-studio-notes-v1";
let notes = [];
let activeId = null;
let recognition = null;
let listening = false;
let finalTranscript = "";
let toastTimer;

function uid(){return "note_"+Math.random().toString(36).slice(2,10);}
function current(){return notes.find(n=>n.id===activeId);}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(notes));}catch(e){console.warn("Local save failed",e);}}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2300);}
function countWords(text){const trimmed=text.trim();return trimmed?trimmed.split(/\s+/).length:0;}
function updateCount(){const text=$("#transcriptText").value;$("#wordCount").textContent=countWords(text)+" words";const n=current();if(n){n.text=text;if(n.title==="Untitled transcript"&&text.trim())n.title=text.trim().split(/\s+/).slice(0,5).join(" ")+(text.trim().split(/\s+/).length>5?"…":"");$("#noteTitle").textContent=n.title;save();renderNotes();}}
function createNote(){stopListening();const n={id:uid(),title:"Untitled transcript",text:"",updatedAt:Date.now()};notes.unshift(n);activeId=n.id;finalTranscript="";save();render();$("#transcriptText").focus();}
function renderNotes(){$("#notesList").innerHTML=notes.map(n=>`<button class="note-item ${n.id===activeId?'active':''}" data-id="${n.id}" title="${escapeHTML(n.title)}">${escapeHTML(n.title)}</button>`).join("");document.querySelectorAll(".note-item").forEach(b=>b.addEventListener("click",()=>{stopListening();activeId=b.dataset.id;finalTranscript=current().text;render();}));}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){const n=current();if(!n)return;$("#noteTitle").textContent=n.title;$("#transcriptText").value=n.text;finalTranscript=n.text;$("#wordCount").textContent=countWords(n.text)+" words";renderNotes();}
function setStatus(on){listening=on;$("#statusBadge").classList.toggle("recording",on);$("#statusBadge").innerHTML=on?"<i></i> Listening":"<i></i> Ready";$("#startBtn").disabled=on;$("#stopBtn").disabled=!on;$("#waveWrap").classList.toggle("is-recording",on);$("#waveTitle").textContent=on?"Listening to your voice…":"Ready when you are";$("#waveSubtitle").textContent=on?"Speak clearly. Your recognized words will appear below.":"Allow microphone access when your browser asks.";}
function startListening(){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){$("#supportNotice").textContent="Speech recognition is not supported in this browser. Try the latest Google Chrome or Microsoft Edge. You can still type or paste text into the editor.";$("#supportNotice").classList.remove("hidden");toast("Speech recognition is not supported here.");return;}
  $("#supportNotice").classList.add("hidden");
  try{
    recognition=new SpeechRecognition();recognition.lang=$("#language").value;recognition.continuous=true;recognition.interimResults=true;
    recognition.onstart=()=>setStatus(true);
    recognition.onresult=(event)=>{let interim="";for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0].transcript;if(event.results[i].isFinal)finalTranscript+=(finalTranscript&&!/\s$/.test(finalTranscript)?" ":"")+text;else interim+=text;}$("#transcriptText").value=finalTranscript+(interim?" "+interim:"");updateCount();};
    recognition.onerror=(event)=>{if(event.error==="not-allowed"||event.error==="service-not-allowed")toast("Please allow microphone access in your browser.");else if(event.error!=="no-speech"&&event.error!=="aborted")toast("Recognition issue: "+event.error);};
    recognition.onend=()=>{setStatus(false);finalTranscript=$("#transcriptText").value;updateCount();};
    recognition.start();
  }catch(e){setStatus(false);toast("Could not start microphone. Please try again.");}
}
function stopListening(){if(recognition){try{recognition.stop();}catch(e){}recognition=null;}setStatus(false);}
function downloadText(){const n=current();if(!n||!n.text.trim()){toast("Add some text before exporting.");return;}const blob=new Blob([n.text],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(n.title==="Untitled transcript"?"voxnote-transcript":n.title.replace(/[^a-z0-9-_ ]/gi,"").trim().replace(/\s+/g,"-").toLowerCase())+".txt";a.click();URL.revokeObjectURL(url);toast("Transcript downloaded.");}
$("#startBtn").addEventListener("click",startListening);
$("#stopBtn").addEventListener("click",stopListening);
$("#newNote").addEventListener("click",createNote);
$("#focusEditor").addEventListener("click",()=>$("#transcriptText").focus());
$("#transcriptText").addEventListener("input",()=>{finalTranscript=$("#transcriptText").value;updateCount();});
$("#language").addEventListener("change",()=>{if(listening){stopListening();toast("Language changed. Start listening again.");}});
$("#downloadBtn").addEventListener("click",downloadText);
$("#exportBtn").addEventListener("click",downloadText);
$("#copyBtn").addEventListener("click",async()=>{const text=$("#transcriptText").value;if(!text.trim()){toast("There is no text to copy yet.");return;}try{await navigator.clipboard.writeText(text);toast("Transcript copied to clipboard.");}catch(e){$("#transcriptText").select();toast("Select the text and copy it manually.");}});
window.addEventListener("beforeunload",stopListening);
try{notes=JSON.parse(localStorage.getItem(STORAGE)||"[]");}catch(e){notes=[];}
if(!notes.length){notes=[{id:uid(),title:"Untitled transcript",text:"",updatedAt:Date.now()}];save();}
activeId=notes[0].id;render();
