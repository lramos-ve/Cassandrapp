import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Play, Square, Save, Activity, Trash2, Clock, ChevronDown, ChevronRight, Share2 } from 'lucide-react';
import { socket } from '../socket';
import './ContractionCounter.css';

const ContractionCounter = () => {
  const [data, setData] = useState({ activeSession: null, history: [] });
  const [loading, setLoading] = useState(true);
  const isRemoteUpdate = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [expandedSessions, setExpandedSessions] = useState({});

  useEffect(() => {
    // Timer for active contraction
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/state/contractions')
      .then(res => res.json())
      .then(saved => {
        if (saved) {
          isRemoteUpdate.current = true;
          setData(saved);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading contractions", err);
        setLoading(false);
      });

    const handleStateUpdate = (update) => {
      if (update.key === 'contractions') {
        isRemoteUpdate.current = true;
        setData(update.value);
      }
    };
    
    socket.on('state-updated', handleStateUpdate);
    return () => socket.off('state-updated', handleStateUpdate);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    
    fetch('/api/state/contractions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error("Error saving contractions", err));
  }, [data, loading]);

  const startSession = () => {
    setData(prev => ({
      ...prev,
      activeSession: {
        id: uuidv4(),
        startTime: Date.now(),
        contractions: [],
        currentContractionStart: null
      }
    }));
  };

  const endSession = () => {
    setData(prev => {
      const now = new Date();
      const dateString = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const finishedSession = {
        ...prev.activeSession,
        name: `Sesión: ${dateString} ${timeString}`,
        endTime: now.getTime()
      };
      
      return {
        activeSession: null,
        history: [finishedSession, ...(prev.history || [])]
      };
    });
  };

  const deleteSession = (id) => {
    if(confirm('¿Seguro que deseas eliminar este registro?')) {
      setData(prev => ({
        ...prev,
        history: prev.history.filter(s => s.id !== id)
      }));
    }
  };

  const toggleContraction = () => {
    setData(prev => {
      const active = { ...prev.activeSession };
      
      if (active.currentContractionStart) {
        // Stop contraction
        active.contractions = [
          { 
            start: active.currentContractionStart, 
            end: Date.now() 
          },
          ...active.contractions
        ];
        active.currentContractionStart = null;
      } else {
        // Start contraction
        active.currentContractionStart = Date.now();
      }
      
      return { ...prev, activeSession: active };
    });
  };

  const formatTime = (ms) => {
    if (!ms) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const formatDate = (ts) => {
    return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const toggleExpand = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const shareSession = async (session) => {
    let title = session.name;
    if (!title) {
      const dateString = new Date(session.startTime).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      const timeString = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      title = `Sesión: ${dateString} ${timeString} (En curso)`;
    }
    
    let shareText = `🤰 ${title}\n`;
    shareText += `📊 Total de contracciones: ${session.contractions?.length || 0}\n\n`;
    
    if (session.contractions && session.contractions.length > 0) {
      shareText += `Detalle:\n`;
      const chronContractions = [...session.contractions].reverse();
      chronContractions.forEach((c, idx) => {
        const isFirst = idx === 0;
        const previousStart = isFirst ? null : chronContractions[idx - 1].start;
        const freq = previousStart ? c.start - previousStart : null;
        
        const durationStr = formatTime(c.end - c.start);
        const freqStr = freq ? formatTime(freq) : '-';
        const timeStr = formatTimestamp(c.start);
        
        shareText += `${idx + 1}. ⏰ ${timeStr} | ⏳ ${durationStr} | 🔄 ${freqStr}\n`;
      });
    }

    if (session.currentContractionStart) {
      const runningDuration = formatTime(Date.now() - session.currentContractionStart);
      const timeStr = formatTimestamp(session.currentContractionStart);
      const lastFinished = session.contractions?.[0];
      const freq = lastFinished ? session.currentContractionStart - lastFinished.start : null;
      const freqStr = freq ? formatTime(freq) : '-';

      shareText += `\n🔴 En curso: ⏰ ${timeStr} | ⏳ ${runningDuration} | 🔄 ${freqStr}\n`;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Registro de Contracciones',
          text: shareText
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Texto copiado al portapapeles (Compartir nativo no soportado en este navegador)');
      }
    } catch (err) {
      console.error('Error al compartir', err);
    }
  };

  if (loading) {
    return <div className="contractions-container"><p>Cargando...</p></div>;
  }

  const { activeSession, history } = data;

  return (
    <div className="contractions-container">
      <div className="contractions-content">
        
        {/* ACTIVE SESSION */}
        <div className="active-session-card">
          {!activeSession ? (
            <div className="empty-state">
              <Activity size={48} className="empty-icon" />
              <h2>Contador de Contracciones</h2>
              <p>Mide la duración y frecuencia de las contracciones fácilmente.</p>
              <button className="btn-primary" onClick={startSession}>
                <Play size={20} /> Iniciar Nueva Sesión
              </button>
            </div>
          ) : (
            <div className="active-state">
              <div className="active-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Sesión Activa</h3>
                  <span className="session-time">Iniciada a las {formatTimestamp(activeSession.startTime)}</span>
                </div>
                <button className="btn-icon-primary" onClick={() => shareSession(activeSession)} title="Compartir">
                  <Share2 size={20} />
                </button>
              </div>
              
              <div className="big-button-container">
                <button 
                  className={`big-toggle-btn ${activeSession.currentContractionStart ? 'is-recording' : ''}`}
                  onClick={toggleContraction}
                >
                  <div className="btn-pulse-ring"></div>
                  {activeSession.currentContractionStart ? (
                    <>
                      <Square size={32} />
                      <span>Terminó</span>
                      <div className="timer">{formatTime(now - activeSession.currentContractionStart)}</div>
                    </>
                  ) : (
                    <>
                      <Play size={32} />
                      <span>Empezó</span>
                      <div className="timer">Toca para iniciar</div>
                    </>
                  )}
                </button>
              </div>

              {activeSession.contractions.length > 0 && (
                <div className="contractions-table-container">
                  <table className="contractions-table">
                    <thead>
                      <tr>
                        <th>Inicio</th>
                        <th>Duración</th>
                        <th>Frecuencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSession.contractions.map((c, idx) => {
                        const isLast = idx === activeSession.contractions.length - 1;
                        const previousStart = isLast ? null : activeSession.contractions[idx + 1].start;
                        const freq = previousStart ? c.start - previousStart : null;
                        
                        return (
                          <tr key={idx}>
                            <td>{formatTimestamp(c.start)}</td>
                            <td className="highlight-duration">{formatTime(c.end - c.start)}</td>
                            <td>{freq ? formatTime(freq) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="end-session-container">
                <button className="btn-secondary" onClick={endSession}>
                  <Save size={18} /> Guardar y Finalizar Sesión
                </button>
              </div>
            </div>
          )}
        </div>

        {/* HISTORY */}
        {history && history.length > 0 && (
          <div className="history-section">
            <h3>Historial de Sesiones</h3>
            <div className="history-list">
              {history.map(session => (
                <div key={session.id} className="history-card">
                  <div className="history-card-header" onClick={() => toggleExpand(session.id)}>
                    <div className="history-info">
                      <div className="history-title-row">
                        {expandedSessions[session.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <h4>{session.name}</h4>
                      </div>
                      <div className="history-meta">
                        <Clock size={14} /> {formatDate(session.startTime)} · {formatTimestamp(session.startTime)}
                        <span className="badge">{session.contractions?.length || 0} reg.</span>
                      </div>
                    </div>
                    <div className="history-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon-primary" onClick={(e) => { e.stopPropagation(); shareSession(session); }} title="Compartir">
                        <Share2 size={18} />
                      </button>
                      <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {expandedSessions[session.id] && session.contractions?.length > 0 && (
                    <div className="history-card-body">
                      <table className="contractions-table compact">
                        <thead>
                          <tr>
                            <th>Inicio</th>
                            <th>Duración</th>
                            <th>Frecuencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.contractions.map((c, idx) => {
                            const isLast = idx === session.contractions.length - 1;
                            const previousStart = isLast ? null : session.contractions[idx + 1].start;
                            const freq = previousStart ? c.start - previousStart : null;
                            return (
                              <tr key={idx}>
                                <td>{formatTimestamp(c.start)}</td>
                                <td>{formatTime(c.end - c.start)}</td>
                                <td>{freq ? formatTime(freq) : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default ContractionCounter;
