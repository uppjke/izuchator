'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
} from 'lucide-react'
import { Icon } from '@/components/ui/icon'

interface VideoPanelProps {
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  isActive: boolean
  isMuted: boolean
  isCameraOff: boolean
  boardUsers: Array<{ userId: string; userName: string }>
  onToggleMute: () => void
  onToggleCamera: () => void
  toolbarPosition?: 'top' | 'bottom'
}

const TILE_W = 160
const CONTROLS_TIMEOUT = 3000
const DRAG_THRESHOLD = 5

function VideoTile({
  stream,
  label,
  isMuted,
  isSelf,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
}: {
  stream: MediaStream | null
  label: string
  isMuted?: boolean
  isSelf?: boolean
  isCameraOff?: boolean
  onToggleMute?: () => void
  onToggleCamera?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showControls, setShowControls] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Attach stream to video element
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream) {
      el.srcObject = stream
      // Safari needs explicit play() for WebRTC streams
      el.play().catch(() => {
        // Retry once after a tick — sometimes Safari needs a moment
        setTimeout(() => el.play().catch(() => {}), 100)
      })
    } else {
      el.srcObject = null
      setHasVideo(false)
    }
  }, [stream])

  // Detect actual video frames
  useEffect(() => {
    const el = videoRef.current
    if (!el || !stream) { setHasVideo(false); return }

    const check = () => {
      setHasVideo(el.videoWidth > 0 && el.videoHeight > 0)
    }

    el.addEventListener('resize', check)
    el.addEventListener('loadedmetadata', check)
    el.addEventListener('playing', check)
    const interval = setInterval(check, 500)
    check()

    return () => {
      el.removeEventListener('resize', check)
      el.removeEventListener('loadedmetadata', check)
      el.removeEventListener('playing', check)
      clearInterval(interval)
    }
  }, [stream])

  // Auto-hide controls after timeout
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_TIMEOUT)
  }, [])

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [])

  return (
    <div
      className="relative bg-zinc-900 rounded-xl overflow-hidden aspect-[4/3]"
      style={{ width: TILE_W }}
      onMouseEnter={() => isSelf && setShowControls(true)}
      onMouseLeave={() => isSelf && setShowControls(false)}
    >
      {/* Video — muted only for self tile. WebRTC streams can autoplay unmuted in browsers */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!!isSelf}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
          stream && hasVideo ? 'opacity-100' : 'opacity-0'
        }`}
        style={isSelf ? { transform: 'scaleX(-1)' } : undefined}
      />
      {/* Avatar overlay — visible when no active video */}
      {(!stream || !hasVideo) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-medium">
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Label + muted indicator */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
        <span className="text-[10px] text-white bg-black/60 rounded px-1.5 py-0.5 truncate">
          {isSelf ? 'Вы' : label}
        </span>
        {isMuted && (
          <span className="flex-shrink-0">
            <Icon icon={MicOff} size="xs" className="text-red-400" />
          </span>
        )}
      </div>

      {/* Controls overlay for self tile */}
      {isSelf && showControls && (
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40"
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleMute?.(); showControlsTemporarily() }}
            className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${
              isMuted
                ? 'bg-red-500/30 text-red-400'
                : 'bg-white/15 text-white'
            }`}
          >
            <Icon icon={isMuted ? MicOff : Mic} size="sm" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleCamera?.(); showControlsTemporarily() }}
            className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${
              isCameraOff
                ? 'bg-red-500/30 text-red-400'
                : 'bg-white/15 text-white'
            }`}
          >
            <Icon icon={isCameraOff ? VideoOff : Video} size="sm" />
          </button>
        </div>
      )}

      {/* Invisible tap zone for mobile — triggers controls temporarily */}
      {isSelf && !showControls && (
        <div
          className="absolute inset-0"
          onTouchStart={(e) => { e.stopPropagation(); showControlsTemporarily() }}
        />
      )}
    </div>
  )
}

export function VideoPanel({
  localStream,
  remoteStreams,
  isActive,
  isMuted,
  isCameraOff,
  boardUsers,
  onToggleMute,
  onToggleCamera,
  toolbarPosition = 'bottom',
}: VideoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Store right-edge offset instead of absolute x — so panel sticks to right on resize
  const [rightOffset, setRightOffset] = useState(16)
  // Offset from the anchored edge (top when toolbar=bottom, bottom when toolbar=top)
  const [edgeOffset, setEdgeOffset] = useState(16)
  const initialized = useRef(false)
  const dragRef = useRef<{
    startX: number; startY: number
    startRight: number; startEdge: number
    isDragging: boolean
  } | null>(null)

  // Anchor video panel to opposite side of toolbar
  const anchorBottom = toolbarPosition === 'top'

  // Show panel if local video is active OR there are remote streams
  const hasRemote = remoteStreams.size > 0
  const shouldShow = isActive || hasRemote

  // Clamp position within viewport bounds
  const clampPosition = useCallback((right: number, edge: number) => {
    const el = panelRef.current
    if (!el) return { right, edge }
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 4

    // Clamp right: panel right edge can't go past left viewport, left edge can't exceed right viewport
    let clampedRight = right
    clampedRight = Math.max(margin, clampedRight) // don't go past right edge
    clampedRight = Math.min(vw - rect.width - margin, clampedRight) // don't go past left edge

    // Clamp edge offset (from top or bottom depending on anchor)
    let clampedEdge = edge
    clampedEdge = Math.max(margin, clampedEdge)
    clampedEdge = Math.min(vh - rect.height - margin, clampedEdge)

    return { right: clampedRight, edge: clampedEdge }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: rightOffset,
      startEdge: edgeOffset,
      isDragging: false,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [rightOffset, edgeOffset])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    // Start dragging only after threshold
    if (!dragRef.current.isDragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      dragRef.current.isDragging = true
    }

    // Moving right = decrease rightOffset, moving left = increase rightOffset
    const newRight = dragRef.current.startRight - dx
    // For top-anchor: moving down = increase offset; for bottom-anchor: moving down = decrease offset
    const newEdge = anchorBottom
      ? dragRef.current.startEdge - dy
      : dragRef.current.startEdge + dy

    const clamped = clampPosition(newRight, newEdge)
    setRightOffset(clamped.right)
    setEdgeOffset(clamped.edge)
  }, [anchorBottom, clampPosition])

  const handlePointerUp = useCallback(() => {
    if (dragRef.current?.isDragging) {
      // Final clamp
      const clamped = clampPosition(rightOffset, edgeOffset)
      setRightOffset(clamped.right)
      setEdgeOffset(clamped.edge)
    }
    dragRef.current = null
  }, [rightOffset, edgeOffset, clampPosition])

  // Reset when closed
  useEffect(() => {
    if (!shouldShow) {
      initialized.current = false
      setRightOffset(16)
      setEdgeOffset(16)
    }
  }, [shouldShow])

  // Reset edge offset when toolbar position changes
  useEffect(() => {
    setEdgeOffset(16)
  }, [toolbarPosition])

  // Mark initialized on first show
  useEffect(() => {
    if (!shouldShow || initialized.current) return
    initialized.current = true
  }, [shouldShow])

  if (!shouldShow) return null

  const positionStyle: React.CSSProperties = {
    right: rightOffset,
    touchAction: 'none',
    ...(anchorBottom ? { bottom: edgeOffset } : { top: edgeOffset }),
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.9, y: anchorBottom ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: anchorBottom ? 8 : -8 }}
      className="absolute z-30 select-none"
      style={positionStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flex flex-col gap-2" style={{ width: TILE_W }}>
        {/* Self tile — only when active */}
        {isActive && (
          <VideoTile
            stream={isCameraOff ? null : localStream}
            label="Вы"
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isSelf
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
          />
        )}
        {/* Remote tiles — always visible when present */}
        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
          const user = boardUsers.find((u) => u.userId === peerId)
          return (
            <VideoTile
              key={peerId}
              stream={stream}
              label={user?.userName || peerId.slice(0, 6)}
            />
          )
        })}
      </div>
    </motion.div>
  )
}
