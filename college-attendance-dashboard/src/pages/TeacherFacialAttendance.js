import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';

export default function TeacherFacialAttendance(){
  const { departments } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const location = useLocation();
  const pre = location.state || {};

  const [dept, setDept] = useState(pre.dept || departments?.[0]?.name || '');
  const [subject, setSubject] = useState(pre.subject || departments?.[0]?.subjects?.[0] || '');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);

  // set defaults once when departments are available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(!dept && departments?.length) setDept(departments[0].name);
    if(!subject && departments?.length) setSubject(departments[0].subjects?.[0] || '');
  }, [departments]);

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

  const capture = async () => {
    if (!streaming) return showToast('Start camera first', 'error', 2000);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    setCaptured(data);
    stopCamera();
    // Navigate to take-attendance with image and course info
    navigate('/take-attendance', { state: { image: data, course: `${dept} - ${subject}`, dept, subject } });
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Teacher — Facial Attendance</h2>

      <div className="bg-white p-6 rounded-xl shadow-md max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select value={dept} onChange={(e)=>setDept(e.target.value)} className="border p-2 rounded">
            {(departments || []).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <select value={subject} onChange={(e)=>setSubject(e.target.value)} className="border p-2 rounded">
            {(departments.find(d=>d.name===dept)?.subjects || []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            {!streaming ? (
              <button onClick={startCamera} className="px-4 py-2 bg-green-600 text-white rounded">Start Camera</button>
            ) : (
              <button onClick={stopCamera} className="px-4 py-2 bg-gray-600 text-white rounded">Stop Camera</button>
            )}
            <button onClick={capture} className="px-4 py-2 bg-blue-800 text-white rounded">Capture & Send to Attendance</button>
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
          <p><strong>Privacy:</strong> Images are handled locally. For production use, send captures to a secure server or perform on-device verification and store only non-sensitive tokens.</p>
        </div>
      </div>
    </div>
  );
}
