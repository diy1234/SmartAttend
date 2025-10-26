import React, { useState, useContext, useRef, useEffect } from 'react';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';
import { uploadImageDataUrl } from '../utils/uploadUtils';
import { useLocation } from 'react-router-dom';

export default function StudentAttendance(){
  const { addAttendance, departments } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);
  const location = useLocation();
  const { getEnrollmentsForStudent } = useContext(DataContext);
  // support preselection via router state: { dept, subject }
  const pre = location.state || {};
  const [dept, setDept] = useState(pre.dept || departments?.[0]?.name || '');
  const [subject, setSubject] = useState(pre.subject || departments?.[0]?.subjects?.[0] || '');

  // Camera refs/state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);

  useEffect(()=>{
    // update selected dept/subject when departments change
    if(!dept && departments?.length) setDept(departments[0].name);
    const enrolls = getEnrollmentsForStudent(JSON.parse(localStorage.getItem('user'))?.email) || [];
    if(enrolls.length){
      const forDept = enrolls.filter(e=>e.dept === dept).map(e=>e.subject);
      if(forDept.length) setSubject(prev=> forDept.includes(prev) ? prev : forDept[0]);
      else {
        const d = departments.find(d => d.name === dept);
        if(d && (!subject || !d.subjects.includes(subject))) setSubject(d.subjects?.[0] || '');
      }
    } else {
      if(dept){
        const d = departments.find(d => d.name === dept);
        if(d && (!subject || !d.subjects.includes(subject))) setSubject(d.subjects?.[0] || '');
      }
    }
  }, [departments, dept, subject, getEnrollmentsForStudent]);

  const startCamera = async () => {
    if (streaming) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (e) {
      showToast('Camera access denied or not available', 'error', 3500);
    }
  };

  const stopCamera = () => {
    const tracks = videoRef.current?.srcObject?.getTracks() || [];
    tracks.forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  };

  const capture = () => {
    if (!streaming) return showToast('Start camera first', 'error', 2000);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    setCaptured(data);
    // stop camera after capture
    stopCamera();
    // save attendance record
    const user = JSON.parse(localStorage.getItem('user')) || { email: 'student@local' };
    (async ()=>{
      let photoRef = data; // fallback
      const uploaded = await uploadImageDataUrl(data);
      if(uploaded) photoRef = uploaded; // might be URL or path (or compressed dataURL)
      // protect localStorage quota: if the photo is still a very large data URL, omit it
      try{
        if(typeof photoRef === 'string' && photoRef.startsWith('data:') && photoRef.length > 180000){
          // too large to safely store in localStorage
          showToast('Image omitted from local storage to avoid exceeding browser storage quota', 'warning', 5000);
          photoRef = null;
        }
      }catch(e){
        console.warn('photo size check failed', e);
      }
      const record = {
        id: Date.now(),
        student: user.email,
        method: 'face-capture',
        status: 'Present',
        date: new Date().toISOString(),
        dept,
        subject,
        photo: photoRef,
      };
      addAttendance(record);
      showToast('✅ Attendance recorded', 'info', 3000);
    })();
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Student — Face Check-in</h2>

      <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select value={dept} onChange={(e)=>setDept(e.target.value)} className="border p-2 rounded">
            {(departments || []).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <select value={subject} onChange={(e)=>setSubject(e.target.value)} className="border p-2 rounded">
            {
              (() => {
                const enrolls = getEnrollmentsForStudent(JSON.parse(localStorage.getItem('user'))?.email) || [];
                const forDept = enrolls.filter(e => e.dept === dept).map(e=>e.subject);
                if(forDept.length) return forDept.map(s => <option key={s} value={s}>{s}</option>);
                return (departments.find(d=>d.name===dept)?.subjects || []).map(s => <option key={s} value={s}>{s}</option>);
              })()
            }
          </select>
          <div className="flex items-center gap-2">
            {!streaming ? (
              <button onClick={startCamera} className="px-4 py-2 bg-blue-800 text-white rounded">Start Camera</button>
            ) : (
              <button onClick={stopCamera} className="px-4 py-2 bg-gray-600 text-white rounded">Stop Camera</button>
            )}
            <button onClick={capture} className="px-4 py-2 bg-green-600 text-white rounded">Capture & Check-in</button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-1/2 bg-gray-50 p-2 rounded">
            <video ref={videoRef} className="w-full rounded" autoPlay muted playsInline style={{ background: '#000' }} />
          </div>
          <div className="w-1/2 bg-gray-50 p-2 rounded">
            <canvas ref={canvasRef} style={{ display: captured ? 'block' : 'none', width: '100%', borderRadius: 6 }} />
            {!captured && <div className="text-sm text-gray-500">Captured image will appear here after you press capture.</div>}
            {captured && (
              <div className="mt-2">
                <img src={captured} alt="captured" className="w-full rounded" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p><strong>Privacy:</strong> Images are stored locally in your browser (localStorage via DataContext). For production use, send captures to a secure server or perform on-device verification and only store non-sensitive tokens.</p>
        </div>
      </div>
    </div>
  );
}
