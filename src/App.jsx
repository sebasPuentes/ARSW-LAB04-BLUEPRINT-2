import { useEffect, useRef, useState } from 'react'
import { createStompClient, subscribeBlueprint } from './lib/stompClient.js'
import { createSocket } from './lib/socketIoClient.js'
import useGetBlueprintsByAuthor from './hooks/useGetBlueprintsByAuthor.js'
import useGetBlueprintByAuthorAndName from './hooks/useGetBlueprintByAuthorAndName.js'
import useCreateBlueprint from './hooks/useCreateBlueprint.js'
import useUpdateBlueprint from './hooks/useUpdateBlueprint.js'
import useDeleteBlueprint from './hooks/useDeleteBlueprint.js'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080' // Spring
const IO_BASE  = import.meta.env.VITE_IO_BASE  ?? 'http://localhost:3001' // Node/Socket.IO

export default function App() {
  const [tech, setTech] = useState('socketio')
  const [author, setAuthor] = useState('')
  const [name, setName] = useState('')
  const [currentPoints, setCurrentPoints] = useState([])
  const [selectedBp, setSelectedBp] = useState(null)
  const [newName, setNewName] = useState('')
  const [rtRoom, setRtRoom] = useState(null)
  const canvasRef = useRef(null)

  const stompRef = useRef(null)
  const unsubRef = useRef(null)
  const socketRef = useRef(null)

  //Hooks
  const { blueprints, totalPoints, loading: loadingList, error: errorList, fetchBlueprints } = useGetBlueprintsByAuthor()
  const { blueprint, fetchBlueprint } = useGetBlueprintByAuthorAndName()
  const { createBlueprint, loading: loadingCreate } = useCreateBlueprint()
  const { updateBlueprint, loading: loadingUpdate } = useUpdateBlueprint()
  const { deleteBlueprint, loading: loadingDelete } = useDeleteBlueprint()

  function drawAll(points) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 600, 400)
    if (!points || points.length === 0) return
    ctx.beginPath()
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
  }

  useEffect(() => {
    if (blueprint) {
      setCurrentPoints(blueprint.points ?? [])
    }
  }, [blueprint])
  useEffect(() => {
    unsubRef.current?.(); unsubRef.current = null
    stompRef.current?.deactivate?.(); stompRef.current = null
    socketRef.current?.disconnect?.(); socketRef.current = null

    if (!rtRoom) return

    const { author: rtAuthor, name: rtName } = rtRoom

    if (tech === 'stomp') {
      const client = createStompClient(API_BASE)
      stompRef.current = client
      client.onConnect = () => {
        unsubRef.current = subscribeBlueprint(client, rtAuthor, rtName, (upd) => {
          setCurrentPoints(prev => [...prev, ...upd.points])
        })
      }
      client.activate()

    } else if (tech === 'socketio') {
      const s = createSocket(IO_BASE)
      socketRef.current = s
      const room = `blueprints.${rtAuthor}.${rtName}`
      s.on('connect', () => {
        console.log('Socket.IO connected, id:', s.id, 'joining room:', room)
        s.emit('join-room', room)
      })
      s.on('blueprint-update', (upd) => {
        console.log('Received blueprint-update:', upd)
        setCurrentPoints(prev => [...prev, ...upd.points])
      })
      s.on('connect_error', (err) => {
        console.error('Socket.IO connect_error:', err.message)
      })
    }

    return () => {
      unsubRef.current?.(); unsubRef.current = null
      stompRef.current?.deactivate?.()
      socketRef.current?.disconnect?.()
    }
  }, [tech, rtRoom])

  useEffect(() => {
    drawAll(currentPoints)
  }, [currentPoints])

  function onClick(e) {
    const rect = e.target.getBoundingClientRect()
    const point = { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) }

    setCurrentPoints(prev => [...prev, point])

    if (!rtRoom) return

    if (tech === 'stomp' && stompRef.current?.connected) {
      stompRef.current.publish({ destination: '/app/draw', body: JSON.stringify({ author: rtRoom.author, name: rtRoom.name, point }) })
    } else if (tech === 'socketio' && socketRef.current?.connected) {
      const room = `blueprints.${rtRoom.author}.${rtRoom.name}`
      console.log('[RT] Emitting draw-event, room:', room, 'point:', point, 'socket connected:', socketRef.current.connected)
      socketRef.current.emit('draw-event', { room, author: rtRoom.author, name: rtRoom.name, point })
    } else {
      console.warn('[RT] Click but no RT connection. tech:', tech, 'socket connected:', socketRef.current?.connected)
    }
  }

  //blueprints por autor
  function handleGetByAuthor() {
    if (!author.trim()) return
    fetchBlueprints(author.trim())
  }

  // Seleccionar un blueprint de la tabla
  function handleSelectBp(bp) {
    setSelectedBp(bp)
    setName(bp.name)
    setRtRoom({ author: bp.author, name: bp.name })
    fetchBlueprint(bp.author, bp.name)
  }

  //Crear nuevo blueprint
  async function handleCreate() {
    const bpName = newName.trim() || name.trim()
    if (!author.trim() || !bpName) return
    const result = await createBlueprint(author.trim(), bpName, currentPoints)
    if (result) {
      setName(bpName)
      setNewName('')
      setRtRoom({ author: author.trim(), name: bpName })
      fetchBlueprints(author.trim())
    }
  }

  //Save/Update blueprint actual
  async function handleSave() {
    if (!author.trim() || !name.trim()) return
    const result = await updateBlueprint(author.trim(), name.trim(), currentPoints)
    if (result) {
      fetchBlueprints(author.trim())
    }
  }

  //Delete blueprint actual
  async function handleDelete() {
    if (!author.trim() || !name.trim()) return
    const ok = await deleteBlueprint(author.trim(), name.trim())
    if (ok) {
      setSelectedBp(null)
      setName('')
      setRtRoom(null)
      setCurrentPoints([])
      fetchBlueprints(author.trim())
    }
  }

  function handleReset() {
    setCurrentPoints([])
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui', padding: 16, maxWidth: 900 }}>
      <h2>BluePrints RT – Socket.IO vs STOMP</h2>

      {/*Barra superior*/}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <label>Tecnología:</label>
        <select value={tech} onChange={e => setTech(e.target.value)}>
          <option value="stomp">STOMP (Spring)</option>
          <option value="socketio">Socket.IO (Node)</option>
          <option value="none">None (solo REST)</option>
        </select>
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="autor" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="plano" />
        <button onClick={handleGetByAuthor} disabled={loadingList}>
          {loadingList ? 'Buscando...' : 'Get Blueprints'}
        </button>
      </div>

      {/*Canvas*/}
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{ border: '1px solid #ddd', borderRadius: 12 }}
        onClick={onClick}
      />

      {/*Barra: Create / Save / Delete / Reset*/}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="nombre nuevo (create)" />
        <button onClick={handleCreate} disabled={loadingCreate}>
          {loadingCreate ? 'Creando...' : 'Create'}
        </button>
        <button onClick={handleSave} disabled={loadingUpdate || !name.trim()}>
          {loadingUpdate ? 'Guardando...' : 'Save/Update'}
        </button>
        <button className="btn-delete" onClick={handleDelete} disabled={loadingDelete || !name.trim()}>
          {loadingDelete ? 'Eliminando...' : 'Delete'}
        </button>
        <button onClick={handleReset}>Reset Canvas</button>
      </div>

      {errorList && <p className="error-msg">Error: {errorList}</p>}

      {/*Tabla de blueprints*/}
      {blueprints.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>{author}'s Blueprints</h3>
          <table className="bp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Points</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {blueprints.map(bp => (
                <tr key={`${bp.author}-${bp.name}`} className={selectedBp?.name === bp.name ? 'selected' : ''}>
                  <td>{bp.name}</td>
                  <td>{bp.points?.length ?? 0}</td>
                  <td>
                    <button onClick={() => handleSelectBp(bp)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total points</strong></td>
                <td><strong>{totalPoints}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p style={{ opacity: .7, marginTop: 8 }}>Tip: abre 2 pestañas y dibuja alternando para ver la colaboración.</p>
    </div>
  )
}
