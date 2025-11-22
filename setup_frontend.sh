#!/bin/bash

echo "🚀 Generating Headhunter Frontend..."

# Create Folder Structure
mkdir -p frontend/src/assets
mkdir -p frontend/public

# 1. Package.json
cat > frontend/package.json <<EOF
{
  "name": "headhunter-ui",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.2",
    "lucide-react": "^0.294.0",
    "tailwindcss": "^3.3.5",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
EOF

# 2. Vite Config (Proxy for API)
cat > frontend/vite.config.js <<EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:30001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
EOF

# 3. Tailwind Config
cat > frontend/postcss.config.js <<EOF
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

cat > frontend/tailwind.config.js <<EOF
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# 4. HTML Entry Point
cat > frontend/index.html <<EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Headhunter AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# 5. React Entry Point
cat > frontend/src/main.jsx <<EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# 6. CSS
cat > frontend/src/index.css <<EOF
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# 7. The Main Dashboard (App.jsx)
cat > frontend/src/App.jsx <<EOF
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Upload, FileText, RefreshCw, CheckCircle, BrainCircuit, FileSearch } from 'lucide-react'

function App() {
  const [profiles, setProfiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState("")

  const fetchProfiles = async () => {
    try {
      const res = await axios.get('/api/profiles/')
      setProfiles(res.data)
    } catch (err) {
      console.error("Error fetching profiles", err)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setStatus("Uploading...")
    try {
      await axios.post('/api/cv/upload', formData)
      setStatus("AI Parsing started (GPU)...")
      // Wait 5s then refresh
      setTimeout(() => {
        fetchProfiles()
        setStatus("Done!")
        setTimeout(() => setStatus(""), 2000)
      }, 5000) 
    } catch (err) {
      alert("Upload failed")
      setStatus("Error")
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
    const interval = setInterval(fetchProfiles, 5000) // Auto-refresh
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-600 flex items-center gap-3">
              <BrainCircuit className="w-10 h-10" /> Headhunter AI
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-1">Powered by Llama 3.1 8B & Intel GPU</p>
          </div>

          <div className="flex items-center gap-4">
            {status && <span className="text-sm font-medium text-indigo-600 animate-pulse bg-indigo-50 px-3 py-1 rounded-lg">{status}</span>}
            <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0">
              <Upload size={20} />
              {uploading ? "Processing..." : "Upload CV"}
              <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.docx" disabled={uploading} />
            </label>
          </div>
        </header>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {profiles.map((cv) => (
            <div key={cv.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1" title={cv.parsed_data?.name || cv.filename}>
                      {cv.parsed_data?.name || "Unknown Candidate"}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 truncate w-48" title={cv.filename}>{cv.filename}</p>
                  </div>
                </div>
                {cv.is_parsed ? (
                  <span className="bg-green-100 text-green-700 p-1.5 rounded-full" title="Parsed Successfully">
                    <CheckCircle size={16} />
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-700 p-1.5 rounded-full animate-pulse" title="Processing">
                    <RefreshCw size={16} className="animate-spin" />
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                   <span>Experience:</span>
                   <span className="font-semibold text-indigo-600">{cv.parsed_data?.experience_years ?? "?"} Years</span>
                </div>
                <div className="truncate" title={cv.parsed_data?.email}>📧 {cv.parsed_data?.email || "N/A"}</div>
                <div className="truncate">📱 {cv.parsed_data?.phone || "N/A"}</div>
              </div>

              <div className="mt-auto">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Top Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {cv.parsed_data?.skills && cv.parsed_data.skills.length > 0 ? (
                    <>
                      {cv.parsed_data.skills.slice(0, 6).map((skill, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                      {cv.parsed_data.skills.length > 6 && (
                        <span className="text-[10px] text-gray-400 py-1">+{cv.parsed_data.skills.length - 6} more</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No skills detected</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileSearch className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-medium text-gray-900">No candidates found</h3>
            <p className="text-gray-500 mt-2">Upload a CV to start building your talent pool.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
EOF

# 8. Dockerfile for Frontend
cat > frontend/Dockerfile <<EOF
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
EOF

echo "✅ Frontend Generated Successfully!"
