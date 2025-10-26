// Small helper to upload a base64 data URL to a configured endpoint (stored in localStorage under 'uploadEndpoint')
export async function uploadImageDataUrl(dataUrl){
  const endpoint = localStorage.getItem('uploadEndpoint') || '';
  // If no server endpoint configured, compress the image client-side to avoid
  // saving huge data URLs into localStorage (which can quickly exceed quota).
  if(!endpoint){
    try{
      // create an offscreen image to downscale to a reasonable size
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
      const maxDim = 800; // limit max width/height
      let { width, height } = img;
      if(width > maxDim || height > maxDim){
        const ratio = Math.min(maxDim/width, maxDim/height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      // prefer JPEG with quality to reduce size
      const compressed = canvas.toDataURL('image/jpeg', 0.65);
      return compressed;
    }catch(err){
      console.warn('uploadImageDataUrl: compression fallback failed', err);
      return null;
    }
  }
  try{
    // convert dataURL to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const form = new FormData();
    form.append('file', blob, 'capture.png');
    const resp = await fetch(endpoint, { method: 'POST', body: form });
    if(!resp.ok) return null;
    const json = await resp.json();
    // return common fields
    return json.url || json.fileUrl || json.path || json.filename || json.file || null;
  }catch(err){
    console.warn('uploadImageDataUrl failed', err);
    return null;
  }
}
