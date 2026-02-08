'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { BoardClientToServerEvents, BoardServerToClientEvents } from './types'

type BoardSocket = Socket<BoardServerToClientEvents, BoardClientToServerEvents>

interface UseVideoCallOptions {
  boardId: string
  userId: string
  socketRef: React.RefObject<BoardSocket | null>
  boardUsers: Array<{ userId: string; userName: string }>
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const TAG = '📹'
function log(...args: unknown[]) { console.log(TAG, ...args) }
function uid(id: string) { return id.slice(0, 6) }

function isMediaAvailable(): boolean {
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
}

export function useVideoCall({ boardId, userId, socketRef, boardUsers }: UseVideoCallOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isActive, setIsActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [mediaSupported] = useState(isMediaAvailable)

  const peersRef = useRef<Map<string, { pc: RTCPeerConnection; remoteStream: MediaStream }>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const isActiveRef = useRef(false)
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const boardIdRef = useRef(boardId)
  const userIdRef = useRef(userId)
  // Polite peer glare handling
  const makingOfferRef = useRef<Set<string>>(new Set())
  const ignoreOfferRef = useRef<Set<string>>(new Set())

  useEffect(() => { isActiveRef.current = isActive }, [isActive])
  useEffect(() => { boardIdRef.current = boardId }, [boardId])
  useEffect(() => { userIdRef.current = userId }, [userId])

  // ── Create a NEW peer connection (only when no existing usable peer) ──
  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    const existing = peersRef.current.get(remoteUserId)
    if (existing) {
      log(`Closing old peer for ${uid(remoteUserId)} (ICE: ${existing.pc.iceConnectionState})`)
      existing.pc.close()
      peersRef.current.delete(remoteUserId)
    }

    log(`NEW peer for ${uid(remoteUserId)}, local tracks: ${localStreamRef.current?.getTracks().length ?? 0}`)
    const pc = new RTCPeerConnection(ICE_SERVERS)
    const remoteStream = new MediaStream()

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('board:rtc-ice-candidate', {
          boardId: boardIdRef.current,
          targetUserId: remoteUserId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.ontrack = (event) => {
      log(`ontrack ${uid(remoteUserId)}: ${event.track.kind}, enabled=${event.track.enabled}, muted=${event.track.muted}`)
      if (!remoteStream.getTracks().find(t => t.id === event.track.id)) {
        remoteStream.addTrack(event.track)
      }
      log(`Remote tracks: ${remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ')}`)
      setRemoteStreams((prev) => new Map(prev).set(remoteUserId, remoteStream))
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      log(`ICE [${uid(remoteUserId)}]: ${state}`)
      if (state === 'failed') {
        log(`ICE failed → closing peer ${uid(remoteUserId)}`)
        pc.close()
        peersRef.current.delete(remoteUserId)
        setRemoteStreams((prev) => { const n = new Map(prev); n.delete(remoteUserId); return n })
      }
      // 'disconnected' is transient — don't close, ICE may recover
    }

    pc.onsignalingstatechange = () => {
      log(`Signaling [${uid(remoteUserId)}]: ${pc.signalingState}`)
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    peersRef.current.set(remoteUserId, { pc, remoteStream })
    return pc
  }, [socketRef])

  const getLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (!isMediaAvailable()) return null
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 24 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      log(`Got local media: ${stream.getTracks().map(t => `${t.kind}:${t.readyState}`).join(', ')}`)
      return stream
    } catch (err) {
      console.error(TAG, 'Failed to get media:', err)
      return null
    }
  }, [])

  // ── Send offer — reuses existing peer when possible ──
  const sendOfferTo = useCallback(async (targetUserId: string) => {
    if (targetUserId === userIdRef.current) return
    if (!localStreamRef.current) {
      log(`Skip offer to ${uid(targetUserId)}: no local stream`)
      return
    }

    const existing = peersRef.current.get(targetUserId)
    let pc: RTCPeerConnection

    if (existing && existing.pc.signalingState !== 'closed') {
      const ice = existing.pc.iceConnectionState
      const sig = existing.pc.signalingState

      // Skip if already negotiating or connected with tracks
      if (sig === 'have-local-offer') {
        log(`Skip offer to ${uid(targetUserId)}: already have-local-offer`)
        return
      }
      if ((ice === 'connected' || ice === 'completed') &&
          existing.pc.getSenders().some(s => s.track !== null)) {
        log(`Skip offer to ${uid(targetUserId)}: connected with tracks`)
        return
      }
      if (ice === 'checking' || ice === 'new') {
        log(`Skip offer to ${uid(targetUserId)}: ICE ${ice}`)
        return
      }
      // disconnected — let ICE recover, don't destroy
      if (ice === 'disconnected') {
        log(`Skip offer to ${uid(targetUserId)}: ICE disconnected (may recover)`)
        return
      }

      // Stable state — add our tracks and renegotiate on EXISTING peer
      log(`Renegotiating with ${uid(targetUserId)} (ICE: ${ice})`)
      const senderTrackIds = new Set(
        existing.pc.getSenders().map(s => s.track?.id).filter(Boolean)
      )
      localStreamRef.current.getTracks().forEach((track) => {
        if (!senderTrackIds.has(track.id)) {
          existing.pc.addTrack(track, localStreamRef.current!)
        }
      })
      pc = existing.pc
    } else {
      log(`New peer for offer to ${uid(targetUserId)}`)
      pc = createPeerConnection(targetUserId)
    }

    try {
      makingOfferRef.current.add(targetUserId)
      const offer = await pc.createOffer()
      if (pc.signalingState === 'closed') {
        log(`Peer closed during createOffer for ${uid(targetUserId)}`)
        return
      }
      await pc.setLocalDescription(offer)
      socketRef.current?.emit('board:rtc-offer', {
        boardId: boardIdRef.current,
        targetUserId,
        offer,
      })
      log(`Sent offer to ${uid(targetUserId)}`)
    } catch (err) {
      log(`Failed to offer ${uid(targetUserId)}:`, err)
    } finally {
      makingOfferRef.current.delete(targetUserId)
    }
  }, [socketRef, createPeerConnection])

  // ── Main toggle ──
  const toggleMedia = useCallback(async () => {
    if (isActive) {
      log('Turning off media')
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      setLocalStream(null)
      peersRef.current.forEach((peer) => peer.pc.close())
      peersRef.current.clear()
      pendingCandidatesRef.current.clear()
      makingOfferRef.current.clear()
      ignoreOfferRef.current.clear()
      setRemoteStreams(new Map())
      setIsActive(false)
      setIsMuted(false)
      setIsCameraOff(false)
      socketRef.current?.emit('board:rtc-hangup', { boardId })
      return
    }

    log('Turning on media')
    const stream = await getLocalMedia()
    if (!stream) return

    stream.getAudioTracks().forEach((t) => { t.enabled = false })
    stream.getVideoTracks().forEach((t) => { t.enabled = false })

    localStreamRef.current = stream
    setLocalStream(stream)
    setIsMuted(true)
    setIsCameraOff(true)
    setIsActive(true)

    // For each user — add tracks to existing peer or create new
    const others = boardUsers.filter(u => u.userId !== userId)
    log(`Joining call: ${others.length} other users, ${peersRef.current.size} existing peers`)

    for (const user of others) {
      await sendOfferTo(user.userId)
    }
  }, [isActive, boardId, userId, boardUsers, socketRef, sendOfferTo, getLocalMedia])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const newEnabled = !localStreamRef.current.getAudioTracks()[0]?.enabled
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = newEnabled })
    setIsMuted(!newEnabled)
    log(`Mic ${newEnabled ? 'ON' : 'OFF'}`)
  }, [])

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return
    const newEnabled = !localStreamRef.current.getVideoTracks()[0]?.enabled
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = newEnabled })
    setIsCameraOff(!newEnabled)
    log(`Camera ${newEnabled ? 'ON' : 'OFF'}`)
  }, [])

  // ── Signaling — stable effect, depends only on socket instance ──
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) {
      log('Signaling: no socket')
      return
    }
    log('Signaling: setting up listeners')

    // ─ OFFER: renegotiate on existing peer, or create new. Polite peer for glare. ─
    const handleOffer = async ({ fromUserId, offer }: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      log(`Received offer from ${uid(fromUserId)}`)

      const existing = peersRef.current.get(fromUserId)
      let pc: RTCPeerConnection

      if (existing && existing.pc.signalingState !== 'closed') {
        const sig = existing.pc.signalingState
        const ice = existing.pc.iceConnectionState
        log(`Existing peer: ICE=${ice}, sig=${sig}`)

        if (sig === 'have-local-offer' || makingOfferRef.current.has(fromUserId)) {
          // ── GLARE: both sent offers simultaneously ──
          // Polite peer (lower userId) yields
          const weArePolite = userIdRef.current < fromUserId
          if (!weArePolite) {
            log(`Glare: impolite → ignore offer from ${uid(fromUserId)}`)
            ignoreOfferRef.current.add(fromUserId)
            return
          }
          log(`Glare: polite → accept offer from ${uid(fromUserId)} (implicit rollback)`)
          ignoreOfferRef.current.delete(fromUserId)
        }

        // Renegotiate on EXISTING peer (stable or after rollback)
        pc = existing.pc
      } else {
        pc = createPeerConnection(fromUserId)
      }

      ignoreOfferRef.current.delete(fromUserId)

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        log(`setRemoteDescription from ${uid(fromUserId)}, transceivers: ${pc.getTransceivers().length}`)
      } catch (err) {
        log(`setRemoteDescription failed for ${uid(fromUserId)}, recreating:`, err)
        pc = createPeerConnection(fromUserId)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
      }

      // Flush buffered ICE candidates
      const pending = pendingCandidatesRef.current.get(fromUserId) || []
      if (pending.length > 0) log(`Flushing ${pending.length} ICE candidates`)
      for (const c of pending) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
      }
      pendingCandidatesRef.current.delete(fromUserId)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('board:rtc-answer', { boardId: boardIdRef.current, targetUserId: fromUserId, answer })
      log(`Sent answer to ${uid(fromUserId)}`)
    }

    const handleAnswer = async ({ fromUserId, answer }: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current.get(fromUserId)
      if (!peer) {
        log(`Answer from ${uid(fromUserId)}: no peer`)
        return
      }
      if (peer.pc.signalingState !== 'have-local-offer') {
        log(`Answer from ${uid(fromUserId)}: ignoring (sig=${peer.pc.signalingState})`)
        return
      }
      log(`Answer from ${uid(fromUserId)}`)
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer))
      const pending = pendingCandidatesRef.current.get(fromUserId) || []
      if (pending.length > 0) log(`Flushing ${pending.length} ICE candidates`)
      for (const c of pending) {
        try { await peer.pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
      }
      pendingCandidatesRef.current.delete(fromUserId)
    }

    const handleIceCandidate = async ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      if (ignoreOfferRef.current.has(fromUserId)) return
      const peer = peersRef.current.get(fromUserId)
      if (peer && peer.pc.remoteDescription) {
        try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      } else {
        if (!pendingCandidatesRef.current.has(fromUserId)) pendingCandidatesRef.current.set(fromUserId, [])
        pendingCandidatesRef.current.get(fromUserId)!.push(candidate)
      }
    }

    const handleHangup = ({ fromUserId }: { fromUserId: string }) => {
      log(`Hangup from ${uid(fromUserId)}`)
      const peer = peersRef.current.get(fromUserId)
      if (peer) {
        peer.pc.close()
        peersRef.current.delete(fromUserId)
        setRemoteStreams((prev) => { const n = new Map(prev); n.delete(fromUserId); return n })
      }
      ignoreOfferRef.current.delete(fromUserId)
      makingOfferRef.current.delete(fromUserId)
      pendingCandidatesRef.current.delete(fromUserId)
    }

    const handleRtcReady = async ({ fromUserId }: { fromUserId: string }) => {
      log(`User ${uid(fromUserId)} RTC-ready, active=${isActiveRef.current}, stream=${!!localStreamRef.current}`)
      if (!isActiveRef.current || !localStreamRef.current) return
      if (fromUserId === userIdRef.current) return
      await sendOfferTo(fromUserId)
    }

    socket.on('board:rtc-offer', handleOffer)
    socket.on('board:rtc-answer', handleAnswer)
    socket.on('board:rtc-ice-candidate', handleIceCandidate)
    socket.on('board:rtc-hangup', handleHangup)
    socket.on('board:rtc-ready', handleRtcReady)

    return () => {
      log('Signaling: cleanup')
      socket.off('board:rtc-offer', handleOffer)
      socket.off('board:rtc-answer', handleAnswer)
      socket.off('board:rtc-ice-candidate', handleIceCandidate)
      socket.off('board:rtc-hangup', handleHangup)
      socket.off('board:rtc-ready', handleRtcReady)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current])

  // ── Emit rtc-ready after join confirmed ──
  const rtcReadyEmittedRef = useRef(false)
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const isJoined = boardUsers.some((u) => u.userId === userId)
    if (!isJoined) {
      rtcReadyEmittedRef.current = false
      return
    }
    if (rtcReadyEmittedRef.current) return
    rtcReadyEmittedRef.current = true
    socket.emit('board:rtc-ready', { boardId })
    log(`Emitted rtc-ready (${boardUsers.length} users)`)
  }, [boardUsers, userId, boardId, socketRef])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      peersRef.current.forEach((peer) => peer.pc.close())
    }
  }, [])

  return {
    localStream,
    remoteStreams,
    isActive,
    isMuted,
    isCameraOff,
    mediaSupported,
    toggleMedia,
    toggleMute,
    toggleCamera,
  }
}
