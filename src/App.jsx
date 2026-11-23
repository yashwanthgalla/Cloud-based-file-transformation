import './App.css'
import { useEffect, useMemo } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import MergePdf from './pages/MergePdf.jsx'
import ToolPage from './pages/ToolPage.jsx'
import AuthPlaceholder from './pages/AuthPlaceholder.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import VerifyResetCode from './pages/VerifyResetCode.jsx'
import Header from './components/Header.jsx'
import SplitPdf from './pages/SplitPdf.jsx'
import RotatePdf from './pages/RotatePdf.jsx'
import JpgToPdf from './pages/JpgToPdf.jsx'
import PdfToJpg from './pages/PdfToJpg.jsx'
import Watermark from './pages/Watermark.jsx'
import PageNumbers from './pages/PageNumbers.jsx'
import CompressPdf from './pages/CompressPdf.jsx'
import OrganizePdf from './pages/OrganizePdf.jsx'
import RepairPdf from './pages/RepairPdf.jsx'
import CropPdf from './pages/CropPdf.jsx'
import SignPdf from './pages/SignPdf.jsx'
import EditPdf from './pages/EditPdf.jsx'
import ScanToPdf from './pages/ScanToPdf.jsx'
import OcrPdf from './pages/OcrPdf.jsx'
import ComparePdf from './pages/ComparePdf.jsx'
import RedactPdf from './pages/RedactPdf.jsx'
import HtmlToPdf from './pages/HtmlToPdf.jsx'

import PdfToWord from './pages/PdfToWord.jsx'
import PdfToExcel from './pages/PdfToExcel.jsx'
import PdfToPowerpoint from './pages/PdfToPowerpoint.jsx'

const HERO_SMURFS = [
  '/smurfs/smurf-22587.png',
  '/smurfs/smurf-22589.png',
  '/smurfs/smurf-22593.png',
  '/smurfs/smurf-22595.png',
  '/smurfs/smurf-22601.png',
  '/smurfs/smurf-22604.png',
  '/smurfs/smurf-22607.png',
  '/smurfs/smurf-22609.png',
  '/smurfs/smurf-22611.png',
  '/smurfs/smurf-22662.png',
  '/smurfs/smurf-22664.png',
  '/smurfs/smurf-22666.png',
]

function hashString(input) {
  // Small deterministic hash (FNV-1a-ish) for stable per-route selection.
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickHeroSmurf(pathname) {
  const idx = hashString(String(pathname || '/')) % HERO_SMURFS.length
  return HERO_SMURFS[idx]
}
import OfficeToPdf from './pages/OfficeToPdf.jsx'
import UnlockPdf from './pages/UnlockPdf.jsx'
import ProtectPdf from './pages/ProtectPdf.jsx'
import PdfToPdfa from './pages/PdfToPdfa.jsx'
import { tools } from './data/tools.js'
import { resetFaviconToDefault, setFaviconForServiceTitle } from './utils/favicon.js'
import { applyTheme, getPreferredTheme } from './utils/theme.js'
import { trackToolUse } from './utils/recentTools.js'

function App() {
  const location = useLocation()

  const heroSmurf = useMemo(() => pickHeroSmurf(location.pathname), [location.pathname])

  const toolByPath = useMemo(() => {
    const map = new Map()
    for (const t of tools) map.set(t.path, t)
    return map
  }, [])

  useEffect(() => {
    const tool = toolByPath.get(location.pathname)
    if (tool?.title) setFaviconForServiceTitle(tool.title)
    else resetFaviconToDefault()

    if (tool?.path) trackToolUse(tool)
  }, [location.pathname, toolByPath])

  useEffect(() => {
    applyTheme(getPreferredTheme())
  }, [])

  return (
    <div className="appShell">
      <Header />

      <main className="container main" style={{ '--heroSmurf': `url("${heroSmurf}")` }}>
        <div className="page" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/merge" element={<MergePdf />} />
            <Route path="/split" element={<SplitPdf />} />
            <Route path="/compress" element={<CompressPdf />} />
            <Route path="/rotate" element={<RotatePdf />} />
            <Route path="/jpg-to-pdf" element={<JpgToPdf />} />
            <Route path="/pdf-to-jpg" element={<PdfToJpg />} />
            <Route path="/watermark" element={<Watermark />} />
            <Route path="/page-numbers" element={<PageNumbers />} />
            <Route path="/organize" element={<OrganizePdf />} />
            <Route path="/repair" element={<RepairPdf />} />
            <Route path="/crop" element={<CropPdf />} />
            <Route path="/sign" element={<SignPdf />} />
            <Route path="/edit" element={<EditPdf />} />
            <Route path="/scan-to-pdf" element={<ScanToPdf />} />
            <Route path="/ocr" element={<OcrPdf />} />
            <Route path="/compare" element={<ComparePdf />} />
            <Route path="/redact" element={<RedactPdf />} />
            <Route path="/html-to-pdf" element={<HtmlToPdf />} />

            <Route path="/pdf-to-word" element={<PdfToWord />} />
            <Route path="/pdf-to-excel" element={<PdfToExcel />} />
            <Route path="/pdf-to-powerpoint" element={<PdfToPowerpoint />} />

            <Route path="/word-to-pdf" element={<OfficeToPdf kind="word" />} />
            <Route path="/excel-to-pdf" element={<OfficeToPdf kind="excel" />} />
            <Route path="/powerpoint-to-pdf" element={<OfficeToPdf kind="powerpoint" />} />

            <Route path="/unlock" element={<UnlockPdf />} />
            <Route path="/protect" element={<ProtectPdf />} />
            <Route path="/pdfa" element={<PdfToPdfa />} />
            <Route path="/tools/:slug" element={<ToolPage />} />
            <Route path="/login" element={<AuthPlaceholder mode="login" />} />
            <Route path="/signup" element={<AuthPlaceholder mode="signup" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-reset-code" element={<VerifyResetCode />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <footer className="footer">
        <div className="container footerInner">
          <span className="muted">All rights reserved to DammyPDF</span>
        </div>
      </footer>
    </div>
  )
}

export default App
