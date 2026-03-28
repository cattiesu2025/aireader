import { useState, useRef, useEffect } from 'react'
import { PDFViewer } from './components/PDFViewer/index.jsx'
import { Sidebar } from './components/Sidebar/index.jsx'
import { Toolbar } from './components/Toolbar/index.jsx'
import { useStore } from './store/useStore.js'

export default function App() {
  const [filePath, setFilePath] = useState(null)
  const [selectionMode, setSelectionMode] = useState('text')
  const pdfViewerRef = useRef(null)
  const setPdfPath = useStore((s) => s.setPdfPath)

  const handleOpenFile = async () => {
    const path = await window.electron.openFileDialog()
    if (path) {
      setFilePath(path)
      setPdfPath(path)
    }
  }

  // Shift key temporarily switches to region mode
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Shift' && selectionMode === 'text') {
        setSelectionMode('region')
      }
    }
    const onKeyUp = (e) => {
      if (e.key === 'Shift') {
        setSelectionMode('text')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectionMode])

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Toolbar
        onOpenFile={handleOpenFile}
        selectionMode={selectionMode}
        onModeChange={setSelectionMode}
      />
      <div className="flex flex-1 overflow-hidden">
        <PDFViewer
          ref={pdfViewerRef}
          filePath={filePath}
          selectionMode={selectionMode}
        />
        <Sidebar pdfViewerRef={pdfViewerRef} />
      </div>
    </div>
  )
}
